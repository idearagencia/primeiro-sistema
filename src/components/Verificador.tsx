"use client";

import { useEffect, useState } from "react";
import type { Conferencia, Grupo, Item } from "@/lib/verificar/tipos";
import { type EstadoNaTela, Linha } from "./Linha";
import { Mascote, type Pose } from "./Mascote";
import { Tempo } from "./Tempo";

const PROXIMO_PASSO = "https://ia.diegohacks.com.br/cursos/introducao";
const ESPERA_MS = 20_000; // o servidor responde em até 8 s; isto é só para não esperar para sempre

const GRUPOS: { id: Grupo; titulo: string }[] = [
	{ id: "ferramentas", titulo: "Ferramentas" },
	{ id: "skills", titulo: "Skills" },
	{ id: "seguranca", titulo: "Segurança" },
	{ id: "performance", titulo: "Performance" },
];

// Os itens que a tela mostra antes da resposta chegar, na mesma ordem do verificador.
// (Um teste garante que esta lista bate com a do verificador.)
export const ITENS_DA_TELA: {
	id: string;
	grupo: Grupo;
	titulo: string;
	descricao: string;
}[] = [
	{
		id: "node",
		grupo: "ferramentas",
		titulo: "Node.js",
		descricao: "O motor que roda sistemas feitos em JavaScript, como este.",
	},
	{
		id: "git",
		grupo: "ferramentas",
		titulo: "Git",
		descricao:
			"Guarda cada versão do seu código, para você poder voltar atrás.",
	},
	{
		id: "git-identidade",
		grupo: "ferramentas",
		titulo: "Git sabe quem é você",
		descricao: "O nome que vai junto de cada versão que você salvar.",
	},
	{
		id: "claude",
		grupo: "ferramentas",
		titulo: "Claude Code",
		descricao: "A IA que lê e escreve código junto com você, no terminal.",
	},
	{
		id: "editor",
		grupo: "ferramentas",
		titulo: "Editor (VS Code)",
		descricao: "Onde você abre e lê os arquivos do projeto. É opcional.",
	},
	{
		id: "skill-superpowers",
		grupo: "skills",
		titulo: "superpowers",
		descricao:
			"Faz o Claude trabalhar em ordem: primeiro o desenho, depois o plano, depois a construção.",
	},
	{
		id: "skill-frontend-design",
		grupo: "skills",
		titulo: "frontend-design",
		descricao: "Ajuda o Claude a fazer telas bonitas e fáceis de usar.",
	},
	{
		id: "skill-code-review",
		grupo: "skills",
		titulo: "code-review",
		descricao: "Revisa o código procurando erros antes de você publicar.",
	},
	{
		id: "skill-security-guidance",
		grupo: "skills",
		titulo: "security-guidance",
		descricao: "Avisa quando o código deixa uma porta aberta para ataque.",
	},
	{
		id: "skill-skill-creator",
		grupo: "skills",
		titulo: "skill-creator",
		descricao: "Ensina o Claude a criar skills novas do seu jeito.",
	},
	{
		id: "cabecalhos",
		grupo: "seguranca",
		titulo: "Cabeçalhos de proteção",
		descricao:
			"Regras que a página manda ao navegador para se defender de ataques comuns.",
	},
	{
		id: "so-local",
		grupo: "seguranca",
		titulo: "Só o seu computador enxerga",
		descricao: "O servidor só atende quem está neste computador, não a rede.",
	},
	{
		id: "segredos",
		grupo: "seguranca",
		titulo: "Segredos fora do Git",
		descricao: "Senhas e chaves do arquivo .env nunca vão parar no Git.",
	},
	{
		id: "pasta-sua",
		grupo: "seguranca",
		titulo: "Pasta é sua",
		descricao:
			"A pasta não está mais ligada ao projeto original do DiegoHacks.",
	},
];

type Topo = { pose: Pose; titulo: string; texto: string; pronto: boolean };

function topoDaTela(c: Conferencia | null, erro: boolean): Topo {
	if (erro) {
		return {
			pose: "pensando",
			titulo: "Não consegui conferir.",
			texto:
				"A página não conseguiu falar com o servidor. Veja se o npm run dev continua ligado no terminal e recarregue a página.",
			pronto: false,
		};
	}
	if (!c) {
		return {
			pose: "parado",
			titulo: "Conferindo o seu computador…",
			texto: "Leva alguns segundos. Os itens abaixo se preenchem sozinhos.",
			pronto: false,
		};
	}
	if (c.producao) {
		return {
			pose: "comemorando",
			titulo: "Você conseguiu!",
			texto: "Seu sistema está no ar, na internet, com cadeado.",
			pronto: true,
		};
	}
	return { ...c.frase, pronto: c.pronto };
}

