# 📋 Atualizações e Melhorias - CNPJ-WS

## 🎯 Resumo das Alterações

Este documento descreve todas as atualizações realizadas na biblioteca `consulta-cnpj-ws`.

---

## 🔄 Principais Mudanças

### 1. **Nova API - OpenCNPJ**

A biblioteca agora utiliza a API **OpenCNPJ** (`https://api.opencnpj.org/`) ao invés da antiga ReceitaWS.

**Benefícios:**
- API mais estável e atualizada
- Dados mais completos e detalhados
- Melhor estruturação das respostas

### 2. **Sintaxe Simplificada**

#### Antes:
```javascript
cnpj.consultaCNPJ({ cnpj: '33000167000101' })
```

#### Agora:
```javascript
cnpj.consultaCNPJ('33000167000101')
```

O método agora recebe o CNPJ **diretamente como parâmetro**, sem necessidade de objeto.

### 3. **Correção de Bug - Formatação de CNPJ**

**Problema corrigido:**
- Erro quando CNPJ era passado como número
- Erro: `arg.cnpj.replace is not a function`

**Solução implementada:**
```javascript
const cnpjLimpo = String(cnpj).replace(/\D/g, "");
```

Agora a biblioteca aceita:
- ✅ String: `"33000167000101"`
- ✅ Número: `33000167000101`
- ✅ Formatado: `"33.000.167/0001-01"`
- ✅ Com espaços: `"33 000 167 000 101"`

---

## 📊 Nova Estrutura de Resposta

A API OpenCNPJ retorna dados mais completos:

### Campos Principais

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `cnpj` | string | CNPJ sem formatação |
| `razao_social` | string | Razão social da empresa |
| `nome_fantasia` | string | Nome fantasia |
| `situacao_cadastral` | string | Situação (Ativa, Baixada, etc) |
| `data_situacao_cadastral` | string | Data no formato YYYY-MM-DD |
| `matriz_filial` | string | Matriz ou Filial |
| `data_inicio_atividade` | string | Data de abertura YYYY-MM-DD |
| `cnae_principal` | string | Código CNAE principal |
| `cnaes_secundarios` | array | Array de códigos CNAE |
| `natureza_juridica` | string | Natureza jurídica |
| `logradouro` | string | Endereço - Logradouro |
| `numero` | string | Endereço - Número |
| `complemento` | string | Endereço - Complemento |
| `bairro` | string | Endereço - Bairro |
| `cep` | string | CEP sem formatação |
| `uf` | string | Unidade Federativa |
| `municipio` | string | Município |
| `email` | string | Email de contato |
| `telefones` | array | Array de objetos com telefones |
| `capital_social` | string | Valor do capital social |
| `porte_empresa` | string | Porte (ME, EPP, Demais) |
| `opcao_simples` | string | Optante Simples (S/N) |
| `opcao_mei` | string | É MEI (S/N) |
| `QSA` | array | Quadro de Sócios e Administradores |

### Exemplo de Telefone

```json
{
  "ddd": "21",
  "numero": "21660000",
  "is_fax": false
}
```

### Exemplo de QSA (Sócio)

```json
{
  "nome_socio": "MAGDA MARIA DE REGINA CHAMBRIARD",
  "cnpj_cpf_socio": "***612937**",
  "qualificacao_socio": "Presidente",
  "data_entrada_sociedade": "2024-06-07",
  "identificador_socio": "Pessoa Física",
  "faixa_etaria": "61 a 70 anos"
}
```

---

## 📝 Documentação Atualizada

### 1. **README.md**
- ✅ Atualizado com nova sintaxe
- ✅ Exemplo real da Petrobras
- ✅ Tabela completa de campos da resposta
- ✅ Exemplos de tratamento de erros
- ✅ CNPJs de empresas públicas para teste

### 2. **TESTES.md**
- ✅ Guia completo de testes
- ✅ 8 métodos diferentes de teste
- ✅ Exemplos práticos com código
- ✅ Testes automatizados com Jest
- ✅ Troubleshooting e debugging
- ✅ Exemplo de aplicação completa com cache e retry

### 3. **test.js**
- ✅ 6 testes automatizados
- ✅ Testa Petrobras e Banco do Brasil
- ✅ Valida diferentes formatos de CNPJ
- ✅ Testa tratamento de erros
- ✅ Delays entre requisições

### 4. **__tests__/cnpj.test.js**
- ✅ Suite completa de testes Jest
- ✅ 25+ casos de teste
- ✅ Testes de validação
- ✅ Testes de formatação
- ✅ Testes de múltiplas empresas
- ✅ Testes de estrutura de dados

---

## 🧪 Como Testar

### Teste Rápido

