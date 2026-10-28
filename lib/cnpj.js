const URL_PADRAO = "https://api.opencnpj.org/{CNPJ}";
const TIMEOUT_PADRAO = 10000;
// A resposta da OpenCNPJ tem poucos KiB; 256 KiB é folga para QSA grande.
const TAMANHO_MAXIMO_PADRAO = 256 * 1024;
// Por padrão redirect não é seguido: a consulta não sai do host configurado.
const REDIRECTS_PADRAO = 0;
const STATUS_REDIRECT = new Set([301, 302, 303, 307, 308]);
const PROTOCOLOS = new Set(["http:", "https:"]);
// Teto do setTimeout que o AbortSignal.timeout usa por baixo: acima disso o
// Node troca o prazo por 1 ms.
const TIMEOUT_MAXIMO = 2 ** 31 - 1;
const MARCADOR_CNPJ = "{CNPJ}";
const TAMANHO_CNPJ = 14;
// Desde jul/2026 a Receita emite CNPJ alfanumérico: 12 caracteres [0-9A-Z]
// (raiz e ordem) seguidos de 2 dígitos verificadores, sempre numéricos.
const FORMATO_CNPJ = /^[0-9A-Z]{12}[0-9]{2}$/;
// TextDecoder descarta o BOM, como o axios fazia; Buffer#toString não.
const DECODIFICADOR = new TextDecoder();
// Pesos do módulo 11, aplicados da esquerda para a direita.
const PESOS_DV1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const PESOS_DV2 = [6, ...PESOS_DV1];

const MSG_CNPJ_OBRIGATORIO =
  "Você precisa informar um CNPJ valido. Ex. cnpj.consultar('13150088000170')";

