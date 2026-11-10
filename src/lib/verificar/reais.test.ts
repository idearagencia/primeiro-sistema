import { describe, expect, it, vi } from "vitest";
import { comCacheDosPlugins } from "./reais";
import type { Rodar } from "./rodar";

describe("comCacheDosPlugins", () => {
	it("guarda a lista de plugins por 10 s e só ela", async () => {
		let agora = 1_000_000;
		const rodar = vi.fn<Rodar>(async () => ({ ok: true, saida: "lista" }));
		const comCache = comCacheDosPlugins(rodar, () => agora);

		await comCache("claude", ["plugin", "list"]);
		await comCache("claude", ["plugin", "list"]);
		expect(rodar).toHaveBeenCalledTimes(1);

		await comCache("git", ["--version"]);
		await comCache("git", ["--version"]);
		expect(rodar).toHaveBeenCalledTimes(3);

		agora += 10_001;
		await comCache("claude", ["plugin", "list"]);
		expect(rodar).toHaveBeenCalledTimes(4);
	});

	it("não guarda resposta que falhou", async () => {
		const rodar = vi.fn<Rodar>(async () => ({ ok: false, saida: "" }));
		const comCache = comCacheDosPlugins(rodar, () => 0);
		await comCache("claude", ["plugin", "list"]);
		await comCache("claude", ["plugin", "list"]);
		expect(rodar).toHaveBeenCalledTimes(2);
	});
});
