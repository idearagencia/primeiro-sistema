import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { hostPermitido } from "./cabecalhos";
import type { Deps } from "./index";
import { type Resposta, type Rodar, rodar } from "./rodar";

const DEZ_SEGUNDOS = 10_000;

// `claude plugin list` é o comando mais lento: guarda a última resposta boa por 10 s para a
// página não demorar a cada recarga. Os outros comandos rodam sempre.
export function comCacheDosPlugins(
	rodarDeVerdade: Rodar,
	agora: () => number = Date.now,
): Rodar {
	let guardada: { em: number; resposta: Resposta } | null = null;
	return async (cmd, args, ms) => {
		const ehLista =
			cmd === "claude" &&
			args.length === 2 &&
			args[0] === "plugin" &&
			args[1] === "list";
		if (!ehLista) return rodarDeVerdade(cmd, args, ms);
		if (guardada && agora() - guardada.em < DEZ_SEGUNDOS) {
			return guardada.resposta;
		}
		const resposta = await rodarDeVerdade(cmd, args, ms);
		if (resposta.ok) guardada = { em: agora(), resposta };
		return resposta;
	};
}

const rodarComCache = comCacheDosPlugins(rodar);

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
export async function depsReais(host: string | null): Promise<Deps> {
	const [gitignore, cabecalhos] = await Promise.all([
		lerGitignore(),
		lerCabecalhos(host),
	]);
	return {
		rodar: rodarComCache,
		node: process.versions.node,
		gitignore,
		host,
		local: process.env.PRIMEIRO_SISTEMA_LOCAL === "1",
		producao: process.env.NODE_ENV === "production",
		cabecalhos,
	};
}
