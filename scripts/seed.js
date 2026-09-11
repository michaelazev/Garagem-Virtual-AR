/*
 * scripts/seed.js — regrava o db.json com N veículos aleatórios (com categoria).
 * Uso:  node scripts/seed.js 8
 */
const fs = require('fs');
const path = require('path');

const CATALOGO = {
  Fiat: { Uno: 'hatch', Argo: 'hatch', Mobi: 'hatch', Cronos: 'sedan', Toro: 'caminhonete', Strada: 'caminhonete', Pulse: 'suv', Fastback: 'suv' },
  Volkswagen: { Gol: 'hatch', Polo: 'hatch', Virtus: 'sedan', Saveiro: 'caminhonete', Nivus: 'suv', 'T-Cross': 'suv' },
  Chevrolet: { Onix: 'hatch', 'Onix Plus': 'sedan', Cruze: 'sedan', Montana: 'caminhonete', S10: 'caminhonete', Tracker: 'suv' },
  Ford: { Ka: 'hatch', Fiesta: 'hatch', Focus: 'sedan', Ranger: 'caminhonete', Maverick: 'caminhonete', Territory: 'suv' },
  Toyota: { Yaris: 'hatch', Corolla: 'sedan', Hilux: 'caminhonete', 'Corolla Cross': 'suv', SW4: 'suv' },
  Honda: { Fit: 'hatch', City: 'sedan', Civic: 'sedan', 'HR-V': 'suv', 'WR-V': 'suv' },
  Hyundai: { HB20: 'hatch', HB20S: 'sedan', Creta: 'suv' },
  Renault: { Kwid: 'hatch', Sandero: 'hatch', Logan: 'sedan', Oroch: 'caminhonete', Duster: 'suv' },
  Jeep: { Renegade: 'suv', Compass: 'suv', Commander: 'suv', Gladiator: 'caminhonete' },
  Nissan: { March: 'hatch', Versa: 'sedan', Frontier: 'caminhonete', Kicks: 'suv' }
};
const CORES = [
  ['Vermelho', '#e53935'], ['Azul', '#1e88e5'], ['Preto', '#1c1c1e'], ['Branco', '#f2f4f7'],
  ['Prata', '#b8c0c9'], ['Cinza', '#5b6672'], ['Verde', '#2e9e5b'], ['Amarelo', '#f4c025'],
  ['Laranja', '#fb8c00'], ['Vinho', '#7c2d4a']
];
const MARCAS = Object.keys(CATALOGO);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const int = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const placa = () => {
  const L = () => String.fromCharCode(65 + int(0, 25));
  return L() + L() + L() + int(0, 9) + L() + int(0, 9) + int(0, 9);
};
const FAIXA = { hatch: [75, 180], sedan: [110, 210], suv: [120, 250], caminhonete: [140, 320] };

const n = Number(process.argv[2]) || 6;
const vehicles = Array.from({ length: n }, (_, i) => {
  const marca = pick(MARCAS);
  const modelos = Object.keys(CATALOGO[marca]);
  const modelo = pick(modelos);
  const categoria = CATALOGO[marca][modelo];
  const [corNome, cor] = pick(CORES);
  const [pmin, pmax] = FAIXA[categoria] || [80, 200];
  return {
    id: i + 1, marca, modelo, categoria, ano: int(2008, 2025),
    cor, corNome, potenciaCv: int(pmin, pmax),
    preco: int(45, 320) * 1000 + int(0, 99) * 10, placa: placa()
  };
});

fs.writeFileSync(path.join(__dirname, '..', 'db.json'), JSON.stringify({ vehicles }, null, 2) + '\n');
console.log('db.json regravado com ' + n + ' veículo(s).');
