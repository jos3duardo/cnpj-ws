/**
 * Limites de transporte com o axios de verdade contra um servidor HTTP local:
 * tamanho de resposta, redirect e timeout. Sem internet — roda no `npm test`.
 */
const http = require("http");
const { Cnpj, ErroConsulta } = require("../lib/cnpj");

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

  expect(erro).toBeInstanceOf(Error);
  expect(erro.message).toMatch(/maxContentLength/);
});

test("resposta acima do padrão de 256 KiB é recusada", async () => {
  rota = (_req, res) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ lixo: "x".repeat(300 * 1024) }));
  };

  await expect(cliente().consultar(PETROBRAS)).rejects.toThrow(
    /maxContentLength/,
  );
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

test("timeout interrompe a consulta", async () => {
  rota = () => {}; // nunca responde

  const erro = await cliente({ timeout: 50 })
    .consultar(PETROBRAS)
    .catch((e) => e);

  // Timeout do axios e signal disparam juntos; qualquer um dos dois serve.
  expect(["ECONNABORTED", "ERR_CANCELED"]).toContain(erro.code);
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

  expect(erro).toBeInstanceOf(Error);
  expect(erro.code).toBe("ERR_CANCELED");
  expect(Date.now() - inicio).toBeLessThan(1000);
});
