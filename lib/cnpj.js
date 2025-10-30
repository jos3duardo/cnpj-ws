const axios = require("axios");

module.exports = class Cnpj {
  constructor() {
    this.urlApiCnpj = "https://api.opencnpj.org/{CNPJ}";
  }

  consultaCNPJ(cnpj) {
    if (!cnpj || cnpj === undefined || cnpj === null) {
      throw new Error(
        "Você precisa informar um CNPJ valido. Ex. CNPJ: { cnpj: 13150088000170 }",
      );
    }

    return new Promise((resolve, reject) => {
      const cnpjLimpo = String(cnpj).replace(/\D/g, "");
      const url = this.urlApiCnpj.replace("{CNPJ}", cnpjLimpo);
      axios
        .get(url)
        .then((response) => {
          return resolve(response.data);
        })
        .catch((error) => {
          if (error.response) {
            return reject({
              Erro: 404,
              MsgErro: "CNPJ não encontrado.",
            });
          } else {
            return reject(error);
          }
        });
    });
  }
};
