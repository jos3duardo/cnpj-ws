/**
 * Limites de transporte com o `fetch` de verdade contra um servidor HTTP local:
 * tamanho de resposta, redirect e timeout. Sem internet — roda no `npm test`.
 */
const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const http = require("http");
const zlib = require("zlib");
const { Cnpj, ErroConsulta, ErroTransporte } = require("../lib/cnpj");

// O node:test não tem timeout padrão (o Jest tinha 5 s): sem isto, uma
// regressão no prazo da lib faz o teste de timeout esperar para sempre em vez
// de falhar.
const PRAZO = { timeout: 5000 };

const PETROBRAS = "33000167000101";

let servidor;
let base;
let rota;
let caminhos;

before(async () => {
  servidor = http.createServer((req, res) => {
    caminhos.push(req.url);
    rota(req, res);
  });
  await new Promise((resolve) => servidor.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${servidor.address().port}`;
});

after(() => {
  servidor.closeAllConnections();
  servidor.close();
});

beforeEach(() => {
  caminhos = [];
  rota = (_req, res) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ cnpj: PETROBRAS }));
  };
});

const cliente = (opcoes = {}) => new Cnpj({ url: `${base}/{CNPJ}`, ...opcoes });

test("resposta dentro do limite é entregue", PRAZO, async () => {
  assert.deepEqual(await cliente().consultar(PETROBRAS), { cnpj: PETROBRAS });
});

test("resposta acima de maxContentLength é recusada", PRAZO, async () => {
  rota = (_req, res) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ lixo: "x".repeat(5000) }));
  };

  const erro = await cliente({ maxContentLength: 1000 })
    .consultar(PETROBRAS)
    .catch((e) => e);

  assert.ok(erro instanceof ErroTransporte);
  assert.equal(erro.code, "RESPOSTA_GRANDE_DEMAIS");
});

test("o limite vale para o corpo recebido, mesmo sem Content-Length", PRAZO, async () => {
  rota = (_req, res) => {
    // Sem content-length o Node usa chunked: só a contagem pega o excesso.
    res.writeHead(200, { "content-type": "application/json" });
    res.write('{"lixo":"');
    res.write("x".repeat(5000));
    res.end('"}');
  };

  await assert.rejects(
    cliente({ maxContentLength: 1000 }).consultar(PETROBRAS),
    { code: "RESPOSTA_GRANDE_DEMAIS" },
  );
});

test("com gzip, o limite vale para o corpo descomprimido, não o Content-Length", PRAZO, async () => {
  // Corpo pequeno cujo gzip fica maior que o limite: tem de passar.
  const corpo = JSON.stringify({ cnpj: PETROBRAS });
  const comprimido = zlib.gzipSync(corpo);
  rota = (_req, res) => {
    res.writeHead(200, {
      "content-type": "application/json",
      "content-encoding": "gzip",
      "content-length": comprimido.length,
    });
    res.end(comprimido);
  };

  const limite = corpo.length;
  assert.ok(comprimido.length > limite);
  assert.deepEqual(
    await cliente({ maxContentLength: limite }).consultar(PETROBRAS),
    { cnpj: PETROBRAS },
  );
});

test("maxContentLength -1 desliga o limite", PRAZO, async () => {
  rota = (_req, res) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ lixo: "x".repeat(300 * 1024) }));
  };

  const resultado = await cliente({ maxContentLength: -1 }).consultar(PETROBRAS);

  assert.equal(resultado.lixo.length, 300 * 1024);
});

test("resposta acima do padrão de 256 KiB é recusada", PRAZO, async () => {
  rota = (_req, res) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ lixo: "x".repeat(300 * 1024) }));
  };

  await assert.rejects(cliente().consultar(PETROBRAS), {
    code: "RESPOSTA_GRANDE_DEMAIS",
  });
});

test("redirect não é seguido e vira ErroConsulta com o status real", PRAZO, async () => {
  rota = (req, res) => {
    if (req.url === `/${PETROBRAS}`) {
      res.writeHead(302, { location: `${base}/outro-destino` });
      return res.end();
    }
    res.writeHead(200, { "content-type": "application/json" });
    res.end("{}");
  };

  const erro = await cliente().consultar(PETROBRAS).catch((e) => e);

  assert.ok(erro instanceof ErroConsulta);
  assert.equal(erro.Erro, 302);
  assert.deepEqual(caminhos, [`/${PETROBRAS}`]);
});

test("com maxRedirects, segue até o limite e para no seguinte", PRAZO, async () => {
  rota = (req, res) => {
    const salto = Number(new URL(req.url, base).searchParams.get("salto"));
    if (salto < 3) {
      res.writeHead(302, { location: `/redir?salto=${salto + 1}` });
      return res.end();
    }
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ salto }));
  };

  assert.deepEqual(
    await cliente({ maxRedirects: 3 }).consultar(PETROBRAS),
    { salto: 3 },
  );

  caminhos = [];
  const erro = await cliente({ maxRedirects: 2 })
    .consultar(PETROBRAS)
    .catch((e) => e);

  assert.ok(erro instanceof ErroConsulta);
  assert.equal(erro.Erro, 302);
  assert.equal(caminhos.length, 3);
});

test("timeout interrompe a consulta", PRAZO, async () => {
  rota = () => {}; // nunca responde

  const erro = await cliente({ timeout: 50 })
    .consultar(PETROBRAS)
    .catch((e) => e);

  assert.ok(erro instanceof ErroTransporte);
  assert.equal(erro.code, "TEMPO_ESGOTADO");
});

test("conexão recusada vira ErroTransporte FALHA_DE_REDE", PRAZO, async () => {
  const fechado = http.createServer();
  await new Promise((resolve) => fechado.listen(0, "127.0.0.1", resolve));
  const porta = fechado.address().port;
  await new Promise((resolve) => fechado.close(resolve));

  const erro = await new Cnpj({ url: `http://127.0.0.1:${porta}/{CNPJ}` })
    .consultar(PETROBRAS)
    .catch((e) => e);

  assert.ok(erro instanceof ErroTransporte);
  assert.equal(erro.code, "FALHA_DE_REDE");
  assert.ok(erro.cause instanceof TypeError);
});

test("timeout é prazo total: corpo pingado byte a byte não o estende", PRAZO, async () => {
  let intervalo;
  rota = (req, res) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.write('{"cnpj":"');
    intervalo = setInterval(() => res.write("x"), 20);
    req.on("close", () => clearInterval(intervalo));
  };

  const inicio = Date.now();
  const erro = await cliente({ timeout: 150 })
    .consultar(PETROBRAS)
    .catch((e) => e);
  clearInterval(intervalo);

  assert.ok(erro instanceof ErroTransporte);
  assert.equal(erro.code, "TEMPO_ESGOTADO");
  assert.ok(Date.now() - inicio < 1000);
});
