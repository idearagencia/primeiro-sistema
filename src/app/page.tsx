import { headers } from "next/headers";
import { Verificador } from "@/components/Verificador";
import { frase, verificar } from "@/lib/verificar";
import { chegouPorHttps, depsReais } from "@/lib/verificar/reais";
import type { Conferencia } from "@/lib/verificar/tipos";

// Cada abertura confere de novo: nada desta página é guardado no build.
export const dynamic = "force-dynamic";

export default async function Inicio() {
	// Em desenvolvimento a tela aparece na hora, com tudo em "conferindo…", e pede o resultado
	// à rota /api/conferir (abrir o Claude Code leva segundos; a página não espera por ele).
	if (process.env.NODE_ENV !== "production") {
		return <Verificador inicial={null} />;
	}
	// Em produção não roda comando nenhum: só confere os cabeçalhos e o cadeado, e comemora.
	const h = await headers();
	const r = await verificar(
		await depsReais(h.get("host"), chegouPorHttps(h.get("x-forwarded-proto"))),
	);
	const inicial: Conferencia = { ...r, frase: frase(r) };
	return <Verificador inicial={inicial} />;
}
