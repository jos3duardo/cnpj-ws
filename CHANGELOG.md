# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/);
versionamento conforme [SemVer](https://semver.org/lang/pt-BR/).

## [3.1.0] - 2026-09-23

Release aditivo: nenhuma API existente foi removida.

### Adicionado

- Método `consultar()`, nome curto para a consulta de CNPJ.
- Validação local do formato: entrada que não resulte em exatamente 14 dígitos
  é rejeitada sem gastar chamada de rede.
- Hierarquia de erros exportada: `ErroCnpj` (base), `ErroValidacao` (entrada que
  nem vira requisição) e `ErroConsulta` (status HTTP de erro). Todos estendem
  `Error`, então `message` e stack trace sempre funcionam; `ErroConsulta` mantém
  `.Erro` e `.MsgErro`. Um `instanceof ErroCnpj` separa "a biblioteca recusou"
  de "o transporte falhou".
- Uso sem `new`: `require("consulta-cnpj-ws").consultar(...)`, também por
  destructuring — `const { consultar } = require("consulta-cnpj-ws")`.
- Tipos TypeScript (`index.d.ts`), sem necessidade de `@types`.
- Opções no construtor: `new Cnpj({ timeout, url })`.
- Timeout padrão de 10 s nas requisições — antes uma chamada podia ficar pendurada
  indefinidamente. `timeout: 0` desliga, como no axios.
- `npm run test:types`, que valida com `tsc` os tipos publicados nos padrões de
  uso do README. Roda no CI.
- Campo `files` no `package.json`: o pacote publicado agora leva só o que é
  necessário em runtime.
- Suíte de testes unitários com axios mockado, mais `npm run test:integration`
  para os testes que batem na API real.
- Integração contínua no GitHub Actions, contra Node 18, 20 e 22.

### Corrigido

- Qualquer resposta HTTP de erro virava `{ Erro: 404 }`. Agora o status real é
  preservado — um 429 de rate limit não se disfarça mais de "CNPJ não encontrado".
- Entrada sem dígitos (`"abc"`, `"--//.."`, `NaN`) era reduzida a string vazia e
  disparava um GET na **raiz da API**, devolvendo ao chamador o que a raiz
  respondesse em vez de um erro de validação.
- Erros de API rejeitavam com objeto literal: `erro.message` era `undefined` e
  `erro instanceof Error`, falso. Um handler genérico logava `undefined` em
  qualquer falha.
- `timeout: 0` e `url: ""` eram engolidos pelo `||` e trocados silenciosamente
  pelos padrões.
- URL customizada sem o marcador `{CNPJ}` fazia toda consulta bater no mesmo
  endpoint, sem o CNPJ e sem erro. Agora o construtor valida o marcador.
- Os tipos usavam sintaxe ESM para um runtime `module.exports = class`, então
  `import pkg = require("consulta-cnpj-ws")` — o padrão citado no próprio README —
  não compilava. Corrigido para `export =` com namespace.
- Exemplos do README usavam `await` em nível de topo em trechos CommonJS: copiar
  e rodar dava `SyntaxError`.
- `permissions: contents: read` no workflow, que sem isso herdava o padrão do
  repositório.
- `.travis.yml` declarava `rvm` com versões de Ruby num projeto Node: a suíte
  nunca chegou a rodar no CI. Substituído por GitHub Actions.
- README referenciava `TESTES.md`, que não existe no repositório.
- README anunciava "Versão 2.1.0" enquanto o pacote estava em 3.0.1.
- Piso do axios elevado para `^1.18.0`, a primeira versão livre dos avisos de
  segurança conhecidos (`npm audit` limpo).

### Depreciado

- `consultaCNPJ()` — use `consultar()`. Continua funcionando em toda a série 3.x
  e será removido na 4.0.0.

### Alterado

- `consultaCnpj.js` e `test.js` saíram da raiz para `examples/`, como
  `consulta-simples.js` e `consulta-completa.js`.
- `engines` passou de `>=8.0.0` para `>=18.0.0`. O valor anterior nunca foi
  verdade: o código não roda em Node 8, e o CI testa 18, 20 e 22.
- `CHANGELOG.md` entrou na whitelist `files` — o link do README apontava para um
  arquivo ausente do pacote publicado.
- `lib/cnpj.js` passou a exportar `{ Cnpj, ErroCnpj, ErroValidacao, ErroConsulta }`
  de forma simples; `index.js` é o único dono da superfície pública do pacote.
  Antes os dois mutavam o mesmo objeto e `require("./lib/cnpj") === require("./index")`.

### Notas de comportamento

`consultar()` **rejeita a Promise** quando o CNPJ não é informado, o que torna o
erro capturável por `.catch()` — como o README sempre sugeriu. `consultaCNPJ()`
mantém o `throw` **síncrono** original, inclusive para `0`, `false` e `NaN`.

Erros de API deixaram de ser objeto literal e passaram a ser `ErroConsulta`,
que estende `Error`. Acesso por `.Erro` e `.MsgErro` continua idêntico; muda só
para quem fazia comparação de igualdade profunda com o valor rejeitado — em
geral, asserção de teste.

## [3.0.1]

- Troca da ReceitaWS pela API OpenCNPJ.
- `consultaCNPJ()` passou a receber o CNPJ diretamente, em vez de `{ cnpj: ... }`.
- Normalização da entrada com `String(cnpj).replace(/\D/g, "")`, corrigindo
  `arg.cnpj.replace is not a function` quando o CNPJ vinha como número.
