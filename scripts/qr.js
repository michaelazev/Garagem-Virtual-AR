/*
 * scripts/qr.js — QR Code para ABRIR o site (modo AR) no celular.
 *
 *   npm run qr                       -> QR de  https://SEU_IP:8443/   (rede local + npm run front:https)
 *   npm run qr -- http               -> QR de  http://SEU_IP:8080/
 *   npm run qr -- https://algum.site/ -> QR da URL que você passar (ex.: GitHub Pages, Netlify, Codespaces)
 *
 * O "/" abre direto no modo AR. Saída: QR no terminal + assets/qr-abrir-no-celular.png
 */
const os = require('os');
const path = require('path');
const QR = require('qrcode');

function lanIP() {
  var best = null;
  var ifs = os.networkInterfaces();
  for (var name in ifs) {
    (ifs[name] || []).forEach(function (i) {
      if (i.family === 'IPv4' && !i.internal) {
        var pref = /^192\.168\./.test(i.address) || /^10\./.test(i.address) || /^172\.(1[6-9]|2\d|3[01])\./.test(i.address);
        if (!best || (pref && !best.pref)) best = { address: i.address, pref: pref };
      }
    });
  }
  return best ? best.address : 'localhost';
}

var arg = process.argv[2] || '';
var url;
if (/^https?:\/\//i.test(arg)) {
  url = arg;                                   // URL explícita (deploy)
} else if (arg.toLowerCase() === 'http') {
  url = 'http://' + lanIP() + ':8080/';
} else {
  url = 'https://' + lanIP() + ':8443/';
}

console.log('\n  URL do site (modo AR): ' + url + '\n');
QR.toString(url, { type: 'terminal', small: true }, function (err, str) { if (!err) console.log(str); });

var out = path.join(__dirname, '..', 'assets', 'qr-abrir-no-celular.png');
QR.toFile(out, url, { width: 640, margin: 2 }, function (err) {
  if (err) console.error(err);
  else console.log('  imagem: assets/qr-abrir-no-celular.png  (aparece na pagina imprimir.html)\n');
});
