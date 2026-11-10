import { describe, expect, it, vi } from "vitest";
import { comCacheDoClaude } from "./reais";
import type { Resposta, Rodar } from "./rodar";

describe("comCacheDoClaude", () => {
	it("guarda claude --version e a lista de plugins por 10 s, e só eles", async () => {
		let agora = 1_000_000;
		const rodar = vi.fn<Rodar>(async () => ({ ok: true, saida: "x" }));
		const comCache = comCacheDoClaude(rodar, () => agora);

		await comCache("claude", ["plugin", "list"]);
		await comCache("claude", ["plugin", "list"]);
		await comCache("claude", ["--version"]);
		await comCache("claude", ["--version"]);
		expect(rodar).toHaveBeenCalledTimes(2);

		await comCache("git", ["--version"]);
		await comCache("git", ["--version"]);
		expect(rodar).toHaveBeenCalledTimes(4);

		agora += 10_001;
		await comCache("claude", ["plugin", "list"]);
		await comCache("claude", ["--version"]);
		expect(rodar).toHaveBeenCalledTimes(6);
	});

	it("não guarda resposta que falhou", async () => {
		const rodar = vi.fn<Rodar>(async () => ({ ok: false, saida: "" }));
		const comCache = comCacheDoClaude(rodar, () => 0);
		await comCache("claude", ["plugin", "list"]);
		await comCache("claude", ["plugin", "list"]);
		expect(rodar).toHaveBeenCalledTimes(2);
	});

	it("dois pedidos ao mesmo tempo usam um processo só", async () => {
		let libera: (r: Resposta) => void = () => {};
		const rodar = vi.fn<Rodar>(
			() =>
				new Promise<Resposta>((resolve) => {
					libera = resolve;
				}),
		);
		const comCache = comCacheDoClaude(rodar, () => 0);
		const a = comCache("claude", ["--version"]);
		const b = comCache("claude", ["--version"]);
		expect(rodar).toHaveBeenCalledTimes(1);
		libera({ ok: true, saida: "2.1.322 (Claude Code)" });
		expect(await a).toEqual(await b);
		expect((await a).saida).toBe("2.1.322 (Claude Code)");
		// e depois disso a resposta fica guardada
		await comCache("claude", ["--version"]);
		expect(rodar).toHaveBeenCalledTimes(1);
	});

	it("depois de um pedido que falhou, o próximo roda de novo", async () => {
		const respostas: Resposta[] = [
			{ ok: false, saida: "" },
			{ ok: true, saida: "x" },
		];
		const rodar = vi.fn<Rodar>(async () => respostas.shift() as Resposta);
		const comCache = comCacheDoClaude(rodar, () => 0);
		expect((await comCache("claude", ["--version"])).ok).toBe(false);
		expect((await comCache("claude", ["--version"])).ok).toBe(true);
		expect(rodar).toHaveBeenCalledTimes(2);
	});

	it("um pedido que lança não fica preso", async () => {
		let vez = 0;
		const rodar: Rodar = async () => {
			vez++;
			if (vez === 1) throw new Error("x");
			return { ok: true, saida: "x" };
		};
		const comCache = comCacheDoClaude(rodar, () => 0);
		await expect(comCache("claude", ["--version"])).rejects.toThrow();
		expect((await comCache("claude", ["--version"])).ok).toBe(true);
	});
});
