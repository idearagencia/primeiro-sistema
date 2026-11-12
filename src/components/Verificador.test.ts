import { describe, expect, it, vi } from "vitest";
import { verificar } from "@/lib/verificar";
import { CABECALHOS } from "@/lib/verificar/cabecalhos";
import type { Conferencia, Item } from "@/lib/verificar/tipos";
import {
	conferirComNovaTentativa,
	ITENS_DA_TELA,
	topoDaTela,
} from "./Verificador";

describe("ITENS_DA_TELA", () => {
	it("tem os mesmos itens, títulos, grupos e ordem do verificador", async () => {
		const r = await verificar({
			rodar: async () => ({ ok: false, saida: "" }),
			node: "24.0.0",
			gitignore: ".env*\n",
			host: "localhost:3000",
			local: true,
			producao: false,
			cabecalhos: { ...CABECALHOS },
		});
		expect(
			ITENS_DA_TELA.map(({ id, grupo, titulo }) => ({ id, grupo, titulo })),
		).toEqual(r.itens.map(({ id, grupo, titulo }) => ({ id, grupo, titulo })));
	});

	it("toda frase explicativa existe e é curta", () => {
		for (const i of ITENS_DA_TELA) {
			expect(i.descricao.length).toBeGreaterThan(10);
			expect(i.descricao.length).toBeLessThan(110);
		}
	});
});

describe("conferirComNovaTentativa", () => {
	const item = (estado: Item["estado"]): Item => ({
		id: "skill-superpowers",
		grupo: "skills",
		titulo: "superpowers",
		estado,
		detalhe: "",
		conta: true,
		ajuda: "https://a/b",
	});
	const conferencia = (estado: Item["estado"]): Conferencia => ({
		itens: [item("ok"), item(estado)],
		pronto: estado === "ok",
		producao: false,
		frase: { titulo: "", texto: "", pose: "pensando" },
	});

	it("tudo conferido: pergunta uma vez só", async () => {
		const buscar = vi.fn(async () => conferencia("ok"));
		const aoParcial = vi.fn();
		const r = await conferirComNovaTentativa(buscar, aoParcial);
		expect(buscar).toHaveBeenCalledTimes(1);
		expect(aoParcial).not.toHaveBeenCalled();
		expect(r.pronto).toBe(true);
	});

	it("algum item sem conferir: mostra o parcial e pergunta de novo", async () => {
		const primeira = conferencia("nao-conferi");
		const buscar = vi
			.fn<() => Promise<Conferencia>>()
			.mockResolvedValueOnce(primeira)
			.mockResolvedValueOnce(conferencia("ok"));
		const aoParcial = vi.fn();
		const r = await conferirComNovaTentativa(buscar, aoParcial);
		expect(buscar).toHaveBeenCalledTimes(2);
		expect(aoParcial).toHaveBeenCalledWith(primeira);
		expect(r.pronto).toBe(true);
	});

	it("pergunta de novo uma vez só, mesmo que continue sem conferir", async () => {
		const buscar = vi.fn(async () => conferencia("nao-conferi"));
		const r = await conferirComNovaTentativa(buscar, () => {});
		expect(buscar).toHaveBeenCalledTimes(2);
		expect(r.itens[1].estado).toBe("nao-conferi");
	});

	it("a segunda pergunta falhou: fica valendo a primeira", async () => {
		const primeira = conferencia("nao-conferi");
		const buscar = vi
			.fn<() => Promise<Conferencia>>()
			.mockResolvedValueOnce(primeira)
			.mockRejectedValueOnce(new Error("caiu"));
		expect(await conferirComNovaTentativa(buscar, () => {})).toBe(primeira);
	});

	it("a primeira pergunta falhou: o erro sobe (a tela mostra o aviso)", async () => {
		const buscar = vi.fn(async (): Promise<Conferencia> => {
			throw new Error("caiu");
		});
		await expect(conferirComNovaTentativa(buscar, () => {})).rejects.toThrow();
		expect(buscar).toHaveBeenCalledTimes(1);
	});
});

describe("topoDaTela em produção", () => {
	const emProducao = (pronto: boolean, cadeado: boolean): Conferencia => ({
		itens: [],
		pronto,
		producao: true,
		cadeado,
		frase: { titulo: "", texto: "", pose: "pensando" },
	});

	it("endereço da lista com https: Seu sistema está no ar", () => {
		const t = topoDaTela(emProducao(true, true), false);
		expect(t.titulo).toBe("Você conseguiu!");
		expect(t.texto).toBe("Seu sistema está no ar, na internet, com cadeado.");
		expect(t.pose).toBe("comemorando");
	});

	it("sem https: não comemora e pede o endereço com https://", () => {
		const t = topoDaTela(emProducao(false, false), false);
		expect(t.titulo).toBe("Quase no ar.");
		expect(t.texto).toContain("https://");
		expect(t.pronto).toBe(false);
	});

	it("com https mas faltando proteção: aponta o item", () => {
		const t = topoDaTela(emProducao(false, true), false);
		expect(t.titulo).toBe("Quase no ar.");
		expect(t.texto).toContain("faltam proteções");
	});
});
