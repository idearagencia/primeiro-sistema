// Liga o servidor de desenvolvimento só no seu computador (127.0.0.1).
// Roda o Next direto com o Node, sem shell: funciona igual no Windows e no Mac.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { portaOcupada } from "./lib.mjs";

const next = fileURLToPath(
	new URL("../node_modules/next/dist/bin/next", import.meta.url),
);
const porta = process.env.PORT || "3000";

// Porta ocupada: avisa em português em vez de deixar aparecer o erro cru do Next.
if (await portaOcupada(Number(porta))) {
	console.log(
		`A porta ${porta} já está em uso por outro programa. Feche o outro programa ou escolha outra porta:`,
	);
	console.log("  Windows (PowerShell):  $env:PORT=3001; npm run dev");
	console.log("  Mac ou Linux:          PORT=3001 npm run dev");
	console.log("Depois rode o conferir com a mesma porta:");
	console.log("  Windows (PowerShell):  $env:PORT=3001; npm run conferir");
	console.log("  Mac ou Linux:          PORT=3001 npm run conferir");
	process.exit(1);
}

const filho = spawn(
	process.execPath,
	[next, "dev", "-H", "127.0.0.1", "-p", porta],
	{
		stdio: "inherit",
		env: { ...process.env, PRIMEIRO_SISTEMA_LOCAL: "1" },
	},
);

// Ctrl+C no terminal: repassa para o Next e deixa ele fechar sozinho.
for (const sinal of ["SIGINT", "SIGTERM"]) {
	process.on(sinal, () => filho.kill(sinal));
}

filho.on("exit", (codigo, sinal) => {
	process.exit(codigo ?? (sinal ? 1 : 0));
});
