// Entrada ESM: o Node detecta os nomes que o index.js atribui em
// `module.exports.X`, então nada é listado de novo aqui. Mesma classe e mesma
// instância padrão para `import` e `require` no mesmo processo.
export * from "./index.js";
export { default } from "./index.js";
