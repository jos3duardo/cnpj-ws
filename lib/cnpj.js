const axios = require("axios");

module.exports = class Cnpj {
  constructor() {
    this.urlApiCnpj = "https://www.receitaws.com.br/v1/cnpj/{CNPJ}";
  }

  consultaCNPJ(args) {
    let arg = Object.assign({}, args);

    if ("cnpj" in arg === false) {
      throw new Error(
        "Você precisa informar um CNPJ valido. Ex. CNPJ: { cnpj: 13150088000170 }"
      );
    }

    return new Promise((resolve, reject) => {
      const url = this.urlApiCnpj.replace("{CNPJ}", arg.cnpj.replace(".", ""));
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
