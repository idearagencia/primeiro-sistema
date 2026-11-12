import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cabecalhosFaltando, conferirNoAr } from "./lib.mjs";

const PROTECOES = {
	"Content-Security-Policy": "default-src 'self'",
	"X-Content-Type-Options": "nosniff",
	"Referrer-Policy": "strict-origin-when-cross-origin",
	"X-Frame-Options": "DENY",
};

// Servidor falso: cada teste diz como ele responde em cada caminho.
/** @type {Record<string, { status: number, corpo?: string, cabecalhos?: Record<string, string> }>} */
let rotas = {};
const servidor = createServer((req, res) => {
	const rota = rotas[req.url ?? "/"] ?? {
		status: 404,
		corpo: "Não encontrado.",
	};
	res.writeHead(rota.status, rota.cabecalhos ?? {});
	res.end(rota.corpo ?? "");
});
let porta = 0;

beforeAll(async () => {
	await new Promise((ok) => servidor.listen(0, "127.0.0.1", () => ok(null)));
	const endereco = servidor.address();
	porta = typeof endereco === "object" && endereco ? endereco.port : 0;
});
afterAll(() => new Promise((ok) => servidor.close(() => ok(null))));

const ENDERECO = "https://meu-sistema.exemplo.com.br";

// O "https://" do teste vai para o servidor falso (o cadeado de verdade não dá para simular).
/** @type {typeof fetch} */
const buscarNoFalso = (url, init) =>
	fetch(String(url).replace(ENDERECO, `http://127.0.0.1:${porta}`), init);

async function rodar(
	/** @type {string | undefined} */ texto,
	buscar = buscarNoFalso,
) {
	/** @type {string[]} */
	const linhas = [];
	const ok = await conferirNoAr(texto, {
		buscar,
		escrever: (l) => linhas.push(l),
		prazoMs: 3000,
	});
	return { ok, linhas, ultima: linhas.at(-1)?.trim() ?? "" };
}

const demoNoAr = () => ({
	"/": { status: 200, corpo: "<html></html>", cabecalhos: { ...PROTECOES } },
	"/api/health": {
		status: 200,
		corpo: '{"ok":true}',
		cabecalhos: { "Content-Type": "application/json" },
	},
	"/api/conferir": { status: 404, corpo: "Não encontrado." },
});

describe("conferirNoAr", () => {
	it("tudo certo: última linha é No ar, com cadeado.", async () => {
		rotas = demoNoAr();
		const r = await rodar(ENDERECO);
		expect(r.ok).toBe(true);
		expect(r.ultima).toBe("No ar, com cadeado.");
		expect(r.linhas.filter((l) => l.startsWith("[OK]"))).toHaveLength(5);
		expect(r.linhas.some((l) => l.startsWith("[FALTA]"))).toBe(false);
	});

	it("faltou um cabeçalho: diz qual", async () => {
		rotas = demoNoAr();
		const { "X-Frame-Options": _, ...sem } = PROTECOES;
		rotas["/"] = { status: 200, cabecalhos: sem };
		const r = await rodar(ENDERECO);
		expect(r.ok).toBe(false);
		expect(r.linhas.join("\n")).toContain("faltou X-Frame-Options");
		expect(r.ultima).not.toBe("No ar, com cadeado.");
	});

	it("demo recusou o endereço (403): fala do HOSTS_PERMITIDOS", async () => {
		rotas = demoNoAr();
		rotas["/"] = { status: 403, cabecalhos: { ...PROTECOES } };
		const r = await rodar(ENDERECO);
		expect(r.ok).toBe(false);
		expect(r.linhas.join("\n")).toContain("HOSTS_PERMITIDOS");
	});

	it("sem /api/health: reprova", async () => {
		rotas = demoNoAr();
		delete rotas["/api/health"];
		const r = await rodar(ENDERECO);
		expect(r.ok).toBe(false);
		expect(r.linhas.join("\n")).toContain("[FALTA] Saúde (/api/health)");
	});

	it("/api/conferir aberto (modo de desenvolvimento): reprova", async () => {
		rotas = demoNoAr();
		rotas["/api/conferir"] = { status: 200, corpo: "{}" };
		const r = await rodar(ENDERECO);
		expect(r.ok).toBe(false);
		expect(r.linhas.join("\n")).toContain("esperava 404");
	});

	it("endereço com http:// reprova sem nem pedir", async () => {
		let pediu = false;
		const r = await rodar("http://meu-sistema.exemplo.com.br", async () => {
			pediu = true;
			throw new Error("não devia pedir");
		});
		expect(pediu).toBe(false);
		expect(r.ok).toBe(false);
		expect(r.linhas[0]).toContain("http://");
	});

	it.each([undefined, "", "meu-sistema", "ftp://x.exemplo.com.br"])(
		"%j não é endereço: mostra como usar",
		async (texto) => {
			const r = await rodar(texto);
			expect(r.ok).toBe(false);
			expect(r.linhas[0]).toContain("npm run no-ar -- https://");
		},
	);

	it("certificado inválido: fala do cadeado", async () => {
		const r = await rodar(ENDERECO, async () => {
			throw new TypeError("fetch failed", {
				cause: Object.assign(new Error("x"), { code: "CERT_HAS_EXPIRED" }),
			});
		});
		expect(r.ok).toBe(false);
		expect(r.linhas[1]).toMatch(/^\[FALTA\] Cadeado \(HTTPS\):/);
	});

	it("endereço que não existe: fala do DNS", async () => {
		const r = await rodar(ENDERECO, async () => {
			throw new TypeError("fetch failed", {
				cause: Object.assign(new Error("x"), { code: "ENOTFOUND" }),
			});
		});
		expect(r.ok).toBe(false);
		expect(r.linhas.join("\n")).toContain("DNS");
	});

	it("redirecionou para http: reprova o cadeado", async () => {
		const r = await rodar(ENDERECO, async () => {
			const resposta = new Response("", {
				status: 200,
				headers: PROTECOES,
			});
			Object.defineProperty(resposta, "redirected", { value: true });
			Object.defineProperty(resposta, "url", {
				value: "http://meu-sistema.exemplo.com.br/",
			});
			return resposta;
		});
		expect(r.ok).toBe(false);
		expect(r.linhas.join("\n")).toContain("sem cadeado (http://)");
	});
});

describe("cabecalhosFaltando", () => {
	it("aceita objeto ou Headers, sem ligar para maiúsculas", () => {
		expect(cabecalhosFaltando(PROTECOES)).toEqual([]);
		expect(cabecalhosFaltando(new Headers(PROTECOES))).toEqual([]);
		expect(
			cabecalhosFaltando({
				"x-content-type-options": "sniff",
				"x-frame-options": "ALLOW",
			}),
		).toEqual([
			"Content-Security-Policy",
			"X-Content-Type-Options",
			"Referrer-Policy",
			"X-Frame-Options",
		]);
	});
});

describe("npm run no-ar (o script)", () => {
	const script = fileURLToPath(new URL("./no-ar.mjs", import.meta.url));

	it("sem endereço: sai com 1 e mostra como usar", () => {
		const r = spawnSync(process.execPath, [script], { encoding: "utf8" });
		expect(r.status).toBe(1);
		expect(r.stdout).toContain("npm run no-ar -- https://");
	});

	it("com http://: sai com 1", () => {
		const r = spawnSync(
			process.execPath,
			[script, "--", "http://meu-sistema.exemplo.com.br"],
			{ encoding: "utf8" },
		);
		expect(r.status).toBe(1);
		expect(r.stdout).toContain("sem cadeado");
	});
});
