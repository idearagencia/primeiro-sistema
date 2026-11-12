import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /api/health", () => {
	it('responde 200 com {"ok":true}, sem guardar em cache', async () => {
		const r = GET();
		expect(r.status).toBe(200);
		expect(r.headers.get("content-type")).toMatch(/application\/json/);
		expect(r.headers.get("cache-control")).toBe("no-store");
		expect(await r.json()).toEqual({ ok: true });
	});
});
