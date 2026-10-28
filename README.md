# CONSULTA-CNPJ-WS

[![CI](https://github.com/jos3duardo/cnpj-ws/actions/workflows/ci.yml/badge.svg)](https://github.com/jos3duardo/cnpj-ws/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/consulta-cnpj-ws.svg)](https://www.npmjs.com/package/consulta-cnpj-ws)
[![npm downloads](https://img.shields.io/npm/dm/consulta-cnpj-ws.svg)](https://www.npmjs.com/package/consulta-cnpj-ws)
[![license](https://img.shields.io/npm/l/consulta-cnpj-ws.svg)](./LICENSE)
[![zero dependências](https://img.shields.io/badge/depend%C3%AAncias-0-brightgreen.svg)](./package.json)
[![tamanho](https://img.shields.io/bundlephobia/minzip/consulta-cnpj-ws.svg)](https://bundlephobia.com/package/consulta-cnpj-ws)
[![tipos](https://img.shields.io/npm/types/consulta-cnpj-ws.svg)](./index.d.ts)

Consulta gratuita de CNPJ — numérico e **alfanumérico** — na base pública da
Receita Federal, via API [OpenCNPJ](https://api.opencnpj.org/). Sem chave de API.

```javascript
import { consultar } from "consulta-cnpj-ws";

const empresa = await consultar("33.000.167/0001-01");
console.log(empresa.razao_social); // PETROLEO BRASILEIRO S A PETROBRAS
```

## ✨ Por que usar

- **Zero dependências.** Usa o `fetch` nativo do Node 18+; nada de `axios` na sua árvore.
- **CNPJ alfanumérico** (emitido desde jul/2026), com `validarCnpj()` pelo módulo 11 da Receita.
- **ESM e CommonJS**, com tipos TypeScript para os dois. Não precisa de `@types`.
- **Erros tipados:** um `instanceof ErroCnpj` cobre tudo que a lib rejeita, inclusive rede e timeout.
- **Seguro por padrão:** prazo total de 10 s, resposta limitada a 256 KiB, redirect não seguido, entrada filtrada antes de virar URL.
- **Publicado com provenance** pelo GitHub Actions (trusted publishing): o pacote no npm é rastreável até o commit.

## ⚠️ Importante

- Não sou responsável pelo fornecimento das informações das consultas.
- Apenas forneço uma forma facilitada de fazer essas consultas em suas aplicações.
- Os dados são fornecidos pela API OpenCNPJ.

## 📦 Instalação

```bash
npm install consulta-cnpj-ws
```

## 🚀 Uso

ESM:

```javascript
import { consultar } from "consulta-cnpj-ws";

const empresa = await consultar("33000167000101");
```

CommonJS:

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
consultar("12.ABC.345/01DE-35"); // alfanumérico (desde jul/2026)
consultar("12abc34501de35"); // minúsculas são convertidas
```

Entrada que não resulte em exatamente 14 caracteres — 12 em `[0-9A-Z]` mais 2
dígitos verificadores numéricos, ou 14 dígitos depois de descartar o resto, como
na 3.1.0 — é rejeitada localmente, sem gastar uma chamada
à API. O dígito verificador **não** é conferido por `consultar()`; use
`validarCnpj()` para isso.

### CNPJ alfanumérico

Desde julho de 2026 a Receita Federal emite CNPJ com letras nas 12 primeiras
posições (raiz e ordem); os 2 dígitos verificadores continuam numéricos. CNPJs
já existentes não mudam. A API OpenCNPJ aceita o novo formato.

```javascript
const { validarCnpj, normalizarCnpj } = require("consulta-cnpj-ws");

validarCnpj("12.ABC.345/01DE-35"); // true  (exemplo oficial da Receita)
validarCnpj("12.ABC.345/01DE-36"); // false (DV errado)
validarCnpj("33.000.167/0001-01"); // true  (numérico continua valendo)

normalizarCnpj("12.abc.345/01de-35"); // "12ABC34501DE35"
```

O DV segue o módulo 11 da Receita, com cada caractere valendo seu código ASCII
menos 48 (`0`–`9` mantêm o valor, `A` = 17 … `Z` = 42). Referência:
[Perguntas e Respostas — CNPJ alfanumérico](https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/perguntas-e-respostas/cnpj/cnpj-alfanumerico.pdf), pergunta 14.

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
| `timeout` | `10000`                            | Prazo total da consulta em ms; `0` desliga |
| `url`     | `https://api.opencnpj.org/{CNPJ}`  | Template de URL; precisa conter `{CNPJ}` |
| `maxContentLength` | `262144` (256 KiB)        | Tamanho máximo da resposta; `-1` desliga |
| `maxRedirects` | `0`                           | Redirecionamentos seguidos, só para a mesma origem; 3xx vira `ErroConsulta` |
| `fetch`   | `fetch` global                     | Implementação de `fetch` a usar (proxy, instrumentação) |

Opção inválida (timeout fracionário, URL sem `http(s)://`, URL com usuário e
senha) lança `ErroValidacao` já no construtor. Para autenticar na API, use a
opção `fetch` e envie o cabeçalho `Authorization`.

### Atrás de proxy

Por padrão o `fetch` nativo do Node **não lê** `HTTPS_PROXY`/`HTTP_PROXY`/`NO_PROXY`
(o axios lia). Duas saídas:

- **Node 22.21+ ou 24+:** rode com `NODE_USE_ENV_PROXY=1` e o `fetch` nativo
  passa a usar essas variáveis, sem mudar código.
- **Qualquer versão:** injete um `fetch` com o `ProxyAgent` do `undici`, que
  precisa ser instalado à parte (`npm install undici`, numa versão compatível
  com o seu Node):

```javascript
const { fetch, ProxyAgent } = require("undici");
const { Cnpj } = require("consulta-cnpj-ws");

const proxy = new ProxyAgent(process.env.HTTPS_PROXY);
const cliente = new Cnpj({
  fetch: (url, opcoes) => fetch(url, { ...opcoes, dispatcher: proxy }),
});
```

### TypeScript

O pacote inclui tipos para ESM (`index.d.mts`) e CommonJS (`index.d.ts`). Não é
necessário instalar `@types`.

```typescript
import { consultar, type Empresa } from "consulta-cnpj-ws";

const empresa: Empresa = await consultar("33000167000101");
```

Em projeto CommonJS:

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
const {
  consultar,
  ErroConsulta,
  ErroValidacao,
  ErroTransporte,
} = require("consulta-cnpj-ws");

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
    if (erro instanceof ErroTransporte && erro.code === "TEMPO_ESGOTADO") {
      console.log("A API demorou demais; tente de novo");
      return null;
    }
    throw erro;
  }
}
```

Todo erro é instância de `Error`, então `erro.message` e o stack trace sempre
funcionam — não é preciso testar `.MsgErro` antes.

Desde a 4.0.0 a lib não rejeita com nada que não seja `ErroCnpj`: um único
`instanceof ErroCnpj` cobre entrada inválida, status HTTP e falha de transporte.

```
Error
└── ErroCnpj           tudo que esta biblioteca rejeita
    ├── ErroValidacao  entrada que nem chega a virar requisição
    ├── ErroConsulta   a API respondeu com status de erro (.Erro, .MsgErro)
    └── ErroTransporte sem resposta utilizável (.code, .cause)
```

| Situação                        | Rejeita com                                         |
| ------------------------------- | --------------------------------------------------- |
| CNPJ não informado, `null`, `""` | `ErroValidacao`                                     |
| CNPJ sem 14 caracteres          | `ErroValidacao` informando quantos vieram           |
| Letra no dígito verificador     | `ErroValidacao`                                     |
| CNPJ não encontrado (404)       | `ErroConsulta` com `Erro: 404`                       |
| Outro erro HTTP ou redirect     | `ErroConsulta` com o status real (302, 429, 500, …) |
| Prazo total esgotado            | `ErroTransporte` com `code: "TEMPO_ESGOTADO"`        |
| Falha de rede (DNS, conexão)    | `ErroTransporte` com `code: "FALHA_DE_REDE"`         |
| Resposta acima do limite        | `ErroTransporte` com `code: "RESPOSTA_GRANDE_DEMAIS"` |
| Resposta que não é JSON         | `ErroTransporte` com `code: "RESPOSTA_INVALIDA"`     |

O erro original (do `fetch` ou do `JSON.parse`) fica em `erro.cause`.

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
| `cnpj`                         | string  | CNPJ sem formatação (números, ou letras e números no alfanumérico) |
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

## 🔄 Migrando para a 4.0

### Da 3.x

A API de consulta não mudou. O que muda:

- **Falha de transporte agora é `ErroTransporte`.** Antes vinha o erro cru do
  axios. Quem testava `erro.code === "ECONNABORTED"` ou `erro.response` passa a
  testar `erro instanceof ErroTransporte` e `erro.code` (`TEMPO_ESGOTADO`,
  `FALHA_DE_REDE`, `RESPOSTA_GRANDE_DEMAIS`, `RESPOSTA_INVALIDA`).
- **Import profundo fechado.** O campo `exports` só expõe a raiz do pacote;
  `require("consulta-cnpj-ws/lib/cnpj")` deixa de funcionar. Tudo que estava lá
  é exportado pela raiz.
- **`axios` saiu das dependências.** Se o seu projeto usava o `axios` que vinha
  junto, declare-o no seu `package.json`.
- **Proxy por variável de ambiente deixa de valer por padrão.** O axios lia
  `HTTPS_PROXY`; o `fetch` nativo só lê com `NODE_USE_ENV_PROXY=1` (Node 22.21+
  ou 24+). Veja [Atrás de proxy](#atrás-de-proxy).
- **`consultaCNPJ()` segue depreciado** (desde a 3.1.0). Troque por
  `consultar()`. Diferença entre os dois: com CNPJ ausente, `consultaCNPJ()`
  lança de forma **síncrona** (só `try/catch` captura) e `consultar()` **rejeita
  a Promise**.
- **Opções inválidas falham no construtor** com `ErroValidacao`: `timeout` que
  não é inteiro (inclusive string vinda de variável de ambiente) e URL que não
  é `http(s)` absoluta.

### Da 2.x

A 2.x está fixada em muitos lockfiles. A troca é pequena:

```javascript
// 2.x
const CNPJ = require("consulta-cnpj-ws");
const cnpj = new CNPJ();
cnpj
  .consultaCNPJ({ cnpj: "33000167000101" })
  .then((empresa) => console.log(empresa))
  .catch((erro) => console.log(erro.Erro, erro.MsgErro));

// 4.x
const { consultar } = require("consulta-cnpj-ws");
consultar("33000167000101")
  .then((empresa) => console.log(empresa))
  .catch((erro) => console.log(erro.Erro, erro.message));
```

- A fonte dos dados mudou na 3.0 (ReceitaWS → OpenCNPJ), e os nomes dos campos
  da resposta mudaram junto. Os mais usados:

| 2.x (ReceitaWS)          | 4.x (OpenCNPJ)             |
| ------------------------ | -------------------------- |
| `nome`                   | `razao_social`             |
| `fantasia`               | `nome_fantasia`            |
| `situacao`               | `situacao_cadastral`       |
| `data_situacao`          | `data_situacao_cadastral`  |
| `abertura`               | `data_inicio_atividade`    |
| `atividade_principal`    | `cnae_principal`           |
| `atividades_secundarias` | `cnaes_secundarios`        |
| `telefone`               | `telefones[]`              |
| `qsa`                    | `QSA`                      |

  Datas vêm em `AAAA-MM-DD` e CNAE só com o código; a lista completa está em
  [Campos](#campos).
- `.Erro` e `.MsgErro` continuam em `ErroConsulta`; código novo usa `message` e
  `instanceof`.
- Exige Node 18 ou superior.

Veja o [CHANGELOG](./CHANGELOG.md) para a lista completa de mudanças.

## 🧪 Desenvolvimento

```bash
npm test                  # unitários (fetch mockado) e limites (servidor local), sem internet
npm run test:esm          # o pacote importado como ESM
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
