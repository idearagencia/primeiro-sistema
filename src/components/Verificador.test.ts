import { describe, expect, it } from "vitest";
import { verificar } from "@/lib/verificar";
import { CABECALHOS } from "@/lib/verificar/cabecalhos";
import { ITENS_DA_TELA } from "./Verificador";

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
