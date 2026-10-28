import Cnpj from "./index.js";

export default Cnpj;
export { Cnpj };

export import ErroCnpj = Cnpj.ErroCnpj;
export import ErroValidacao = Cnpj.ErroValidacao;
export import ErroConsulta = Cnpj.ErroConsulta;
export import ErroTransporte = Cnpj.ErroTransporte;

export type Empresa = Cnpj.Empresa;
export type Socio = Cnpj.Socio;
export type Telefone = Cnpj.Telefone;
export type OpcoesCnpj = Cnpj.OpcoesCnpj;
export type Consulta = Cnpj.Consulta;
export type CodigoTransporte = Cnpj.CodigoTransporte;

export import normalizarCnpj = Cnpj.normalizarCnpj;
export import validarCnpj = Cnpj.validarCnpj;
export import consultar = Cnpj.consultar;
export import consultaCNPJ = Cnpj.consultaCNPJ;
