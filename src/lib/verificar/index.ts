import { ehRepoDaDemo } from "../../../scripts/lib.mjs";
import { hostLocal } from "./cabecalhos";
import {
	listaReconhecida,
	PLUGINS_OBRIGATORIOS,
	pluginsInstalados,
} from "./plugins";
import type { Resposta, Rodar } from "./rodar";
import type { Estado, Frase, Item, Resultado } from "./tipos";
import { extrairVersao, versaoAtende } from "./versao";

export type Deps = {
	rodar: Rodar;
	node: string; // process.versions.node
	gitignore: string | null; // conteúdo do .gitignore da pasta; null = não existe
	host: string | null; // cabeçalho Host do pedido
	local: boolean; // o servidor foi ligado pelo `npm run dev` da demo
	producao: boolean;
	https?: boolean; // o pedido chegou por https (só conta em produção)
	// Da resposta da própria demo; null = não deu para ler. Pode chegar como promessa: a leitura
	// corre junto com os comandos, dentro do mesmo prazo.
	cabecalhos:
		| Record<string, string>
		| null
		| Promise<Record<string, string> | null>;
	prazoMs?: number; // prazo total da conferência (padrão PRAZO_MS); os testes usam menos
};

// A conferência inteira termina dentro deste prazo. O que não respondeu a tempo vira
// NÃO CONSEGUI CONFERIR ("demorou demais").
export const PRAZO_MS = 8000;
const LIMITE_POR_COMANDO_MS = 5000;
// Abaixo disso nem começa um comando: abrir o do Claude já trava o Node por segundos.
const MINIMO_PARA_COMECAR_MS = 500;

const GUIAS = "https://ia.diegohacks.com.br/guias";
const AJUDA = {
	notebook: `${GUIAS}/preparar-o-computador/preparar-o-notebook`,
	claude: `${GUIAS}/preparar-o-computador/instalar-o-claude-code`,
	editor: `${GUIAS}/preparar-o-computador/instalar-um-editor`,
	skills: `${GUIAS}/preparar-o-computador/instalar-as-skills`,
	seguranca: `${GUIAS}/rodar-local/conferir-o-computador`,
};

const NODE_MINIMO = 22;

const DEMOROU = "O comando demorou demais para responder.";
const ESTRANHO = "Respondeu de um jeito que eu não esperava.";
const SEM_GIT = "Precisa do Git funcionando primeiro.";

type Base = Pick<Item, "id" | "grupo" | "titulo" | "conta" | "ajuda">;
const item = (base: Base, estado: Estado, detalhe: string): Item => ({
	...base,
	estado,
	detalhe,
});

// Resposta com um campo a mais: `estranho` = o rodar lançou (não deveria).
type Lida = Resposta & { estranho?: boolean };
const ESGOTOU: Lida = { ok: false, saida: "", demorou: true };

// Relógio único da conferência: cada espera disputa com ele.
function criarPrazo(ms: number) {
	const fim = Date.now() + ms;
	let relogio: ReturnType<typeof setTimeout> | undefined;
	const esgotou = new Promise<typeof ESGOTOU>((resolve) => {
		relogio = setTimeout(() => resolve(ESGOTOU), ms);
	});
	return {
		resta: () => fim - Date.now(),
		disputa: <T>(p: Promise<T>) => Promise.race([p, esgotou]),
		parar: () => clearTimeout(relogio),
	};
}
type Prazo = ReturnType<typeof criarPrazo>;

// Nunca lança e nunca passa do prazo. Um rodar que lança vira "não consegui conferir".
async function seguro(
	rodar: Rodar,
	prazo: Prazo,
	cmd: Parameters<Rodar>[0],
	args: readonly string[],
): Promise<Lida> {
	const resta = prazo.resta();
	if (resta < MINIMO_PARA_COMECAR_MS) return ESGOTOU;
	const ms = Math.min(LIMITE_POR_COMANDO_MS, resta);
	try {
		const r = await prazo.disputa(Promise.resolve(rodar(cmd, args, ms)));
		return {
			ok: r.ok === true,
			saida: String(r.saida ?? ""),
			demorou: r.demorou,
		};
	} catch {
		return { ok: false, saida: "", estranho: true };
	}
}

