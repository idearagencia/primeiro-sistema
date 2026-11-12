// Funções usadas pelos scripts (npm run comecar/conferir) e pelo verificador.
// JavaScript puro: os scripts rodam direto no Node, sem compilar.
import net from "node:net";

const REPO_DA_DEMO =
	/^(?:https?:\/\/(?:www\.)?github\.com\/|ssh:\/\/git@github\.com\/|git@github\.com:)idearagencia\/primeiro-sistema(?:\.git)?\/?$/i;

/**
 * A pasta ainda aponta para o repositório da demo no GitHub (https ou ssh, com ou sem .git)?
 * @param {unknown} url resposta de `git remote get-url origin`
 * @returns {boolean}
 */
export function ehRepoDaDemo(url) {
	return typeof url === "string" && REPO_DA_DEMO.test(url.trim());
}

const MARCA = {
	ok: "[OK]",
	falta: "[FALTA]",
	"nao-conferi": "[?]",
	aviso: "[!]",
};

/**
 * Uma linha do terminal para um item do verificador (o mesmo que a tela mostra).
 * [OK] sem "Como resolver"; [FALTA], [?] (não consegui conferir) e [!] (atenção) com o link.
 * @param {{ estado: string, titulo: string, detalhe: string, ajuda: string }} item
 * @returns {string}
 */
export function linhaDoItem(item) {
	const marca = MARCA[item.estado] ?? "[?]";
	const detalhe = String(item.detalhe ?? "")
		.trim()
		.replace(/\.$/, "");
	if (item.estado === "ok") {
		const curto = detalhe.replace(/^Versão\s+/, "");
		if (curto === "") return `${marca} ${item.titulo}`;
		// Versão vai logo depois do nome ("[OK] Git 2.47.1"); frase vai depois de dois-pontos.
		return /^\d/.test(curto)
			? `${marca} ${item.titulo} ${curto}`
			: `${marca} ${item.titulo}: ${curto}`;
	}
	return `${marca} ${item.titulo}: ${detalhe}. Como resolver: ${item.ajuda}`;
}

const ehTexto = (v) => typeof v === "string";

/**
 * A resposta tem a cara do que a rota /api/conferir da demo devolve?
 * (Outro programa pode estar usando a mesma porta.)
 * @param {unknown} c
 * @returns {boolean}
 */
export function ehConferencia(c) {
	if (c === null || typeof c !== "object") return false;
	const { itens, frase, pronto } = /** @type {Record<string, any>} */ (c);
	return (
		Array.isArray(itens) &&
		itens.every(
			(i) =>
				i !== null &&
				typeof i === "object" &&
				ehTexto(i.estado) &&
				ehTexto(i.titulo) &&
				ehTexto(i.grupo),
		) &&
		frase !== null &&
		typeof frase === "object" &&
		ehTexto(frase.titulo) &&
		ehTexto(frase.texto) &&
		typeof pronto === "boolean"
	);
}

// Tenta ocupar a porta num endereço: true se já tem outro programa nela.
// Endereço que o computador não tem (ex.: sem IPv6) não conta como ocupado.
function ocupadaEm(porta, host) {
	return new Promise((resolve) => {
		const servidor = net.createServer();
		servidor.once("error", (erro) => {
			resolve(
				/** @type {NodeJS.ErrnoException} */ (erro).code === "EADDRINUSE",
			);
		});
		servidor.listen({ port: porta, host, exclusive: true }, () => {
			servidor.close(() => resolve(false));
		});
	});
}

/**
 * Já existe outro programa usando esta porta neste computador (127.0.0.1 ou ::1)?
 * @param {number} porta
 * @returns {Promise<boolean>}
 */
export async function portaOcupada(porta) {
	for (const host of ["127.0.0.1", "::1"]) {
		if (await ocupadaEm(porta, host)) return true;
	}
	return false;
}

