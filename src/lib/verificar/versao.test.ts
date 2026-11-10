import { describe, expect, it } from "vitest";
import { extrairVersao, versaoAtende } from "./versao";

describe("extrairVersao", () => {
	it.each([
		["git version 2.47.1.windows.1", "2.47.1"],
		["2.1.211 (Claude Code)", "2.1.211"],
		["v24.19.0", "24.19.0"],
		["1.105.0\nabc123\nx64", "1.105.0"],
	])("%s → %s", (saida, versao) => {
		expect(extrairVersao(saida)).toBe(versao);
	});

	it.each(["'claude' não é reconhecido como um comando", ""])(
		"sem versão em %j → null",
		(saida) => {
			expect(extrairVersao(saida)).toBeNull();
		},
	);
});

describe("versaoAtende", () => {
	it("compara a versão principal", () => {
		expect(versaoAtende("22.0.0", 22)).toBe(true);
		expect(versaoAtende("24.19.0", 22)).toBe(true);
		expect(versaoAtende("20.11.1", 22)).toBe(false);
	});

	it("versão que não dá para ler não atende", () => {
		expect(versaoAtende("", 22)).toBe(false);
		expect(versaoAtende("abc", 22)).toBe(false);
	});
});
