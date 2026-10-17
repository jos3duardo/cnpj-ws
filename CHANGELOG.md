# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/);
versionamento conforme [SemVer](https://semver.org/lang/pt-BR/).

## [3.2.0] - 2026-10-17

Release aditivo: nenhuma API existente foi removida e toda entrada aceita pela
3.1.0 continua aceita, consultando o mesmo CNPJ.

### Adicionado

- Suporte ao **CNPJ alfanumérico** da Receita Federal (emitido desde jul/2026):
  12 caracteres `[0-9A-Z]` seguidos de 2 dígitos verificadores numéricos.
  `consultar("12.ABC.345/01DE-35")` normaliza para `12ABC34501DE35` e consulta.
  A OpenCNPJ já aceita o formato (contrato documentado no repositório
  `hitmasu/opencnpj`; testado ao vivo: CNPJ alfanumérico sem cadastro devolve
  404, não 400).
- `validarCnpj(cnpj)`: confere formato e dígitos verificadores, numéricos ou
  alfanuméricos, pelo módulo 11 com valor ASCII − 48 por caractere, conforme as
  [Perguntas e Respostas da Receita](https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/perguntas-e-respostas/cnpj/cnpj-alfanumerico.pdf)
  (pergunta 14). Recusa sequência de um caractere só (`00000000000000`).
- `normalizarCnpj(cnpj)`: remove tudo fora de `[0-9A-Za-z]` e passa para
  maiúsculas, nessa ordem (letra Unicode como `ß` não vira `SS`); entrada que não
  é string, número ou bigint vira `""`.
- Limite de tamanho da resposta: `maxContentLength` e `maxBodyLength` de 256 KiB
  por padrão, configuráveis com `new Cnpj({ maxContentLength })` (`-1` desliga).
- Redirecionamentos não são seguidos (`maxRedirects: 0`, configurável): um 3xx
  vira `ErroConsulta` com o status real e a consulta nunca sai do host
  configurado.
- `__tests__/limites.test.js`: tamanho, redirect e timeout testados com o axios
  real contra um servidor HTTP local, sem internet.

### Alterado

- Timeout passa a ser **prazo total** da consulta: além do `timeout` do axios
  (ociosidade do socket), a requisição sai com `AbortSignal.timeout(timeout)`.
  Um corpo enviado byte a byte não segura mais a consulta além do prazo; nesse
  caso o erro original do axios tem `code: "ERR_CANCELED"`. `timeout: 0` continua
  desligando os dois.
- A mensagem de tamanho inválido diz "caracteres" em vez de "dígitos".
- Letra nas duas últimas posições é recusada com `ErroValidacao` específico
  ("os dois últimos caracteres (dígitos verificadores) devem ser numéricos").
- Tipos: `consultar()` aceita `bigint`, como o runtime já aceitava.
- `release.yml`: o job de publicação não usa mais `cache: npm`.

### Compatibilidade

Toda entrada aceita pela 3.1.0 continua aceita e consultando o mesmo CNPJ.
Quando a forma alfanumérica não fecha o formato mas os dígitos somam 14 —
`"33000167000101X"`, `"CNPJ: 33.000.167/0001-01"` —, valem só os dígitos, como
antes. Letras só contam quando formam um CNPJ alfanumérico de 14 caracteres.

### Notas de comportamento

`consultar()` confere o **formato**, não o dígito verificador — como na 3.1.0,
um CNPJ de 14 caracteres com DV errado vai à API e volta como `ErroConsulta`
404. Para recusar localmente, chame `validarCnpj()` antes.

**Planejado para a 4.0.0:** `consultar()` passará a conferir o dígito
verificador e a rejeitar DV inválido com `ErroValidacao`, sem chamar a API —
hoje esse caso volta como `ErroConsulta` 404.

Com o limite de tamanho, uma resposta acima de 256 KiB rejeita com o erro
original do axios (`maxContentLength size of ... exceeded`), como as demais
falhas de transporte.

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
