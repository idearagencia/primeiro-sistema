import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { rodar, rodarQualquer } from "./rodar";
import { extrairVersao } from "./versao";

const dorme = fileURLToPath(
	new URL("../../../tests/fixtures/rodar/dorme.mjs", import.meta.url),
);

function vivo(pid: number): boolean {
	try {
		process.kill(pid, 0);
		return true;
	} catch {
		return false;
	}
}

async function esperarMorrer(pid: number, ms: number): Promise<boolean> {
	const fim = Date.now() + ms;
	while (Date.now() < fim) {
		if (!vivo(pid)) return true;
		await new Promise((r) => setTimeout(r, 100));
	}
	return !vivo(pid);
}

describe("rodarQualquer", () => {
	it("comando lento estoura o tempo sem lançar e encerra os processos", async () => {
		const t = Date.now();
		const r = await rodarQualquer(process.execPath, [dorme], 1500);
		const passou = Date.now() - t;
		expect(r.ok).toBe(false);
		expect(r.demorou).toBe(true);
		expect(passou).toBeGreaterThanOrEqual(1400);
		expect(passou).toBeLessThan(4000);

		const pids = r.saida.match(/pids (\d+) (\d+)/);
		expect(pids).not.toBeNull();
		for (const pid of [Number(pids?.[1]), Number(pids?.[2])]) {
			expect(await esperarMorrer(pid, 3000)).toBe(true);
		}
	}, 15000);

	it("comando que não existe devolve ok:false", async () => {
		const r = await rodarQualquer("comando-que-nao-existe-xyz", []);
		expect(r.ok).toBe(false);
		expect(r.demorou).toBeFalsy();
	});

	it("comando que sai com erro devolve ok:false", async () => {
		const r = await rodarQualquer(process.execPath, ["--opcao-que-nao-existe"]);
		expect(r.ok).toBe(false);
		expect(r.demorou).toBeFalsy();
	});
});

describe("rodar", () => {
	it("git --version roda de verdade", async () => {
		const r = await rodar("git", ["--version"]);
		expect(r.ok).toBe(true);
		expect(extrairVersao(r.saida)).not.toBeNull();
	});
});
