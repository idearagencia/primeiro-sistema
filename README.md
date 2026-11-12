# Meu primeiro sistema

Um "hello world caprichado" do curso de introdução do **DiegoHacks**. Você liga este projeto no seu
computador e ele mostra, na tela, se as ferramentas estão instaladas e se você pode começar a criar
com segurança.

Roda no seu computador e, quando você quiser, vai para a internet (Vercel ou um servidor com
Docker/Coolify): sem login, sem banco de dados, sem `.env` e sem serviço de fora.

## Os três comandos

Depois de baixar a pasta e rodar `npm install` uma vez:

```
npm run comecar
npm run dev
npm run conferir
```

- `npm run comecar` prepara a pasta para ser sua.
- `npm run dev` liga o servidor. Abra http://localhost:3000 no navegador.
- `npm run conferir` (em outra janela do terminal) mostra no terminal o mesmo que a tela.

Precisa do Node.js 22 ou mais novo.

## Colocar na internet

- **Vercel:** importe o repositório e publique. Não precisa criar variável: o endereço que a
  Vercel informa já é aceito.
- **Servidor próprio (Coolify ou Docker):** o `Dockerfile` está pronto (porta 3000, saúde em
  `/api/health`, usuário sem poder de administrador). O endereço que o Coolify informa já é aceito.
- **Outro endereço** (um domínio a mais): crie a variável `HOSTS_PERMITIDOS` com os nomes separados
  por vírgula, por exemplo `seudominio.com.br,www.seudominio.com.br`.

Qualquer outro endereço recebe 403. No seu computador nada muda: `npm run dev` e `npm start` só
respondem em `127.0.0.1`.

Para conferir de fora:

```
npm run no-ar -- https://seu-endereco
```

Ele confere o cadeado (HTTPS), as quatro proteções, o `/api/health` e que a conferência do
computador está fechada. Com tudo certo, a última linha é **No ar, com cadeado.**

## Os testes

- `npm run test:run` roda os testes rápidos.
- `npm run build` e depois `npm run fumaca` ligam a demo de verdade, em produção e em
  desenvolvimento, e conferem a tela, os cabeçalhos de proteção e o peso da página.

**Peso da página:** a página `/` em produção (HTML + scripts) pesava **601.881 bytes** quando foi
medida (Next 16.4.5). O teste de fumaça falha se ela passar de **722.258 bytes** (medido + 20%).

## O curso

O passo a passo completo, para Windows e Mac, está em
https://ia.diegohacks.com.br/cursos/introducao

## Licença

O código está sob a licença MIT (veja `LICENSE`). A arte do mascote IAHacks e a marca DiegoHacks
**não** estão cobertas pela MIT: veja `public/mascote/LICENCA.md`. A fonte de pixel (VT323) vem
dentro do projeto, sob a licença SIL Open Font License: veja `src/app/fontes/VT323-OFL.txt`.
