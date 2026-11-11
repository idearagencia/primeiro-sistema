import { frase, verificar } from "@/lib/verificar";
import { depsReais } from "@/lib/verificar/reais";
import type { Conferencia } from "@/lib/verificar/tipos";

export const dynamic = "force-dynamic";

// Responde a conferência do computador em JSON (a tela e o `npm run conferir` usam).
// Em produção não existe: um servidor na internet não sai contando o que tem instalado.
export async function GET(request: Request) {
	if (process.env.NODE_ENV === "production") {
		return new Response("Não encontrado.", {
			status: 404,
			headers: { "Content-Type": "text/plain; charset=utf-8" },
		});
	}
	const r = await verificar(await depsReais(request.headers.get("host")));
	const corpo: Conferencia = { ...r, frase: frase(r) };
	return Response.json(corpo, { headers: { "Cache-Control": "no-store" } });
}
