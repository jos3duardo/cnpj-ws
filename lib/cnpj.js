const axios = require("axios");

const URL_PADRAO = "https://api.opencnpj.org/{CNPJ}";
const TIMEOUT_PADRAO = 10000;
const MARCADOR_CNPJ = "{CNPJ}";
const TAMANHO_CNPJ = 14;
// Desde jul/2026 a Receita emite CNPJ alfanumérico: 12 caracteres [0-9A-Z]
// (raiz e ordem) seguidos de 2 dígitos verificadores, sempre numéricos.
const FORMATO_CNPJ = /^[0-9A-Z]{12}[0-9]{2}$/;
// Pesos do módulo 11, aplicados da esquerda para a direita.
const PESOS_DV1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const PESOS_DV2 = [6, ...PESOS_DV1];

const MSG_CNPJ_OBRIGATORIO =
  "Você precisa informar um CNPJ valido. Ex. cnpj.consultar('13150088000170')";

/** Base de todo erro originado nesta biblioteca. */
class ErroCnpj extends Error {
  constructor(mensagem) {
    super(mensagem);
    this.name = new.target.name;
  }
}

/** Entrada que sequer chega a virar uma consulta. */
class ErroValidacao extends ErroCnpj {}

/** A API respondeu com um status HTTP de erro. */
class ErroConsulta extends ErroCnpj {
  constructor(status, mensagem) {
    super(mensagem);
    // Mantidos por compatibilidade: é o formato documentado desde a 2.x.
    this.Erro = status;
    this.MsgErro = mensagem;
  }
}

/**
 * Normaliza um CNPJ, numérico ou alfanumérico: maiúsculas e só [0-9A-Z].
 * Remove pontuação, espaços e qualquer outro caractere. Não valida.
 */
function normalizarCnpj(cnpj) {
  const tipo = typeof cnpj;
  if (tipo !== "string" && tipo !== "number" && tipo !== "bigint") {
    return "";
  }

  // O `[^0-9A-Z]` é o que mantém a URL segura: só sobra caractere de CNPJ.
  return String(cnpj).toUpperCase().replace(/[^0-9A-Z]/g, "");
}

/**
 * Dígito verificador pelo módulo 11 da Receita: cada caractere vale o código
 * ASCII menos 48 — os dígitos mantêm o valor, "A" vale 17, "Z" vale 42.
 */
function digitoVerificador(caracteres, pesos) {
  let soma = 0;
  for (let i = 0; i < pesos.length; i++) {
    soma += (caracteres.charCodeAt(i) - 48) * pesos[i];
  }
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

/**
 * `true` se o CNPJ, numérico ou alfanumérico, tem formato e dígitos
 * verificadores válidos. Aceita com ou sem formatação.
 */
function validarCnpj(cnpj) {
  const valor = normalizarCnpj(cnpj);

  // Sequência de um caractere só (00000000000000) passa no módulo 11, mas
  // não é CNPJ emitido.
  if (!FORMATO_CNPJ.test(valor) || /^(.)\1+$/.test(valor)) {
    return false;
  }

  const dv1 = digitoVerificador(valor, PESOS_DV1);
  const dv2 = digitoVerificador(valor.slice(0, 12) + dv1, PESOS_DV2);

  return valor.endsWith(`${dv1}${dv2}`);
}

class Cnpj {
  /**
   * @param {{ url?: string, timeout?: number }} [opcoes]
   */
  constructor(opcoes = {}) {
    const url = opcoes.url ?? URL_PADRAO;

    if (!url.includes(MARCADOR_CNPJ)) {
      throw new ErroValidacao(
        `A URL precisa conter o marcador ${MARCADOR_CNPJ}. Ex.: ${URL_PADRAO}`,
      );
    }

    this.urlApiCnpj = url;
    this.timeout = opcoes.timeout ?? TIMEOUT_PADRAO;
  }

  /**
   * Consulta um CNPJ na API OpenCNPJ.
   * Aceita string, número, com ou sem formatação.
   *
   * `async` converte o throw de `_preparar` em rejeição — é o que separa este
   * método do alias abaixo.
   */
  async consultar(cnpj) {
    return this._requisitar(this._preparar(cnpj));
  }

  /**
   * @deprecated desde 3.1.0 — use consultar(). Será removido na 4.0.0.
   *
   * Não é `async`: preserva o throw síncrono do comportamento original, e
   * `falsyEhAusente` preserva a rejeição histórica de `0`, `false` e `NaN`.
   */
  consultaCNPJ(cnpj) {
    return this._requisitar(this._preparar(cnpj, true));
  }

  /**
   * Normaliza e valida o formato num passo só. Lança `ErroValidacao`; devolve
   * o CNPJ normalizado. Não confere o dígito verificador — isso é
   * `validarCnpj()`, e mudaria o erro de quem hoje recebe 404 da API.
   */
  _preparar(cnpj, falsyEhAusente = false) {
    const ausente = falsyEhAusente
      ? !cnpj
      : cnpj === undefined || cnpj === null || cnpj === "";

    if (ausente) {
      throw new ErroValidacao(MSG_CNPJ_OBRIGATORIO);
    }

    const valor = normalizarCnpj(cnpj);

    if (valor.length !== TAMANHO_CNPJ) {
      throw new ErroValidacao(
        `CNPJ inválido: são esperados ${TAMANHO_CNPJ} caracteres, foram encontrados ${valor.length}.`,
      );
    }

    if (!FORMATO_CNPJ.test(valor)) {
      throw new ErroValidacao(
        "CNPJ inválido: os dois últimos caracteres (dígitos verificadores) devem ser numéricos.",
      );
    }

    return valor;
  }

  _requisitar(valor) {
    const url = this.urlApiCnpj.replace(MARCADOR_CNPJ, valor);

    return axios
      .get(url, { timeout: this.timeout })
      .then((response) => response.data)
      .catch((error) => {
        if (!error.response) {
          throw error;
        }

        const status = error.response.status;

        throw new ErroConsulta(
          status,
          status === 404
            ? "CNPJ não encontrado."
            : `Erro ${status} ao consultar a API.`,
        );
      });
  }
}

module.exports = {
  Cnpj,
  ErroCnpj,
  ErroValidacao,
  ErroConsulta,
  normalizarCnpj,
  validarCnpj,
};
