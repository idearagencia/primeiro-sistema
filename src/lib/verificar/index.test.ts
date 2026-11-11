import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { CABECALHOS } from "./cabecalhos";
import { type Deps, frase, PRAZO_MS, verificar } from "./index";
import type { Rodar } from "./rodar";
import type { Item, Resultado } from "./tipos";

const fixture = (nome: string) =>
	readFileSync(
		new URL(`../../../tests/fixtures/plugin-list/${nome}.txt`, import.meta.url),
		"utf8",
	);

const DEMOROU = Symbol("demorou");
type Resposta = string | null | typeof DEMOROU;

// rodar falso: a chave é "comando argumentos"; null = falhou; DEMOROU = estourou o tempo.
function falso(tabela: Record<string, Resposta>): Rodar {
	return async (cmd, args) => {
		const r = tabela[[cmd, ...args].join(" ")];
		if (r === DEMOROU) return { ok: false, saida: "", demorou: true };
		if (r === null || r === undefined) return { ok: false, saida: "" };
		return { ok: true, saida: r };
	};
}

const RESPOSTAS: Record<string, Resposta> = {
	"git --version": "git version 2.47.1",
	"git config user.name": "Alguém",
	"git remote get-url origin": null,
	"claude --version": "2.1.211 (Claude Code)",
	"claude plugin list": fixture("completa"),
	"code --version": "1.105.0",
};

const tudoCerto: Deps = {
	rodar: falso(RESPOSTAS),
	node: "24.19.0",
	gitignore: "node_modules/\n.env*\n",
	host: "localhost:3000",
	local: true,
	producao: false,
	cabecalhos: { ...CABECALHOS },
};

const com = (mudancas: Record<string, Resposta>): Deps => ({
	...tudoCerto,
	rodar: falso({ ...RESPOSTAS, ...mudancas }),
});

const SKILLS = [
	"skill-superpowers",
	"skill-frontend-design",
	"skill-code-review",
	"skill-security-guidance",
	"skill-skill-creator",
];

const IDS = [
	"node",
	"git",
	"git-identidade",
	"claude",
	"editor",
	...SKILLS,
	"cabecalhos",
	"so-local",
	"segredos",
	"pasta-sua",
];

const estado = (r: Resultado, id: string) =>
	r.itens.find((i) => i.id === id)?.estado;

const naoOk = (r: Resultado) =>
	r.itens.filter((i) => i.estado !== "ok").map((i) => i.id);

