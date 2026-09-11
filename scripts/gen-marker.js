/*
 * scripts/gen-marker.js — gera o marcador matricial (tipo "barcode 3x3") da concessionária.
 *
 * Fonte: assets/_src-barcode.png  (marcador barcode nº 5 da coleção oficial do AR.js)
 * Saída: assets/marcador-garagem.png  — versão ampliada, P&B, com margem branca (quiet zone),
 *        pronta para imprimir / mostrar em outra tela.
 *
 * Marcador matricial ("barcode") lê bem melhor no celular que um pattern.
 * No index.html:  <a-marker type="barcode" value="5">  +  matrixCodeType: 3x3
 *
 * Sem dependências (usa zlib nativo).  Rode:  npm run marker
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const A = path.join(__dirname, '..', 'assets');
const SRC = path.join(A, '_src-barcode.png');
const OUT = path.join(A, 'marcador-garagem.png');
const TARGET = 960;      // lado do PNG final (px)
const QUIET = 0.09;      // margem branca proporcional (quiet zone)

/* ---------- decodifica PNG (RGB/RGBA/gray, sem interlace) ---------- */
function decodePNG(buf) {
  let p = 8, w, h, ct, idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p);
    const type = buf.toString('ascii', p + 4, p + 8);
    const data = buf.slice(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); ct = data[9]; }
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  const ch = ct === 6 ? 4 : ct === 2 ? 3 : ct === 0 ? 1 : ct === 4 ? 2 : 3;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * ch;
  const out = Buffer.alloc(w * h * ch);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    const line = raw.slice(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    const cur = Buffer.alloc(stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= ch ? cur[i - ch] : 0, b = prev[i], c = i >= ch ? prev[i - ch] : 0;
      let v = line[i];
      if (f === 1) v = (v + a) & 255;
      else if (f === 2) v = (v + b) & 255;
      else if (f === 3) v = (v + ((a + b) >> 1)) & 255;
      else if (f === 4) {
        const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
        v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
      }
      cur[i] = v;
    }
    cur.copy(out, y * stride);
    prev = cur;
  }
  return { w, h, ch, data: out };
}

/* ---------- encoder PNG cinza 8-bit ---------- */
const CRC = (() => {
  const t = [];
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = t[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
})();
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(CRC(td), 0);
  return Buffer.concat([len, td, crc]);
}
function encodeGray(W, H, px) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 0;
  const raw = Buffer.alloc(H * (W + 1));
  for (let y = 0; y < H; y++) { raw[y * (W + 1)] = 0; px.copy(raw, y * (W + 1) + 1, y * W, y * W + W); }
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

/* ---------- monta o marcador final ---------- */
const src = decodePNG(fs.readFileSync(SRC));
const margin = Math.round(TARGET * QUIET);
const inner = TARGET - margin * 2;              // área do código
const W = TARGET;
const px = Buffer.alloc(W * W, 255);            // fundo branco (quiet zone)
for (let y = 0; y < inner; y++) {
  const sy = Math.min(src.h - 1, Math.floor(y / inner * src.h));
  for (let x = 0; x < inner; x++) {
    const sx = Math.min(src.w - 1, Math.floor(x / inner * src.w));
    const g = src.data[(sy * src.w + sx) * src.ch];   // canal 0 (P&B)
    px[(y + margin) * W + (x + margin)] = g < 128 ? 0 : 255;
  }
}
fs.writeFileSync(OUT, encodeGray(W, W, px));
console.log('OK -> assets/marcador-garagem.png  (' + W + 'x' + W + ', 3x3 Hamming, value 1)');
