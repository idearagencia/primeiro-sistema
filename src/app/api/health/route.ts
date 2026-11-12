export const dynamic = "force-dynamic";

// Rota de saúde: a plataforma (e o HEALTHCHECK do Dockerfile) pergunta aqui se o sistema está
// de pé. Não conta nada sobre o servidor: só diz que está respondendo.
export function GET() {
	return Response.json(
		{ ok: true },
		{ headers: { "Cache-Control": "no-store" } },
	);
}
