const { Cnpj, ErroCnpj, ErroValidacao, ErroConsulta } = require("./lib/cnpj");

const instanciaPadrao = new Cnpj();

// A classe é o export principal desde a 2.x — `new (require("consulta-cnpj-ws"))()`
// precisa continuar funcionando —, então os demais nomes são anexados a ela.
// Este arquivo é o único dono da superfície pública: `lib/cnpj.js` exporta as
// classes de forma simples e não sabe nada deste arranjo.
module.exports = Cnpj;

module.exports.Cnpj = Cnpj;
module.exports.ErroCnpj = ErroCnpj;
module.exports.ErroValidacao = ErroValidacao;
module.exports.ErroConsulta = ErroConsulta;

// Uso sem `new`: require("consulta-cnpj-ws").consultar("33000167000101")
module.exports.consultar = (cnpj) => instanciaPadrao.consultar(cnpj);
module.exports.consultaCNPJ = (cnpj) => instanciaPadrao.consultaCNPJ(cnpj);
