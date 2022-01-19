let request = require('request');

module.exports = class Cnpj {
    consultaCNPJ(args) {
        let { cnpj } = Object.assign({}, args);

        if (cnpj == null) {
          throw new Error(
            "Você precisa informar um CNPJ válido. Ex. CENPJ: { cnpj: 13150088000170 }"
          );
        }

        return new Promise( (resolve, reject) => {
            let url = `https://www.receitaws.com.br/v1/cnpj/${cnpj}`;

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