// Barra de blocos: um por item que conta para o "pronto", com o número em texto ao lado.
function Barra({ itens }: { itens: Item[] }) {
	const contam = itens.filter((i) => i.conta);
	const ok = contam.filter((i) => i.estado === "ok").length;
	return (
		<div className="barra">
			<div className="blocos" aria-hidden="true">
				{contam.map((i) => (
					<span
						key={i.id}
						className="bloco"
						data-ok={i.estado === "ok" ? "sim" : "nao"}
					/>
				))}
			</div>
			<span className="barra-texto">
				{ok} de {contam.length} itens que contam estão OK
			</span>
		</div>
	);
}

type Props = {
	// Em produção a página já chega com o resultado. Em desenvolvimento chega null e a tela
	// pede a conferência ao servidor depois de aparecer (os comandos levam segundos).
	inicial: Conferencia | null;
};

export function Verificador({ inicial }: Props) {
	const [conferencia, setConferencia] = useState<Conferencia | null>(inicial);
	const [erro, setErro] = useState(false);

	useEffect(() => {
		if (inicial) return;
		const controle = new AbortController();
		let desistiu = false;
		const relogio = setTimeout(() => controle.abort(), ESPERA_MS);
		fetch("/api/conferir", { cache: "no-store", signal: controle.signal })
			.then((r) => {
				if (!r.ok) throw new Error(String(r.status));
				return r.json() as Promise<Conferencia>;
			})
			.then((c) => {
				if (!desistiu) setConferencia(c);
			})
			.catch(() => {
				if (!desistiu) setErro(true);
			})
			.finally(() => clearTimeout(relogio));
		return () => {
			desistiu = true;
			clearTimeout(relogio);
			controle.abort();
		};
	}, [inicial]);

	const topo = topoDaTela(conferencia, erro);
	const porId = new Map(conferencia?.itens.map((i) => [i.id, i]));
	const producao = conferencia?.producao === true;
	const grupos = producao ? GRUPOS.filter((g) => g.id === "seguranca") : GRUPOS;
	const linhas = producao
		? ITENS_DA_TELA.filter((i) => porId.has(i.id))
		: ITENS_DA_TELA;

	return (
		<main className="pagina">
			<header className="topo" data-pronto={topo.pronto ? "sim" : "nao"}>
				<Mascote pose={topo.pose} />
				<div className="frase">
					<p className="nome-do-sistema">Meu primeiro sistema</p>
					<div role="status">
						<h1>{topo.titulo}</h1>
						<p>{topo.texto}</p>
					</div>
					{conferencia && !producao ? (
						<Barra itens={conferencia.itens} />
					) : null}
				</div>
			</header>

			{grupos.map((g) => {
				const doGrupo = linhas.filter((i) => i.grupo === g.id);
				const respostas = doGrupo
					.map((i) => porId.get(i.id))
					.filter((i): i is Item => i !== undefined);
				const okNoGrupo = respostas.filter((i) => i.estado === "ok").length;
				return (
					<section
						key={g.id}
						className="grupo"
						aria-labelledby={`grupo-${g.id}`}
					>
						<div className="grupo-topo">
							<h2 id={`grupo-${g.id}`}>{g.titulo}</h2>
							{respostas.length > 0 ? (
								<span className="grupo-conta">
									{okNoGrupo} de {respostas.length} OK
								</span>
							) : null}
						</div>
						<ul className="itens">
							{doGrupo.map((base) => {
								const r = porId.get(base.id);
								const estado: EstadoNaTela = r
									? r.estado
									: erro
										? "nao-conferi"
										: "conferindo";
								const detalhe = r
									? r.detalhe
									: erro
										? "Sem resposta do servidor."
										: "Conferindo…";
								return (
									<Linha
										key={base.id}
										estado={estado}
										titulo={base.titulo}
										descricao={base.descricao}
										detalhe={detalhe}
										ajuda={r?.ajuda}
									/>
								);
							})}
							{g.id === "performance" ? <Tempo /> : null}
						</ul>
						{g.id === "performance" ? (
							<p className="nota">
								<strong>Página leve.</strong> O peso desta página não é medido
								no seu computador: os testes da demo conferem, a cada versão,
								que ela continua leve.
							</p>
						) : null}
					</section>
				);
			})}

			<footer className="proximo">
				<h2>Próximo passo</h2>
				<p>
					Volte ao curso e siga para a próxima etapa:{" "}
					<a href={PROXIMO_PASSO}>Curso de Introdução do DiegoHacks</a>.
				</p>
			</footer>
		</main>
	);
}
