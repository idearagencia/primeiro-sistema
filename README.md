# Meu primeiro sistema

Um "hello world caprichado" do curso de introdução do **DiegoHacks**. Você liga este projeto no seu
computador e ele mostra, na tela, se as ferramentas estão instaladas e se você pode começar a criar
com segurança.

Roda **só no seu computador**: sem login, sem banco de dados, sem `.env` e sem serviço de fora.

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
