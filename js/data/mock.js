/*
 * data/mock.js — geração de dados aleatórios para os registros do CRUD.
 * Usa o catálogo (data/catalog.js) para já vir com a CATEGORIA correta.
 */
(function (global) {
  'use strict';

  var C = global.Catalog;

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function int(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

  /* Placa padrão Mercosul: LLL N L NN */
  function randomPlaca() {
    var L = function () { return String.fromCharCode(65 + int(0, 25)); };
    return L() + L() + L() + int(0, 9) + L() + int(0, 9) + int(0, 9);
  }

  function randomVehicle() {
    var marca = pick(C.MARCAS);
    var modelo = pick(C.modelosDe(marca));
    var cor = pick(C.CORES);
    var categoria = C.categoriaDe(marca, modelo);
    // potência coerente com a categoria
    var faixa = { hatch: [75, 180], sedan: [110, 210], suv: [120, 250], caminhonete: [140, 320] }[categoria] || [80, 200];
    return {
      marca: marca,
      modelo: modelo,
      categoria: categoria,
      ano: int(2008, 2025),
      cor: cor.hex,
      corNome: cor.nome,
      potenciaCv: int(faixa[0], faixa[1]),
      preco: int(45, 320) * 1000 + int(0, 99) * 10,
      placa: randomPlaca()
    };
  }

  global.Mock = {
    // reexporta p/ compatibilidade com o código existente
    CATALOGO: C.CATALOGO,
    CORES: C.CORES,
    MARCAS: C.MARCAS,
    CATEGORIAS: C.CATEGORIAS,
    randomVehicle: randomVehicle,
    randomPlaca: randomPlaca
  };
})(window);
