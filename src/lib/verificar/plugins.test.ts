import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
	listaReconhecida,
	PLUGINS_OBRIGATORIOS,
	pluginsInstalados,
} from "./plugins";

const fixture = (nome: string) =>
	readFileSync(
		new URL(`../../../tests/fixtures/plugin-list/${nome}.txt`, import.meta.url),
		"utf8",
	);

describe("pluginsInstalados", () => {
	it("acha os cinco na lista completa", () => {
		expect(pluginsInstalados(fixture("completa")).sort()).toEqual(
			[...PLUGINS_OBRIGATORIOS].sort(),
		);
	});

	it("acha três na lista parcial", () => {
		expect(pluginsInstalados(fixture("parcial"))).toHaveLength(3);
	});

	it("lista vazia e lixo não acham nada", () => {
		expect(pluginsInstalados(fixture("vazia"))).toEqual([]);
		expect(pluginsInstalados("lixo qualquer \u0000")).toEqual([]);
	});

	it("aceita fim de linha do Windows", () => {
		const crlf = fixture("completa").replace(/\n/g, "\r\n");
		expect(pluginsInstalados(crlf)).toHaveLength(5);
	});

	it("plugin desligado não conta", () => {
		const desligado = fixture("completa").replace(
			/(superpowers@claude-plugins-official\n(?:.*\n)*?\s+Status: )✔ enabled/,
			"$1✘ disabled",
		);
		expect(desligado).toContain("disabled");
		expect(pluginsInstalados(desligado)).not.toContain("superpowers");
		expect(pluginsInstalados(desligado)).toHaveLength(4);
	});
});

describe("listaReconhecida", () => {
	it("reconhece a lista com plugins e a lista vazia", () => {
		expect(listaReconhecida(fixture("completa"))).toBe(true);
		expect(listaReconhecida(fixture("vazia"))).toBe(true);
	});

	it("não reconhece resposta estranha", () => {
		expect(listaReconhecida("lixo qualquer")).toBe(false);
		expect(listaReconhecida("")).toBe(false);
	});
});
