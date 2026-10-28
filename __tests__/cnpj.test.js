const { test, describe, beforeEach, afterEach, mock } = require("node:test");
const assert = require("node:assert/strict");
const { inspect } = require("node:util");
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
/** Opções que toda consulta passa ao fetch, fora o `signal`, conferido à parte. */
const OPCOES_FETCH = {
  headers: { accept: "application/json" },
  redirect: "manual",
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

/**
 * Confere que `funcao` foi chamada uma única vez, com `url`, as opções padrão
 * e um `AbortSignal` de prazo.
 */
function chamouCom(funcao, url) {
  assert.equal(funcao.mock.callCount(), 1);
  const [urlRecebida, opcoes] = funcao.mock.calls[0].arguments;
  const { signal, ...resto } = opcoes;
  assert.equal(urlRecebida, url);
  assert.deepEqual(resto, OPCOES_FETCH);
  assert.ok(signal instanceof AbortSignal, "signal deveria ser um AbortSignal");
}

/** Rótulo para nome de teste: string entre aspas, o resto como o `inspect` mostra. */
const rotulo = (valor) =>
  typeof valor === "string" ? JSON.stringify(valor) : inspect(valor);

let cnpj;

beforeEach(() => {
  cnpj = new Cnpj();
  mock.method(globalThis, "fetch", async () => resposta(200));
});

afterEach(() => {
  mock.restoreAll();
});

describe("Construtor", () => {
  test("usa a URL e o timeout padrão", () => {
    assert.equal(cnpj.urlApiCnpj, URL_PADRAO);
    assert.equal(cnpj.timeout, TIMEOUT_PADRAO);
  });

  test("aceita url e timeout customizados", () => {
    const custom = new Cnpj({ url: "https://exemplo.test/{CNPJ}", timeout: 500 });

    assert.equal(custom.urlApiCnpj, "https://exemplo.test/{CNPJ}");
    assert.equal(custom.timeout, 500);
  });

  test("limita a resposta a 256 KiB e não segue redirect por padrão", () => {
    assert.equal(cnpj.maxContentLength, 256 * 1024);
    assert.equal(cnpj.maxRedirects, 0);
  });

  test("maxContentLength e maxRedirects são configuráveis", () => {
    const custom = new Cnpj({ maxContentLength: 1000, maxRedirects: 2 });

    assert.equal(custom.maxContentLength, 1000);
    assert.equal(custom.maxRedirects, 2);
  });

  test("timeout 0 é respeitado (sem prazo)", () => {
    assert.equal(new Cnpj({ timeout: 0 }).timeout, 0);
  });

  test("timeout 0 não cria signal de prazo total", async () => {
    await new Cnpj({ timeout: 0 }).consultar(PETROBRAS);

    assert.ok(!("signal" in fetch.mock.calls[0].arguments[1]));
  });

  test("url sem o marcador {CNPJ} falha na construção", () => {
    assert.throws(
      () => new Cnpj({ url: "https://exemplo.test/cnpj" }),
      ErroValidacao,
    );
  });

  test("url customizada com marcador é usada na requisição", async () => {
    await new Cnpj({ url: "https://exemplo.test/x/{CNPJ}.json" }).consultar(
      PETROBRAS,
    );

    chamouCom(fetch, `https://exemplo.test/x/${PETROBRAS}.json`);
  });
});

describe("Construtor - validação das opções", () => {
  for (const [rotuloUrl, url] of [
    ["sem esquema", "api.exemplo.test/{CNPJ}"],
    ["ftp", "ftp://exemplo.test/{CNPJ}"],
    ["data:", "data:application/json,{CNPJ}"],
    ["com usuário e senha", "https://usuario:senha@exemplo.test/{CNPJ}"],
  ]) {
    test(`recusa url ${rotuloUrl}, em vez de falhar como rede a cada consulta`, () => {
      assert.throws(() => new Cnpj({ url }), ErroValidacao);
    });
  }

  for (const [rotuloOpcao, opcoes] of [
    ["fracionário", { timeout: 1.5 }],
    ["string", { timeout: "5000" }],
    ["acima do teto do setTimeout", { timeout: 2 ** 33 }],
    ["negativo", { timeout: -1 }],
    ["maxContentLength abaixo de -1", { maxContentLength: -2 }],
    ["maxRedirects fracionário", { maxRedirects: 0.5 }],
    ["fetch que não é função", { fetch: "nao" }],
  ]) {
    test(`recusa opção inválida: ${rotuloOpcao}`, () => {
      assert.throws(() => new Cnpj(opcoes), ErroValidacao);
    });
  }

  test("a mensagem de URL com credencial não repete a senha", () => {
    assert.throws(
      () => new Cnpj({ url: "https://u:senha123@exemplo.test/{CNPJ}" }),
      (erro) => {
        assert.doesNotMatch(erro.message, /senha123/);
        return true;
      },
    );
  });

  test("urlApiCnpj alterada depois do construtor ainda é validada", async () => {
    const mutada = new Cnpj();
    mutada.urlApiCnpj = 'data:application/json,{"razao_social":"X"}{CNPJ}';

    await assert.rejects(mutada.consultar(PETROBRAS), ErroValidacao);
    assert.equal(fetch.mock.callCount(), 0);
  });

  test("fetch injetado é usado no lugar do global", async () => {
    const proprio = mock.fn(async () => resposta(200));

    await new Cnpj({ fetch: proprio }).consultar(PETROBRAS);

    chamouCom(proprio, `https://api.opencnpj.org/${PETROBRAS}`);
    assert.equal(fetch.mock.callCount(), 0);
  });
});

describe("consultar - redirect", () => {
  /** 302 apontando para `destino`, com corpo vazio. */
  const redirect = (destino) =>
    new Response(null, { status: 302, headers: { location: destino } });

  for (const [rotuloDestino, destino] of [
    ["data:", 'data:application/json,{"razao_social":"FORJADA"}'],
    ["https → http", "http://api.opencnpj.org/outro"],
    ["file:", "file:///etc/passwd"],
    ["Location malformado", "http://[::1"],
    ["outro host", "https://169.254.169.254/latest/meta-data/"],
    ["mesmo host, outra porta", "https://api.opencnpj.org:8443/x"],
  ]) {
    test(`não segue redirect para ${rotuloDestino}, mesmo com maxRedirects`, async () => {
      fetch.mock.mockImplementationOnce(async () => redirect(destino));

      const erro = await new Cnpj({ maxRedirects: 5 })
        .consultar(PETROBRAS)
        .catch((e) => e);

      assert.ok(erro instanceof ErroConsulta);
      assert.equal(erro.Erro, 302);
      assert.equal(fetch.mock.callCount(), 1);
    });
  }
});

describe("consultar - corpo da resposta", () => {
  // Prazo explícito: se o cancel voltar a ser aguardado, o teste falha em vez
  // de travar (o node:test não tem timeout padrão).
  test("cancel do corpo que nunca termina não segura a consulta", { timeout: 5000 }, async () => {
    const corpoTravado = new ReadableStream({
      cancel: () => new Promise(() => {}),
    });
    fetch.mock.mockImplementation(
      async () => new Response(corpoTravado, { status: 500 }),
    );

    await assert.rejects(cnpj.consultar(PETROBRAS), { Erro: 500 });
  });

  test("JSON com BOM UTF-8 é aceito, como no axios", async () => {
    fetch.mock.mockImplementation(
      async () => new Response("\uFEFF" + JSON.stringify(RESPOSTA)),
    );

    assert.deepEqual(await cnpj.consultar(PETROBRAS), RESPOSTA);
  });

  for (const [rotuloResposta, r] of [
    ["204", () => new Response(null, { status: 204 })],
    ["200 vazio", () => new Response("")],
  ]) {
    test(`${rotuloResposta} vira RESPOSTA_INVALIDA dizendo que veio sem corpo`, async () => {
      fetch.mock.mockImplementation(r);

      await assert.rejects(cnpj.consultar(PETROBRAS), {
        code: "RESPOSTA_INVALIDA",
        message: "A API respondeu sem corpo.",
      });
    });
  }
});

describe("consultar - normalização da entrada", () => {
  for (const [rotuloEntrada, entrada] of [
    ["string", PETROBRAS],
    ["número", 33000167000101],
    ["formatado", "33.000.167/0001-01"],
    ["com espaços", "33 000 167 000 101"],
  ]) {
    test(`aceita CNPJ como ${rotuloEntrada}`, async () => {
      await cnpj.consultar(entrada);

      chamouCom(fetch, `https://api.opencnpj.org/${PETROBRAS}`);
    });
  }

  test("retorna o corpo da resposta já convertido de JSON", async () => {
    assert.deepEqual(await cnpj.consultar(PETROBRAS), RESPOSTA);
  });
});

describe("consultar - validação", () => {
  for (const [rotuloEntrada, entrada] of [
    ["undefined", undefined],
    ["null", null],
    ["string vazia", ""],
  ]) {
    test(`rejeita quando o CNPJ é ${rotuloEntrada}`, async () => {
      await assert.rejects(
        cnpj.consultar(entrada),
        /Você precisa informar um CNPJ valido/,
      );
      assert.equal(fetch.mock.callCount(), 0);
    });
  }

  for (const [rotuloEntrada, entrada] of [
    ["texto sem dígitos", "abc"],
    ["só pontuação", "--//.."],
    ["NaN", NaN],
    ["dígitos de menos", 12345],
    ["dígitos demais", "330001670001010"],
    ["letra no dígito verificador", "12ABC34501DE3A"],
    ["zero", 0],
    ["false", false],
  ]) {
    test(`rejeita ${rotuloEntrada} sem chamar a API`, async () => {
      await assert.rejects(cnpj.consultar(entrada), /CNPJ inválido/);
      assert.equal(fetch.mock.callCount(), 0);
    });
  }

  test("entrada inválida nunca vira requisição à raiz da API", async () => {
    await cnpj.consultar("abc").catch(() => {});

    assert.equal(fetch.mock.callCount(), 0);
  });

  test("rejeita com ErroValidacao, capturável por .catch()", async () => {
    const erro = await cnpj.consultar().catch((e) => e);

    assert.ok(erro instanceof ErroValidacao);
    assert.ok(erro instanceof ErroCnpj);
    assert.ok(erro instanceof Error);
  });
});

describe("consultar - erros da API", () => {
  test("404 vira o erro documentado de CNPJ não encontrado", async () => {
    fetch.mock.mockImplementation(async () => resposta(404, {}));

    await assert.rejects(cnpj.consultar(PETROBRAS), {
      Erro: 404,
      MsgErro: "CNPJ não encontrado.",
      message: "CNPJ não encontrado.",
    });
  });

  test("status diferente de 404 preserva o status real", async () => {
    fetch.mock.mockImplementation(async () => resposta(500, {}));

    await assert.rejects(cnpj.consultar(PETROBRAS), {
      Erro: 500,
      MsgErro: "Erro 500 ao consultar a API.",
    });
  });

  test("o erro da API é um Error de verdade, não objeto literal", async () => {
    fetch.mock.mockImplementation(async () => resposta(429, {}));

    const erro = await cnpj.consultar(PETROBRAS).catch((e) => e);

    assert.ok(erro instanceof ErroConsulta);
    assert.ok(erro instanceof ErroCnpj);
    assert.equal(erro.message, "Erro 429 ao consultar a API.");
    assert.notEqual(erro.stack, undefined);
  });

  test("erro de rede vira ErroTransporte com o erro original em cause", async () => {
    const original = new TypeError("fetch failed");
    fetch.mock.mockImplementation(async () => {
      throw original;
    });

    const erro = await cnpj.consultar(PETROBRAS).catch((e) => e);

    assert.ok(erro instanceof ErroTransporte);
    assert.ok(erro instanceof ErroCnpj);
    assert.equal(erro.code, "FALHA_DE_REDE");
    assert.equal(erro.cause, original);
  });

  test("corpo que não é JSON vira ErroTransporte RESPOSTA_INVALIDA", async () => {
    fetch.mock.mockImplementation(
      async () => new Response("<html>manutenção</html>"),
    );

    await assert.rejects(cnpj.consultar(PETROBRAS), {
      name: "ErroTransporte",
      code: "RESPOSTA_INVALIDA",
    });
  });
});

describe("consultar - CNPJ alfanumérico", () => {
  for (const [rotuloEntrada, entrada] of [
    ["sem formatação", ALFANUMERICO],
    ["formatado", "12.ABC.345/01DE-35"],
    ["minúsculo", "12.abc.345/01de-35"],
  ]) {
    test(`consulta ${rotuloEntrada} com o valor normalizado`, async () => {
      await cnpj.consultar(entrada);

      chamouCom(fetch, `https://api.opencnpj.org/${ALFANUMERICO}`);
    });
  }

  test("não confere o DV: a decisão fica com a API, como no CNPJ numérico", async () => {
    await cnpj.consultar("12ABC34501DE99");

    chamouCom(fetch, "https://api.opencnpj.org/12ABC34501DE99");
  });

  test("caracteres fora de [0-9A-Z] nunca chegam à URL", async () => {
    await cnpj.consultar("12ABC345/../01DE?35#").catch(() => {});

    chamouCom(fetch, `https://api.opencnpj.org/${ALFANUMERICO}`);
  });
});

describe("consultar - compatibilidade com a 3.1.0", () => {
  for (const [rotuloEntrada, entrada] of [
    ["letra solta junto ao CNPJ numérico", "33000167000101X"],
    ["rótulo antes do CNPJ", "CNPJ: 33.000.167/0001-01"],
  ]) {
    test(`${rotuloEntrada} ainda consulta pelos dígitos`, async () => {
      await cnpj.consultar(entrada);

      chamouCom(fetch, `https://api.opencnpj.org/${PETROBRAS}`);
    });
  }

  test("forma alfanumérica válida tem precedência sobre os dígitos", async () => {
    await cnpj.consultar("12.ABC.345/01DE-35");

    assert.equal(
      fetch.mock.calls[0].arguments[0],
      `https://api.opencnpj.org/${ALFANUMERICO}`,
    );
  });
});

describe("normalizarCnpj", () => {
  for (const [entrada, esperado] of [
    ["33.000.167/0001-01", PETROBRAS],
    [33000167000101, PETROBRAS],
    ["12.abc.345/01de-35", ALFANUMERICO],
    [" 12 ABC 345 01DE 35 ", ALFANUMERICO],
    ["--//..", ""],
    ["12ABC345ß01DE35", ALFANUMERICO],
  ]) {
    test(`${rotulo(entrada)} vira ${rotulo(esperado)}`, () => {
      assert.equal(normalizarCnpj(entrada), esperado);
    });
  }

  for (const entrada of [undefined, null, false, {}]) {
    test(`${rotulo(entrada)} vira string vazia, não 'NULL' ou 'UNDEFINED'`, () => {
      assert.equal(normalizarCnpj(entrada), "");
    });
  }
});

describe("validarCnpj", () => {
  for (const [rotuloEntrada, entrada] of [
    ["numérico (Petrobras)", PETROBRAS],
    ["numérico formatado", "33.000.167/0001-01"],
    ["numérico (Banco do Brasil)", "00.000.000/0001-91"],
    ["alfanumérico oficial da Receita", ALFANUMERICO],
    ["alfanumérico formatado e minúsculo", "12.abc.345/01de-35"],
  ]) {
    test(`aceita ${rotuloEntrada}`, () => {
      assert.equal(validarCnpj(entrada), true);
    });
  }

  for (const [rotuloEntrada, entrada] of [
    ["numérico com DV errado", "33000167000102"],
    ["alfanumérico com 1º DV errado", "12ABC34501DE45"],
    ["alfanumérico com 2º DV errado", "12ABC34501DE36"],
    ["letra no DV", "12ABC34501DE3A"],
    ["tamanho errado", "12ABC34501DE3"],
    ["sequência repetida", "00000000000000"],
    ["vazio", ""],
    ["null", null],
  ]) {
    test(`recusa ${rotuloEntrada}`, () => {
      assert.equal(validarCnpj(entrada), false);
    });
  }
});

describe("consultaCNPJ - alias depreciado", () => {
  test("consulta igual a consultar()", async () => {
    assert.deepEqual(await cnpj.consultaCNPJ(PETROBRAS), RESPOSTA);
  });

  for (const [rotuloEntrada, entrada] of [
    ["undefined", undefined],
    ["0", 0],
    ["false", false],
  ]) {
    test(`lança de forma síncrona quando o CNPJ é ${rotuloEntrada}`, () => {
      assert.throws(
        () => cnpj.consultaCNPJ(entrada),
        /Você precisa informar um CNPJ valido/,
      );
      assert.equal(fetch.mock.callCount(), 0);
    });
  }

  test("lança de forma síncrona para formato inválido", () => {
    assert.throws(() => cnpj.consultaCNPJ("12345"), /CNPJ inválido/);
    assert.equal(fetch.mock.callCount(), 0);
  });
});

describe("Formas de importar o pacote", () => {
  test("consultar() direto, sem new", async () => {
    assert.deepEqual(await pacote.consultar(PETROBRAS), RESPOSTA);
  });

  test("consultar() por destructuring", async () => {
    const { consultar } = pacote;

    assert.deepEqual(await consultar(PETROBRAS), RESPOSTA);
  });

  test("consultaCNPJ() direto continua funcionando", async () => {
    assert.deepEqual(await pacote.consultaCNPJ(PETROBRAS), RESPOSTA);
  });

  test("o export principal é a classe", () => {
    assert.equal(pacote, Cnpj);
    assert.equal(pacote.Cnpj, Cnpj);
    assert.ok(new pacote() instanceof Cnpj);
  });

  test("normalizarCnpj e validarCnpj são exportados", () => {
    assert.equal(pacote.normalizarCnpj, normalizarCnpj);
    assert.equal(pacote.validarCnpj, validarCnpj);
    assert.equal(pacote.validarCnpj(ALFANUMERICO), true);
  });

  test("as classes de erro são exportadas", () => {
    assert.equal(pacote.ErroCnpj, ErroCnpj);
    assert.equal(pacote.ErroTransporte, ErroTransporte);
    assert.equal(pacote.ErroValidacao, ErroValidacao);
    assert.equal(pacote.ErroConsulta, ErroConsulta);
  });

  test("lib/cnpj.js não carrega a superfície montada em index.js", () => {
    const lib = require("../lib/cnpj");

    assert.equal(lib.consultar, undefined);
    assert.notEqual(lib, pacote);
  });
});
