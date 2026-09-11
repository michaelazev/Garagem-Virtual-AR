/*
 * scripts/https-config.js — certificado autoassinado p/ o `npm run front:https`.
 * Usado por: live-server --https=scripts/https-config.js
 *
 * Gera um par chave/cert (localhost) e guarda em cache p/ ficar estável entre
 * reinícios (assim o navegador lembra da exceção de segurança).
 * O certificado é autoassinado: o navegador vai pedir p/ confiar uma vez.
 */
const fs = require('fs');
const path = require('path');
const selfsigned = require('selfsigned');

const cacheFile = path.join(__dirname, '.cert-cache.json');

function load() {
  try {
    const c = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    if (c && c.key && c.cert) return c;
  } catch (e) { /* gera abaixo */ }
  const pems = selfsigned.generate(
    [{ name: 'commonName', value: 'localhost' }],
    { days: 3650, keySize: 2048, algorithm: 'sha256' }
  );
  const c = { key: pems.private, cert: pems.cert };
  try { fs.writeFileSync(cacheFile, JSON.stringify(c)); } catch (e) { /* ok */ }
  return c;
}

module.exports = load();