/** Base de todo erro originado nesta biblioteca. */
class ErroCnpj extends Error {
  constructor(mensagem, opcoes) {
    super(mensagem, opcoes);
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
 * A consulta não chegou a uma resposta HTTP utilizável: rede, prazo esgotado,
 * resposta grande demais ou que não é JSON. `code` diz qual; `cause` guarda o
 * erro original, quando há.
 */
class ErroTransporte extends ErroCnpj {
  constructor(codigo, mensagem, causa) {
    super(mensagem, causa === undefined ? undefined : { cause: causa });
    this.code = codigo;
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

  // O filtro vem antes do toUpperCase: "ß".toUpperCase() é "SS", e letra
  // fora de A-Z não pode virar letra de CNPJ. Só sobrar [0-9A-Z] é o que
  // mantém a URL segura.
  return String(cnpj).replace(/[^0-9A-Za-z]/g, "").toUpperCase();
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
   * @param {{ url?: string, timeout?: number, maxContentLength?: number, maxRedirects?: number, fetch?: typeof fetch }} [opcoes]
   */
  constructor(opcoes = {}) {
    const url = opcoes.url ?? URL_PADRAO;

    if (typeof url !== "string" || !url.includes(MARCADOR_CNPJ)) {
      throw new ErroValidacao(
        `A URL precisa conter o marcador ${MARCADOR_CNPJ}. Ex.: ${URL_PADRAO}`,
      );
    }

    // Validar aqui evita que erro de configuração chegue ao fetch e volte
    // disfarçado de FALHA_DE_REDE em toda consulta. `_requisitar` confere de
    // novo: `urlApiCnpj` é campo público desde a 2.x e pode mudar depois.
    urlDaApi(url.replace(MARCADOR_CNPJ, "0"));

    this.urlApiCnpj = url;
    this.timeout = inteiro(
      opcoes.timeout ?? TIMEOUT_PADRAO,
      "timeout",
      0,
      TIMEOUT_MAXIMO,
    );
    this.maxContentLength = inteiro(
      opcoes.maxContentLength ?? TAMANHO_MAXIMO_PADRAO,
      "maxContentLength",
      -1,
    );
    this.maxRedirects = inteiro(
      opcoes.maxRedirects ?? REDIRECTS_PADRAO,
      "maxRedirects",
      0,
    );

    // Sem padrão fixo: o `fetch` global é lido a cada consulta, para respeitar
    // polyfill ou mock instalado depois do require. Injetar é o caminho para
    // proxy corporativo (undici ProxyAgent), que o fetch nativo não lê do env.
    if (opcoes.fetch !== undefined && typeof opcoes.fetch !== "function") {
      throw new ErroValidacao("A opção fetch precisa ser uma função.");
    }
    this.fetch = opcoes.fetch;
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
   * @deprecated desde 3.1.0 — use consultar(). Será removido numa próxima major.
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
   *
   * Compatibilidade com a 3.1.0, que descartava tudo que não era dígito: se a
   * forma alfanumérica não fecha o formato mas os dígitos somam 14
   * ("CNPJ: 33.000.167/0001-01"), valem só os dígitos.
   */
  _preparar(cnpj, falsyEhAusente = false) {
    const ausente = falsyEhAusente
      ? !cnpj
      : cnpj === undefined || cnpj === null || cnpj === "";

    if (ausente) {
      throw new ErroValidacao(MSG_CNPJ_OBRIGATORIO);
    }

    let valor = normalizarCnpj(cnpj);

    if (!FORMATO_CNPJ.test(valor)) {
      const digitos = valor.replace(/\D/g, "");
      if (digitos.length === TAMANHO_CNPJ) {
        valor = digitos;
      }
    }

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

  /**
   * `fetch` nativo, sem dependência. Redirect é seguido à mão para respeitar
   * `maxRedirects`; o `signal` é o prazo total da consulta, corpo incluído.
   */
  async _requisitar(valor) {
    const prazo =
      this.timeout > 0 ? AbortSignal.timeout(this.timeout) : undefined;
    const buscar = this.fetch ?? fetch;
    let url = urlDaApi(String(this.urlApiCnpj).replace(MARCADOR_CNPJ, valor));
    const origem = url.origin;

    for (let redirects = 0; ; redirects++) {
      const resposta = await this._transportar(prazo, () =>
        buscar(url.href, {
          headers: { accept: "application/json" },
          redirect: "manual",
          ...(prazo && { signal: prazo }),
        }),
      );

      if (resposta.ok) {
        return this._transportar(prazo, () =>
          lerJson(resposta, this.maxContentLength),
        );
      }

      // O corpo do erro não interessa; cancelar libera a conexão.
      await resposta.body?.cancel().catch(() => {});

      const status = resposta.status;
      const proxima =
        STATUS_REDIRECT.has(status) &&
        redirects < this.maxRedirects &&
        destinoDoRedirect(origem, url, resposta.headers.get("location"));

      if (proxima) {
        url = proxima;
        continue;
      }

      throw new ErroConsulta(
        status,
        status === 404
          ? "CNPJ não encontrado."
          : `Erro ${status} ao consultar a API.`,
      );
    }
  }

  /**
   * Roda uma etapa de I/O (o `fetch` ou a leitura do corpo) e traduz a falha
   * dela em `ErroTransporte`. Só essas etapas: erro de outra origem não pode
   * sair rotulado como rede.
   */
  async _transportar(prazo, etapa) {
    try {
      return await etapa();
    } catch (erro) {
      if (erro instanceof ErroCnpj) {
        throw erro;
      }

      if (prazo?.aborted) {
        throw new ErroTransporte(
          "TEMPO_ESGOTADO",
          `A consulta excedeu o prazo de ${this.timeout} ms.`,
          erro,
        );
      }

      throw new ErroTransporte(
        "FALHA_DE_REDE",
        "Falha de rede ao consultar a API.",
        erro,
      );
    }
  }
}

/**
 * Próxima URL de um redirect, ou `null` se ele não deve ser seguido: sem
 * `Location`, `Location` malformado ou destino fora da origem configurada.
 * Mesma origem barra de uma vez `data:`, rebaixamento de https para http e
 * desvio para host interno escolhido por quem responde o redirect.
 */
function destinoDoRedirect(origem, atual, location) {
  if (!location) {
    return null;
  }

  try {
    const proxima = new URL(location, atual);
    return proxima.origin === origem ? proxima : null;
  } catch {
    return null;
  }
}

/**
 * Valida a URL da API: absoluta, http(s) e sem credencial. A mensagem nunca
 * repete a URL, que pode carregar senha.
 */
function urlDaApi(texto) {
  let url;
  try {
    url = new URL(texto);
  } catch {
    url = null;
  }

  if (!url || !PROTOCOLOS.has(url.protocol)) {
    throw new ErroValidacao(
      `A URL precisa ser http ou https e absoluta. Ex.: ${URL_PADRAO}`,
    );
  }

  // O fetch nativo recusa credencial na URL, e o erro dele a repete inteira.
  if (url.username || url.password) {
    throw new ErroValidacao(
      "A URL não pode conter usuário ou senha. Para autenticar, use a opção " +
        "fetch e envie o cabeçalho Authorization.",
    );
  }

  return url;
}

/** Confere que uma opção numérica é inteiro dentro da faixa; devolve o valor. */
function inteiro(valor, nome, minimo, maximo = Number.MAX_SAFE_INTEGER) {
  if (!Number.isInteger(valor) || valor < minimo || valor > maximo) {
    throw new ErroValidacao(
      `A opção ${nome} precisa ser um inteiro entre ${minimo} e ${maximo}.`,
    );
  }
  return valor;
}

/**
 * Lê o corpo contando bytes: o `Content-Length` declarado pode mentir ou faltar,
 * então o limite vale para o que de fato chega. `-1` desliga.
 */
async function lerJson(resposta, limite) {
  const excedeu = (tamanho) => limite >= 0 && tamanho > limite;
  const erroTamanho = () =>
    new ErroTransporte(
      "RESPOSTA_GRANDE_DEMAIS",
      `A resposta da API excedeu o limite de ${limite} bytes.`,
    );

  if (excedeu(Number(resposta.headers.get("content-length")))) {
    await resposta.body?.cancel();
    throw erroTamanho();
  }

  const partes = [];
  let total = 0;

  if (resposta.body) {
    // Lançar dentro do for await cancela o stream.
    for await (const parte of resposta.body) {
      total += parte.byteLength;
      if (excedeu(total)) {
        throw erroTamanho();
      }
      partes.push(parte);
    }
  }

  if (total === 0) {
    throw new ErroTransporte("RESPOSTA_INVALIDA", "A API respondeu sem corpo.");
  }

  const texto = DECODIFICADOR.decode(Buffer.concat(partes));

  try {
    return JSON.parse(texto);
  } catch (erro) {
    throw new ErroTransporte(
      "RESPOSTA_INVALIDA",
      "A API respondeu com um corpo que não é JSON.",
      erro,
    );
  }
}

module.exports = {
  Cnpj,
  ErroCnpj,
  ErroValidacao,
  ErroConsulta,
  ErroTransporte,
  normalizarCnpj,
  validarCnpj,
};
