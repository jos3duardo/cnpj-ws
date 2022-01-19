let CNPJ = require('./lib/cnpj');
let cnpj = new CNPJ();

cnpj.consultaCNPJ({ cnpj: 27865757000105 })
.then(result => {
    console.log(result)
})
.catch(error => {
    console.log(error)
})
