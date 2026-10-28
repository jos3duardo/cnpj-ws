export = Cnpj;

declare class Cnpj {
  /** Template da URL em uso, com o marcador `{CNPJ}`. */
  urlApiCnpj: string;
  /** Timeout das requisições, em milissegundos. */
  timeout: number;
  /** Tamanho máximo da resposta, em bytes. */
  maxContentLength: number;
  /** Redirecionamentos seguidos; `0` não segue nenhum. */
  maxRedirects: number;

  constructor(opcoes?: Cnpj.OpcoesCnpj);

  /**
   * Consulta um CNPJ, numérico ou alfanumérico. Aceita string ou número, com
   * ou sem formatação. Confere o formato, não o dígito verificador.
   */
  consultar: Cnpj.Consulta;

  /** @deprecated desde 3.1.0 — use `consultar()`. Será removido numa próxima major. */
  consultaCNPJ: Cnpj.Consulta;
}

declare namespace Cnpj {
  export type Consulta = (cnpj: string | number | bigint) => Promise<Empresa>;

  export interface Telefone {
    ddd: string;
    numero: string;
    is_fax: boolean;
  }

  export interface Socio {
    nome_socio: string;
    cnpj_cpf_socio: string;
    qualificacao_socio: string;
    data_entrada_sociedade: string;
    identificador_socio: string;
    faixa_etaria: string;
  }

  export interface Empresa {
    cnpj: string;
    razao_social: string;
    nome_fantasia: string;
    situacao_cadastral: string;
    data_situacao_cadastral: string;
    matriz_filial: string;
    data_inicio_atividade: string;
    cnae_principal: string;
    cnaes_secundarios: string[];
    natureza_juridica: string;
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    cep: string;
    uf: string;
    municipio: string;
    email: string;
    telefones: Telefone[];
    capital_social: string;
    porte_empresa: string;
    opcao_simples: string;
    data_opcao_simples: string;
    opcao_mei: string;
    data_opcao_mei: string;
    QSA: Socio[];
    [campo: string]: unknown;
  }

  export interface OpcoesCnpj {
    /** Template da URL: http(s) absoluta, sem credencial, com o marcador `{CNPJ}`. */
    url?: string;
    /** Prazo total da consulta em milissegundos. Padrão: 10000. `0` desliga. */
    timeout?: number;
    /** Tamanho máximo da resposta em bytes. Padrão: 262144 (256 KiB). `-1` desliga. */
    maxContentLength?: number;
    /** Redirecionamentos seguidos, só para a mesma origem da `url`. Padrão: `0`. */
    maxRedirects?: number;
    /**
     * `fetch` a usar no lugar do global. Útil atrás de proxy corporativo: o
     * `fetch` nativo só lê `HTTPS_PROXY` com `NODE_USE_ENV_PROXY=1`.
     */
    fetch?: typeof fetch;
  }

  /** Base de todo erro originado nesta biblioteca. */
  export class ErroCnpj extends Error {}

  /** Entrada que sequer chega a virar uma consulta. */
  export class ErroValidacao extends ErroCnpj {}

  /** A API respondeu com um status HTTP de erro. */
  export class ErroConsulta extends ErroCnpj {
    /** Status HTTP devolvido pela API. */
    Erro: number;
    /** Mensagem legível — igual a `message`. */
    MsgErro: string;

    constructor(status: number, mensagem: string);
  }

  /** Motivo de uma falha de transporte. */
  export type CodigoTransporte =
    | "TEMPO_ESGOTADO"
    | "FALHA_DE_REDE"
    | "RESPOSTA_GRANDE_DEMAIS"
    | "RESPOSTA_INVALIDA";

  /**
   * A consulta não chegou a uma resposta HTTP utilizável: rede, prazo esgotado,
   * resposta grande demais ou que não é JSON.
   */
  export class ErroTransporte extends ErroCnpj {
    code: CodigoTransporte;
    /** Erro original do `fetch` ou do `JSON.parse`, quando há. */
    cause?: unknown;

    constructor(codigo: CodigoTransporte, mensagem: string, causa?: unknown);
  }

  /**
   * Normaliza um CNPJ numérico ou alfanumérico: maiúsculas, só `[0-9A-Z]`.
   * Não valida; entrada que não é string nem número vira `""`.
   */
  export function normalizarCnpj(cnpj: string | number | bigint): string;

  /**
   * `true` se o CNPJ, numérico ou alfanumérico, tem formato e dígitos
   * verificadores válidos (módulo 11 da Receita). Aceita formatação.
   */
  export function validarCnpj(cnpj: string | number | bigint): boolean;

  /** Consulta um CNPJ usando a instância padrão. */
  export const consultar: Consulta;

  /** @deprecated desde 3.1.0 — use `consultar()`. Será removido numa próxima major. */
  export const consultaCNPJ: Consulta;

  export const Cnpj: new (opcoes?: OpcoesCnpj) => import("./index");
}
