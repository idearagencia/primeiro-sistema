// npm run no-ar -- https://seu-endereco: confere de fora, igual no Windows e no Mac, se a demo
// está na internet com cadeado (HTTPS válido), com as quatro proteções, com o /api/health de pé
// e com a conferência do computador fechada. A última linha é "No ar, com cadeado." quando
// está tudo certo. Sai com 0 se está tudo certo e 1 se falta algo.
// Usa process.exitCode em vez de process.exit(): no Windows, sair à força logo depois de um
// fetch derruba o Node com um erro interno.
import { conferirNoAr } from "./lib.mjs";

// O primeiro argumento que não é opção (no PowerShell o "--" às vezes não chega).
const endereco = process.argv.slice(2).find((a) => !a.startsWith("-"));

process.exitCode = (await conferirNoAr(endereco)) ? 0 : 1;
