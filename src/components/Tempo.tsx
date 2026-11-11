"use client";

import { useEffect, useState } from "react";
import { type EstadoNaTela, Linha } from "./Linha";

const LIMITE_MS = 2500; // até 2,5 s é rápido (a régua usada para o LCP)

type Medida = { ms: number } | "medindo" | "sem-suporte";

const segundos = (ms: number) =>
	(ms / 1000).toLocaleString("pt-BR", {
		minimumFractionDigits: 1,
		maximumFractionDigits: 1,
	});

// Mede no navegador o tempo até o maior elemento aparecer na tela (LCP).
// Não conta para o "pronto": no modo de desenvolvimento a primeira abertura é lenta e isso
// não é culpa de ninguém.
export function Tempo() {
	const [medida, setMedida] = useState<Medida>("medindo");

	useEffect(() => {
		const tipos =
			typeof PerformanceObserver === "undefined"
				? []
				: (PerformanceObserver.supportedEntryTypes ?? []);
		if (!tipos.includes("largest-contentful-paint")) {
			setMedida("sem-suporte");
			return;
		}
		const observador = new PerformanceObserver((lista) => {
			const entradas = lista.getEntries();
			const ultima = entradas[entradas.length - 1];
			if (ultima) setMedida({ ms: ultima.startTime });
		});
		observador.observe({ type: "largest-contentful-paint", buffered: true });
		return () => observador.disconnect();
	}, []);

	let estado: EstadoNaTela = "conferindo";
	let detalhe = "Medindo…";
	if (medida === "sem-suporte") {
		estado = "nao-conferi";
		detalhe =
			"Este navegador não mede esse tempo. Isso não muda nada no seu computador.";
	} else if (medida !== "medindo") {
		const texto = `Abriu em ${segundos(medida.ms)} s.`;
		if (medida.ms <= LIMITE_MS) {
			estado = "ok";
			detalhe = texto;
		} else {
			// Recomendação conferida: ATENÇÃO, não "não consegui conferir".
			estado = "aviso";
			detalhe = `${texto} Recarregue a página: a primeira abertura é sempre mais lenta.`;
		}
	}

	return (
		<Linha
			estado={estado}
			titulo="Página abre rápido"
			descricao="Quanto tempo a página levou para mostrar o conteúdo principal na tela."
			detalhe={detalhe}
		/>
	);
}
