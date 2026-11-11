import { describe, expect, it } from "vitest";
import { ehConferencia, ehRepoDaDemo, linhaDoItem } from "./lib.mjs";

describe("ehRepoDaDemo", () => {
	it.each([
		"https://github.com/idearagencia/primeiro-sistema.git",
		"https://github.com/idearagencia/primeiro-sistema",
		"git@github.com:idearagencia/primeiro-sistema.git",
		"https://github.com/IdearAgencia/Primeiro-Sistema.git",
		"https://github.com/idearagencia/primeiro-sistema.git\n",
		"ssh://git@github.com/idearagencia/primeiro-sistema.git",
	])("%j é a demo", (url) => {
		expect(ehRepoDaDemo(url)).toBe(true);
	});

	it.each([
		"https://github.com/fulana/meu-app.git",
		"",
		"https://github.com/idearagencia/primeiro-sistema-fork.git",
		"https://github.com/fulana/idearagencia/primeiro-sistema.git",
		"https://evil.example/idearagencia/primeiro-sistema.git",
	])("%j não é a demo", (url) => {
		expect(ehRepoDaDemo(url)).toBe(false);
	});

	it("aceita qualquer coisa sem lançar", () => {
		expect(ehRepoDaDemo(undefined)).toBe(false);
		expect(ehRepoDaDemo(null)).toBe(false);
	});
});

describe("linhaDoItem", () => {
	it("OK mostra título e versão", () => {
		expect(
			linhaDoItem({
				estado: "ok",
				titulo: "Git",
				detalhe: "2.47.1",
				ajuda: "x",
			}),
		).toBe("[OK] Git 2.47.1");
	});

	it("OK com o detalhe que o verificador escreve", () => {
		expect(
			linhaDoItem({
				estado: "ok",
				titulo: "Git",
				detalhe: "Versão 2.47.1.",
				ajuda: "x",
			}),
		).toBe("[OK] Git 2.47.1");
		expect(
			linhaDoItem({
				estado: "ok",
				titulo: "superpowers",
				detalhe: "Instalada.",
				ajuda: "x",
			}),
		).toBe("[OK] superpowers: Instalada");
	});

	it("FALTA diz como resolver", () => {
		expect(
			linhaDoItem({
				estado: "falta",
				titulo: "Claude Code",
				detalhe: "não encontrei",
				ajuda: "https://a/b",
			}),
		).toBe("[FALTA] Claude Code: não encontrei. Como resolver: https://a/b");
	});

	it("não repete o ponto final do detalhe", () => {
		expect(
			linhaDoItem({
				estado: "falta",
				titulo: "Git",
				detalhe: "Não encontrei o Git.",
				ajuda: "https://a/b",
			}),
		).toBe("[FALTA] Git: Não encontrei o Git. Como resolver: https://a/b");
	});

	it("NÃO CONSEGUI CONFERIR vira [?]", () => {
		expect(
			linhaDoItem({
				estado: "nao-conferi",
				titulo: "Skills",
				detalhe: "não consegui conferir",
				ajuda: "https://a/b",
			}),
		).toMatch(/^\[\?\] Skills/);
	});

	it("ATENÇÃO vira [!]", () => {
		expect(
			linhaDoItem({
				estado: "aviso",
				titulo: "Pasta é sua",
				detalhe: "Rode npm run comecar.",
				ajuda: "https://a/b",
			}),
		).toBe("[!] Pasta é sua: Rode npm run comecar. Como resolver: https://a/b");
	});
});

describe("linhaDoItem sem detalhe", () => {
	it("OK sem detalhe mostra só o título, sem dois-pontos", () => {
		expect(
			linhaDoItem({ estado: "ok", titulo: "Git", detalhe: "", ajuda: "x" }),
		).toBe("[OK] Git");
	});
});

describe("ehConferencia", () => {
	const boa = {
		itens: [{ estado: "ok", titulo: "Git", grupo: "ferramentas", detalhe: "" }],
		frase: { titulo: "Quase lá.", texto: "Falta 1 item." },
		pronto: false,
	};

	it("aceita a resposta da demo", () => {
		expect(ehConferencia(boa)).toBe(true);
	});

	it.each([
		null,
		"texto",
		[],
		{},
		{ ...boa, itens: "x" },
		{ ...boa, itens: [null] },
		{ ...boa, itens: [{ titulo: "Git" }] },
		{ ...boa, frase: null },
		{ ...boa, pronto: "sim" },
	])("recusa %j", (c) => {
		expect(ehConferencia(c)).toBe(false);
	});
});
