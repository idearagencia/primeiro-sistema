// npm run fumaca: teste de fumaça, roda depois do `npm run build`.
// Liga a demo de verdade, em produção e em desenvolvimento, e confere o que a pessoa vai ver.
// Tem que passar num computador sem o Claude Code e sem o VS Code (como os do CI).
import { spawn } from "node:child_process";
import { request } from "node:http";
import { fileURLToPath } from "node:url";

// Peso máximo de "/" em produção: HTML + os <script src> que ele carrega, em bytes.
// Medido na primeira execução (veja o README) e fixado em medido + 20%.
const ORCAMENTO_BYTES = 722_258; // medido: 601_881 bytes (2026-11-10, Next 16.4.5)

const HOST = "127.0.0.1";
const PORTA_PRODUCAO = 3111;
const PORTA_DEV = 3112;
const CABECALHOS = [
	"content-security-policy",
	"x-content-type-options",
	"referrer-policy",
	"x-frame-options",
];

const raiz = fileURLToPath(new URL("..", import.meta.url));
const next = fileURLToPath(
	new URL("../node_modules/next/dist/bin/next", import.meta.url),
);

// GET com node:http (o fetch não deixa trocar o cabeçalho Host).
function pedir(porta, caminho, host = `localhost:${porta}`, extras = {}) {
	return new Promise((resolve, reject) => {
		const req = request(
			{
				host: HOST,
				port: porta,
				path: caminho,
				headers: { ...extras, Host: host },
			},
			(res) => {
				const pedacos = [];
				res.on("data", (p) => pedacos.push(p));
				res.on("end", () => {
					const corpo = Buffer.concat(pedacos);
					resolve({
						status: res.statusCode,
						cabecalhos: res.headers,
						bytes: corpo.length,
						texto: corpo.toString("utf8"),
					});
				});
				res.on("error", reject);
			},
		);
		req.setTimeout(30_000, () => req.destroy(new Error("demorou demais")));
		req.on("error", reject);
		req.end();
	});
}

function ligar(args, env) {
	return spawn(process.execPath, args, {
		cwd: raiz,
		env: { ...process.env, ...env },
		stdio: ["ignore", "pipe", "pipe"],
		detached: process.platform !== "win32",
		windowsHide: true,
	});
}

// Mata o processo e todos os que ele abriu (o next abre outros).
function desligar(filho) {
	return new Promise((resolve) => {
		if (filho.exitCode !== null || filho.pid === undefined) return resolve();
		filho.once("exit", () => resolve());
		try {
			if (process.platform === "win32") {
				spawn("taskkill", ["/pid", String(filho.pid), "/T", "/F"], {
					stdio: "ignore",
					windowsHide: true,
				}).on("error", () => filho.kill("SIGKILL"));
			} else {
				process.kill(-filho.pid, "SIGKILL");
			}
		} catch {
			filho.kill("SIGKILL");
		}
		setTimeout(resolve, 5000).unref();
	});
}

async function esperarNoAr(porta, ms, filho) {
	const fim = Date.now() + ms;
	while (Date.now() < fim) {
		if (filho.exitCode !== null) {
			throw new Error(`o servidor fechou sozinho (código ${filho.exitCode})`);
		}
		try {
			const r = await pedir(porta, "/");
			if (r.status === 200) return r;
		} catch {}
		await new Promise((r) => setTimeout(r, 500));
	}
	throw new Error(`a página não abriu em ${ms / 1000} s`);
}

function confere(condicao, mensagem) {
	if (!condicao) throw new Error(mensagem);
	console.log(`  ok: ${mensagem}`);
}

async function bloco(nome, args, env, testes) {
	console.log(`\n${nome}`);
	const filho = ligar(args, env);
	let log = "";
	const juntar = (p) => {
		log = (log + p.toString("utf8")).slice(-4000);
	};
	filho.stdout.on("data", juntar);
	filho.stderr.on("data", juntar);
	try {
		await testes(filho);
	} catch (e) {
		console.error(
			`\nFALHOU (${nome}): ${e.message}\n--- fim do log do servidor ---\n${log}`,
		);
		throw e;
	} finally {
		await desligar(filho);
	}
}

async function producao() {
	await bloco(
		"Produção (next start)",
		[next, "start", "-H", HOST, "-p", String(PORTA_PRODUCAO)],
		{ NODE_ENV: "production" },
		async (filho) => {
			const r = await esperarNoAr(PORTA_PRODUCAO, 60_000, filho);
			confere(r.status === 200, "GET / responde 200");
			for (const c of CABECALHOS) {
				confere(Boolean(r.cabecalhos[c]), `GET / traz ${c}`);
			}
			confere(
				r.texto.includes("Você conseguiu!"),
				"a tela de produção comemora",
			);

			const evil = await pedir(PORTA_PRODUCAO, "/", "evil.example");
			confere(evil.status === 403, "Host de fora recebe 403");

			const api = await pedir(PORTA_PRODUCAO, "/api/conferir");
			confere(api.status === 404, "/api/conferir não existe em produção");

			const scripts = [...r.texto.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)].map(
				(m) => m[1].replaceAll("&amp;", "&"),
			);
			let total = r.bytes;
			for (const src of new Set(scripts)) {
				const s = await pedir(PORTA_PRODUCAO, src);
				confere(s.status === 200, `script ${src} abre`);
				total += s.bytes;
			}
			console.log(
				`  peso de /: ${total} bytes (HTML + ${new Set(scripts).size} scripts)`,
			);
			confere(
				total <= ORCAMENTO_BYTES,
				`peso de / dentro do orçamento (${ORCAMENTO_BYTES} bytes)`,
			);
		},
	);
}

async function desenvolvimento() {
	await bloco(
		"Desenvolvimento (npm run dev)",
		[fileURLToPath(new URL("./dev.mjs", import.meta.url))],
		{ PORT: String(PORTA_DEV), NODE_ENV: "development" },
		async (filho) => {
			const r = await esperarNoAr(PORTA_DEV, 60_000, filho);
			confere(r.status === 200, "GET / responde 200 em até 60 s");
			// A tela aparece na hora em "conferindo…" e busca o resultado em /api/conferir.
			confere(
				r.texto.includes("Conferindo o seu computador"),
				"a tela aparece na hora, conferindo",
			);

			const api = await pedir(PORTA_DEV, "/api/conferir");
			confere(api.status === 200, "/api/conferir responde 200");
			const c = JSON.parse(api.texto);
			confere(
				Array.isArray(c.itens) && c.itens.length === 14,
				"/api/conferir traz 14 itens",
			);
			confere(
				["Seu computador está pronto!", "Quase lá."].includes(c.frase?.titulo),
				`frase do topo: "${c.frase?.titulo}"`,
			);

			const deFora = await pedir(PORTA_DEV, "/api/conferir", undefined, {
				"Sec-Fetch-Site": "cross-site",
			});
			confere(
				deFora.status === 403,
				"/api/conferir pedido por outro site recebe 403",
			);
		},
	);
}

try {
	await producao();
	await desenvolvimento();
	console.log("\nFumaça: tudo certo.");
} catch {
	process.exitCode = 1;
}