// As quatro proteções que toda resposta da demo leva (o next.config.ts aplica). O verificador
// da tela e o `npm run no-ar` conferem com as mesmas regras.
/** @type {{ nome: string, vale: (valor: string) => boolean }[]} */
export const CABECALHOS_EXIGIDOS = [
	{ nome: "Content-Security-Policy", vale: (v) => v.trim() !== "" },
	{ nome: "X-Content-Type-Options", vale: (v) => /^nosniff$/i.test(v.trim()) },
	{ nome: "Referrer-Policy", vale: (v) => v.trim() !== "" },
	{
		nome: "X-Frame-Options",
		vale: (v) => /^(deny|sameorigin)$/i.test(v.trim()),
	},
];

/**
 * Quais das quatro proteções não chegaram (ou chegaram com valor errado)?
 * @param {Record<string, string> | Headers} cabecalhos
 * @returns {string[]} os nomes que faltam, na ordem de CABECALHOS_EXIGIDOS
 */
export function cabecalhosFaltando(cabecalhos) {
	/** @type {Map<string, string>} */
	const recebidos = new Map();
	if (typeof Headers !== "undefined" && cabecalhos instanceof Headers) {
		cabecalhos.forEach((valor, nome) => {
			recebidos.set(nome.toLowerCase(), valor);
		});
	} else {
		for (const [nome, valor] of Object.entries(cabecalhos)) {
			recebidos.set(nome.toLowerCase(), String(valor));
		}
	}
	return CABECALHOS_EXIGIDOS.filter((c) => {
		const valor = recebidos.get(c.nome.toLowerCase());
		return valor === undefined || !c.vale(valor);
	}).map((c) => c.nome);
}

const ERRO_DE_CERTIFICADO = /CERT|TLS|SSL/i;
const AINDA_NAO = "\nAinda não está no ar com cadeado.";

/**
 * Por que o pedido falhou, em português (o fetch do Node põe o motivo em `cause.code`).
 * @param {unknown} erro
 * @returns {{ cadeado: boolean, texto: string }} cadeado = o problema é o certificado
 */
function explicarErro(erro) {
	const e = /** @type {any} */ (erro);
	const codigo = String(e?.cause?.code ?? e?.code ?? "");
	const nome = String(e?.name ?? "");
	if (ERRO_DE_CERTIFICADO.test(codigo)) {
		return {
			cadeado: true,
			texto: `o certificado do cadeado não é válido (${codigo}). Espere uns minutos e rode de novo; se continuar, confira o domínio na plataforma`,
		};
	}
	if (codigo === "ENOTFOUND" || codigo === "EAI_AGAIN") {
		return {
			cadeado: false,
			texto:
				"não encontrei esse endereço. Confira se digitou certo; com domínio novo, o DNS pode levar algumas horas",
		};
	}
	if (nome === "TimeoutError" || nome === "AbortError") {
		return {
			cadeado: false,
			texto: "o endereço demorou demais para responder",
		};
	}
	return {
		cadeado: false,
		texto: `não consegui falar com o endereço${codigo ? ` (${codigo})` : ""}`,
	};
}

/**
 * npm run no-ar: confere de fora se a demo está na internet, com cadeado e protegida.
 * Escreve uma linha por item ([OK]/[FALTA]) e, se tudo passou, "No ar, com cadeado.".
 * @param {string | undefined} texto o endereço digitado (https://...)
 * @param {{ buscar?: typeof fetch, escrever?: (linha: string) => void, prazoMs?: number }} [opcoes]
 * @returns {Promise<boolean>} true = tudo certo
 */
