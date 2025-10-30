# CONSULTA-CNPJ-WS

[![Build Status](https://travis-ci.com/jos3duardo/cnpj-ws.svg?branch=master)](https://travis-ci.com/jos3duardo/cnpj-ws)
[![npm](https://img.shields.io/npm/l/express.svg)](https://travis-ci.com/jos3duardo/cnpj-ws)
[![npm downloads](https://img.shields.io/npm/dm/cnpj-ws.svg)](https://www.npmjs.com/package/cnpj-ws)

Este é um pacote que permite consultas gratuitas de CNPJ utilizando a API [OpenCNPJ](https://api.opencnpj.org/).

## ⚠️ Importante

- Não sou responsável pelo fornecimento das informações das consultas.
- Apenas estou fornecendo uma forma facilitada de fazer as consultas em suas aplicações por meio deste pacote.
- Os dados são fornecidos pela API OpenCNPJ.

## 📦 Como instalar

```bash
npm install consulta-cnpj-ws --save
```

## 🚀 Como utilizar

```javascript
const CNPJ = require("consulta-cnpj-ws");
const cnpj = new CNPJ();

cnpj
  .consultaCNPJ("33000167000101")
  .then((resultado) => {
    console.log(resultado);
  })
  .catch((erro) => {
    console.log(erro);
  });
```

### Com async/await

```javascript
const CNPJ = require("consulta-cnpj-ws");

async function consultarCNPJ() {
  const cnpj = new CNPJ();

  try {
    const resultado = await cnpj.consultaCNPJ("33000167000101");
    console.log(resultado);
  } catch (erro) {
    console.error(erro);
  }
}

consultarCNPJ();
```

### Formatos aceitos

O pacote aceita CNPJ nos seguintes formatos:

```javascript
// Como string (com ou sem formatação)
cnpj.consultaCNPJ("33000167000101");
cnpj.consultaCNPJ("33.000.167/0001-01");

// Como número
cnpj.consultaCNPJ(33000167000101);
```

## 📄 Resposta

Exemplo de resposta para o CNPJ da **Petrobras** (33.000.167/0001-01):

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
  "telefones": [
    {
      "ddd": "21",
      "numero": "21660000",
      "is_fax": false
    },
    {
      "ddd": "21",
      "numero": "3224",
      "is_fax": true
    }
  ],
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

## 📊 Estrutura da Resposta

| Campo                          | Tipo    | Descrição                                          |
| ------------------------------ | ------- | -------------------------------------------------- |
| `cnpj`                         | string  | CNPJ no formato sem formatação (apenas números)    |
| `razao_social`                 | string  | Razão social da empresa                            |
| `nome_fantasia`                | string  | Nome fantasia                                      |
| `situacao_cadastral`           | string  | Situação cadastral (Ativa, Baixada, Suspensa, etc) |
| `data_situacao_cadastral`      | string  | Data da situação cadastral no formato YYYY-MM-DD   |
| `matriz_filial`                | string  | Tipo: Matriz ou Filial                             |
| `data_inicio_atividade`        | string  | Data de abertura no formato YYYY-MM-DD             |
| `cnae_principal`               | string  | Código CNAE da atividade principal                 |
| `cnaes_secundarios`            | array   | Array com códigos CNAE das atividades secundárias  |
| `natureza_juridica`            | string  | Natureza jurídica da empresa                       |
| `logradouro`                   | string  | Logradouro do endereço                             |
| `numero`                       | string  | Número do endereço                                 |
| `complemento`                  | string  | Complemento do endereço                            |
| `bairro`                       | string  | Bairro                                             |
| `cep`                          | string  | CEP sem formatação                                 |
| `uf`                           | string  | Sigla da Unidade Federativa                        |
| `municipio`                    | string  | Nome do município                                  |
| `email`                        | string  | Email de contato                                   |
| `telefones`                    | array   | Array de objetos com telefones                     |
| `telefones[].ddd`              | string  | DDD do telefone                                    |
| `telefones[].numero`           | string  | Número do telefone                                 |
| `telefones[].is_fax`           | boolean | Indica se é fax                                    |
| `capital_social`               | string  | Valor do capital social                            |
| `porte_empresa`                | string  | Porte da empresa (ME, EPP, Demais)                 |
| `opcao_simples`                | string  | Se optante pelo Simples Nacional (S/N)             |
| `data_opcao_simples`           | string  | Data da opção pelo Simples                         |
| `opcao_mei`                    | string  | Se é MEI (S/N)                                     |
| `data_opcao_mei`               | string  | Data da opção pelo MEI                             |
| `QSA`                          | array   | Quadro de Sócios e Administradores                 |
| `QSA[].nome_socio`             | string  | Nome do sócio/administrador                        |
| `QSA[].cnpj_cpf_socio`         | string  | CPF/CNPJ do sócio (parcialmente oculto)            |
| `QSA[].qualificacao_socio`     | string  | Qualificação (Sócio, Diretor, Presidente, etc)     |
| `QSA[].data_entrada_sociedade` | string  | Data de entrada na sociedade                       |
| `QSA[].identificador_socio`    | string  | Tipo: Pessoa Física ou Pessoa Jurídica             |
| `QSA[].faixa_etaria`           | string  | Faixa etária do sócio                              |

## ❌ Tratamento de Erros

### CNPJ não encontrado ou inválido

```javascript
cnpj
  .consultaCNPJ("00000000000000")
  .then((resultado) => {
    console.log(resultado);
  })
  .catch((erro) => {
    console.log(erro);
    // Saída: { Erro: 404, MsgErro: 'CNPJ não encontrado.' }
  });
```

### CNPJ não informado

```javascript
cnpj
  .consultaCNPJ()
  .then((resultado) => {
    console.log(resultado);
  })
  .catch((erro) => {
    console.log(erro);
    // Lança exceção: "Você precisa informar um CNPJ valido..."
  });
```

## 📝 Exemplos de CNPJs para Teste

| Empresa                 | CNPJ               |
| ----------------------- | ------------------ |
| Petrobras               | 33.000.167/0001-01 |
| Banco do Brasil         | 00.000.000/0001-91 |
| Correios                | 34.028.316/0001-03 |
| Caixa Econômica Federal | 00.360.305/0001-04 |

## 🧪 Como Testar

Veja o arquivo [TESTES.md](./TESTES.md) para um guia completo de como testar a biblioteca.

### Teste Rápido

```bash
node consultaCnpj.js
```

### Testes Automatizados

```bash
npm install --save-dev jest
npm test
```

## 🔗 Links Úteis

- [API OpenCNPJ](https://api.opencnpj.org/)
- [Repositório GitHub](https://github.com/jos3duardo/cnpj-ws)
- [NPM Package](https://www.npmjs.com/package/consulta-cnpj-ws)

## 📄 Licença

MIT

## 👤 Autor

**José Eduardo** - [jos3duardo](https://github.com/jos3duardo)

---

**Versão**: 2.1.0
