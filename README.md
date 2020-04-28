# cnpj-ws
Package node para consulta de cnpj

 # Importante
 
* Não sou responsavel pelo fornecimentos das informações
* Apenas estou fornecendo uma forma facilitada de fazer as consultas em suas aplicações por meio desta api


## Informações

Este é um pacote que permite consultas gratuitas de CNPJ no site da Receita Federal Brasileira a partir do uso [ desta api](https://receitaws.com.br/api).  
Este serviço apesar de ser gratuito possui algumas limitações mostradas logo abaixo
 


## Planos

Descrição                                   | Básico | Bronze |	Prata	|   Ouro	| Diamante
--------------------------------------------|--------|--------|---------|-----------|-----------
Limite de Consultas por Minuto              |	3	 |  10    |	  20	| Ilimitado |	Ilimitado
Limite de Consultas por Mês	                | 130.000| 150.000|	300.000 |	600.000	|  +1.200.000
Limite de Consultas por Mês em Tempo Real(1)|    x	 |	  x   | 15.000  |	30.000	|  +60.000
Planos Mensais(2)                           |Gratuito|R$99,00 | R$149,00| R$249,00  |  Sob Consulta


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