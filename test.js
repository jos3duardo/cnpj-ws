const CNPJ = require("./index.js");

console.log("=== Testando a biblioteca CNPJ-WS ===\n");

// Criar instância
const cnpj = new CNPJ();

// Teste 1: CNPJ válido da Petrobras
console.log("Teste 1: Consultando CNPJ da Petrobras (33000167000101)...");
cnpj
  .consultaCNPJ("33000167000101")
  .then((result) => {
    console.log("✓ Sucesso!");
    console.log("Razão Social:", result.razao_social);
    console.log("Nome Fantasia:", result.nome_fantasia);
    console.log("Situação:", result.situacao_cadastral);
    console.log("Município/UF:", result.municipio, "/", result.uf);
    console.log("Capital Social:", result.capital_social);
    console.log("---\n");
  })
  .catch((error) => {
    console.log("✗ Erro:", error);
    console.log("---\n");
  });

// Teste 2: CNPJ como número
setTimeout(() => {
  console.log("Teste 2: Consultando CNPJ como número (33000167000101)...");
  cnpj
    .consultaCNPJ(33000167000101)
    .then((result) => {
      console.log("✓ Sucesso!");
      console.log("Razão Social:", result.razao_social);
      console.log("Natureza Jurídica:", result.natureza_juridica);
      console.log("---\n");
    })
    .catch((error) => {
      console.log("✗ Erro:", error);
      console.log("---\n");
    });
}, 2000);

// Teste 3: CNPJ formatado
setTimeout(() => {
  console.log("Teste 3: Consultando CNPJ formatado (33.000.167/0001-01)...");
  cnpj
    .consultaCNPJ("33.000.167/0001-01")
    .then((result) => {
      console.log("✓ Sucesso!");
      console.log("Razão Social:", result.razao_social);
      console.log("Email:", result.email);
      console.log("---\n");
    })
    .catch((error) => {
      console.log("✗ Erro:", error);
      console.log("---\n");
    });
}, 4000);

// Teste 4: CNPJ inválido (deve gerar erro)
setTimeout(() => {
  console.log("Teste 4: Testando CNPJ inválido (00000000000000)...");
  cnpj
    .consultaCNPJ("00000000000000")
    .then((result) => {
      console.log("✓ Retornou dados:", result);
      console.log("---\n");
    })
    .catch((error) => {
      console.log("✓ Erro esperado capturado:", error);
      console.log("---\n");
    });
}, 6000);

// Teste 5: Banco do Brasil
setTimeout(() => {
  console.log(
    "Teste 5: Consultando CNPJ do Banco do Brasil (00000000000191)...",
  );
  cnpj
    .consultaCNPJ("00000000000191")
    .then((result) => {
      console.log("✓ Sucesso!");
      console.log("Razão Social:", result.razao_social);
      console.log("Situação:", result.situacao_cadastral);
      console.log("Matriz/Filial:", result.matriz_filial);
      console.log("---\n");
    })
    .catch((error) => {
      console.log("✗ Erro:", error);
      console.log("---\n");
    });
}, 8000);

// Teste 6: Sem passar CNPJ (deve lançar exceção)
setTimeout(() => {
  console.log("Teste 6: Testando sem passar CNPJ...");
  try {
    cnpj
      .consultaCNPJ()
      .then((result) => {
        console.log("Resultado:", result);
      })
      .catch((error) => {
        console.log("✓ Erro capturado no catch:", error.message || error);
        console.log("---\n");
      });
  } catch (error) {
    console.log("✓ Exceção capturada no try/catch:", error.message);
    console.log("---\n");
  }
}, 10000);

console.log("\nAguarde os resultados dos testes...\n");
console.log(
  "⚠️  Aguardando 2 segundos entre cada teste para respeitar limites da API\n",
);
