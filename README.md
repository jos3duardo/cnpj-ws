# CONSULTA-CNPJ-WS

[![CI](https://github.com/jos3duardo/cnpj-ws/actions/workflows/ci.yml/badge.svg)](https://github.com/jos3duardo/cnpj-ws/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/consulta-cnpj-ws.svg)](https://www.npmjs.com/package/consulta-cnpj-ws)
[![npm downloads](https://img.shields.io/npm/dm/consulta-cnpj-ws.svg)](https://www.npmjs.com/package/consulta-cnpj-ws)
[![license](https://img.shields.io/npm/l/consulta-cnpj-ws.svg)](./LICENSE)

Consulta gratuita de CNPJ a partir da API [OpenCNPJ](https://api.opencnpj.org/).

## ⚠️ Importante

- Não sou responsável pelo fornecimento das informações das consultas.
- Apenas forneço uma forma facilitada de fazer essas consultas em suas aplicações.
- Os dados são fornecidos pela API OpenCNPJ.

## 📦 Instalação

```bash
npm install consulta-cnpj-ws
```

## 🚀 Uso

```javascript
const { consultar } = require("consulta-cnpj-ws");

async function main() {
  const empresa = await consultar("33000167000101");
  console.log(empresa.razao_social);
}

main();
```

Sem `async/await`:

```javascript
const { consultar } = require("consulta-cnpj-ws");

consultar("33000167000101")
  .then((empresa) => console.log(empresa.razao_social))
  .catch((erro) => console.error(erro));
```

### Formatos aceitos

```javascript
consultar("33000167000101"); // string
consultar(33000167000101); // número
consultar("33.000.167/0001-01"); // formatado
```

Entrada que não resulte em exatamente 14 dígitos é rejeitada localmente, sem
gastar uma chamada à API.

### Instância com opções

Use a classe quando precisar ajustar o timeout ou apontar para outra URL:

```javascript
const { Cnpj } = require("consulta-cnpj-ws");

const cliente = new Cnpj({ timeout: 5000 });

cliente.consultar("33000167000101").then((empresa) => {
  console.log(empresa.razao_social);
});
```

| Opção     | Padrão                             | Descrição                            |
| --------- | ---------------------------------- | ------------------------------------ |
| `timeout` | `10000`                            | Timeout da requisição em ms; `0` desliga |
| `url`     | `https://api.opencnpj.org/{CNPJ}`  | Template de URL; precisa conter `{CNPJ}` |

### TypeScript

O pacote inclui tipos (`index.d.ts`). Não é necessário instalar `@types`.

```typescript
import Cnpj = require("consulta-cnpj-ws");

async function main(): Promise<void> {
  const empresa: Cnpj.Empresa = await Cnpj.consultar("33000167000101");
  console.log(empresa.razao_social);
}
```

Os tipos publicados são verificados no CI com `tsc --strict`.

## ❌ Tratamento de erros

`consultar()` rejeita a Promise em todos os casos de falha — um único `catch` cobre tudo:

```javascript
const { consultar, ErroConsulta, ErroValidacao } = require("consulta-cnpj-ws");

async function buscar(numeroCnpj) {
  try {
    return await consultar(numeroCnpj);
  } catch (erro) {
    if (erro instanceof ErroValidacao) {
      console.log("CNPJ mal formado:", erro.message);
      return null;
    }
    if (erro instanceof ErroConsulta && erro.Erro === 404) {
      console.log("CNPJ não encontrado");
      return null;
    }
    throw erro; // falha de rede: o erro original do axios
  }
}
```

Todo erro é instância de `Error`, então `erro.message` e o stack trace sempre
funcionam — não é preciso testar `.MsgErro` antes.

As classes formam uma hierarquia, então um único `instanceof ErroCnpj` separa
"a biblioteca recusou" de "o transporte falhou":

```
Error
└── ErroCnpj          tudo que esta biblioteca rejeita
    ├── ErroValidacao entrada que nem chega a virar requisição
    └── ErroConsulta  a API respondeu com status de erro (.Erro, .MsgErro)
```

| Situação                        | Rejeita com                                         |
| ------------------------------- | --------------------------------------------------- |
| CNPJ não informado, `null`, `""` | `ErroValidacao`                                     |
| CNPJ sem 14 dígitos             | `ErroValidacao` informando quantos dígitos vieram   |
| CNPJ não encontrado (404)       | `ErroConsulta` com `Erro: 404`                       |
| Outro erro HTTP                 | `ErroConsulta` com o status real (429, 500, …)      |
| Falha de rede ou timeout        | O erro original do axios                             |

## 📄 Resposta

Exemplo para o CNPJ da **Petrobras** (33.000.167/0001-01):

```json
{
  "cnpj": "33000167000101",
  "razao_social": "PETROLEO BRASILEIRO S A PETROBRAS",
  "nome_fantasia": "PETROBRAS - EDISE",
  "situacao_cadastral": "Ativa",
  "data_situacao_cadastral": "2005-11-03",
  "matriz_filial": "Matriz",
  "data_inicio_atividade": "1966-09-28",
  "cnae_principal": "1921700",
  "cnaes_secundarios": ["0600001", "3520401", "3520402", "4681801"],
  "natureza_juridica": "Sociedade de Economia Mista",
  "logradouro": "REPUBLICA DO CHILE",
  "numero": "65",
  "complemento": "",
  "bairro": "CENTRO",
  "cep": "20031170",
  "uf": "RJ",
  "municipio": "RIO DE JANEIRO",
  "email": "CC-RFISC@PETROBRAS.COM.BR",
  "telefones": [{ "ddd": "21", "numero": "21660000", "is_fax": false }],
  "capital_social": "205431960490,52",
  "porte_empresa": "Demais",
  "opcao_simples": "",
  "data_opcao_simples": "",
  "opcao_mei": "",
  "data_opcao_mei": "",
  "QSA": [
    {
      "nome_socio": "MAGDA MARIA DE REGINA CHAMBRIARD",
      "cnpj_cpf_socio": "***612937**",
      "qualificacao_socio": "Presidente",
      "data_entrada_sociedade": "2024-06-07",
      "identificador_socio": "Pessoa Física",
      "faixa_etaria": "61 a 70 anos"
    }
  ]
}
```

### Campos

| Campo                          | Tipo    | Descrição                                          |
| ------------------------------ | ------- | -------------------------------------------------- |
| `cnpj`                         | string  | CNPJ sem formatação (apenas números)               |
| `razao_social`                 | string  | Razão social da empresa                            |
| `nome_fantasia`                | string  | Nome fantasia                                      |
| `situacao_cadastral`           | string  | Situação cadastral (Ativa, Baixada, Suspensa, etc) |
| `data_situacao_cadastral`      | string  | Data da situação cadastral (YYYY-MM-DD)            |
| `matriz_filial`                | string  | Matriz ou Filial                                   |
| `data_inicio_atividade`        | string  | Data de abertura (YYYY-MM-DD)                      |
| `cnae_principal`               | string  | Código CNAE da atividade principal                 |
| `cnaes_secundarios`            | array   | Códigos CNAE das atividades secundárias            |
| `natureza_juridica`            | string  | Natureza jurídica da empresa                       |
| `logradouro`                   | string  | Logradouro do endereço                             |
| `numero`                       | string  | Número do endereço                                 |
| `complemento`                  | string  | Complemento do endereço                            |
| `bairro`                       | string  | Bairro                                             |
| `cep`                          | string  | CEP sem formatação                                 |
| `uf`                           | string  | Sigla da Unidade Federativa                        |
| `municipio`                    | string  | Nome do município                                  |
| `email`                        | string  | Email de contato                                   |
| `telefones[].ddd`              | string  | DDD do telefone                                    |
| `telefones[].numero`           | string  | Número do telefone                                 |
| `telefones[].is_fax`           | boolean | Indica se é fax                                    |
| `capital_social`               | string  | Valor do capital social                            |
| `porte_empresa`                | string  | Porte da empresa (ME, EPP, Demais)                 |
| `opcao_simples`                | string  | Se optante pelo Simples Nacional                   |
| `data_opcao_simples`           | string  | Data da opção pelo Simples                         |
| `opcao_mei`                    | string  | Se é MEI                                           |
| `data_opcao_mei`               | string  | Data da opção pelo MEI                             |
| `QSA[].nome_socio`             | string  | Nome do sócio/administrador                        |
| `QSA[].cnpj_cpf_socio`         | string  | CPF/CNPJ do sócio (parcialmente oculto)            |
| `QSA[].qualificacao_socio`     | string  | Qualificação (Sócio, Diretor, Presidente, etc)     |
| `QSA[].data_entrada_sociedade` | string  | Data de entrada na sociedade                       |
| `QSA[].identificador_socio`    | string  | Pessoa Física ou Pessoa Jurídica                   |
| `QSA[].faixa_etaria`           | string  | Faixa etária do sócio                              |

## 🔄 Migrando da 3.0.x

`consultaCNPJ()` continua funcionando na 3.x, agora depreciado. Será removido na 4.0.0.

```javascript
// antes
const CNPJ = require("consulta-cnpj-ws");
const cnpj = new CNPJ();
cnpj.consultaCNPJ("33000167000101");

// agora
const { consultar } = require("consulta-cnpj-ws");
consultar("33000167000101");
```

Uma diferença de comportamento entre os dois: quando o CNPJ não é informado,
`consultaCNPJ()` lança de forma **síncrona** (só `try/catch` captura), enquanto
`consultar()` **rejeita a Promise** — capturável por `.catch()`, como a
documentação sempre sugeriu.

Veja o [CHANGELOG](./CHANGELOG.md) para a lista completa de mudanças.

## 🧪 Desenvolvimento

```bash
npm test                  # testes unitários (axios mockado, sem rede)
npm run test:watch
npm run test:coverage
npm run test:integration  # bate na API real; não roda no CI
npm run test:types        # valida os tipos publicados com tsc
```

Exemplos executáveis em [`examples/`](https://github.com/jos3duardo/cnpj-ws/blob/master/examples):

```bash
node examples/consulta-simples.js
node examples/consulta-completa.js
```

### CNPJs públicos para teste

| Empresa                 | CNPJ               |
| ----------------------- | ------------------ |
| Petrobras               | 33.000.167/0001-01 |
| Banco do Brasil         | 00.000.000/0001-91 |
| Correios                | 34.028.316/0001-03 |
| Caixa Econômica Federal | 00.360.305/0001-04 |

## 🔗 Links

- [API OpenCNPJ](https://api.opencnpj.org/)
- [Repositório GitHub](https://github.com/jos3duardo/cnpj-ws)
- [Pacote no NPM](https://www.npmjs.com/package/consulta-cnpj-ws)

## 📄 Licença

MIT — veja [LICENSE](./LICENSE).

## 👤 Autor

**José Eduardo** — [jos3duardo](https://github.com/jos3duardo)
