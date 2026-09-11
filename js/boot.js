/*
 * boot.js — decide o modo e injeta a cena A-Frame ANTES do A-Frame varrer o DOM.
 *
 *   (padrão)    -> modo AR:  <a-marker type="barcode" value="5"> (código matricial 3x3) + webcam (AR.js)
 *   ?preview=1  -> modo Showroom: cidade navegável, jogador anda com WASD, sem webcam
 */
/* silencia o ruído "Unknown property ... for component/system material" que o
   A-Frame 1.3.0 emite na inicialização de muitas primitivas (não é erro). */
(function () {
  var _log = console.log;
  console.log = function (a) {
    if (typeof a === 'string' && a.indexOf('schema:warn') !== -1) return;
    return _log.apply(console, arguments);
  };
})();

(function () {
  var params = new URLSearchParams(location.search);
  var preview = params.has('preview') || params.has('showroom');
  window.APP_MODE = preview ? 'preview' : 'ar';

  var tpl = document.getElementById('scene-tpl');
  var root = document.getElementById('ar-root');
  if (!tpl || !root) return;

  var html = tpl.innerHTML;

  var AR_CAMERA = [
    '<a-entity camera position="0 0 0">',
    '  <a-entity id="cursor" cursor="fuse: true; fuseTimeout: 1400"',
    '     raycaster="objects: .clickable; far: 400" position="0 0 -1"',
    '     geometry="primitive: ring; radiusInner: 0.016; radiusOuter: 0.025"',
    '     material="shader: flat; color: #38bdf8; opacity: 0.9"',
    '     animation__fuse="property: scale; startEvents: fusing; easing: linear; dur: 1400; from: 1 1 1; to: 0.15 0.15 0.15"',
    '     animation__leave="property: scale; startEvents: mouseleave; dur: 200; to: 1 1 1"',
    '     animation__click="property: scale; startEvents: click; dur: 250; easing: easeOutBack; from: 0.15 0.15 0.15; to: 1 1 1">',
    '  </a-entity>',
    '</a-entity>'
  ].join('\n');

  // rig do jogador: player-controls (WASD) + câmera filha com look-controls (mouse)
  var PREVIEW_PLAYER = [
    '<a-entity id="player" player-controls position="0 0 20">',
    '  <a-entity camera position="0 1.62 0"',
    '     look-controls="pointerLockEnabled: false; magicWindowTrackingEnabled: false; touchEnabled: true"></a-entity>',
    '</a-entity>'
  ].join('\n');

  var PREVIEW_ENV = '<a-sky color="#0b1a2e"></a-sky>';

  if (preview) {
    if (window.AFRAME) {
      try { delete AFRAME.systems.arjs; } catch (e) {}
      try { delete AFRAME.components.arjs; } catch (e) {}
    }
    html = html
      .replace(/\s*arjs="[^"]*"/, '')
      .replace(/<a-marker[^>]*>/, '<a-entity id="stage-root" position="0 0 0">')
      .replace('</a-marker>', '</a-entity>')
      .replace('<!--ENV-->', PREVIEW_ENV)
      .replace('<!--CAMERA-->', PREVIEW_PLAYER);
  } else {
    // AR: diorama compacto sobre o marcador
    html = html
      .replace('<a-entity id="stage" position="0 0 0">', '<a-entity id="stage" position="0 0 0.6" rotation="-20 0 0" scale="0.05 0.05 0.05">')
      .replace('<!--ENV-->', '')
      .replace('<!--CAMERA-->', AR_CAMERA);
  }

  root.innerHTML = html;

  if (preview) {
    var s = document.querySelector('a-scene');
    if (s) s.setAttribute('fog', 'type: linear; color: #0f1d30; near: 60; far: 200');
  }
})();
