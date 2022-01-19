# Sobre o CONSULTA-CNPJ-WS
[![Build Status](https://travis-ci.com/jos3duardo/cnpj-ws.svg?branch=master)](https://travis-ci.com/jos3duardo/cnpj-ws)
[![npm](https://img.shields.io/npm/l/express.svg)](https://travis-ci.com/jos3duardo/cnpj-ws)
[![npm downloads](https://img.shields.io/npm/dm/cnpj-ws.svg)](https://www.npmjs.com/package/cnpj-ws)<br />

Este é um pacote que permite consultas gratuitas de CNPJ no site da Receita Federal Brasileira a partir do uso [ desta api](https://receitaws.com.br/api).  
Este serviço apesar de ser gratuito possui algumas limitações mostradas no final desta pagina e também [neste link](https://receitaws.com.br/pricing).

### Importante
 
* Não sou responsável pelo fornecimentos das informações das consultas.
* Apenas estou fornecendo uma forma facilitada de fazer as consultas em suas aplicações por meio deste pacote
* Créditos ao autor (José Eduardo)[https://github.com/jos3duardo/cnpj-ws]

## Como instalar

```
npm i cnpj-receita-federal --save
```

## Como utilizar para fazer busca de um CNPJ

```javascript
let CNPJ = require('cnpj-receita-federal');
let cnpj = new CNPJ();

cnpj.consultaCNPJ({ cnpj: 27865757000105 })
.then(result => {
    console.log(result)
})
.catch(error => {
    console.log(error)
})
```
## Resposta

```json
{
"atividade_principal": [
    {
    "text": "Atividades de televisão aberta",
    "code": "60.21-7-00"
    }
],
"data_situacao": "03/11/2005",
"nome": "GLOBO COMUNICACAO E PARTICIPACOES S/A",
"uf": "RJ",
"telefone": "(21) 2155-4551/ (21) 2155-4552",
"atividades_secundarias": [
    {
    "text": "Produção de filmes para publicidade",
    "code": "59.11-1-02"
    },
    {
    "text": "Atividades de produção cinematográfica, de vídeos e de programas de televisão não especificadas anteriormente",
    "code": "59.11-1-99"
    },
    {
    "text": "Serviços de mixagem sonora em produção audiovisual",
    "code": "59.12-0-02"
    },
    {
    "text": "Distribuição cinematográfica, de vídeo e de programas de televisão",
    "code": "59.13-8-00"
    },
    {
    "text": "Atividades de gravação de som e de edição de música",
    "code": "59.20-1-00"
    },
    {
    "text": "Programadoras",
    "code": "60.22-5-01"
    },
    {
    "text": "Consultoria em tecnologia da informação",
    "code": "62.04-0-00"
    },
    {
    "text": "Portais, provedores de conteúdo e outros serviços de informação na internet",
    "code": "63.19-4-00"
    },
    {
    "text": "Outras sociedades de participação, exceto holdings",
    "code": "64.63-8-00"
    },
    {
    "text": "Atividades de consultoria em gestão empresarial, exceto consultoria técnica específica",
    "code": "70.20-4-00"
    },
    {
    "text": "Atividades de intermediação e agenciamento de serviços e negócios em geral, exceto imobiliários",
    "code": "74.90-1-04"
    },
    {
    "text": "Aluguel de outras máquinas e equipamentos comerciais e industriais não especificados anteriormente, sem operador",
    "code": "77.39-0-99"
    },
    {
    "text": "Gestão de ativos intangíveis não-financeiros",
    "code": "77.40-3-00"
    },
    {
    "text": "Produção musical",
    "code": "90.01-9-02"
    },
    {
    "text": "Produção e promoção de eventos esportivos",
    "code": "93.19-1-01"
    }
],
"qsa": [
    {
    "qual": "10-Diretor",
    "nome": "CARLOS HENRIQUE SCHRODER"
    },
    {
    "qual": "10-Diretor",
    "nome": "JORGE LUIZ DE BARROS NOBREGA"
    },
    {
    "qual": "10-Diretor",
    "nome": "ROSSANA FONTENELE BERTO"
    },
    {
    "qual": "10-Diretor",
    "nome": "MARCELO LUIS MENDES SOARES DA SILVA"
    },
    {
    "qual": "10-Diretor",
    "nome": "EDUARDO GAMA SCHAEFFER"
    },
    {
    "qual": "10-Diretor",
    "nome": "PAULO DAUDT MARINHO"
    },
    {
    "qual": "10-Diretor",
    "nome": "ERICK DE MIRANDA BRETAS"
    },
    {
    "qual": "10-Diretor",
    "nome": "PEDRO BORGES GARCIA"
    },
    {
    "qual": "10-Diretor",
    "nome": "MANUEL LUIS ROQUETE CAMPELO BELMAR DA COSTA"
    },
    {
    "qual": "10-Diretor",
    "nome": "CLAUDIA FALCAO DA MOTTA"
    }
],
"situacao": "ATIVA",
"bairro": "JARDIM BOTANICO",
"logradouro": "R LOPES QUINTAS",
"numero": "303",
"cep": "22.460-901",
"municipio": "RIO DE JANEIRO",
"porte": "DEMAIS",
"abertura": "31/01/1986",
"natureza_juridica": "205-4 - Sociedade Anônima Fechada",
"fantasia": "TV/REDE/CANAIS/G2C+GLOBO SOMLIVRE GLOBO.COM GLOBOPLAY",
"cnpj": "27.865.757/0001-02",
"ultima_atualizacao": "2020-04-26T06:00:29.739Z",
"status": "OK",
"tipo": "MATRIZ",
"complemento": "",
"email": "",
"efr": "",
"motivo_situacao": "",
"situacao_especial": "",
"data_situacao_especial": "",
"capital_social": "6453568523.86",
"extra": {},
"billing": {
    "free": true,
    "database": true
  }
}
```
## Tipos de retorno

Uma resposta típica é composta por uma matriz em JSON composta pelos seguintes campos:

Campo   |	Tipo |	Descrição
--------|--------|--------------------
status  | string | Indica a situação da requisição. Valores possíveis: OK, ERROR.
message | string | Mensagem explicativa indicando erro. Válido apenas quando o campo status é ERROR.
billing	|objeto	|Indica para a requisição como foi registrado a cobrança da consulta.
billing.free|	boolean	|Indica se a requisição foi gratuita.
billing.database|	boolean	|Indica como a requisição foi resolvida: true (resolvida pelo banco de dados), false (resolvida em tempo real).
cnpj	|string	| CNPJ no formato 00.000.000/0000-00.
tipo	|string |	Valores possíveis: MATRIZ, FILIAL.
abertura|	string|	Data de abertura no formato dd/mm/aaaa.
nome	|string	|Razão social.
fantasia|	string	|Nome fantasia.
atividade_principal	|Array<objeto>|	Atividade principal. Um array com um elemento.
atividade_principal.code|	string	|Código CNAE da atividade no formato 00.00-0-00.
atividade_principal.text|	string|	Descrição da atividade.
atividades_secundarias|	Array<objeto>|	Atividades secundárias.
atividades_secundarias.code	|string|	Código CNAE da atividade no formato 00.00-0-00.
atividades_secundarias.text	|string|	Descrição da atividade.
natureza_juridica	|string	|Natureza jurídica.
logradouro	|string	|Logradouro.
numero	| string	| Número.
complemento	| string	|Complemento.
cep	|string	|CEP no formato 00.000-000.
bairro|	string|	Bairro.
municipio	|string	|Município.
uf|	string|	Sigla da Unidade da Federação.
email|	string	|Email.
telefone	|string	|Telefone.
efr	|string|	Ente Federativo Responsável, disponibilizado apenas para CNPJs da administração pública.
situacao|	string	|Situação.
data_situacao	|string	|Data da situação no formato dd/mm/aaaa.
motivo_situacao	|string|	Motivo da situação.
situacao_especial|	string	|Situação especial.
data_situacao_especial	|string|	Data da situação especial no formato dd/mm/aaaa.
capital_social	|string	|Valor do capital social no formato 0.00.
qsa	|Array<objeto>|	Quadro de Sócios e Administradores.
qsa.nome|	string|	Nome do sócio.
qsa.qual|	string|	Qualificação do sócio.
qsa.pais_origem|	string|	País de origem do sócio. Disponível apenas para sócios estrangeiros.
qsa.nome_rep_legal|	string|	Nome do representante legal. Disponível apenas para sócios com representantes.
qsa.qual_rep_legal|	string|	Qualificação do representante legal. Disponível apenas para sócios com representantes.
extra	|objeto	|Campo reservado para uso futuro.

## Planos

Descrição                                   | Básico | Bronze |	Prata	|   Ouro	| Diamante
--------------------------------------------|--------|--------|---------|-----------|-----------
Limite de Consultas por Minuto              |	3	 |  10    |	  20	| Ilimitado |	Ilimitado
Limite de Consultas por Mês	                | 130.000| 150.000|	300.000 |	600.000	|  +1.200.000
Limite de Consultas por Mês em Tempo Real(1)|    x	 |	  x   | 15.000  |	30.000	|  +60.000
Planos Mensais(2)                           |Gratuito|R$99,00 | R$149,00| R$249,00  |  Sob Consulta
