import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { hostPermitido } from "./cabecalhos";
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

// Pede um arquivo pequeno à própria demo e lê os cabeçalhos que chegaram de verdade.
// (Pedir "/" chamaria esta conferência de novo, sem fim.)
async function lerCabecalhos(
	host: string | null,
): Promise<Record<string, string> | null> {
	if (host === null || !hostPermitido(host)) return null;
	const porta = host.split(":")[1] ?? "80";
	try {
		const r = await fetch(`http://127.0.0.1:${porta}/icon.svg`, {
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

// As dependências de verdade, usadas pela página e pela rota /api/conferir.
// Os cabeçalhos vão como promessa: o verificar lê junto com os comandos, dentro do prazo.
export async function depsReais(host: string | null): Promise<Deps> {
	return {
		rodar: rodarComCache,
		node: process.versions.node,
		gitignore: await lerGitignore(),
		host,
		local: process.env.PRIMEIRO_SISTEMA_LOCAL === "1",
		producao: process.env.NODE_ENV === "production",
		cabecalhos: lerCabecalhos(host),
	};
}
