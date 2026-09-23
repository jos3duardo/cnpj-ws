/**
 * Testes de integração: batem na API OpenCNPJ de verdade.
 *
 * Não rodam no `npm test` nem no CI — dependem de rede e do conteúdo do
 * cadastro da Receita, que muda sem aviso. Rodar com `npm run test:integration`.
 */
const { Cnpj } = require("../../lib/cnpj");

const PETROBRAS = "33000167000101";
const PAUSA_MS = 2000;

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
  test("retorna os dados cadastrais básicos", async () => {
    const resultado = await cnpj.consultar(PETROBRAS);

    expect(resultado.cnpj).toBe(PETROBRAS);
    expect(resultado).toHaveProperty("razao_social");
    expect(resultado).toHaveProperty("situacao_cadastral");
    expect(resultado).toHaveProperty("uf");
  });

  test("remove a formatação antes de consultar", async () => {
    const resultado = await cnpj.consultar("33.000.167/0001-01");

    expect(resultado.cnpj).toBe(PETROBRAS);
  });

  test("rejeita CNPJ inexistente com 404", async () => {
    await expect(cnpj.consultar("00000000000000")).rejects.toMatchObject({
      Erro: 404,
      MsgErro: "CNPJ não encontrado.",
    });
  });
});
