// "nao-conferi" = o comando falhou de um jeito inesperado ou demorou demais: a tela diz
// NÃO CONSEGUI CONFERIR em vez de inventar uma resposta.
// "aviso" = conferi e está funcionando, mas tem uma recomendação (só em item que não conta).
export type Estado = "ok" | "falta" | "aviso" | "nao-conferi";

export type Grupo = "ferramentas" | "skills" | "seguranca" | "performance";

export type Item = {
	id: string;
	grupo: Grupo;
	titulo: string;
	estado: Estado;
	detalhe: string; // só versão extraída ou frase fixa do código, nunca saída bruta
	conta: boolean; // conta para o "pronto"?
	ajuda: string; // URL da etapa do guia que resolve
};

export type Resultado = {
	itens: Item[];
	pronto: boolean;
	producao: boolean;
	cadeado?: boolean; // só em produção: o pedido chegou por https
};

// A frase do topo da tela e a pose do mascote que vai com ela.
export type Frase = {
	titulo: string;
	texto: string;
	pose: "comemorando" | "pensando";
};

// O que a rota /api/conferir devolve: o resultado e a frase do topo, já calculada.
export type Conferencia = Resultado & { frase: Frase };
