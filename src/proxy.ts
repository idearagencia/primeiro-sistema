import { type NextRequest, NextResponse } from "next/server";
import { hostPermitido } from "@/lib/verificar/cabecalhos";

// Sem matcher: roda em todo pedido, inclusive arquivos estáticos.
// Pedido que não veio de localhost/127.0.0.1 recebe 403 (também em produção).
export function proxy(req: NextRequest) {
	if (!hostPermitido(req.headers.get("host"))) {
		return new NextResponse("Esta demo só responde no seu computador.", {
			status: 403,
			headers: { "Content-Type": "text/plain; charset=utf-8" },
		});
	}
	return NextResponse.next();
}
