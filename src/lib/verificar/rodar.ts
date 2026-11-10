import { type ChildProcess, spawn } from "node:child_process";

export type Resposta = { ok: boolean; saida: string; demorou?: boolean };
export type Comando = "git" | "claude" | "code";
export type Rodar = (
	cmd: Comando,
	args: readonly string[],
	ms?: number,
) => Promise<Resposta>;

const LIMITE_SAIDA = 256 * 1024;
const FOLGA_DEPOIS_DE_SAIR = 250;

function matarArvore(filho: ChildProcess) {
	const pid = filho.pid;
	if (pid === undefined) return;
	try {
		if (process.platform === "win32") {
			// /T leva junto os processos que ele abriu (code.cmd abre outros).
			spawn("taskkill", ["/pid", String(pid), "/T", "/F"], {
				windowsHide: true,
				stdio: "ignore",
			}).on("error", () => {});
		} else {
			process.kill(-pid, "SIGKILL"); // o grupo inteiro (detached = grupo próprio)
		}
	} catch {
		try {
			filho.kill("SIGKILL");
		} catch {}
	}
}

// Só exportada para os testes. O app só chama `rodar`, com os três comandos fixos e
// argumentos escritos no código.
// Nunca lança. Resolve pelo próprio relógio: não espera o processo fechar as saídas.
export function rodarQualquer(
	cmd: string,
	args: readonly string[],
	ms = 5000,
	shell = false,
): Promise<Resposta> {
	return new Promise((resolve) => {
		let saida = "";
		let terminou = false;
		let filho: ChildProcess | undefined;
		let folga: ReturnType<typeof setTimeout> | undefined;
		let relogio: ReturnType<typeof setTimeout> | undefined;

		const fim = (r: Resposta) => {
			if (terminou) return;
			terminou = true;
			clearTimeout(relogio);
			clearTimeout(folga);
			filho?.stdout?.destroy();
			filho?.stderr?.destroy();
			resolve(r);
		};

		try {
			// Com shell, o comando vai inteiro numa string (são só constantes do código).
			filho = spawn(
				shell ? [cmd, ...args].join(" ") : cmd,
				shell ? [] : [...args],
				{
					shell,
					windowsHide: true,
					stdio: ["ignore", "pipe", "pipe"],
					detached: process.platform !== "win32",
					env: { ...process.env, NO_COLOR: "1" },
				},
			);
		} catch {
			fim({ ok: false, saida: "" });
			return;
		}

		// O relógio só começa depois que o processo abriu: no Windows, abrir um executável
		// grande (o do Claude Code tem centenas de MB) trava o Node por segundos, e esse tempo
		// não é demora do comando.
		relogio = setTimeout(() => {
			if (filho) matarArvore(filho);
			fim({ ok: false, saida, demorou: true });
		}, ms);

		const juntar = (pedaco: Buffer) => {
			if (saida.length < LIMITE_SAIDA) saida += pedaco.toString("utf8");
		};
		filho.stdout?.on("data", juntar).on("error", () => {});
		filho.stderr?.on("data", juntar).on("error", () => {});

		// ENOENT (não existe), EINVAL, EACCES...
		filho.on("error", () => fim({ ok: false, saida: "" }));
		filho.on("close", (codigo) => fim({ ok: codigo === 0, saida }));
		// Se um processo neto segurar as saídas abertas, o "close" não chega: depois de sair,
		// espera um pouco pelo resto da saída e resolve assim mesmo.
		filho.on("exit", (codigo) => {
			folga = setTimeout(
				() => fim({ ok: codigo === 0, saida }),
				FOLGA_DEPOIS_DE_SAIR,
			);
		});
	});
}

// No Windows o `code` é um code.cmd, que só roda dentro de um shell (sem ele dá EINVAL).
// Só ele usa shell; os argumentos são sempre constantes do código.
export const rodar: Rodar = (cmd, args, ms = 5000) =>
	rodarQualquer(cmd, args, ms, cmd === "code" && process.platform === "win32");
