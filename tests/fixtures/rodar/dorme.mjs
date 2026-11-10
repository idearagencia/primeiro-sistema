// Usado pelo teste de rodar: abre um processo neto, mostra os dois pids e fica parado.
// O teste confere que, quando o tempo estoura, os dois são encerrados.
import { spawn } from "node:child_process";

const neto = spawn(process.execPath, ["-e", "setTimeout(() => {}, 20000)"], {
	stdio: "ignore",
});
process.stdout.write(`pids ${process.pid} ${neto.pid}\n`);
setTimeout(() => {}, 20000);
