import { describe, expect, it } from "vitest";
import { CABECALHOS, hostPermitido } from "./cabecalhos";

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
});
