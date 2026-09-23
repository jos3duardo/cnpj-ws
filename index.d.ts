export = Cnpj;

declare class Cnpj {
  /** Template da URL em uso, com o marcador `{CNPJ}`. */
  urlApiCnpj: string;
  /** Timeout das requisições, em milissegundos. */
  timeout: number;

  constructor(opcoes?: Cnpj.OpcoesCnpj);

  /** Consulta um CNPJ. Aceita string, número, com ou sem formatação. */
  consultar: Cnpj.Consulta;

  /** @deprecated desde 3.1.0 — use `consultar()`. Será removido na 4.0.0. */
  consultaCNPJ: Cnpj.Consulta;
}

declare namespace Cnpj {
  export type Consulta = (cnpj: string | number) => Promise<Empresa>;

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
    /** Template da URL; precisa conter o marcador `{CNPJ}`. */
    url?: string;
    /** Timeout da requisição em milissegundos. Padrão: 10000. `0` desliga. */
    timeout?: number;
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

  /** Consulta um CNPJ usando a instância padrão. */
  export const consultar: Consulta;

  /** @deprecated desde 3.1.0 — use `consultar()`. Será removido na 4.0.0. */
  export const consultaCNPJ: Consulta;

  export const Cnpj: new (opcoes?: OpcoesCnpj) => import("./index");
}
