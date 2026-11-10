import { describe, expect, it } from "vitest";
import { ehRepoDaDemo } from "./lib.mjs";

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
