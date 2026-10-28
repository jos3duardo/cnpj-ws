// Prova o pacote importado como ESM, pelo nome, como o usuário importa.
// Roda com `npm run test:esm` (node:test; o Jest daqui é CommonJS).
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import * as modulo from "consulta-cnpj-ws";
import Cnpj, {
  consultar,
  validarCnpj,
  ErroValidacao,
  ErroTransporte,
} from "consulta-cnpj-ws";

const require = createRequire(import.meta.url);

test("import default é a mesma classe do require", () => {
  assert.equal(Cnpj, require("consulta-cnpj-ws"));
  assert.equal(new Cnpj().urlApiCnpj, "https://api.opencnpj.org/{CNPJ}");
});

test("exports nomeados funcionam", async () => {
  assert.equal(validarCnpj("12.ABC.345/01DE-35"), true);
  assert.equal(ErroTransporte, Cnpj.ErroTransporte);
  await assert.rejects(consultar("123"), ErroValidacao);
});

test("todo nome do require também existe no import", () => {
  const cjs = require("consulta-cnpj-ws");
  for (const nome of Object.keys(cjs)) {
    assert.equal(modulo[nome], cjs[nome], nome);
  }
});
