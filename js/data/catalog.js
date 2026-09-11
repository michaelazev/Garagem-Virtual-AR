/*
 * data/catalog.js — catálogo de marcas/modelos com a CATEGORIA de cada veículo
 * (hatch | sedan | caminhonete | suv) e a paleta de cores.
 * A categoria define o formato 3D do carro (ver components/vehicle.js).
 */
(function (global) {
  'use strict';

  // modelo -> categoria
  var CATALOGO = {
    Fiat: {
      Uno: 'hatch', Argo: 'hatch', Mobi: 'hatch', Cronos: 'sedan',
      Toro: 'caminhonete', Strada: 'caminhonete', Pulse: 'suv', Fastback: 'suv'
    },
    Volkswagen: {
      Gol: 'hatch', Polo: 'hatch', Virtus: 'sedan', Voyage: 'sedan',
      Saveiro: 'caminhonete', Nivus: 'suv', 'T-Cross': 'suv', Taos: 'suv'
    },
    Chevrolet: {
      Onix: 'hatch', 'Onix Plus': 'sedan', Cruze: 'sedan',
      Montana: 'caminhonete', S10: 'caminhonete', Tracker: 'suv', Spin: 'suv'
    },
    Ford: {
      Ka: 'hatch', Fiesta: 'hatch', Focus: 'sedan',
      Ranger: 'caminhonete', Maverick: 'caminhonete', EcoSport: 'suv', Territory: 'suv'
    },
    Toyota: {
      Yaris: 'hatch', Etios: 'hatch', Corolla: 'sedan',
      Hilux: 'caminhonete', 'Corolla Cross': 'suv', SW4: 'suv'
    },
    Honda: {
      Fit: 'hatch', City: 'sedan', Civic: 'sedan',
      'HR-V': 'suv', 'WR-V': 'suv'
    },
    Hyundai: {
      HB20: 'hatch', HB20S: 'sedan', Elantra: 'sedan', Creta: 'suv'
    },
    Renault: {
      Kwid: 'hatch', Sandero: 'hatch', Logan: 'sedan',
      Oroch: 'caminhonete', Duster: 'suv', Captur: 'suv'
    },
    Jeep: {
      Renegade: 'suv', Compass: 'suv', Commander: 'suv', Gladiator: 'caminhonete'
    },
    Nissan: {
      March: 'hatch', Versa: 'sedan', Sentra: 'sedan',
      Frontier: 'caminhonete', Kicks: 'suv'
    }
  };

  var CORES = [
    { nome: 'Vermelho', hex: '#e53935' },
    { nome: 'Azul',     hex: '#1e88e5' },
    { nome: 'Preto',    hex: '#1c1c1e' },
    { nome: 'Branco',   hex: '#f2f4f7' },
    { nome: 'Prata',    hex: '#b8c0c9' },
    { nome: 'Cinza',    hex: '#5b6672' },
    { nome: 'Verde',    hex: '#2e9e5b' },
    { nome: 'Amarelo',  hex: '#f4c025' },
    { nome: 'Laranja',  hex: '#fb8c00' },
    { nome: 'Vinho',    hex: '#7c2d4a' }
  ];

  var MARCAS = Object.keys(CATALOGO);
  var CATEGORIAS = ['hatch', 'sedan', 'caminhonete', 'suv'];

  /* deduz a categoria a partir de marca/modelo (fallback p/ registros antigos) */
  function categoriaDe(marca, modelo) {
    var m = CATALOGO[marca];
    if (m && m[modelo]) return m[modelo];
    // heurística por nome, se o modelo não estiver no catálogo
    var s = String(modelo || '').toLowerCase();
    if (/hilux|ranger|s10|toro|strada|saveiro|frontier|montana|oroch|maverick|gladiator|amarok/.test(s)) return 'caminhonete';
    if (/cross|creta|compass|renegade|duster|tracker|kicks|hr-v|wr-v|nivus|t-cross|suv|sw4|territory|ecosport|captur|commander|taos|spin/.test(s)) return 'suv';
    if (/corolla|civic|city|versa|virtus|cronos|sentra|elantra|logan|cruze|focus|sedan|plus|voyage/.test(s)) return 'sedan';
    return 'hatch';
  }

  function modelosDe(marca) { return Object.keys(CATALOGO[marca] || {}); }

  global.Catalog = {
    CATALOGO: CATALOGO,
    CORES: CORES,
    MARCAS: MARCAS,
    CATEGORIAS: CATEGORIAS,
    categoriaDe: categoriaDe,
    modelosDe: modelosDe
  };
})(window);
