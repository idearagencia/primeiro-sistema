import { describe, expect, it, vi } from "vitest";
import { chegouPorHttps, comCacheDoClaude, enderecoDoIcone } from "./reais";
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

describe("enderecoDoIcone", () => {
	const producao = {
		NODE_ENV: "production",
		HOSTS_PERMITIDOS: "seudominio.com.br",
	};

	it("no computador: mesma porta do endereço aberto", () => {
		expect(enderecoDoIcone("localhost:3111", producao)).toBe(
			"http://127.0.0.1:3111/icon.svg",
		);
	});

	it("num servidor: por dentro, na porta PORT (3000 se não tiver)", () => {
		expect(enderecoDoIcone("seudominio.com.br", producao)).toBe(
			"http://127.0.0.1:3000/icon.svg",
		);
		expect(
			enderecoDoIcone("seudominio.com.br", { ...producao, PORT: "8080" }),
		).toBe("http://127.0.0.1:8080/icon.svg");
	});

	it("na Vercel: pelo próprio endereço com https", () => {
		expect(
			enderecoDoIcone("seudominio.com.br", { ...producao, VERCEL: "1" }),
		).toBe("https://seudominio.com.br/icon.svg");
	});

	it("endereço fora da lista: não pede nada", () => {
		expect(enderecoDoIcone("evil.example", producao)).toBeNull();
		expect(enderecoDoIcone(null, producao)).toBeNull();
	});
});

describe("chegouPorHttps", () => {
	it.each([
		["https", true],
		["HTTPS", true],
		["https, http", true],
		["http", false],
		["http, https", false],
		["", false],
		[null, false],
	] as const)("%j → %s", (proto, esperado) => {
		expect(chegouPorHttps(proto)).toBe(esperado);
	});
});
