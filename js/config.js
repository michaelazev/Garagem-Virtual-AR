/* config.js — configuração global da aplicação (window.APP_CONFIG) */
(function () {
  // Descobre onde está a API (:3001). Se não alcançar, o api.js cai p/ LocalStorage.
  var h = location.hostname;
  var proto = (location.protocol === 'https:') ? 'https:' : 'http:';

  if (h === 'localhost' || h === '127.0.0.1' || h === '') {
    window.__API_URL = 'http://localhost:3001';
  } else if (/-8080\.(app\.github\.dev|githubpreview\.dev)$/.test(h)) {
    // GitHub Codespaces: cada porta vira um subdomínio -> troca 8080 por 3001
    window.__API_URL = proto + '//' + h.replace('-8080.', '-3001.') + '/';
  } else if (/\.github\.io$/.test(h) || /\.netlify\.app$/.test(h) || /\.trycloudflare\.com$/.test(h) || /\.vercel\.app$/.test(h)) {
    // hospedagem estática: não há API -> força o modo LocalStorage
    window.__API_URL = '';
  } else {
    // IP na rede local / outro host: mesma máquina, porta 3001
    window.__API_URL = proto + '//' + h + ':3001';
  }
})();

window.APP_CONFIG = {
  /* ---- API / dados ---- */
  API_URL: window.__API_URL,           // JSON Server 0.17.4 (porta própria :3001)
  RESOURCE: 'vehicles',                // recurso REST -> /vehicles
  LS_KEY: 'garagem-virtual-ar/cache',  // espelho dos dados no LocalStorage
  LS_META: 'garagem-virtual-ar/meta',  // metadados do cache

  /* ---- vitrine (carros do CRUD) ---- */
  PAGE_SIZE: 5,                        // carros por pagina no patio de exposição
  GAZE_MS: 1400,                       // tempo de "olhar fixo" (gaze) no modo AR
  LINEUP: { z: -15, spacing: 6.6, y: 0, rotY: -90 },

  /* ---- mapa / cenário (metros) ---- */
  MAP: { half: 95 },                   // limite jogavel: -half..+half em X e Z

  /* ---- jogador (modo Showroom) ---- */
  PLAYER: {
    eye: 1.62,                         // altura dos olhos
    speed: 4.6,                        // m/s andando
    run: 8.4,                          // m/s correndo (Shift)
    spawn: { x: 0, z: 22, ry: 0 }      // nasce na calçada sul, de frente p/ a concessionária (norte = -Z)
  },

  /* ---- test drive (rotatória a leste da avenida) ---- */
  TESTDRIVE: { center: { x: 70, z: 0 }, radius: 12, speed: 55, height: 0 }
};
