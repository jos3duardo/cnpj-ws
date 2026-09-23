jest.mock("axios");

const axios = require("axios");
const { Cnpj, ErroCnpj, ErroValidacao, ErroConsulta } = require("../lib/cnpj");
const pacote = require("../index");

const PETROBRAS = "33000167000101";
const URL_PADRAO = "https://api.opencnpj.org/{CNPJ}";
const TIMEOUT_PADRAO = 10000;

const RESPOSTA = {
  cnpj: PETROBRAS,
  razao_social: "PETROLEO BRASILEIRO S A PETROBRAS",
  situacao_cadastral: "Ativa",
  uf: "RJ",
};

/** Simula uma resposta HTTP de erro do axios (com `response`). */
function erroHttp(status) {
  return Object.assign(new Error(`Request failed with status code ${status}`), {
    response: { status },
  });
}

let cnpj;

beforeEach(() => {
  cnpj = new Cnpj();
  axios.get.mockResolvedValue({ data: RESPOSTA });
});

describe("Construtor", () => {
  test("usa a URL e o timeout padrão", () => {
    expect(cnpj.urlApiCnpj).toBe(URL_PADRAO);
    expect(cnpj.timeout).toBe(TIMEOUT_PADRAO);
  });

  test("aceita url e timeout customizados", () => {
    const custom = new Cnpj({ url: "https://exemplo.test/{CNPJ}", timeout: 500 });

    expect(custom.urlApiCnpj).toBe("https://exemplo.test/{CNPJ}");
    expect(custom.timeout).toBe(500);
  });

  test("timeout 0 é respeitado (axios trata como sem timeout)", () => {
    expect(new Cnpj({ timeout: 0 }).timeout).toBe(0);
  });

  test("url sem o marcador {CNPJ} falha na construção", () => {
    expect(() => new Cnpj({ url: "https://exemplo.test/cnpj" })).toThrow(
      ErroValidacao,
    );
  });

  test("url customizada com marcador é usada na requisição", async () => {
    await new Cnpj({ url: "https://exemplo.test/x/{CNPJ}.json" }).consultar(
      PETROBRAS,
    );

    expect(axios.get).toHaveBeenCalledWith(
      `https://exemplo.test/x/${PETROBRAS}.json`,
      { timeout: TIMEOUT_PADRAO },
    );
  });
});

describe("consultar - normalização da entrada", () => {
  test.each([
    ["string", PETROBRAS],
    ["número", 33000167000101],
    ["formatado", "33.000.167/0001-01"],
    ["com espaços", "33 000 167 000 101"],
  ])("aceita CNPJ como %s", async (_rotulo, entrada) => {
    await cnpj.consultar(entrada);

    expect(axios.get).toHaveBeenCalledWith(
      `https://api.opencnpj.org/${PETROBRAS}`,
      { timeout: TIMEOUT_PADRAO },
    );
  });

  test("retorna o corpo da resposta, não o envelope do axios", async () => {
    await expect(cnpj.consultar(PETROBRAS)).resolves.toEqual(RESPOSTA);
  });
});

describe("consultar - validação", () => {
  test.each([
    ["undefined", undefined],
    ["null", null],
    ["string vazia", ""],
  ])("rejeita quando o CNPJ é %s", async (_rotulo, entrada) => {
    await expect(cnpj.consultar(entrada)).rejects.toThrow(
      "Você precisa informar um CNPJ valido",
    );
    expect(axios.get).not.toHaveBeenCalled();
  });

  test.each([
    ["texto sem dígitos", "abc"],
    ["só pontuação", "--//.."],
    ["NaN", NaN],
    ["dígitos de menos", 12345],
    ["dígitos demais", "330001670001010"],
    ["zero", 0],
    ["false", false],
  ])("rejeita %s sem chamar a API", async (_rotulo, entrada) => {
    await expect(cnpj.consultar(entrada)).rejects.toThrow("CNPJ inválido");
    expect(axios.get).not.toHaveBeenCalled();
  });

  test("entrada inválida nunca vira requisição à raiz da API", async () => {
    await cnpj.consultar("abc").catch(() => {});

    expect(axios.get).not.toHaveBeenCalled();
  });

  test("rejeita com ErroValidacao, capturável por .catch()", async () => {
    const erro = await cnpj.consultar().catch((e) => e);

    expect(erro).toBeInstanceOf(ErroValidacao);
    expect(erro).toBeInstanceOf(ErroCnpj);
    expect(erro).toBeInstanceOf(Error);
  });
});

