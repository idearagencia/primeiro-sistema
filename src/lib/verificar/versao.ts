// Tira só o número da versão (x.y.z) da resposta de um comando. Nada mais da resposta é usado.
export function extrairVersao(saida: string): string | null {
	const m = /(\d+)\.(\d+)\.(\d+)/.exec(saida);
	return m ? `${m[1]}.${m[2]}.${m[3]}` : null;
}

export function versaoAtende(versao: string, minimoMajor: number): boolean {
	const m = /^v?(\d+)\./.exec(versao.trim());
	return m !== null && Number(m[1]) >= minimoMajor;
}
