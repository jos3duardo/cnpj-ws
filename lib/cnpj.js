let request = require('request');

module.exports = class Cnpj {
    constructor(width) {
        this.urlApiCnpj = 'https://www.receitaws.com.br/v1/cnpj/{CNPJ}';

    }

    consultaCNPJ(args) {
        let arg = Object.assign({}, args);

        if('cnpj' in arg === false){
            throw new Error('Você precisa informar um CNPJ valido. Ex. CNPJ: { cnpj: 13150088000170 }')
        }

        return new Promise( (resolve, reject) => {
            let url = this.urlApiCnpj.replace('{CNPJ}', arg.cnpj.replace('.',''));

            request(url, (error, resp, body) => {
                if (error){
                    return reject(error)
                }

                try {
                    return resolve(JSON.parse(body))
                }catch (e) {
                    return reject({
                        Erro: 404,
                        MsgErro: 'CNPJ não encontrado.'
                    });
                }
            })
        }  )
    }

}