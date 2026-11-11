// Funções usadas pelos scripts (npm run comecar/conferir) e pelo verificador.
// JavaScript puro: os scripts rodam direto no Node, sem compilar.

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
		// Versão vai logo depois do nome ("[OK] Git 2.47.1"); frase vai depois de dois-pontos.
		return /^\d/.test(curto)
			? `${marca} ${item.titulo} ${curto}`
			: `${marca} ${item.titulo}: ${curto}`;
	}
	return `${marca} ${item.titulo}: ${detalhe}. Como resolver: ${item.ajuda}`;
}
