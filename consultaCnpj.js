let CNPJ = require("./lib/cnpj");
let cnpj = new CNPJ();

cnpj
  .consultaCNPJ("33000167000101")
  .then((result) => {
    console.log(result);
  })
  .catch((error) => {
    console.log(error);
  });
