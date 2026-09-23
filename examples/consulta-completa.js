// Percorre os cenários principais da biblioteca contra a API real.
// Rodar com: node examples/consulta-completa.js
const { consultar, ErroValidacao } = require("../index");

const PAUSA_MS = 2000; // respeita o rate limit da API

const espera = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const CASOS = [
  { titulo: "CNPJ da Petrobras", entrada: "33000167000101" },
  { titulo: "O mesmo CNPJ como número", entrada: 33000167000101 },
  { titulo: "O mesmo CNPJ formatado", entrada: "33.000.167/0001-01" },
  { titulo: "Banco do Brasil", entrada: "00000000000191" },
  { titulo: "CNPJ inexistente (espera-se erro 404)", entrada: "00000000000000" },
  { titulo: "Formato inválido (rejeitado sem ir à rede)", entrada: "12345" },
];

async function main() {
  for (const [indice, { titulo, entrada }] of CASOS.entries()) {
    console.log(`\n→ ${titulo}`);

    let consultouAApi = true;

    try {
      const empresa = await consultar(entrada);
      console.log("  razão social:", empresa.razao_social);
      console.log("  situação:    ", empresa.situacao_cadastral);
      console.log("  município/UF:", `${empresa.municipio}/${empresa.uf}`);
    } catch (erro) {
      // Todo erro da biblioteca estende Error, então `message` sempre serve.
      console.log("  erro:", erro.message);
      consultouAApi = !(erro instanceof ErroValidacao);
    }

    // A pausa só faz sentido entre duas chamadas de rede.
    if (consultouAApi && indice < CASOS.length - 1) {
      await espera(PAUSA_MS);
    }
  }
}

main();
