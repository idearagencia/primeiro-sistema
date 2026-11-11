import { describe, expect, it } from "vitest";
import { GET } from "./route";

const pedido = (cabecalhos: Record<string, string>) =>
	new Request("http://localhost:3000/api/conferir", { headers: cabecalhos });

describe("GET /api/conferir", () => {
	it("pedido vindo de outro site (Sec-Fetch-Site: cross-site) → 403", async () => {
		const r = await GET(
			pedido({ host: "localhost:3000", "sec-fetch-site": "cross-site" }),
		);
		expect(r.status).toBe(403);
	});
});
