// npm run conferir: pergunta ao servidor ligado (npm run dev) e mostra no terminal o mesmo
// que a tela. Sai com 0 se está tudo pronto, 1 se falta algo e 2 se o servidor está desligado.
// Usa process.exitCode em vez de process.exit(): no Windows, sair à força logo depois de um
// fetch derruba o Node com um erro interno.
import { linhaDoItem } from "./lib.mjs";

const porta = process.env.PORT || "3000";
const endereco = `http://127.0.0.1:${porta}/api/conferir`;

const GRUPOS = {
	ferramentas: "Ferramentas",
	skills: "Skills",
	seguranca: "Segurança",
	performance: "Performance",
};

async function conferir() {
	let resposta;
	try {
		resposta = await fetch(endereco, {
			cache: "no-store",
			signal: AbortSignal.timeout(30_000),
		});
	} catch {
		console.log(
			"O servidor está desligado. Abra outra janela do terminal nesta pasta e rode: npm run dev",
		);
		return 2;
	}

	if (resposta.status === 404) {
		console.log(
			"O servidor ligado nesta porta não confere o computador (ele está no modo de produção).",
		);
		console.log("Pare ele com Ctrl+C e rode: npm run dev");
		return 2;
	}
	if (!resposta.ok) {
		console.log(
			`O servidor respondeu com erro (${resposta.status}). Veja a janela do npm run dev.`,
		);
		return 2;
	}

	const conferencia = await resposta.json();
	let grupoAtual = "";
	for (const item of conferencia.itens) {
		if (item.grupo !== grupoAtual) {
			grupoAtual = item.grupo;
			console.log(`\n${GRUPOS[grupoAtual] ?? grupoAtual}`);
		}
		console.log(`  ${linhaDoItem(item)}`);
	}
	console.log(
		"\nA velocidade da página só é medida no navegador: abra http://localhost:3000",
	);
	console.log(`\n${conferencia.frase.titulo} ${conferencia.frase.texto}`);
	return conferencia.pronto ? 0 : 1;
}

process.exitCode = await conferir();