describe("consultar - erros da API", () => {
  test("404 vira o erro documentado de CNPJ não encontrado", async () => {
    axios.get.mockRejectedValue(erroHttp(404));

    await expect(cnpj.consultar(PETROBRAS)).rejects.toMatchObject({
      Erro: 404,
      MsgErro: "CNPJ não encontrado.",
      message: "CNPJ não encontrado.",
    });
  });

  test("status diferente de 404 preserva o status real", async () => {
    axios.get.mockRejectedValue(erroHttp(500));

    await expect(cnpj.consultar(PETROBRAS)).rejects.toMatchObject({
      Erro: 500,
      MsgErro: "Erro 500 ao consultar a API.",
    });
  });

  test("o erro da API é um Error de verdade, não objeto literal", async () => {
    axios.get.mockRejectedValue(erroHttp(429));

    const erro = await cnpj.consultar(PETROBRAS).catch((e) => e);

    expect(erro).toBeInstanceOf(ErroConsulta);
    expect(erro).toBeInstanceOf(ErroCnpj);
    expect(erro.message).toBe("Erro 429 ao consultar a API.");
    expect(erro.stack).toBeDefined();
  });

  test("erro de rede (sem response) propaga o erro original", async () => {
    const original = Object.assign(new Error("timeout"), {
      code: "ECONNABORTED",
    });
    axios.get.mockRejectedValue(original);

    await expect(cnpj.consultar(PETROBRAS)).rejects.toBe(original);
  });
});

describe("consultaCNPJ - alias depreciado", () => {
  test("consulta igual a consultar()", async () => {
    await expect(cnpj.consultaCNPJ(PETROBRAS)).resolves.toEqual(RESPOSTA);
  });

  test.each([
    ["undefined", undefined],
    ["0", 0],
    ["false", false],
  ])("lança de forma síncrona quando o CNPJ é %s", (_rotulo, entrada) => {
    expect(() => cnpj.consultaCNPJ(entrada)).toThrow(
      "Você precisa informar um CNPJ valido",
    );
    expect(axios.get).not.toHaveBeenCalled();
  });

  test("lança de forma síncrona para formato inválido", () => {
    expect(() => cnpj.consultaCNPJ("12345")).toThrow("CNPJ inválido");
    expect(axios.get).not.toHaveBeenCalled();
  });
});

describe("Formas de importar o pacote", () => {
  test("consultar() direto, sem new", async () => {
    await expect(pacote.consultar(PETROBRAS)).resolves.toEqual(RESPOSTA);
  });

  test("consultar() por destructuring", async () => {
    const { consultar } = pacote;

    await expect(consultar(PETROBRAS)).resolves.toEqual(RESPOSTA);
  });

  test("consultaCNPJ() direto continua funcionando", async () => {
    await expect(pacote.consultaCNPJ(PETROBRAS)).resolves.toEqual(RESPOSTA);
  });

  test("o export principal é a classe", () => {
    expect(pacote).toBe(Cnpj);
    expect(pacote.Cnpj).toBe(Cnpj);
    expect(new pacote()).toBeInstanceOf(Cnpj);
  });

  test("as classes de erro são exportadas", () => {
    expect(pacote.ErroCnpj).toBe(ErroCnpj);
    expect(pacote.ErroValidacao).toBe(ErroValidacao);
    expect(pacote.ErroConsulta).toBe(ErroConsulta);
  });

  test("lib/cnpj.js não carrega a superfície montada em index.js", () => {
    const lib = require("../lib/cnpj");

    expect(lib.consultar).toBeUndefined();
    expect(lib).not.toBe(pacote);
  });
});
