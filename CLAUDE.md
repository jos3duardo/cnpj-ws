# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## O que é

Pacote npm `consulta-cnpj-ws` (repositório `cnpj-ws`): wrapper fino sobre a API pública [OpenCNPJ](https://api.opencnpj.org/) para consulta de CNPJ. Sem build, sem transpilação, sem lint configurado — CommonJS puro.

Documentação, nomes de função e mensagens de erro são em português do Brasil. Manter esse idioma em código novo, testes e docs.

## Comandos

```bash
npm test                      # unitários, axios mockado, sem rede (~0,3 s)
npm run test:watch
npm run test:coverage
npm run test:types            # valida index.d.ts com tsc --strict
npm run test:integration      # bate na API real; config própria, fora do CI
npx jest -t "nome do teste"   # um teste isolado

node examples/consulta-simples.js
node examples/consulta-completa.js
```

## Arquitetura

- `lib/cnpj.js` — toda a lógica. Exporta **um objeto simples**: `{ Cnpj, ErroCnpj, ErroValidacao, ErroConsulta, normalizarCnpj, validarCnpj }`. Não sabe nada sobre como o pacote é publicado.
- `index.js` — **único dono da superfície pública**. Faz `module.exports = Cnpj` (a classe é o export principal desde a 2.x) e anexa nela os demais nomes, delegando a uma instância padrão. É isso que permite `new Cnpj()`, `pacote.consultar()` e `const { consultar } = require(...)` ao mesmo tempo. Nome público novo se adiciona **aqui**, não em `lib/`.
- `index.d.ts` — tipos mantidos à mão, sem geração automática. Mudou a API pública, atualizar aqui junto; `npm run test:types` roda `tsc --strict` sobre `__tests__/tipos/uso.ts`, que exercita os padrões de uso do README.

## Contrato público (mudar = breaking change)

`consultar()` é a API atual. `consultaCNPJ()` é alias depreciado desde a 3.1.0, previsto para remoção na 4.0.0 — até lá os dois precisam continuar funcionando.

`_preparar(cnpj, falsyEhAusente)` é o ponto único de validação e normalização. Os dois métodos públicos diferem em exatamente **dois eixos**, e há teste para cada:

| | `consultar()` | `consultaCNPJ()` |
|---|---|---|
| Como o erro escapa | `async`, logo **rejeita** | não-`async`, **lança síncrono** |
| `0`, `false`, `NaN` | erro de formato | erro de "não informado" (histórico) |

Não "uniformizar" isso sem bump de major. Ao mexer em `consultar`, note que o `async` é o que converte o throw de `_preparar` em rejeição — remover o `async` quebra o contrato silenciosamente.

### Erros

```
Error
└── ErroCnpj          tudo que a biblioteca rejeita
    ├── ErroValidacao entrada que nem vira requisição
    └── ErroConsulta  status HTTP de erro (.Erro, .MsgErro)
```

Falha de rede ou timeout propaga o erro original do axios, que não tem `response` — é o único caso que não é `ErroCnpj`. `ErroConsulta` preserva o status real: um 429 de rate limit não se disfarça de 404.

`.Erro` e `.MsgErro` são o formato documentado desde a 2.x e existem só por compatibilidade; código novo usa `message` e `instanceof`.

### Normalização

`normalizarCnpj()`: `String(cnpj).replace(/[^0-9A-Za-z]/g, "").toUpperCase()` — filtro antes do `toUpperCase`, senão `ß` vira `SS`. Em `_preparar` vem a checagem do formato `/^[0-9A-Z]{12}[0-9]{2}$/` (CNPJ alfanumérico da Receita, desde jul/2026; o numérico é caso particular) e de 14 caracteres. Se a forma alfanumérica não fecha o formato mas os dígitos somam 14, valem só os dígitos: é o que mantém aceita toda entrada da 3.1.0 (`"CNPJ: 33.000.167/0001-01"`). Três coisas dependem disso e não são óbvias:

1. O `String()` corrige um bug histórico (`arg.cnpj.replace is not a function`) quando o CNPJ vem como número. Só string, número e bigint passam por ele — `String(null)` viraria `"NULL"`, que agora é alfanumérico.
2. O `replace(/[^0-9A-Z]/g, "")` **é o que mantém a URL segura** — sem ele, entrada hostil controlaria o path. A checagem de tamanho evita que entrada vazia vire uma requisição à raiz da API.
3. `consultar()` confere o **formato**, não o dígito verificador. DV é `validarCnpj()`, exportado para o consumidor. Passar a recusar DV inválido em `consultar()` troca o `ErroConsulta` 404 de hoje por `ErroValidacao` — candidato a 4.0.0.

DV: módulo 11 com valor `charCodeAt - 48` por caractere (dígito mantém o valor, `A` = 17) e pesos 5..2,9..2 / 6..2,9..2. Fonte: Perguntas e Respostas do CNPJ alfanumérico da Receita, pergunta 14 (exemplo `12.ABC.345/01DE-35`).

### Transporte

`axios.get` sai com `timeout` (10 s), `signal: AbortSignal.timeout(timeout)` (o `timeout` do axios é ociosidade do socket; o signal é o prazo total), `maxContentLength`/`maxBodyLength` (256 KiB) e `maxRedirects: 0`, todos configuráveis no construtor. Resposta grande demais propaga o erro do axios; redirect vira `ErroConsulta` com o status 3xx.

## Testes

Suítes deliberadamente separadas:

- `__tests__/cnpj.test.js` — unitário, `jest.mock("axios")`. É o que roda no `npm test` e no CI. Teste novo entra aqui.
- `__tests__/limites.test.js` — axios de verdade contra servidor HTTP local (sem internet): tamanho de resposta, redirect, timeout (inclusive corpo pingado). Também roda no `npm test`.
- `__tests__/integracao/` — bate na API real, com `jest.integracao.config.js` próprio (`testTimeout` e `maxWorkers: 1` ficam lá). Fora do `npm test` porque depende de rede e do cadastro da Receita, que muda sem aviso.

A config inline do Jest no `package.json` ignora `/__tests__/integracao/`. Cuidado ao montar scripts do Jest por linha de comando: opções de array como `--testPathIgnorePatterns` engolem o argumento posicional seguinte — daí o arquivo de config separado em vez de flags.

## Publicação

O nome no npm (`consulta-cnpj-ws`) difere do nome do repositório (`cnpj-ws`).

`package.json` tem whitelist `files`: o tarball leva `index.js`, `index.d.ts`, `lib/`, `README.md`, `CHANGELOG.md` e `LICENSE`. Arquivo novo que precise ir junto tem que ser adicionado lá — e link de README para arquivo fora dessa lista quebra na página do npm.

Publicação sai por `.github/workflows/release.yml`: empurrar uma tag `v<versão>` dispara a suíte do CI e, se passar, publica via trusted publishing (OIDC do GitHub Actions). Não há token do npm no repositório, e `npm publish` local não é o caminho.

Consequência prática: **a tag é o gatilho do release**. Não criar nem empurrar tag sem pedido explícito — é o equivalente a publicar. Bump de versão também segue manual e explícito; o workflow aborta se a tag divergir da versão do `package.json`.

Versão com hífen (`v4.0.0-beta.1`) vai para o dist-tag `next`, não para `latest`.

`CHANGELOG.md` é a fonte de verdade das mudanças. `ATUALIZACOES.md` é documento legado da migração 2.x→3.0, mantido por histórico — não atualizar.

## Dívida conhecida (candidatos a 4.0.0)

- O template `{CNPJ}` em `urlApiCnpj` exige um guard no construtor para URL sem o marcador. Um `baseUrl` com os dígitos anexados no fim eliminaria a classe de erro inteira, mas mudaria um campo que existe desde a 2.x.
- `engines` foi para `>=18.0.0` nesta versão; o valor anterior (`>=8.0.0`) nunca foi verdade.
- `consultar()` não confere o dígito verificador (`validarCnpj()` confere, desde a 3.2.0). Recusar DV inválido na consulta muda o erro devolvido.
