import { type NextRequest, NextResponse } from "next/server";
import { hostPermitido } from "@/lib/verificar/cabecalhos";

// Sem matcher: roda em todo pedido, inclusive arquivos estáticos.
// No seu computador só passa localhost/127.0.0.1. Em produção também passam os endereços da
// lista (HOSTS_PERMITIDOS e o endereço que a Vercel ou o Coolify informam). O resto recebe 403.
export function proxy(req: NextRequest) {
	if (!hostPermitido(req.headers.get("host"))) {
		return new NextResponse(
			"Esta demo só responde no seu computador e nos endereços da lista HOSTS_PERMITIDOS.",
			{
				status: 403,
				headers: { "Content-Type": "text/plain; charset=utf-8" },
			},
		);
	}
	return NextResponse.next();
}
