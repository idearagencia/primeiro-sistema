import { describe, expect, it } from "vitest";
import {
	CABECALHOS,
	hostLocal,
	hostPermitido,
	hostsPermitidos,
	lerListaDeHosts,
} from "./cabecalhos";

describe("CABECALHOS", () => {
	it("traz as proteções básicas", () => {
		expect(CABECALHOS["X-Content-Type-Options"]).toBe("nosniff");
		expect(CABECALHOS["Referrer-Policy"]).toBe(
			"strict-origin-when-cross-origin",
		);
		expect(CABECALHOS["X-Frame-Options"]).toBe("DENY");
	});

	it("tem uma CSP que só aceita o próprio site", () => {
		const csp = CABECALHOS["Content-Security-Policy"];
		expect(csp).toContain("default-src 'self'");
		expect(csp).toContain("frame-ancestors 'none'");
		expect(csp).not.toMatch(/https?:\/\//); // nenhuma origem de fora
	});
});

describe("hostPermitido", () => {
	it.each(["localhost:3000", "127.0.0.1:3000", "localhost", "LOCALHOST:3111"])(
		"aceita %s",
		(h) => {
			expect(hostPermitido(h)).toBe(true);
		},
	);

	it.each([
		"evil.example",
		"localhost.evil.example",
		"127.0.0.1.evil.example:3000",
		"",
		null,
	])("recusa %s", (h) => {
		expect(hostPermitido(h)).toBe(false);
	});

	const producao = { NODE_ENV: "production" };

	it("em produção, sem lista e sem plataforma: só o computador", () => {
		expect(hostPermitido("localhost:3000", producao)).toBe(true);
		expect(hostPermitido("meu-sistema.vercel.app", producao)).toBe(false);
		expect(hostPermitido("seudominio.com.br", producao)).toBe(false);
	});

	it("em produção aceita os endereços de HOSTS_PERMITIDOS", () => {
		const env = {
			...producao,
			HOSTS_PERMITIDOS: " seudominio.com.br , https://WWW.Seudominio.com.br/ ",
		};
		expect(hostPermitido("seudominio.com.br", env)).toBe(true);
		expect(hostPermitido("www.seudominio.com.br", env)).toBe(true);
		expect(hostPermitido("SEUDOMINIO.com.br:443", env)).toBe(true);
		expect(hostPermitido("seudominio.com.br.", env)).toBe(true);
		expect(hostPermitido("outro.seudominio.com.br", env)).toBe(false);
		expect(hostPermitido("seudominio.com.br.evil.example", env)).toBe(false);
		expect(hostPermitido("evilseudominio.com.br", env)).toBe(false);
		expect(hostPermitido("seudominio.com.br/x", env)).toBe(false);
	});

	it("em desenvolvimento a lista não vale: só o computador", () => {
		const env = {
			NODE_ENV: "development",
			HOSTS_PERMITIDOS: "seudominio.com.br",
			VERCEL_URL: "meu-sistema.vercel.app",
		};
		expect(hostPermitido("seudominio.com.br", env)).toBe(false);
		expect(hostPermitido("meu-sistema.vercel.app", env)).toBe(false);
		expect(hostPermitido("localhost:3000", env)).toBe(true);
	});

	it("em produção aceita o endereço que a Vercel informa", () => {
		const env = {
			...producao,
			VERCEL_PROJECT_PRODUCTION_URL: "meu-sistema.vercel.app",
			VERCEL_URL: "meu-sistema-abc123.vercel.app",
			VERCEL_BRANCH_URL: "meu-sistema-git-main.vercel.app",
		};
		expect(hostPermitido("meu-sistema.vercel.app", env)).toBe(true);
		expect(hostPermitido("meu-sistema-abc123.vercel.app", env)).toBe(true);
		expect(hostPermitido("meu-sistema-git-main.vercel.app", env)).toBe(true);
		expect(hostPermitido("outro-sistema.vercel.app", env)).toBe(false);
	});

	it("em produção aceita o endereço que o Coolify informa (com ou sem https, vários)", () => {
		const env = {
			...producao,
			COOLIFY_FQDN: "https://seudominio.com.br,https://www.seudominio.com.br",
			COOLIFY_URL: "seudominio.com.br,www.seudominio.com.br",
		};
		expect(hostPermitido("seudominio.com.br", env)).toBe(true);
		expect(hostPermitido("www.seudominio.com.br", env)).toBe(true);
		expect(hostPermitido("painel.seudominio.com.br", env)).toBe(false);
	});
});

describe("lerListaDeHosts", () => {
	it("tira https, caminho e porta, e ignora o que não é domínio", () => {
		expect(
			lerListaDeHosts(
				"https://A.exemplo.com.br:8443/x?y, b.exemplo.com.br,, *.exemplo.com.br, localhost, um espaço.com, http://",
			),
		).toEqual(["a.exemplo.com.br", "b.exemplo.com.br"]);
		expect(lerListaDeHosts(undefined)).toEqual([]);
		expect(lerListaDeHosts("")).toEqual([]);
	});
});

describe("hostsPermitidos", () => {
	it("junta a lista e a plataforma, sem repetir", () => {
		expect(
			hostsPermitidos({
				NODE_ENV: "production",
				HOSTS_PERMITIDOS: "seudominio.com.br",
				COOLIFY_FQDN: "https://seudominio.com.br",
			}),
		).toEqual(["seudominio.com.br"]);
	});

	it("fora de produção é vazia", () => {
		expect(hostsPermitidos({ HOSTS_PERMITIDOS: "seudominio.com.br" })).toEqual(
			[],
		);
	});
});

describe("hostLocal", () => {
	it("só localhost e 127.0.0.1, em qualquer ambiente", () => {
		expect(hostLocal("localhost:3000")).toBe(true);
		expect(hostLocal("127.0.0.1")).toBe(true);
		expect(hostLocal("seudominio.com.br")).toBe(false);
		expect(hostLocal(null)).toBe(false);
	});
});
