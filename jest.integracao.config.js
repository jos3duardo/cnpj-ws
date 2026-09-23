/** Config dos testes de integração — batem na API real, não rodam no CI. */
module.exports = {
  testMatch: ["**/__tests__/integracao/**/*.test.js"],
  testTimeout: 20000,
  // Serializa as suítes: a pausa entre chamadas só protege o rate limit da API
  // se não houver dois workers consultando em paralelo.
  maxWorkers: 1,
};
