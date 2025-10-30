const CNPJ = require("../lib/cnpj");

describe("CNPJ Library Tests", () => {
  let cnpj;

  beforeEach(() => {
    cnpj = new CNPJ();
  });

  afterEach(async () => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
  });

  describe("Constructor", () => {
    test("deve criar uma instância com URL da API configurada", () => {
      expect(cnpj).toBeDefined();
      expect(cnpj.urlApiCnpj).toBe("https://api.opencnpj.org/{CNPJ}");
    });
  });

  describe("consultaCNPJ - Validação de Parâmetros", () => {
    test("deve lançar erro quando CNPJ não é informado", () => {
      expect(() => {
        cnpj.consultaCNPJ();
      }).toThrow("Você precisa informar um CNPJ valido");
    });

    test("deve aceitar CNPJ como string", async () => {
      const resultado = await cnpj.consultaCNPJ("33000167000101");
      expect(resultado).toBeDefined();
      expect(resultado.cnpj).toBe("33000167000101");
    }, 20000);

    test("deve aceitar CNPJ como número", async () => {
      const resultado = await cnpj.consultaCNPJ(33000167000101);
      expect(resultado).toBeDefined();
      expect(resultado.cnpj).toBe("33000167000101");
    }, 20000);
  });

  describe("consultaCNPJ - Consultas Válidas", () => {
    test("deve retornar dados da Petrobras", async () => {
      const resultado = await cnpj.consultaCNPJ("33000167000101");
      expect(resultado).toBeDefined();
      expect(resultado.cnpj).toBe("33000167000101");
      expect(resultado.razao_social).toBe("PETROLEO BRASILEIRO S A PETROBRAS");
    }, 20000);

    test("deve retornar dados cadastrais básicos", async () => {
      const resultado = await cnpj.consultaCNPJ("33000167000101");
      expect(resultado).toHaveProperty("cnpj");
      expect(resultado).toHaveProperty("razao_social");
      expect(resultado).toHaveProperty("situacao_cadastral");
      expect(resultado).toHaveProperty("uf");
    }, 20000);
  });

  describe("consultaCNPJ - Tratamento de Erros", () => {
    test("deve rejeitar para CNPJ inválido", async () => {
      await expect(cnpj.consultaCNPJ("00000000000000")).rejects.toEqual({
        Erro: 404,
        MsgErro: "CNPJ não encontrado.",
      });
    }, 20000);
  });

  describe("consultaCNPJ - Formatação", () => {
    test("deve remover formatação do CNPJ", async () => {
      const resultado = await cnpj.consultaCNPJ("33.000.167/0001-01");
      expect(resultado).toBeDefined();
      expect(resultado.cnpj).toBe("33000167000101");
    }, 20000);
  });
});
