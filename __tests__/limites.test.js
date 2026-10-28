/**
 * Limites de transporte com o `fetch` de verdade contra um servidor HTTP local:
 * tamanho de resposta, redirect e timeout. Sem internet — roda no `npm test`.
 */
const http = require("http");
const zlib = require("zlib");
const { Cnpj, ErroConsulta, ErroTransporte } = require("../lib/cnpj");

const PETROBRAS = "33000167000101";

let servidor;
let base;
let rota;
let caminhos;

beforeAll(async () => {
  servidor = http.createServer((req, res) => {
    caminhos.push(req.url);
    rota(req, res);
  });
  await new Promise((resolve) => servidor.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${servidor.address().port}`;
});

afterAll(() => {
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

test("resposta dentro do limite é entregue", async () => {
  await expect(cliente().consultar(PETROBRAS)).resolves.toEqual({
    cnpj: PETROBRAS,
  });
});

test("resposta acima de maxContentLength é recusada", async () => {
  rota = (_req, res) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ lixo: "x".repeat(5000) }));
  };

  const erro = await cliente({ maxContentLength: 1000 })
    .consultar(PETROBRAS)
    .catch((e) => e);

  expect(erro).toBeInstanceOf(ErroTransporte);
  expect(erro.code).toBe("RESPOSTA_GRANDE_DEMAIS");
});

test("o limite vale para o corpo recebido, mesmo sem Content-Length", async () => {
  rota = (_req, res) => {
    // Sem content-length o Node usa chunked: só a contagem pega o excesso.
    res.writeHead(200, { "content-type": "application/json" });
    res.write('{"lixo":"');
    res.write("x".repeat(5000));
    res.end('"}');
  };

  await expect(
    cliente({ maxContentLength: 1000 }).consultar(PETROBRAS),
  ).rejects.toMatchObject({ code: "RESPOSTA_GRANDE_DEMAIS" });
});

test("com gzip, o limite vale para o corpo descomprimido, não o Content-Length", async () => {
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
  expect(comprimido.length).toBeGreaterThan(limite);
  await expect(
    cliente({ maxContentLength: limite }).consultar(PETROBRAS),
  ).resolves.toEqual({ cnpj: PETROBRAS });
});

test("maxContentLength -1 desliga o limite", async () => {
  rota = (_req, res) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ lixo: "x".repeat(300 * 1024) }));
  };

  const resultado = await cliente({ maxContentLength: -1 }).consultar(PETROBRAS);

  expect(resultado.lixo).toHaveLength(300 * 1024);
});

test("resposta acima do padrão de 256 KiB é recusada", async () => {
  rota = (_req, res) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ lixo: "x".repeat(300 * 1024) }));
  };

  await expect(cliente().consultar(PETROBRAS)).rejects.toMatchObject({
    code: "RESPOSTA_GRANDE_DEMAIS",
  });
});

test("redirect não é seguido e vira ErroConsulta com o status real", async () => {
  rota = (req, res) => {
    if (req.url === `/${PETROBRAS}`) {
      res.writeHead(302, { location: `${base}/outro-destino` });
      return res.end();
    }
    res.writeHead(200, { "content-type": "application/json" });
    res.end("{}");
  };

  const erro = await cliente().consultar(PETROBRAS).catch((e) => e);

  expect(erro).toBeInstanceOf(ErroConsulta);
  expect(erro.Erro).toBe(302);
  expect(caminhos).toEqual([`/${PETROBRAS}`]);
});

test("com maxRedirects, segue até o limite e para no seguinte", async () => {
  rota = (req, res) => {
    const salto = Number(new URL(req.url, base).searchParams.get("salto"));
    if (salto < 3) {
      res.writeHead(302, { location: `/redir?salto=${salto + 1}` });
      return res.end();
    }
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ salto }));
  };

  await expect(
    cliente({ maxRedirects: 3 }).consultar(PETROBRAS),
  ).resolves.toEqual({ salto: 3 });

  caminhos = [];
  const erro = await cliente({ maxRedirects: 2 })
    .consultar(PETROBRAS)
    .catch((e) => e);

  expect(erro).toBeInstanceOf(ErroConsulta);
  expect(erro.Erro).toBe(302);
  expect(caminhos).toHaveLength(3);
});

test("timeout interrompe a consulta", async () => {
  rota = () => {}; // nunca responde

  const erro = await cliente({ timeout: 50 })
    .consultar(PETROBRAS)
    .catch((e) => e);

  expect(erro).toBeInstanceOf(ErroTransporte);
  expect(erro.code).toBe("TEMPO_ESGOTADO");
});

test("conexão recusada vira ErroTransporte FALHA_DE_REDE", async () => {
  const fechado = http.createServer();
  await new Promise((resolve) => fechado.listen(0, "127.0.0.1", resolve));
  const porta = fechado.address().port;
  await new Promise((resolve) => fechado.close(resolve));

  const erro = await new Cnpj({ url: `http://127.0.0.1:${porta}/{CNPJ}` })
    .consultar(PETROBRAS)
    .catch((e) => e);

  expect(erro).toBeInstanceOf(ErroTransporte);
  expect(erro.code).toBe("FALHA_DE_REDE");
  // O TypeError do undici vem de outro realm: instanceof falha sob o Jest.
  expect(erro.cause).toMatchObject({ name: "TypeError" });
});

test("timeout é prazo total: corpo pingado byte a byte não o estende", async () => {
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

  expect(erro).toBeInstanceOf(ErroTransporte);
  expect(erro.code).toBe("TEMPO_ESGOTADO");
  expect(Date.now() - inicio).toBeLessThan(1000);
});