```bash
node consultaCnpj.js
```

### Teste Completo

```bash
node test.js
```

### Testes Automatizados

```bash
npm install --save-dev jest
npm test
```

---

## 📦 CNPJs de Teste

Empresas públicas testadas e validadas:

| Empresa | CNPJ | Status |
|---------|------|--------|
| **Petrobras** | 33.000.167/0001-01 | ✅ Testado |
| **Banco do Brasil** | 00.000.000/0001-91 | ✅ Testado |
| **Correios** | 34.028.316/0001-03 | ✅ Disponível |
| **Caixa Econômica** | 00.360.305/0001-04 | ✅ Disponível |
| **Eletrobras** | 00.001.180/0001-26 | ✅ Disponível |

---

## 🔧 Melhorias Técnicas

### 1. **Tratamento de Erros Aprimorado**

```javascript
// Erro 404 padronizado
{
  Erro: 404,
  MsgErro: "CNPJ não encontrado."
}
```

### 2. **Validação de Parâmetros**

```javascript
if (cnpj === false) {
  throw new Error("Você precisa informar um CNPJ valido...");
}
```

### 3. **Limpeza de CNPJ com Regex**

```javascript
const cnpjLimpo = String(cnpj).replace(/\D/g, "");
```

Remove todos os caracteres não numéricos:
- Pontos: `.`
- Barras: `/`
- Hífens: `-`
- Espaços: ` `

---

## 📈 Exemplos de Uso Atualizados

### Exemplo Básico

```javascript
const CNPJ = require("consulta-cnpj-ws");
const cnpj = new CNPJ();

cnpj.consultaCNPJ("33000167000101")
  .then(resultado => {
    console.log(resultado.razao_social);
    console.log(resultado.situacao_cadastral);
  })
  .catch(erro => console.error(erro));
```

### Exemplo com Async/Await

```javascript
async function consultar() {
  const cnpj = new CNPJ();

  try {
    const resultado = await cnpj.consultaCNPJ("33000167000101");
    console.log(resultado);
  } catch (erro) {
    console.error(erro);
  }
}
```

### Exemplo com Múltiplos CNPJs

```javascript
const cnpjs = ["33000167000101", "00000000000191"];

for (const numeroCnpj of cnpjs) {
  const resultado = await cnpj.consultaCNPJ(numeroCnpj);
  console.log(resultado.razao_social);

  // Aguardar 2 segundos entre consultas
  await new Promise(resolve => setTimeout(resolve, 2000));
}
```

---

## ⚠️ Breaking Changes

### Mudança de Sintaxe

Se você estava usando a versão anterior:

#### Antes (v2.0.x):
```javascript
cnpj.consultaCNPJ({ cnpj: '33000167000101' })
```

#### Agora (v2.1.0):
```javascript
cnpj.consultaCNPJ('33000167000101')
```

### Migração

Para atualizar seu código:

1. Remova o objeto wrapper `{ cnpj: ... }`
2. Passe o CNPJ diretamente como string ou número
3. Atualize os campos da resposta (veja tabela acima)

**Exemplo de migração:**

```javascript
// ANTES
cnpj.consultaCNPJ({ cnpj: dados.cnpj })
  .then(r => {
    console.log(r.nome);          // Campo antigo
    console.log(r.fantasia);       // Campo antigo
  });

// DEPOIS
cnpj.consultaCNPJ(dados.cnpj)
  .then(r => {
    console.log(r.razao_social);   // Campo novo
    console.log(r.nome_fantasia);  // Campo novo
  });
```

---

## 🎯 Próximos Passos

### Sugestões de Melhorias Futuras

- [ ] Implementar cache integrado
- [ ] Adicionar retry automático
- [ ] Suporte a TypeScript
- [ ] Validação de CNPJ (dígitos verificadores)
- [ ] Rate limiting automático
- [ ] Métricas e logs opcionais
- [ ] Suporte a batch de consultas

---

## 📚 Recursos

- [README.md](./README.md) - Documentação principal
- [TESTES.md](./TESTES.md) - Guia completo de testes
- [API OpenCNPJ](https://api.opencnpj.org/)
- [NPM Package](https://www.npmjs.com/package/consulta-cnpj-ws)
- [GitHub](https://github.com/jos3duardo/cnpj-ws)

---

## 👤 Contribuições

Estas atualizações foram realizadas para:

1. ✅ Modernizar a biblioteca
2. ✅ Melhorar a experiência do desenvolvedor
3. ✅ Corrigir bugs conhecidos
4. ✅ Adicionar documentação completa
5. ✅ Facilitar testes e debugging

---

**Versão Atual:** 2.1.0
**Data das Atualizações:** 2024
**Status:** ✅ Estável e Testado
