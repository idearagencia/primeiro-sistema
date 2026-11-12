import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { hostLocal, hostPermitido } from "./cabecalhos";
import type { Deps } from "./index";
import { type Resposta, type Rodar, rodar } from "./rodar";

const DEZ_SEGUNDOS = 10_000;
const GUARDADOS = new Set(["claude --version", "claude plugin list"]);

// Os dois comandos do Claude são os lentos (só abrir o executável já leva segundos no
// Windows): guarda a última resposta boa de cada um por 10 s para a página não demorar a cada
// recarga. Dois pedidos ao mesmo tempo esperam o mesmo processo, em vez de abrir dois.
// Os outros comandos rodam sempre.
export function comCacheDoClaude(
	rodarDeVerdade: Rodar,
	agora: () => number = Date.now,
): Rodar {
	const guardadas = new Map<string, { em: number; resposta: Resposta }>();
	const emAndamento = new Map<string, Promise<Resposta>>();
	return (cmd, args, ms) => {
		const chave = [cmd, ...args].join(" ");
		if (!GUARDADOS.has(chave)) return rodarDeVerdade(cmd, args, ms);
		const guardada = guardadas.get(chave);
		if (guardada && agora() - guardada.em < DEZ_SEGUNDOS) {
			return Promise.resolve(guardada.resposta);
		}
		const andando = emAndamento.get(chave);
		if (andando) return andando;
		const pedido = (async () => {
			try {
				const resposta = await rodarDeVerdade(cmd, args, ms);
				if (resposta.ok) guardadas.set(chave, { em: agora(), resposta });
				return resposta;
			} finally {
				emAndamento.delete(chave);
			}
		})();
		emAndamento.set(chave, pedido);
		return pedido;
	};
}

const rodarComCache = comCacheDoClaude(rodar);

async function lerGitignore(): Promise<string | null> {
	try {
		return await readFile(join(process.cwd(), ".gitignore"), "utf8");
	} catch {
		return null;
	}
}

// Onde pedir o arquivo pequeno à própria demo.
// - No computador: na mesma porta do endereço aberto.
// - Na Vercel: pelo próprio endereço com https (lá não existe "127.0.0.1" do sistema).
// - Num servidor (Docker/Coolify): por dentro, na porta em que o next start escuta (PORT).
// O host já passou pela lista, então nunca é um endereço qualquer.
export function enderecoDoIcone(
	host: string | null,
	env: Record<string, string | undefined> = process.env,
): string | null {
	if (host === null || !hostPermitido(host, env)) return null;
	if (hostLocal(host)) {
		return `http://127.0.0.1:${host.split(":")[1] ?? "80"}/icon.svg`;
	}
	if (env.VERCEL === "1") return `https://${host}/icon.svg`;
	return `http://127.0.0.1:${env.PORT || "3000"}/icon.svg`;
}

// Pede um arquivo pequeno à própria demo e lê os cabeçalhos que chegaram de verdade.
// (Pedir "/" chamaria esta conferência de novo, sem fim.)
async function lerCabecalhos(
	host: string | null,
): Promise<Record<string, string> | null> {
	const endereco = enderecoDoIcone(host);
	if (endereco === null) return null;
	try {
		const r = await fetch(endereco, {
			method: "HEAD",
			cache: "no-store",
			signal: AbortSignal.timeout(5000),
		});
		const cabecalhos: Record<string, string> = {};
		r.headers.forEach((valor, nome) => {
			cabecalhos[nome] = valor;
		});
		return cabecalhos;
	} catch {
		return null;
	}
}

// Na internet o cadeado (https) fica na plataforma (Vercel ou o proxy do Coolify), que avisa o
// sistema pelo cabeçalho X-Forwarded-Proto. Só serve para escolher a tela: quem confere o
// cadeado de verdade, de fora, é o `npm run no-ar`.
export function chegouPorHttps(proto: string | null): boolean {
	return proto?.split(",")[0].trim().toLowerCase() === "https";
}

// As dependências de verdade, usadas pela página e pela rota /api/conferir.
// Os cabeçalhos vão como promessa: o verificar lê junto com os comandos, dentro do prazo.
export async function depsReais(
	host: string | null,
	https = false,
): Promise<Deps> {
	return {
		https,
		rodar: rodarComCache,
		node: process.versions.node,
		gitignore: await lerGitignore(),
		host,
		local: process.env.PRIMEIRO_SISTEMA_LOCAL === "1",
		producao: process.env.NODE_ENV === "production",
		cabecalhos: lerCabecalhos(host),
	};
}
