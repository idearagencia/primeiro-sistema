import type { Estado } from "@/lib/verificar/tipos";

// "conferindo" só existe na tela: o item ainda não tem resposta.
export type EstadoNaTela = Estado | "conferindo";

// Sempre ícone + palavra: a cor nunca é o único sinal.
export const PALAVRA: Record<EstadoNaTela, string> = {
	ok: "OK",
	falta: "FALTA",
	aviso: "ATENÇÃO",
	"nao-conferi": "NÃO CONSEGUI CONFERIR",
	conferindo: "CONFERINDO…",
};

// Ícones de pixel numa grade 7 × 7: cada par é [coluna, linha] de um pixel aceso.
const PIXELS: Record<EstadoNaTela, [number, number][]> = {
	ok: [
		[0, 3],
		[1, 3],
		[1, 4],
		[2, 4],
		[2, 5],
		[3, 4],
		[3, 3],
		[4, 3],
		[4, 2],
		[5, 2],
		[5, 1],
		[6, 1],
	],
	falta: [
		[0, 0],
		[1, 1],
		[2, 2],
		[3, 3],
		[4, 4],
		[5, 5],
		[6, 6],
		[6, 0],
		[5, 1],
		[4, 2],
		[2, 4],
		[1, 5],
		[0, 6],
	],
	aviso: [
		[2, 0],
		[3, 0],
		[4, 0],
		[2, 1],
		[3, 1],
		[4, 1],
		[3, 2],
		[3, 3],
		[3, 5],
		[3, 6],
	],
	"nao-conferi": [
		[1, 1],
		[2, 0],
		[3, 0],
		[4, 0],
		[5, 1],
		[5, 2],
		[4, 3],
		[3, 3],
		[3, 4],
		[3, 6],
	],
	conferindo: [
		[0, 3],
		[3, 3],
		[6, 3],
	],
};

function Icone({ estado }: { estado: EstadoNaTela }) {
	return (
		<svg viewBox="0 0 7 7" aria-hidden="true" focusable="false">
			{PIXELS[estado].map(([x, y]) => (
				<rect
					key={`${x}-${y}`}
					x={x}
					y={y}
					width="1"
					height="1"
					fill="currentColor"
				/>
			))}
		</svg>
	);
}

type Props = {
	estado: EstadoNaTela;
	titulo: string;
	descricao: string;
	detalhe: string;
	ajuda?: string; // link "Como resolver"; só aparece quando o item não está OK
};

export function Linha({ estado, titulo, descricao, detalhe, ajuda }: Props) {
	const mostraAjuda = ajuda && estado !== "ok" && estado !== "conferindo";
	return (
		<li className="item" data-estado={estado}>
			<span className="selo">
				<Icone estado={estado} />
				<span>{PALAVRA[estado]}</span>
			</span>
			<div className="corpo">
				<h3>{titulo}</h3>
				<p className="descricao">{descricao}</p>
				<p className="detalhe">{detalhe}</p>
				{mostraAjuda ? (
					<a
						className="resolver"
						href={ajuda}
						aria-label={`Como resolver: ${titulo}`}
					>
						Como resolver
					</a>
				) : null}
			</div>
		</li>
	);
}
