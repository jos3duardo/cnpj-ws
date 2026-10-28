const {
  Cnpj,
  ErroCnpj,
  ErroValidacao,
  ErroConsulta,
  ErroTransporte,
  normalizarCnpj,
  validarCnpj,
} = require("../lib/cnpj");
const pacote = require("../index");

const PETROBRAS = "33000167000101";
// Exemplo oficial da Receita (Perguntas e Respostas do CNPJ alfanumérico, p. 14).
const ALFANUMERICO = "12ABC34501DE35";
const URL_PADRAO = "https://api.opencnpj.org/{CNPJ}";
const TIMEOUT_PADRAO = 10000;
const OPCOES_FETCH = {
  headers: { accept: "application/json" },
  redirect: "manual",
  signal: expect.any(AbortSignal),
};

const RESPOSTA = {
  cnpj: PETROBRAS,
  razao_social: "PETROLEO BRASILEIRO S A PETROBRAS",
  situacao_cadastral: "Ativa",
  uf: "RJ",
};

/** Resposta HTTP de verdade; o corpo só pode ser lido uma vez. */
function resposta(status, corpo = RESPOSTA) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "content-type": "application/json" },
  });
}

let cnpj;

beforeEach(() => {
  cnpj = new Cnpj();
  global.fetch = jest.fn(async () => resposta(200));
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

  test("limita a resposta a 256 KiB e não segue redirect por padrão", () => {
    expect(cnpj.maxContentLength).toBe(256 * 1024);
    expect(cnpj.maxRedirects).toBe(0);
  });

  test("maxContentLength e maxRedirects são configuráveis", () => {
    const custom = new Cnpj({ maxContentLength: 1000, maxRedirects: 2 });

    expect(custom.maxContentLength).toBe(1000);
    expect(custom.maxRedirects).toBe(2);
  });

  test("timeout 0 é respeitado (sem prazo)", () => {
    expect(new Cnpj({ timeout: 0 }).timeout).toBe(0);
  });

  test("timeout 0 não cria signal de prazo total", async () => {
    await new Cnpj({ timeout: 0 }).consultar(PETROBRAS);

    expect(fetch.mock.calls[0][1]).not.toHaveProperty("signal");
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

    expect(fetch).toHaveBeenCalledWith(
      `https://exemplo.test/x/${PETROBRAS}.json`,
      OPCOES_FETCH,
    );
  });
});

