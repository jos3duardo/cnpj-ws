// Exemplo mínimo. Rodar com: node examples/consulta-simples.js
const { consultar } = require("../index");

consultar("33000167000101")
  .then((empresa) => console.log(empresa))
  .catch((erro) => console.error(erro));
