import { headers } from "next/headers";
import { Verificador } from "@/components/Verificador";
import { frase, verificar } from "@/lib/verificar";
import { depsReais } from "@/lib/verificar/reais";
import type { Conferencia } from "@/lib/verificar/tipos";

// Cada abertura confere de novo: nada desta página é guardado no build.
export const dynamic = "force-dynamic";

export default async function Inicio() {
	// Em desenvolvimento a tela aparece na hora, com tudo em "conferindo…", e pede o resultado
	// à rota /api/conferir (abrir o Claude Code leva segundos; a página não espera por ele).
	if (process.env.NODE_ENV !== "production") {
		return <Verificador inicial={null} />;
	}
	// Em produção não roda comando nenhum: só confere os cabeçalhos e comemora.
	const host = (await headers()).get("host");
	const r = await verificar(await depsReais(host));
	const inicial: Conferencia = { ...r, frase: frase(r) };
	return <Verificador inicial={inicial} />;
}