describe("verificar", () => {
	it("tudo certo → pronto", async () => {
		const r = await verificar(tudoCerto);
		expect(r.pronto).toBe(true);
		expect(r.producao).toBe(false);
		expect(r.itens.map((i) => i.id)).toEqual(IDS);
		expect(r.itens.every((i) => i.estado === "ok")).toBe(true);
	});

	it("mostra as versões encontradas", async () => {
		const r = await verificar(tudoCerto);
		const detalhe = (id: string) => r.itens.find((i) => i.id === id)?.detalhe;
		expect(detalhe("node")).toContain("24.19.0");
		expect(detalhe("git")).toContain("2.47.1");
		expect(detalhe("claude")).toContain("2.1.211");
		expect(detalhe("editor")).toContain("1.105.0");
	});

	it("não contam para o pronto: identidade do git, editor e pasta-sua", async () => {
		const r = await verificar(tudoCerto);
		expect(r.itens.filter((i) => !i.conta).map((i) => i.id)).toEqual([
			"git-identidade",
			"editor",
			"pasta-sua",
		]);
	});

	it("cada item aponta para a etapa certa do guia", async () => {
		const r = await verificar(tudoCerto);
		const base = "https://ia.diegohacks.com.br/guias";
		const ajuda = Object.fromEntries(r.itens.map((i) => [i.id, i.ajuda]));
		const notebook = `${base}/preparar-o-computador/preparar-o-notebook`;
		expect(ajuda.node).toBe(notebook);
		expect(ajuda.git).toBe(notebook);
		expect(ajuda["git-identidade"]).toBe(notebook);
		expect(ajuda.claude).toBe(
			`${base}/preparar-o-computador/instalar-o-claude-code`,
		);
		expect(ajuda.editor).toBe(
			`${base}/preparar-o-computador/instalar-um-editor`,
		);
		for (const id of SKILLS) {
			expect(ajuda[id]).toBe(
				`${base}/preparar-o-computador/instalar-as-skills`,
			);
		}
		for (const id of ["cabecalhos", "so-local", "segredos", "pasta-sua"]) {
			expect(ajuda[id]).toBe(`${base}/rodar-local/conferir-o-computador`);
		}
	});

	it("sem editor e sem identidade do git continua pronto", async () => {
		const r = await verificar(
			com({ "code --version": null, "git config user.name": "" }),
		);
		expect(estado(r, "editor")).toBe("falta");
		expect(estado(r, "git-identidade")).toBe("aviso");
		expect(r.pronto).toBe(true);
	});

	it("git config user.name que falha (nome não configurado) → aviso", async () => {
		const r = await verificar(com({ "git config user.name": null }));
		expect(estado(r, "git-identidade")).toBe("aviso");
	});

	it("sem claude: claude e as cinco skills em falta, não pronto", async () => {
		const r = await verificar(
			com({ "claude --version": null, "claude plugin list": null }),
		);
		expect(naoOk(r)).toEqual(["claude", ...SKILLS]);
		for (const id of ["claude", ...SKILLS]) {
			expect(estado(r, id)).toBe("falta");
		}
		expect(r.pronto).toBe(false);
		// No Windows, o instalado pelo npm (claude.cmd) também cai aqui: o texto manda ao oficial.
		expect(r.itens.find((i) => i.id === "claude")?.detalhe).toMatch(
			/comando oficial/,
		);
	});

	it("claude existe mas a lista de plugins falhou: skills sem conferir, não pronto", async () => {
		const r = await verificar(com({ "claude plugin list": null }));
		for (const id of SKILLS) expect(estado(r, id)).toBe("nao-conferi");
		expect(estado(r, "claude")).toBe("ok");
		expect(r.pronto).toBe(false);
	});

	it("lista de plugins demorou: skills sem conferir", async () => {
		const r = await verificar(com({ "claude plugin list": DEMOROU }));
		for (const id of SKILLS) expect(estado(r, id)).toBe("nao-conferi");
	});

	it("lista de plugins num formato estranho: skills sem conferir, não em falta", async () => {
		const r = await verificar(
			com({ "claude plugin list": "Unexpected output" }),
		);
		for (const id of SKILLS) expect(estado(r, id)).toBe("nao-conferi");
	});

	it("faltam dois plugins: exatamente esses dois em falta", async () => {
		const r = await verificar(
			com({ "claude plugin list": fixture("parcial") }),
		);
		expect(naoOk(r)).toEqual(["skill-frontend-design", "skill-skill-creator"]);
		expect(estado(r, "skill-frontend-design")).toBe("falta");
		expect(estado(r, "skill-skill-creator")).toBe("falta");
		expect(r.pronto).toBe(false);
	});

	it("nenhum plugin: as cinco skills em falta", async () => {
		const r = await verificar(com({ "claude plugin list": fixture("vazia") }));
		expect(naoOk(r)).toEqual(SKILLS);
		for (const id of SKILLS) expect(estado(r, id)).toBe("falta");
	});

	it("Node 20 → node em falta", async () => {
		const r = await verificar({ ...tudoCerto, node: "20.11.1" });
		expect(estado(r, "node")).toBe("falta");
		expect(r.pronto).toBe(false);
	});

	it("Node com versão que não dá para ler → não consegui conferir", async () => {
		const r = await verificar({ ...tudoCerto, node: "" });
		expect(estado(r, "node")).toBe("nao-conferi");
		expect(r.pronto).toBe(false);
	});

	it("sem git: git em falta, identidade e pasta sem conferir", async () => {
		const r = await verificar(
			com({
				"git --version": null,
				"git config user.name": null,
				"git remote get-url origin": null,
			}),
		);
		expect(estado(r, "git")).toBe("falta");
		expect(estado(r, "git-identidade")).toBe("nao-conferi");
		expect(estado(r, "pasta-sua")).toBe("nao-conferi");
		expect(r.pronto).toBe(false);
	});

	it("comando que demora → não consegui conferir, nunca falta", async () => {
		const r = await verificar(
			com({
				"git --version": DEMOROU,
				"claude --version": DEMOROU,
				"code --version": DEMOROU,
			}),
		);
		expect(estado(r, "git")).toBe("nao-conferi");
		expect(estado(r, "claude")).toBe("nao-conferi");
		expect(estado(r, "editor")).toBe("nao-conferi");
		for (const id of SKILLS) expect(estado(r, id)).toBe("nao-conferi");
		expect(r.pronto).toBe(false);
	});

	it("git config e remote que demoram → não consegui conferir", async () => {
		const r = await verificar(
			com({
				"git config user.name": DEMOROU,
				"git remote get-url origin": DEMOROU,
			}),
		);
		expect(estado(r, "git-identidade")).toBe("nao-conferi");
		expect(estado(r, "pasta-sua")).toBe("nao-conferi");
	});

	it("resposta sem versão → não consegui conferir", async () => {
		const r = await verificar(com({ "claude --version": "algo estranho" }));
		expect(estado(r, "claude")).toBe("nao-conferi");
	});

	it("rodar que lança não derruba a conferência", async () => {
		const quebrado: Rodar = async () => {
			throw new Error("C:\\Users\\José Silva\\boom");
		};
		const r = await verificar({ ...tudoCerto, rodar: quebrado });
		expect(r.itens.map((i) => i.id)).toEqual(IDS);
		expect(estado(r, "git")).toBe("nao-conferi");
		expect(estado(r, "claude")).toBe("nao-conferi");
		expect(r.pronto).toBe(false);
		expect(JSON.stringify(r)).not.toMatch(/José|Users|boom/);
		// Lançar não é demorar: a tela não pode dizer que o comando demorou.
		const git = r.itens.find((i) => i.id === "git") as Item;
		expect(git.detalhe).toBe("Respondeu de um jeito que eu não esperava.");
		expect(JSON.stringify(r)).not.toContain("demorou");
	});

	it("rodar que lança só no git config e no remote → não consegui conferir, sem 'demorou'", async () => {
		const base = falso(RESPOSTAS);
		const quebraAlguns: Rodar = async (cmd, args) => {
			if (cmd === "git" && args[0] !== "--version") throw new Error("x");
			return base(cmd, args);
		};
		const r = await verificar({ ...tudoCerto, rodar: quebraAlguns });
		for (const id of ["git-identidade", "pasta-sua"]) {
			const i = r.itens.find((x) => x.id === id) as Item;
			expect(i.estado).toBe("nao-conferi");
			expect(i.detalhe).not.toContain("demorou");
		}
	});

	it("o prazo padrão da conferência é 8 s", () => {
		expect(PRAZO_MS).toBe(8000);
	});

	it("comandos que nunca respondem: termina dentro do prazo, tudo sem conferir", async () => {
		const pedidos: (number | undefined)[] = [];
		const nuncaResponde: Rodar = (_cmd, _args, ms) => {
			pedidos.push(ms);
			return new Promise(() => {});
		};
		const t = Date.now();
		const r = await verificar({
			...tudoCerto,
			rodar: nuncaResponde,
			cabecalhos: new Promise(() => {}),
			prazoMs: 800,
		});
		const passou = Date.now() - t;
		expect(passou).toBeGreaterThanOrEqual(700);
		expect(passou).toBeLessThan(1500);
		expect(r.itens.map((i) => i.id)).toEqual(IDS);
		for (const id of ["git", "claude", "editor"]) {
			const i = r.itens.find((x) => x.id === id) as Item;
			expect(i.estado).toBe("nao-conferi");
			expect(i.detalhe).toBe("O comando demorou demais para responder.");
		}
		for (const id of ["git-identidade", "pasta-sua", ...SKILLS]) {
			expect(estado(r, id)).toBe("nao-conferi");
		}
		expect(estado(r, "cabecalhos")).toBe("nao-conferi");
		expect(r.pronto).toBe(false);
		// Cada comando recebe no máximo o que sobra do prazo.
		for (const ms of pedidos) expect(ms).toBeLessThanOrEqual(800);
	});

	it("o último comando só recebe o que sobra do prazo", async () => {
		const base = falso(RESPOSTAS);
		let msDaLista: number | undefined;
		const t = Date.now();
		const r = await verificar({
			...tudoCerto,
			rodar: async (cmd, args, ms) => {
				if (cmd === "claude" && args[0] === "--version") {
					await new Promise((ok) => setTimeout(ok, 300));
				}
				if (cmd === "claude" && args[0] === "plugin") {
					// rodar falso que respeita o ms recebido e estoura
					msDaLista = ms;
					await new Promise((ok) => setTimeout(ok, ms));
					return { ok: false, saida: "", demorou: true };
				}
				return base(cmd, args);
			},
			prazoMs: 1000,
		});
		expect(Date.now() - t).toBeLessThan(1500);
		expect(msDaLista).toBeLessThanOrEqual(700);
		expect(estado(r, "claude")).toBe("ok");
		expect(estado(r, "git")).toBe("ok");
		for (const id of SKILLS) expect(estado(r, id)).toBe("nao-conferi");
	});

	it("prazo quase no fim: nem começa um comando", async () => {
		const espiao = vi.fn<Rodar>(falso(RESPOSTAS));
		const r = await verificar({ ...tudoCerto, rodar: espiao, prazoMs: 100 });
		expect(espiao).not.toHaveBeenCalled();
		expect(estado(r, "git")).toBe("nao-conferi");
		expect(estado(r, "node")).toBe("ok");
	});

	it("cabeçalhos podem chegar como promessa", async () => {
		const r = await verificar({
			...tudoCerto,
			cabecalhos: Promise.resolve({ ...CABECALHOS }),
		});
		expect(estado(r, "cabecalhos")).toBe("ok");
		const falhou = await verificar({
			...tudoCerto,
			cabecalhos: Promise.reject(new Error("x")),
		});
		expect(estado(falhou, "cabecalhos")).toBe("nao-conferi");
	});

	it("em produção os cabeçalhos também têm prazo", async () => {
		const t = Date.now();
		const r = await verificar({
			...tudoCerto,
			producao: true,
			cabecalhos: new Promise(() => {}),
			prazoMs: 300,
		});
		expect(Date.now() - t).toBeLessThan(1000);
		expect(estado(r, "cabecalhos")).toBe("nao-conferi");
	});

	it("os dois comandos do Claude rodam por último, um de cada vez", async () => {
		const eventos: string[] = [];
		const base = falso(RESPOSTAS);
		const registra: Rodar = async (cmd, args) => {
			const nome = [cmd, ...args].join(" ");
			eventos.push(`começa ${nome}`);
			await new Promise((r) => setTimeout(r, 5));
			eventos.push(`termina ${nome}`);
			return base(cmd, args);
		};
		await verificar({ ...tudoCerto, rodar: registra });
		expect(eventos.slice(-4)).toEqual([
			"começa claude --version",
			"termina claude --version",
			"começa claude plugin list",
			"termina claude plugin list",
		]);
	});

	it("sem Claude Code não pede a lista de plugins", async () => {
		const espiao = vi.fn<Rodar>(
			falso({ ...RESPOSTAS, "claude --version": null }),
		);
		await verificar({ ...tudoCerto, rodar: espiao });
		const pedidos = espiao.mock.calls.map(([cmd, args]) =>
			[cmd, ...args].join(" "),
		);
		expect(pedidos).toContain("claude --version");
		expect(pedidos).not.toContain("claude plugin list");
	});

	it(".gitignore sem .env → segredos em falta; sem .gitignore → falta", async () => {
		const semEnv = await verificar({
			...tudoCerto,
			gitignore: "node_modules/\n",
		});
		expect(estado(semEnv, "segredos")).toBe("falta");
		expect(semEnv.pronto).toBe(false);
		const semArquivo = await verificar({ ...tudoCerto, gitignore: null });
		expect(estado(semArquivo, "segredos")).toBe("falta");
	});

	it.each([
		".env",
		"/.env",
		".env*",
		"*.env",
		"  .env  ",
		"# segredos\r\n.env*\r\n!.env.example\r\n",
	])(".gitignore com %j cobre o .env", async (gitignore) => {
		const r = await verificar({ ...tudoCerto, gitignore });
		expect(estado(r, "segredos")).toBe("ok");
	});

	it.each(["# .env", ".env.local", ".env/", "config/.env", ".env*\n!.env"])(
		".gitignore com %j não cobre o .env",
		async (gitignore) => {
			const r = await verificar({ ...tudoCerto, gitignore });
			expect(estado(r, "segredos")).toBe("falta");
		},
	);

	it("origin apontando para a demo → pasta-sua em aviso, e continua pronto", async () => {
		for (const origin of [
			"https://github.com/idearagencia/primeiro-sistema.git\n",
			"git@github.com:idearagencia/primeiro-sistema.git",
		]) {
			const r = await verificar(com({ "git remote get-url origin": origin }));
			expect(estado(r, "pasta-sua")).toBe("aviso");
			expect(r.pronto).toBe(true);
		}
	});

	it("origin apontando para outro repositório → pasta-sua ok", async () => {
		const r = await verificar(
			com({
				"git remote get-url origin": "https://github.com/fulana/meu-app.git",
			}),
		);
		expect(estado(r, "pasta-sua")).toBe("ok");
	});

	it("ligado fora do npm run dev (local:false) → so-local em falta", async () => {
		const r = await verificar({ ...tudoCerto, local: false });
		expect(estado(r, "so-local")).toBe("falta");
		expect(r.pronto).toBe(false);
	});

	it("pedido que não veio de localhost → so-local em falta", async () => {
		for (const host of ["192.0.2.10:3000", null]) {
			const r = await verificar({ ...tudoCerto, host });
			expect(estado(r, "so-local")).toBe("falta");
		}
	});

	it("falta um cabeçalho → cabecalhos em falta, dizendo qual", async () => {
		for (const nome of Object.keys(CABECALHOS)) {
			const cabecalhos: Record<string, string> = { ...CABECALHOS };
			delete cabecalhos[nome];
			const r = await verificar({ ...tudoCerto, cabecalhos });
			const item = r.itens.find((i) => i.id === "cabecalhos") as Item;
			expect(item.estado).toBe("falta");
			expect(item.detalhe).toContain(nome);
			expect(r.pronto).toBe(false);
		}
	});

	it("cabeçalhos com nome em minúsculas (como o fetch devolve) valem", async () => {
		const cabecalhos = Object.fromEntries(
			Object.entries(CABECALHOS).map(([k, v]) => [k.toLowerCase(), v]),
		);
		const r = await verificar({ ...tudoCerto, cabecalhos });
		expect(estado(r, "cabecalhos")).toBe("ok");
	});

	it("nosniff ou bloqueio de iframe com valor errado → falta", async () => {
		const a = await verificar({
			...tudoCerto,
			cabecalhos: { ...CABECALHOS, "X-Content-Type-Options": "sniff" },
		});
		expect(estado(a, "cabecalhos")).toBe("falta");
		const b = await verificar({
			...tudoCerto,
			cabecalhos: { ...CABECALHOS, "X-Frame-Options": "ALLOWALL" },
		});
		expect(estado(b, "cabecalhos")).toBe("falta");
	});

	it("não deu para ler os cabeçalhos → não consegui conferir", async () => {
		const r = await verificar({ ...tudoCerto, cabecalhos: null });
		expect(estado(r, "cabecalhos")).toBe("nao-conferi");
	});

	it("em produção não roda comando nenhum", async () => {
		const espiao = vi.fn();
		const r = await verificar({ ...tudoCerto, rodar: espiao, producao: true });
		expect(espiao).not.toHaveBeenCalled();
		expect(r.producao).toBe(true);
		expect(r.itens.map((i) => i.id)).toEqual(["cabecalhos"]);
		expect(r.pronto).toBe(true);
	});

	it("nada da saída bruta vaza para a tela", async () => {
		const r = await verificar(
			com({
				"git --version": "git version 2.47.1 C:\\Users\\José Silva\\x",
				"git config user.name": "José Silva",
				"git remote get-url origin":
					"https://José:senha123@github.com/Users/primeiro-sistema.git",
				"claude --version": "2.1.211 (Claude Code) /Users/José/.local/bin",
				"code --version": "1.105.0\nC:\\Users\\José Silva\\AppData",
			}),
		);
		expect(JSON.stringify(r)).not.toMatch(/José|Users|senha123/);
	});
});