describe("Construtor - validação das opções", () => {
  test.each([
    ["sem esquema", "api.exemplo.test/{CNPJ}"],
    ["ftp", "ftp://exemplo.test/{CNPJ}"],
    ["data:", "data:application/json,{CNPJ}"],
    ["com usuário e senha", "https://usuario:senha@exemplo.test/{CNPJ}"],
  ])("recusa url %s, em vez de falhar como rede a cada consulta", (_r, url) => {
    expect(() => new Cnpj({ url })).toThrow(ErroValidacao);
  });

  test.each([
    ["fracionário", { timeout: 1.5 }],
    ["string", { timeout: "5000" }],
    ["acima do teto do setTimeout", { timeout: 2 ** 33 }],
    ["negativo", { timeout: -1 }],
    ["maxContentLength abaixo de -1", { maxContentLength: -2 }],
    ["maxRedirects fracionário", { maxRedirects: 0.5 }],
    ["fetch que não é função", { fetch: "nao" }],
  ])("recusa opção inválida: %s", (_r, opcoes) => {
    expect(() => new Cnpj(opcoes)).toThrow(ErroValidacao);
  });

  test("a mensagem de URL com credencial não repete a senha", () => {
    expect(() => new Cnpj({ url: "https://u:senha123@exemplo.test/{CNPJ}" }))
      .toThrow(expect.objectContaining({
        message: expect.not.stringContaining("senha123"),
      }));
  });

  test("urlApiCnpj alterada depois do construtor ainda é validada", async () => {
    const mutada = new Cnpj();
    mutada.urlApiCnpj = 'data:application/json,{"razao_social":"X"}{CNPJ}';

    await expect(mutada.consultar(PETROBRAS)).rejects.toBeInstanceOf(
      ErroValidacao,
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  test("fetch injetado é usado no lugar do global", async () => {
    const proprio = jest.fn(async () => resposta(200));

    await new Cnpj({ fetch: proprio }).consultar(PETROBRAS);

    expect(proprio).toHaveBeenCalledWith(
      `https://api.opencnpj.org/${PETROBRAS}`,
      OPCOES_FETCH,
    );
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("consultar - redirect", () => {
  /** 302 apontando para `destino`, com corpo vazio. */
  const redirect = (destino) =>
    new Response(null, { status: 302, headers: { location: destino } });

  test.each([
    ["data:", 'data:application/json,{"razao_social":"FORJADA"}'],
    ["https → http", "http://api.opencnpj.org/outro"],
    ["file:", "file:///etc/passwd"],
    ["Location malformado", "http://[::1"],
    ["outro host", "https://169.254.169.254/latest/meta-data/"],
    ["mesmo host, outra porta", "https://api.opencnpj.org:8443/x"],
  ])("não segue redirect para %s, mesmo com maxRedirects", async (_r, destino) => {
    fetch.mockResolvedValueOnce(redirect(destino));

    const erro = await new Cnpj({ maxRedirects: 5 })
      .consultar(PETROBRAS)
      .catch((e) => e);

    expect(erro).toBeInstanceOf(ErroConsulta);
    expect(erro.Erro).toBe(302);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe("consultar - corpo da resposta", () => {
  test("JSON com BOM UTF-8 é aceito, como no axios", async () => {
    fetch.mockResolvedValue(
      new Response("\uFEFF" + JSON.stringify(RESPOSTA)),
    );

    await expect(cnpj.consultar(PETROBRAS)).resolves.toEqual(RESPOSTA);
  });

  test.each([
    ["204", () => new Response(null, { status: 204 })],
    ["200 vazio", () => new Response("")],
  ])("%s vira RESPOSTA_INVALIDA dizendo que veio sem corpo", async (_r, r) => {
    fetch.mockResolvedValue(r());

    await expect(cnpj.consultar(PETROBRAS)).rejects.toMatchObject({
      code: "RESPOSTA_INVALIDA",
      message: "A API respondeu sem corpo.",
    });
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

    expect(fetch).toHaveBeenCalledWith(
      `https://api.opencnpj.org/${PETROBRAS}`,
      OPCOES_FETCH,
    );
  });

  test("retorna o corpo da resposta já convertido de JSON", async () => {
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
    expect(fetch).not.toHaveBeenCalled();
  });

  test.each([
    ["texto sem dígitos", "abc"],
    ["só pontuação", "--//.."],
    ["NaN", NaN],
    ["dígitos de menos", 12345],
    ["dígitos demais", "330001670001010"],
    ["letra no dígito verificador", "12ABC34501DE3A"],
    ["zero", 0],
    ["false", false],
  ])("rejeita %s sem chamar a API", async (_rotulo, entrada) => {
    await expect(cnpj.consultar(entrada)).rejects.toThrow("CNPJ inválido");
    expect(fetch).not.toHaveBeenCalled();
  });

  test("entrada inválida nunca vira requisição à raiz da API", async () => {
    await cnpj.consultar("abc").catch(() => {});

    expect(fetch).not.toHaveBeenCalled();
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
    fetch.mockResolvedValue(resposta(404, {}));

    await expect(cnpj.consultar(PETROBRAS)).rejects.toMatchObject({
      Erro: 404,
      MsgErro: "CNPJ não encontrado.",
      message: "CNPJ não encontrado.",
    });
  });

  test("status diferente de 404 preserva o status real", async () => {
    fetch.mockResolvedValue(resposta(500, {}));

    await expect(cnpj.consultar(PETROBRAS)).rejects.toMatchObject({
      Erro: 500,
      MsgErro: "Erro 500 ao consultar a API.",
    });
  });

  test("o erro da API é um Error de verdade, não objeto literal", async () => {
    fetch.mockResolvedValue(resposta(429, {}));

    const erro = await cnpj.consultar(PETROBRAS).catch((e) => e);

    expect(erro).toBeInstanceOf(ErroConsulta);
    expect(erro).toBeInstanceOf(ErroCnpj);
    expect(erro.message).toBe("Erro 429 ao consultar a API.");
    expect(erro.stack).toBeDefined();
  });

  test("erro de rede vira ErroTransporte com o erro original em cause", async () => {
    const original = new TypeError("fetch failed");
    fetch.mockRejectedValue(original);

    const erro = await cnpj.consultar(PETROBRAS).catch((e) => e);

    expect(erro).toBeInstanceOf(ErroTransporte);
    expect(erro).toBeInstanceOf(ErroCnpj);
    expect(erro.code).toBe("FALHA_DE_REDE");
    expect(erro.cause).toBe(original);
  });

  test("corpo que não é JSON vira ErroTransporte RESPOSTA_INVALIDA", async () => {
    fetch.mockResolvedValue(new Response("<html>manutenção</html>"));

    await expect(cnpj.consultar(PETROBRAS)).rejects.toMatchObject({
      name: "ErroTransporte",
      code: "RESPOSTA_INVALIDA",
    });
  });
});

describe("consultar - CNPJ alfanumérico", () => {
  test.each([
    ["sem formatação", ALFANUMERICO],
    ["formatado", "12.ABC.345/01DE-35"],
    ["minúsculo", "12.abc.345/01de-35"],
  ])("consulta %s com o valor normalizado", async (_rotulo, entrada) => {
    await cnpj.consultar(entrada);

    expect(fetch).toHaveBeenCalledWith(
      `https://api.opencnpj.org/${ALFANUMERICO}`,
      OPCOES_FETCH,
    );
  });

  test("não confere o DV: a decisão fica com a API, como no CNPJ numérico", async () => {
    await cnpj.consultar("12ABC34501DE99");

    expect(fetch).toHaveBeenCalledWith(
      "https://api.opencnpj.org/12ABC34501DE99",
      OPCOES_FETCH,
    );
  });

  test("caracteres fora de [0-9A-Z] nunca chegam à URL", async () => {
    await cnpj.consultar("12ABC345/../01DE?35#").catch(() => {});

    expect(fetch).toHaveBeenCalledWith(
      `https://api.opencnpj.org/${ALFANUMERICO}`,
      OPCOES_FETCH,
    );
  });
});

describe("consultar - compatibilidade com a 3.1.0", () => {
  test.each([
    ["letra solta junto ao CNPJ numérico", "33000167000101X"],
    ["rótulo antes do CNPJ", "CNPJ: 33.000.167/0001-01"],
  ])("%s ainda consulta pelos dígitos", async (_rotulo, entrada) => {
    await cnpj.consultar(entrada);

    expect(fetch).toHaveBeenCalledWith(
      `https://api.opencnpj.org/${PETROBRAS}`,
      OPCOES_FETCH,
    );
  });

  test("forma alfanumérica válida tem precedência sobre os dígitos", async () => {
    await cnpj.consultar("12.ABC.345/01DE-35");

    expect(fetch.mock.calls[0][0]).toBe(
      `https://api.opencnpj.org/${ALFANUMERICO}`,
    );
  });
});

describe("normalizarCnpj", () => {
  test.each([
    ["33.000.167/0001-01", PETROBRAS],
    [33000167000101, PETROBRAS],
    ["12.abc.345/01de-35", ALFANUMERICO],
    [" 12 ABC 345 01DE 35 ", ALFANUMERICO],
    ["--//..", ""],
    ["12ABC345ß01DE35", ALFANUMERICO],
  ])("%p vira %p", (entrada, esperado) => {
    expect(normalizarCnpj(entrada)).toBe(esperado);
  });

  test.each([[undefined], [null], [false], [{}]])(
    "%p vira string vazia, não 'NULL' ou 'UNDEFINED'",
    (entrada) => {
      expect(normalizarCnpj(entrada)).toBe("");
    },
  );
});

describe("validarCnpj", () => {
  test.each([
    ["numérico (Petrobras)", PETROBRAS],
    ["numérico formatado", "33.000.167/0001-01"],
    ["numérico (Banco do Brasil)", "00.000.000/0001-91"],
    ["alfanumérico oficial da Receita", ALFANUMERICO],
    ["alfanumérico formatado e minúsculo", "12.abc.345/01de-35"],
  ])("aceita %s", (_rotulo, entrada) => {
    expect(validarCnpj(entrada)).toBe(true);
  });

  test.each([
    ["numérico com DV errado", "33000167000102"],
    ["alfanumérico com 1º DV errado", "12ABC34501DE45"],
    ["alfanumérico com 2º DV errado", "12ABC34501DE36"],
    ["letra no DV", "12ABC34501DE3A"],
    ["tamanho errado", "12ABC34501DE3"],
    ["sequência repetida", "00000000000000"],
    ["vazio", ""],
    ["null", null],
  ])("recusa %s", (_rotulo, entrada) => {
    expect(validarCnpj(entrada)).toBe(false);
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
    expect(fetch).not.toHaveBeenCalled();
  });

  test("lança de forma síncrona para formato inválido", () => {
    expect(() => cnpj.consultaCNPJ("12345")).toThrow("CNPJ inválido");
    expect(fetch).not.toHaveBeenCalled();
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

  test("normalizarCnpj e validarCnpj são exportados", () => {
    expect(pacote.normalizarCnpj).toBe(normalizarCnpj);
    expect(pacote.validarCnpj).toBe(validarCnpj);
    expect(pacote.validarCnpj(ALFANUMERICO)).toBe(true);
  });

  test("as classes de erro são exportadas", () => {
    expect(pacote.ErroCnpj).toBe(ErroCnpj);
    expect(pacote.ErroTransporte).toBe(ErroTransporte);
    expect(pacote.ErroValidacao).toBe(ErroValidacao);
    expect(pacote.ErroConsulta).toBe(ErroConsulta);
  });

  test("lib/cnpj.js não carrega a superfície montada em index.js", () => {
    const lib = require("../lib/cnpj");

    expect(lib.consultar).toBeUndefined();
    expect(lib).not.toBe(pacote);
  });
});
