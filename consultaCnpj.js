let CNPJ = require('./lib/cnpj');
let cnpj = new CNPJ();

cnpj.consultaCNPJ({ cnpj: 10563821000191 })
.then(result => {
    console.log(result)
})
.catch(error => {
    console.log(error)
})
