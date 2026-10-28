/**
 * Testes de integração: batem na API OpenCNPJ de verdade.
 *
 * Não rodam no `npm test` nem no CI — dependem de rede e do conteúdo do
 * cadastro da Receita, que muda sem aviso. Rodar com `npm run test:integration`.
 *
 * O nome não termina em `.test.js` de propósito: assim o `node --test` sem
 * argumentos do `npm test` não o descobre. O node:test roda os testes de um
 * mesmo arquivo em série, então a pausa do `beforeEach` basta para espaçar as
 * chamadas.
 */
const { test, describe, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { Cnpj } = require("../../lib/cnpj");

const PETROBRAS = "33000167000101";
const PAUSA_MS = 2000;
// Prazo por teste. Fica aqui, e não no script, porque `--test-timeout` não
// existe no Node 18.
const OPCOES = { timeout: 20000 };

const cnpj = new Cnpj();

let primeiro = true;

// Espaça as chamadas para respeitar o rate limit, sem pagar a pausa antes da
// primeira nem depois da última.
beforeEach(async () => {
  if (primeiro) {
    primeiro = false;
    return;
  }
  await new Promise((resolve) => setTimeout(resolve, PAUSA_MS));
});

describe("Integração com a API OpenCNPJ", () => {
  test("retorna os dados cadastrais básicos", OPCOES, async () => {
    const resultado = await cnpj.consultar(PETROBRAS);

    assert.equal(resultado.cnpj, PETROBRAS);
    assert.ok("razao_social" in resultado);
    assert.ok("situacao_cadastral" in resultado);
    assert.ok("uf" in resultado);
  });

  test("remove a formatação antes de consultar", OPCOES, async () => {
    const resultado = await cnpj.consultar("33.000.167/0001-01");

    assert.equal(resultado.cnpj, PETROBRAS);
  });

  // A OpenCNPJ aceita o formato alfanumérico (responde 404, não 400, para um
  // CNPJ válido sem cadastro). Trocar por um CNPJ alfanumérico real quando
  // houver um público conhecido.
  test("aceita o formato alfanumérico (exemplo da Receita, sem cadastro)", OPCOES, async () => {
    await assert.rejects(cnpj.consultar("12.ABC.345/01DE-35"), { Erro: 404 });
  });

  test("rejeita CNPJ inexistente com 404", OPCOES, async () => {
    await assert.rejects(cnpj.consultar("00000000000000"), {
      Erro: 404,
      MsgErro: "CNPJ não encontrado.",
    });
  });
});