// Item que não deu para conferir porque o comando demorou ou falhou de um jeito estranho.
function semConferir(base: Base, r: Lida): Item | null {
	if (r.demorou) return item(base, "nao-conferi", DEMOROU);
	if (r.estranho) return item(base, "nao-conferi", ESTRANHO);
	return null;
}

async function lerCabecalhos(
	cabecalhos: Deps["cabecalhos"],
	prazo: Prazo,
): Promise<Record<string, string> | null> {
	try {
		const r = await prazo.disputa(Promise.resolve(cabecalhos));
		return r === ESGOTOU ? null : (r as Record<string, string> | null);
	} catch {
		return null;
	}
}

// Ferramenta conferida por `<cmd> --version`: só a versão extraída vai para a tela.
function ferramenta(base: Base, r: Lida, naoAchei: string): Item {
	const problema = semConferir(base, r);
	if (problema) return problema;
	if (!r.ok) return item(base, "falta", naoAchei);
	const versao = extrairVersao(r.saida);
	return versao
		? item(base, "ok", `Versão ${versao}.`)
		: item(base, "nao-conferi", ESTRANHO);
}

// Simula o .gitignore para o arquivo ".env" na raiz: a última regra que casa decide.
function cobreEnv(gitignore: string): boolean {
	let ignorado = false;
	for (const linhaCrua of gitignore.split(/\r?\n/)) {
		let regra = linhaCrua.trim();
		if (regra === "" || regra.startsWith("#")) continue;
		const nega = regra.startsWith("!");
		if (nega) regra = regra.slice(1);
		if (regra.endsWith("/")) continue; // só vale para pasta; .env é arquivo
		if (regra.startsWith("/")) regra = regra.slice(1);
		const fonte = regra
			.split("")
			.map((c) =>
				c === "*"
					? "[^/]*"
					: c === "?"
						? "[^/]"
						: c.replace(/[.+^${}()|[\]\\]/g, "\\$&"),
			)
			.join("");
		if (new RegExp(`^${fonte}$`).test(".env")) ignorado = !nega;
	}
	return ignorado;
}

const CABECALHOS_EXIGIDOS: {
	nome: string;
	vale: (valor: string) => boolean;
}[] = [
	{ nome: "Content-Security-Policy", vale: (v) => v.trim() !== "" },
	{ nome: "X-Content-Type-Options", vale: (v) => /^nosniff$/i.test(v.trim()) },
	{ nome: "Referrer-Policy", vale: (v) => v.trim() !== "" },
	{
		nome: "X-Frame-Options",
		vale: (v) => /^(deny|sameorigin)$/i.test(v.trim()),
	},
];

function itemCabecalhos(cabecalhos: Record<string, string> | null): Item {
	const base: Base = {
		id: "cabecalhos",
		grupo: "seguranca",
		titulo: "Cabeçalhos de proteção",
		conta: true,
		ajuda: AJUDA.seguranca,
	};
	if (cabecalhos === null) {
		return item(base, "nao-conferi", "Não consegui ler a resposta da página.");
	}
	const recebidos = new Map(
		Object.entries(cabecalhos).map(([k, v]) => [k.toLowerCase(), String(v)]),
	);
	const faltando = CABECALHOS_EXIGIDOS.filter((c) => {
		const valor = recebidos.get(c.nome.toLowerCase());
		return valor === undefined || !c.vale(valor);
	}).map((c) => c.nome);
	return faltando.length === 0
		? item(base, "ok", "A página chega com as quatro proteções.")
		: item(base, "falta", `Faltou: ${faltando.join(", ")}.`);
}

export async function verificar(deps: Deps): Promise<Resultado> {
	const prazo = criarPrazo(deps.prazoMs ?? PRAZO_MS);
	try {
		return await conferir(deps, prazo);
	} finally {
		prazo.parar();
	}
}

