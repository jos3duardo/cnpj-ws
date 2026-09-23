const axios = require("axios");

const URL_PADRAO = "https://api.opencnpj.org/{CNPJ}";
const TIMEOUT_PADRAO = 10000;
const MARCADOR_CNPJ = "{CNPJ}";
const DIGITOS_CNPJ = 14;

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
   * Normaliza e valida num passo só. Lança `ErroValidacao`; devolve os dígitos.
   */
  _preparar(cnpj, falsyEhAusente = false) {
    const ausente = falsyEhAusente
      ? !cnpj
      : cnpj === undefined || cnpj === null || cnpj === "";

    if (ausente) {
      throw new ErroValidacao(MSG_CNPJ_OBRIGATORIO);
    }

    const digitos = String(cnpj).replace(/\D/g, "");

    if (digitos.length !== DIGITOS_CNPJ) {
      throw new ErroValidacao(
        `CNPJ inválido: são esperados ${DIGITOS_CNPJ} dígitos, foram encontrados ${digitos.length}.`,
      );
    }

    return digitos;
  }

  _requisitar(digitos) {
    const url = this.urlApiCnpj.replace(MARCADOR_CNPJ, digitos);

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

module.exports = { Cnpj, ErroCnpj, ErroValidacao, ErroConsulta };
