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
