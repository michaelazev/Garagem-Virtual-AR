/*
 * scripts/tunnel.js — expõe o Frontend com um link HTTPS PÚBLICO e VÁLIDO
 * (Cloudflare Quick Tunnel). Sem aviso de certificado, sem mexer no firewall,
 * funciona em qualquer celular/rede.
 *
 * Pré-requisito: o site tem que estar rodando em http://localhost:8080
 *   ->  em outro terminal:  npm start   (ou  npm run front)
 *
 * Uso:  npm run tunnel
 * Ele imprime o link https://xxxxx.trycloudflare.com + um QR Code pra escanear.
 */
const { spawn } = require('child_process');
const path = require('path');
const QR = require('qrcode');

let bin;
try { bin = require('cloudflared').bin; }
catch (e) {
  console.error('\n  Pacote "cloudflared" não encontrado. Rode:  npm install\n');
  process.exit(1);
}

console.log('\n  Abrindo túnel para http://localhost:8080 ...');
console.log('  (o site precisa estar rodando: em outro terminal, "npm start")\n');

const cf = spawn(bin, ['tunnel', '--url', 'http://localhost:8080', '--no-autoupdate'], { stdio: ['ignore', 'pipe', 'pipe'] });

let shown = false;
function scan(buf) {
  const s = buf.toString();
  process.stdout.write(s.replace(/\x1b\[[0-9;]*m/g, ''));
  const m = s.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
  if (m && !shown) {
    shown = true;
    const url = m[0];
    setTimeout(function () {
      console.log('\n  ================================================');
      console.log('   ABRA NO CELULAR:  ' + url);
      console.log('  ================================================\n');
      QR.toString(url, { type: 'terminal', small: true }, function (err, str) { if (!err) console.log(str); });
      QR.toFile(path.join(__dirname, '..', 'assets', 'qr-abrir-no-celular.png'), url, { width: 512, margin: 2 }, function () {});
      console.log('  1) escaneie o QR ACIMA (nao um print antigo) com a camera do celular');
      console.log('  2) permita a camera  3) aponte para o marcador\n');
      console.log('  >> DEIXE ESTE TERMINAL ABERTO. O link muda toda vez que roda de novo. <<');
      console.log('  >> Se o Safari disser "servidor nao encontrado", rode "npm run tunnel" outra vez. <<\n');
    }, 300);
  }
}
cf.stdout.on('data', scan);
cf.stderr.on('data', scan);
cf.on('exit', function (c) {
  console.log('\n  >> TUNEL ENCERRADO. O link parou de funcionar.');
  console.log('  >> Rode "npm run tunnel" de novo e escaneie o NOVO QR.\n');
  process.exit(c || 0);
});
process.on('SIGINT', function () { cf.kill('SIGINT'); });
