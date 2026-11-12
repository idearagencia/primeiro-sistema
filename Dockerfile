# syntax=docker/dockerfile:1
# Imagem para servidor próprio (Coolify ou qualquer Docker). Na Vercel este arquivo não é usado.
# Sem `output: "standalone"`: a doc do Next avisa de problema com links simbólicos no Windows,
# e a pasta inteira cabe bem numa imagem pequena como esta.

FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
# --include=dev: o Coolify passa NODE_ENV=production no build e o next build precisa das
# dependências de desenvolvimento (tailwind, typescript).
RUN npm ci --include=dev

COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000

COPY --from=builder --chown=node:node /app /app
# Usuário sem poder de administrador: se alguém invadir o sistema, não manda no container.
USER node

EXPOSE 3000

# A plataforma pergunta a cada 30 s se o sistema está de pé (rota /api/health).
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
	CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Dentro do container o servidor escuta em 0.0.0.0, senão o proxy da plataforma não alcança.
# Quem é atendido continua decidido pela lista de endereços (src/proxy.ts). O `npm start`
# no seu computador segue só em 127.0.0.1.
CMD ["sh", "-c", "exec node node_modules/next/dist/bin/next start -H 0.0.0.0 -p \"${PORT:-3000}\""]
