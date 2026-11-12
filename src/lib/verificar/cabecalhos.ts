// Cabeçalhos de segurança que toda resposta da demo leva.
// O next.config.ts aplica estes valores e o verificador confere se eles chegaram.

const emDesenvolvimento = process.env.NODE_ENV === "development";

// CSP sem nonce, como na doc do Next (guia "Content Security Policy", seção "Without Nonces").
// Nenhuma origem de fora: só o próprio site.
// Em desenvolvimento o React precisa de 'unsafe-eval' (mensagens de erro mais completas) e o
// recarregamento automático usa um WebSocket no próprio computador.
const CSP = [
	"default-src 'self'",
	`script-src 'self' 'unsafe-inline'${emDesenvolvimento ? " 'unsafe-eval'" : ""}`,
	"style-src 'self' 'unsafe-inline'",
	"img-src 'self' blob: data:",
	"font-src 'self'",
	`connect-src 'self'${emDesenvolvimento ? " ws://localhost:* ws://127.0.0.1:*" : ""}`,
	"object-src 'none'",
	"base-uri 'self'",
	"form-action 'self'",
	"frame-ancestors 'none'",
].join("; ");

export const CABECALHOS: Record<string, string> = {
	"Content-Security-Policy": CSP,
	"X-Content-Type-Options": "nosniff",
	"Referrer-Policy": "strict-origin-when-cross-origin",
	"X-Frame-Options": "DENY",
};

// No seu computador a demo só responde em localhost ou 127.0.0.1, com qualquer porta.
const HOST_LOCAL = /^(localhost|127\.0\.0\.1)(:\d{1,5})?$/i;

export function hostLocal(host: string | null): boolean {
	return host !== null && HOST_LOCAL.test(host);
}

type Ambiente = Record<string, string | undefined>;

// Variáveis que a plataforma preenche sozinha com o endereço do sistema (só o domínio, ou o
// endereço com https://; mais de um vem separado por vírgula). Nomes conferidos em 2026-11-11:
// - Vercel: VERCEL_PROJECT_PRODUCTION_URL, VERCEL_URL e VERCEL_BRANCH_URL, sem o https://.
//   https://vercel.com/docs/environment-variables/system-environment-variables
// - Coolify: COOLIFY_FQDN e COOLIFY_URL ("Application domain names" / "Application URLs").
//   Conforme a versão, uma traz os endereços com https:// e a outra só os domínios; as duas
//   separam por vírgula. https://coolify.io/docs/knowledge-base/environment-variables e
//   generate_coolify_env_variables em app/Jobs/ApplicationDeploymentJob.php
//   (https://github.com/coollabsio/coolify).
const DA_PLATAFORMA = [
	"VERCEL_PROJECT_PRODUCTION_URL",
	"VERCEL_URL",
	"VERCEL_BRANCH_URL",
	"COOLIFY_FQDN",
	"COOLIFY_URL",
] as const;

const DOMINIO =
	/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

// Só o nome: sem https://, sem caminho, sem porta, em minúsculas.
function soONome(texto: string): string {
	return texto
		.trim()
		.toLowerCase()
		.replace(/^[a-z][a-z0-9+.-]*:\/\//, "")
		.split(/[/?#]/)[0]
		.replace(/:\d{1,5}$/, "")
		.replace(/\.$/, "");
}

// "https://Meu.Site.com.br:443/x, outro.com.br" → ["meu.site.com.br", "outro.com.br"].
// O que não parece domínio fica de fora.
export function lerListaDeHosts(texto: string | undefined): string[] {
	if (!texto) return [];
	return texto
		.split(",")
		.map(soONome)
		.filter((h) => DOMINIO.test(h));
}

// Os endereços da internet em que a demo pode responder: a lista HOSTS_PERMITIDOS (separada
// por vírgula) mais o endereço que a plataforma informa. Fora de produção, nenhum.
export function hostsPermitidos(env: Ambiente = process.env): string[] {
	if (env.NODE_ENV !== "production") return [];
	const textos = [env.HOSTS_PERMITIDOS, ...DA_PLATAFORMA.map((n) => env[n])];
	return [...new Set(textos.flatMap(lerListaDeHosts))];
}

// No seu computador: só localhost/127.0.0.1. Na internet (só em produção): só os endereços da
// lista. Sem lista, nenhum pedido de fora passa: seguro por padrão.
export function hostPermitido(
	host: string | null,
	env: Ambiente = process.env,
): boolean {
	if (host === null) return false;
	if (hostLocal(host)) return true;
	const nome = host
		.trim()
		.toLowerCase()
		.replace(/:\d{1,5}$/, "")
		.replace(/\.$/, "");
	return DOMINIO.test(nome) && hostsPermitidos(env).includes(nome);
}
