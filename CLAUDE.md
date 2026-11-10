@AGENTS.md

# Meu primeiro sistema

Projeto de exemplo do curso de introdução do DiegoHacks. Uma página que confere se o computador
está pronto para criar com IA. Roda só no computador da pessoa: sem login, sem banco, sem `.env`.

> Este arquivo é lido pelo Claude Code toda vez que você abre o projeto. A linha `@AGENTS.md` lá em
> cima traz as regras que o próprio Next.js escreve; não apague o `AGENTS.md`. Use este arquivo como
> modelo para os seus projetos: diga como rodar, como conferir e quais regras não podem ser quebradas.

## Como rodar

- `npm install` — baixa as dependências (uma vez).
- `npm run comecar` — prepara a pasta (pode rodar de novo sem estragar nada).
- `npm run dev` — liga o servidor em http://localhost:3000. Ctrl+C para parar.

## Como conferir

- `npm run conferir` — em outra janela do terminal, com o servidor ligado.
- `npm run check` — formata e confere o código (Biome + TypeScript).
- `npm run test:run` — roda os testes.
- Antes de dizer que algo está pronto, rode `npm run check` e `npm run test:run`.

## Regras

- Nenhum segredo no código: senha, token e chave nunca entram em arquivo do projeto.
- `.env` fica fora do Git (o `.gitignore` já cobre `.env*`). Nunca remova essa linha.
- O servidor só responde no seu computador (`127.0.0.1`). Não mude isso.
- Comandos que a demo roda são fixos no código. Nada que vem da página vira comando.
- Não desligue as confirmações do Claude Code: leia o que ele vai fazer antes de aprovar.