async function conferir(deps: Deps, prazo: Prazo): Promise<Resultado> {
	// A leitura dos cabeçalhos corre junto com os comandos.
	const lendoCabecalhos = lerCabecalhos(deps.cabecalhos, prazo);

	// Em produção a demo não confere o computador: um servidor não sai contando o que tem.
	// "Pronto" em produção = chegou por https (cadeado) e nenhuma proteção faltando. Se não deu
	// para ler os cabeçalhos por dentro, quem confere é o `npm run no-ar`, de fora.
	if (deps.producao) {
		const cabecalhos = itemCabecalhos(await lendoCabecalhos);
		const cadeado = deps.https === true;
		return {
			itens: [cabecalhos],
			pronto: cadeado && cabecalhos.estado !== "falta",
			producao: true,
			cadeado,
		};
	}

	// Os rápidos juntos; os dois do Claude depois, um de cada vez. No Windows, abrir o
	// executável do Claude Code trava o Node por segundos, e com tudo junto os outros
	// comandos pareceriam demorados sem estar.
	const [git, nome, origin, code] = await Promise.all([
		seguro(deps.rodar, prazo, "git", ["--version"]),
		seguro(deps.rodar, prazo, "git", ["config", "user.name"]),
		seguro(deps.rodar, prazo, "git", ["remote", "get-url", "origin"]),
		seguro(deps.rodar, prazo, "code", ["--version"]),
	]);
	const claude = await seguro(deps.rodar, prazo, "claude", ["--version"]);
	// Sem Claude Code não há lista de plugins para pedir.
	const plugins: Lida = claude.ok
		? await seguro(deps.rodar, prazo, "claude", ["plugin", "list"])
		: { ok: false, saida: "" };
	const cabecalhos = itemCabecalhos(await lendoCabecalhos);

	const itens: Item[] = [];

	// Ferramentas
	const baseNode: Base = {
		id: "node",
		grupo: "ferramentas",
		titulo: "Node.js",
		conta: true,
		ajuda: AJUDA.notebook,
	};
	const versaoNode = extrairVersao(deps.node);
	itens.push(
		versaoNode === null
			? item(baseNode, "nao-conferi", ESTRANHO)
			: versaoAtende(versaoNode, NODE_MINIMO)
				? item(baseNode, "ok", `Versão ${versaoNode}.`)
				: item(
						baseNode,
						"falta",
						`Versão ${versaoNode}. Precisa da ${NODE_MINIMO} ou mais nova.`,
					),
	);

	const itemGit = ferramenta(
		{
			id: "git",
			grupo: "ferramentas",
			titulo: "Git",
			conta: true,
			ajuda: AJUDA.notebook,
		},
		git,
		"Não encontrei o Git neste computador.",
	);
	itens.push(itemGit);
	const gitOk = itemGit.estado === "ok";

	const baseIdentidade: Base = {
		id: "git-identidade",
		grupo: "ferramentas",
		titulo: "Git sabe quem é você",
		conta: false,
		ajuda: AJUDA.notebook,
	};
	// O nome nunca vai para a tela: só se ele existe.
	itens.push(
		!gitOk
			? item(baseIdentidade, "nao-conferi", SEM_GIT)
			: (semConferir(baseIdentidade, nome) ??
					(nome.ok && nome.saida.trim() !== ""
						? item(baseIdentidade, "ok", "O Git já sabe o seu nome.")
						: item(
								baseIdentidade,
								"aviso",
								"O Git ainda não sabe o seu nome. Ele vai pedir na hora do primeiro commit.",
							))),
	);

	const itemClaude = ferramenta(
		{
			id: "claude",
			grupo: "ferramentas",
			titulo: "Claude Code",
			conta: true,
			ajuda: AJUDA.claude,
		},
		claude,
		"Não encontrei o Claude Code neste computador. Instale pelo comando oficial, como mostra o guia (o instalado pelo npm não serve aqui).",
	);
	itens.push(itemClaude);

	itens.push(
		ferramenta(
			{
				id: "editor",
				grupo: "ferramentas",
				titulo: "Editor (VS Code)",
				conta: false,
				ajuda: AJUDA.editor,
			},
			code,
			"Não encontrei o VS Code. Ele é opcional.",
		),
	);

	// Skills
	let estadoLista: { estado: Estado; detalhe: string } | null = null;
	if (itemClaude.estado === "falta") {
		estadoLista = {
			estado: "falta",
			detalhe: "Precisa do Claude Code primeiro.",
		};
	} else if (itemClaude.estado !== "ok" || plugins.demorou) {
		estadoLista = {
			estado: "nao-conferi",
			detalhe: plugins.demorou
				? DEMOROU
				: "Precisa do Claude Code funcionando primeiro.",
		};
	} else if (!plugins.ok || !listaReconhecida(plugins.saida)) {
		estadoLista = {
			estado: "nao-conferi",
			detalhe: "Não consegui ler a lista de plugins.",
		};
	}
	const instalados = new Set(
		estadoLista ? [] : pluginsInstalados(plugins.saida),
	);
	for (const plugin of PLUGINS_OBRIGATORIOS) {
		const base: Base = {
			id: `skill-${plugin}`,
			grupo: "skills",
			titulo: plugin,
			conta: true,
			ajuda: AJUDA.skills,
		};
		itens.push(
			estadoLista
				? item(base, estadoLista.estado, estadoLista.detalhe)
				: instalados.has(plugin)
					? item(base, "ok", "Instalada.")
					: item(base, "falta", "Não está instalada."),
		);
	}

	// Segurança
	itens.push(cabecalhos);

	const baseLocal: Base = {
		id: "so-local",
		grupo: "seguranca",
		titulo: "Só o seu computador enxerga",
		conta: true,
		ajuda: AJUDA.seguranca,
	};
	itens.push(
		!deps.local
			? item(
					baseLocal,
					"falta",
					"O servidor não foi ligado pelo npm run dev desta pasta.",
				)
			: !hostLocal(deps.host)
				? item(baseLocal, "falta", "O pedido não veio deste computador.")
				: item(baseLocal, "ok", "O servidor só responde no seu computador."),
	);

	const baseSegredos: Base = {
		id: "segredos",
		grupo: "seguranca",
		titulo: "Segredos fora do Git",
		conta: true,
		ajuda: AJUDA.seguranca,
	};
	itens.push(
		deps.gitignore === null
			? item(
					baseSegredos,
					"falta",
					"Não achei o arquivo .gitignore nesta pasta.",
				)
			: cobreEnv(deps.gitignore)
				? item(baseSegredos, "ok", "O .gitignore deixa o .env fora do Git.")
				: item(baseSegredos, "falta", "O .gitignore não cobre o .env."),
	);

	const basePasta: Base = {
		id: "pasta-sua",
		grupo: "seguranca",
		titulo: "Pasta é sua",
		conta: false,
		ajuda: AJUDA.seguranca,
	};
	// Sem origin o git sai com erro: é o caso normal depois do `npm run comecar`.
	itens.push(
		!gitOk
			? item(basePasta, "nao-conferi", SEM_GIT)
			: (semConferir(basePasta, origin) ??
					(origin.ok && ehRepoDaDemo(origin.saida)
						? item(
								basePasta,
								"aviso",
								"Ainda aponta para o repositório do DiegoHacks. Rode npm run comecar.",
							)
						: item(basePasta, "ok", "A pasta é só sua."))),
	);

	return {
		itens,
		pronto: itens.filter((i) => i.conta).every((i) => i.estado === "ok"),
		producao: false,
	};
}

export function frase(r: Resultado): Frase {
	// Mesma regra do "pronto": só contam os itens com conta: true.
	const faltam = r.itens.filter((i) => i.conta && i.estado !== "ok").length;
	if (faltam === 0) {
		return {
			pose: "comemorando",
			titulo: "Seu computador está pronto!",
			texto:
				"Você instalou as ferramentas e rodou um sistema usando o guia do DiegoHacks. Pode começar a criar.",
		};
	}
	return {
		pose: "pensando",
		titulo: "Quase lá.",
		texto:
			faltam === 1
				? "Falta 1 item. Clique nele para ver como resolver."
				: `Faltam ${faltam} itens. Clique em cada um para ver como resolver.`,
	};
}

export type {
	Conferencia,
	Estado,
	Frase,
	Grupo,
	Item,
	Resultado,
} from "./tipos";