export async function conferirNoAr(texto, opcoes = {}) {
	const buscar = opcoes.buscar ?? fetch;
	const escrever = opcoes.escrever ?? console.log;
	const prazoMs = opcoes.prazoMs ?? 15_000;

	/** @type {URL | null} */
	let url = null;
	try {
		url = new URL(String(texto ?? "").trim());
	} catch {}
	if (url === null || !["http:", "https:"].includes(url.protocol)) {
		escrever(
			`[FALTA] Endereço: "${texto ?? ""}" não parece um endereço. Use assim: npm run no-ar -- https://seu-projeto.vercel.app`,
		);
		escrever(AINDA_NAO);
		return false;
	}
	if (url.protocol !== "https:") {
		escrever(
			"[FALTA] Cadeado (HTTPS): o endereço começa com http://, sem cadeado. Rode de novo com https://",
		);
		escrever(AINDA_NAO);
		return false;
	}

	const base = url.origin;
	escrever(`Conferindo ${base}\n`);
	let tudoCerto = true;
	/** @param {string} linha */
	const ok = (linha) => escrever(`[OK] ${linha}`);
	/** @param {string} linha */
	const falta = (linha) => {
		tudoCerto = false;
		escrever(`[FALTA] ${linha}`);
	};
	/** @param {string} caminho */
	const pedir = (caminho) =>
		buscar(`${base}${caminho}`, {
			cache: "no-store",
			redirect: "follow",
			signal: AbortSignal.timeout(prazoMs),
		});

	// 1. A página abre, com cadeado válido.
	let pagina;
	try {
		pagina = await pedir("/");
		await pagina.arrayBuffer();
	} catch (erro) {
		const { cadeado, texto: motivo } = explicarErro(erro);
		escrever(`[FALTA] ${cadeado ? "Cadeado (HTTPS)" : "Página"}: ${motivo}.`);
		escrever(AINDA_NAO);
		return false;
	}
	if (pagina.redirected && new URL(pagina.url).protocol !== "https:") {
		falta(
			"Cadeado (HTTPS): o endereço mandou para uma página sem cadeado (http://).",
		);
	} else {
		ok("Cadeado (HTTPS): certificado válido.");
	}
	if (pagina.status === 200) {
		ok("Página: abre normalmente.");
	} else if (pagina.status === 403) {
		falta(
			"Página: a demo recusou este endereço (403). Confira se o domínio cadastrado na plataforma é este; se for outro, ponha este em HOSTS_PERMITIDOS.",
		);
	} else {
		falta(`Página: respondeu com erro (${pagina.status}).`);
	}

	// 2. As quatro proteções.
	const faltando = cabecalhosFaltando(pagina.headers);
	if (faltando.length === 0) {
		ok("Cabeçalhos de proteção: chegaram os quatro.");
	} else {
		falta(`Cabeçalhos de proteção: faltou ${faltando.join(", ")}.`);
	}

	// 3. A rota de saúde.
	try {
		const saude = await pedir("/api/health");
		/** @type {any} */
		let corpo = null;
		try {
			corpo = await saude.json();
		} catch {}
		if (saude.status === 200 && corpo?.ok === true) {
			ok("Saúde (/api/health): o sistema diz que está de pé.");
		} else {
			falta(`Saúde (/api/health): respondeu ${saude.status}, esperava 200.`);
		}
	} catch (erro) {
		falta(`Saúde (/api/health): ${explicarErro(erro).texto}.`);
	}

	// 4. A conferência do computador não existe na internet.
	try {
		const conferir = await pedir("/api/conferir");
		await conferir.arrayBuffer().catch(() => {});
		if (conferir.status === 404) {
			ok("Conferência do computador: fechada na internet, como deve.");
		} else {
			falta(
				`Conferência do computador: /api/conferir respondeu ${conferir.status}, esperava 404. O servidor está em modo de desenvolvimento?`,
			);
		}
	} catch (erro) {
		falta(`Conferência do computador: ${explicarErro(erro).texto}.`);
	}

	escrever(
		tudoCerto
			? "\nNo ar, com cadeado."
			: `${AINDA_NAO} Resolva os itens [FALTA] acima e rode de novo.`,
	);
	return tudoCerto;
}
