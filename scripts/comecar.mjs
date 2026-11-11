// npm run comecar: prepara a pasta para ser sua. Pode rodar quantas vezes quiser.
// Só chama o git com argumentos fixos e sem shell.
import { execFileSync } from "node:child_process";
import { ehRepoDaDemo } from "./lib.mjs";

const NODE_MINIMO = 22;
// Etapa 03 do guia 1: instala o Node.js e o Git e ensina o Git a saber quem é você.
const ETAPA_03 =
	"https://ia.diegohacks.com.br/guias/preparar-o-computador/preparar-o-notebook";

// Devolve a resposta do git, ou null se ele falhou (ou não existe).
function git(args) {
	try {
		return execFileSync("git", args, {
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"],
			windowsHide: true,
			timeout: 10_000,
		}).trim();
	} catch {
		return null;
	}
}

const versaoNode = Number(process.versions.node.split(".")[0]);
if (!(versaoNode >= NODE_MINIMO)) {
	console.log(
		`Seu Node.js é a versão ${process.versions.node}. Este projeto precisa da ${NODE_MINIMO} ou mais nova.`,
	);
	console.log(`Como instalar a versão certa: ${ETAPA_03}`);
	process.exit(1);
}

if (git(["--version"]) === null) {
	console.log("Não encontrei o Git neste computador.");
	console.log(`Como instalar: ${ETAPA_03}`);
	process.exit(1);
}

// A pasta veio do repositório do DiegoHacks: desliga, para ela ser só sua.
const origin = git(["remote", "get-url", "origin"]);
if (origin !== null && ehRepoDaDemo(origin)) {
	if (git(["remote", "remove", "origin"]) === null) {
		console.log(
			"Não consegui desligar a pasta do repositório do DiegoHacks. Rode de novo: npm run comecar",
		);
		process.exit(1);
	}
	console.log("Esta pasta agora é só sua.");
} else {
	console.log("Esta pasta já é só sua.");
}

// Clone por tag deixa o HEAD solto (sem branch): cria a main para guardar as mudanças.
if (git(["symbolic-ref", "-q", "HEAD"]) === null) {
	const atual = git(["rev-parse", "HEAD"]);
	const main = git(["rev-parse", "--verify", "-q", "refs/heads/main"]);
	if (main === null) {
		if (git(["switch", "-c", "main"]) === null) {
			console.log(
				"Aviso: não consegui criar a branch main. Rode: git switch -c main",
			);
		} else {
			console.log("Criei a branch main para guardar as suas mudanças.");
		}
	} else if (main === atual && git(["switch", "main"]) !== null) {
		console.log("Voltei para a branch main para guardar as suas mudanças.");
	} else {
		console.log(
			"Aviso: já existe uma branch main diferente do ponto onde você está. Não mexi nela.",
		);
	}
}

// O nome nunca é mostrado: só se ele existe. Não é erro, só um aviso.
const nome = git(["config", "user.name"]);
if (!nome) {
	console.log(
		"Aviso: o Git ainda não sabe o seu nome. Ele vai pedir na hora do primeiro commit.",
	);
	console.log(`Como resolver: ${ETAPA_03}`);
}

console.log("Tudo pronto. Agora rode: npm run dev");
