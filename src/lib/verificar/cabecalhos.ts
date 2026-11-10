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

// A demo só responde no computador da pessoa: localhost ou 127.0.0.1, com qualquer porta.
const HOST_LOCAL = /^(localhost|127\.0\.0\.1)(:\d{1,5})?$/i;

export function hostPermitido(host: string | null): boolean {
	return host !== null && HOST_LOCAL.test(host);
}
