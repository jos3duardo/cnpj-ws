// Não é executado: serve para o `tsc` provar que os tipos publicados compilam
// nos padrões de uso documentados no README. Rodar com `npm run test:types`.
import Cnpj = require("../../index");

// 1. Função direta, sem `new`.
async function direto(): Promise<string> {
  const empresa: Cnpj.Empresa = await Cnpj.consultar("33000167000101");
  return empresa.razao_social;
}

// 2. Instância com opções.
async function comOpcoes(): Promise<number> {
  const cliente = new Cnpj({ timeout: 5000 });
  const empresa = await cliente.consultar(33000167000101);
  return empresa.telefones.length;
}

// 3. Padrão 3.0.x citado na seção "Migrando da 3.0.x".
async function legado(): Promise<string> {
  const cliente = new Cnpj();
  const empresa = await cliente.consultaCNPJ("33.000.167/0001-01");
  return empresa.QSA[0].nome_socio;
}

// 4. Export nomeado da classe.
const viaNomeado = new Cnpj.Cnpj({ url: "https://exemplo.test/{CNPJ}" });

// 5. Hierarquia de erros: um `instanceof` cobre tudo que a lib rejeita.
function tratar(erro: unknown): string | null {
  if (erro instanceof Cnpj.ErroConsulta) return `HTTP ${erro.Erro}`;
  if (erro instanceof Cnpj.ErroCnpj) return erro.message;
  return null;
}

export { direto, comOpcoes, legado, viaNomeado, tratar };
