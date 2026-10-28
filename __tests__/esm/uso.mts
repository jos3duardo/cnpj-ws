// Não é executado: o `tsc` prova que os tipos de `index.d.mts` compilam para
// quem importa o pacote como ESM. Rodar com `npm run test:types`.
import Cnpj, {
  consultar,
  validarCnpj,
  ErroConsulta,
  ErroTransporte,
  type Empresa,
} from "consulta-cnpj-ws";

async function esm(): Promise<string | null> {
  if (!validarCnpj("33000167000101")) return null;
  try {
    const empresa: Empresa = await consultar("33000167000101");
    return empresa.razao_social;
  } catch (erro) {
    if (erro instanceof ErroConsulta) return `HTTP ${erro.Erro}`;
    if (erro instanceof ErroTransporte) return erro.code;
    throw erro;
  }
}

const cliente = new Cnpj({ timeout: 5000 });

export { esm, cliente };
