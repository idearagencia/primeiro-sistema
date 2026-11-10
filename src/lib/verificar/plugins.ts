export const PLUGINS_OBRIGATORIOS = [
	"superpowers",
	"frontend-design",
	"code-review",
	"security-guidance",
	"skill-creator",
] as const;

const NOME = /(?:^|\s)([a-z0-9][a-z0-9-]*)@claude-plugins-official\b/gim;

// Lê a saída de `claude plugin list` e devolve os nomes da loja oficial que estão ligados.
// Cada plugin é um bloco que começa em "<nome>@claude-plugins-official"; um bloco com
// "Status: ... disabled" não conta (instalado mas desligado não funciona).
export function pluginsInstalados(saida: string): string[] {
	const achados = [...saida.matchAll(NOME)];
	const nomes = new Set<string>();
	achados.forEach((m, i) => {
		const bloco = saida.slice(m.index, achados[i + 1]?.index ?? saida.length);
		if (!/Status:[^\n]*disabled/i.test(bloco)) nomes.add(m[1].toLowerCase());
	});
	return [...nomes];
}

// A resposta tem a cara de uma lista de plugins (com plugins ou vazia)?
// Se não tiver, o verificador diz que não conseguiu conferir em vez de dizer que falta.
export function listaReconhecida(saida: string): boolean {
	return /Installed plugins:|No plugins installed/i.test(saida);
}