describe("frase", () => {
	const item = (estado: Item["estado"], conta = true): Item => ({
		id: "x",
		grupo: "ferramentas",
		titulo: "X",
		estado,
		detalhe: "",
		conta,
		ajuda: "",
	});
	const resultado = (itens: Item[]): Resultado => ({
		itens,
		pronto: itens.filter((i) => i.conta).every((i) => i.estado === "ok"),
		producao: false,
	});

	it("pronto → comemorando", () => {
		expect(frase(resultado([item("ok"), item("aviso", false)]))).toEqual({
			pose: "comemorando",
			titulo: "Seu computador está pronto!",
			texto:
				"Você instalou as ferramentas e rodou um sistema usando o guia do DiegoHacks. Pode começar a criar.",
		});
	});

	it("faltando 3 → pensando, contando só os que contam", () => {
		const r = resultado([
			item("falta"),
			item("nao-conferi"),
			item("falta"),
			item("ok"),
			item("falta", false),
			item("aviso", false),
		]);
		expect(frase(r)).toEqual({
			pose: "pensando",
			titulo: "Quase lá.",
			texto: "Faltam 3 itens. Clique em cada um para ver como resolver.",
		});
	});

	it("faltando 1 → singular", () => {
		expect(frase(resultado([item("falta"), item("ok")])).texto).toBe(
			"Falta 1 item. Clique nele para ver como resolver.",
		);
	});
});
