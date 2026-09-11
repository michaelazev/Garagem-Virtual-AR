/*
 * scene/lineup.js — vitrine do CRUD dentro do cenário 3D e SELEÇÃO de veículos.
 *
 * Toda mudança nos dados redesenha o pátio de exposição:
 *   Create -> carro entra com animação        Read   -> renderiza a página + HUD
 *   Update -> carro "gira" p/ destacar         Delete -> carro sai da cena
 *
 * Seleção:
 *   - clicar em qualquer veículo (2D no Showroom, cursor/gaze no AR) seleciona
 *   - clicar fora de um veículo deseleciona (fecha o painel)
 *   - a lista HTML e a cena ficam em sincronia
 */

/*
 * ar-freeze — no modo "Sem câmera" (body.hide-cam) fixa o diorama numa pose 3/4
 * de FRENTE, ignorando o rastreamento do marcador, para ver a concessionária
 * inteira e com detalhes. Sem hide-cam, deixa o AR.js controlar normalmente.
 */
AFRAME.registerComponent('ar-freeze', {
  init: function () {
    this._e = new AFRAME.THREE.Euler(-1.12, 0, 0);   // ~64° -> fachada de frente
    this._q = new AFRAME.THREE.Quaternion();
  },
  tick: function () {
    if (!document.body.classList.contains('hide-cam')) return;
    var o = this.el.object3D;
    o.visible = true;
    o.matrixAutoUpdate = true;
    o.position.set(0, -1.5, -3.4);
    this._q.setFromEuler(this._e);
    o.quaternion.copy(this._q);
    o.scale.set(1, 1, 1);
  }
});

/* rótulo que sempre encara a câmera (billboard só no eixo Y) */
AFRAME.registerComponent('face-camera', {
  init: function () { this._c = new AFRAME.THREE.Vector3(); this._p = new AFRAME.THREE.Vector3(); },
  tick: function () {
    var cam = this.el.sceneEl && this.el.sceneEl.camera;
    if (!cam) return;
    cam.getWorldPosition(this._c);
    this.el.object3D.getWorldPosition(this._p);
    this.el.object3D.rotation.y = Math.atan2(this._c.x - this._p.x, this._c.z - this._p.z);
  }
});

(function () {
  'use strict';

  var CFG = window.APP_CONFIG;
  var AR = (window.APP_MODE === 'ar');
  // no AR o diorama é minúsculo (sobre o marcador): menos carros, mais juntos, cartaz simples
  var PAGE_SIZE = AR ? 5 : CFG.PAGE_SIZE;
  var LN = AR ? { z: -8, spacing: 5, y: 0, rotY: -90 } : CFG.LINEUP;

  var state = { vehicles: [], page: 0, selectedId: null, prevIds: [], flashId: null };

  function sceneEl() { return document.querySelector('a-scene'); }
  function sameId(a, b) { return String(a) === String(b); }
  function brl(n) { return Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }); }
  function pageCount() { return Math.max(1, Math.ceil(state.vehicles.length / PAGE_SIZE)); }
  function categoriaDe(v) {
    return v.categoria || (window.Catalog && window.Catalog.categoriaDe(v.marca, v.modelo)) || 'hatch';
  }
  function slotX(i, n) { return (i - (n - 1) / 2) * LN.spacing; }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function lum(hex) {
    var m = /^#?([0-9a-fA-F]{6})$/.exec(hex || '');
    if (!m) return 128;
    var n = parseInt(m[1], 16);
    return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  }
  function addTo(parent, tag, attrs) {
    var e = document.createElement(tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    parent.appendChild(e);
    return e;
  }

  /* cartaz de vitrine (billboard) — layout com altura calculada p/ nada sair da caixa */
  function makeCard(v, sel) {
    var W = sel ? 5.4 : 4.7;
    var headH = 1.06;
    var footH = 0.58;
    var pad = 0.26;
    var glyph = sel ? 0.235 : 0.205;          // tamanho da fonte do corpo
    var lineGap = glyph * 2.05;               // altura de linha (folgada de propósito)
    var bodyH = lineGap * 5;
    var H = headH + pad + bodyH + pad + footH;

    var carCol = v.cor || '#888888';
    var headTxt = lum(carCol) > 150 ? '#0b1220' : '#ffffff';
    var accent = sel ? '#38bdf8' : '#43607e';

    var g = document.createElement('a-entity');
    g.setAttribute('position', '0 ' + (H / 2 + 2.6) + ' 0');
    g.setAttribute('face-camera', '');

    // poste + base (chega perto do tapete)
    addTo(g, 'a-cylinder', { position: '0 ' + (-(H / 2) - 1.25) + ' 0', radius: 0.07, height: 2.5, material: 'color: #2b3543' });
    addTo(g, 'a-cylinder', { position: '0 ' + (-(H / 2) - 2.5) + ' 0', radius: 0.42, height: 0.08, material: 'shader: flat; color: #1b2430' });

    // moldura + fundo
    addTo(g, 'a-plane', { position: '0 0 -0.03', width: W + 0.22, height: H + 0.22, material: 'shader: flat; color: ' + accent + '; opacity: ' + (sel ? 0.98 : 0.9) + '; transparent: true' });
    addTo(g, 'a-plane', { position: '0 0 -0.01', width: W, height: H, material: 'shader: flat; color: #0b1622; opacity: 0.98; transparent: true' });

    // cabeçalho: MARCA (menor) em cima, MODELO (maior) embaixo
    var headMidY = H / 2 - headH / 2;
    addTo(g, 'a-plane', { position: '0 ' + headMidY + ' 0.005', width: W, height: headH, material: 'shader: flat; color: ' + carCol });
    addTo(g, 'a-entity', {
      position: '0 ' + (headMidY + 0.26) + ' 0.03',
      text: 'value: ' + v.marca.toUpperCase() + '; align: center; baseline: center; width: ' + (W - 0.3) + '; wrapCount: 34; color: ' + headTxt + '; opacity: 0.85'
    });
    addTo(g, 'a-entity', {
      position: '0 ' + (headMidY - 0.17) + ' 0.03',
      text: 'value: ' + v.modelo.toUpperCase() + '; align: center; baseline: center; width: ' + (W - 0.3) + '; wrapCount: 16; color: ' + headTxt
    });
    addTo(g, 'a-plane', { position: '0 ' + (H / 2 - headH) + ' 0.02', width: W - 0.18, height: 0.02, material: 'shader: flat; color: ' + accent + '; opacity: 0.6; transparent: true' });

    // corpo — 2 colunas; mesmo (width/wrapCount) => mesma fonte => linhas alinhadas
    var bodyTopY = H / 2 - headH - pad;
    var preco = 'R$ ' + Number(v.preco).toLocaleString('pt-BR');
    var labels = ['Ano', 'Preco', 'Potencia', 'Placa', 'Categoria'].join('\n');
    var values = [v.ano, preco, v.potenciaCv + ' cv', v.placa, cap(categoriaDe(v))].join('\n');
    var lblW = glyph * 11, valW = glyph * 17;                 // width = glyph * wrapCount
    addTo(g, 'a-entity', {
      position: (-W / 2 + 0.42) + ' ' + bodyTopY + ' 0.03',
      text: 'value: ' + labels + '; anchor: left; align: left; baseline: top; width: ' + lblW + '; wrapCount: 11; color: #9fb4cc'
    });
    addTo(g, 'a-entity', {
      position: (-W / 2 + 0.42 + glyph * 10) + ' ' + bodyTopY + ' 0.03',
      text: 'value: ' + values + '; anchor: left; align: left; baseline: top; width: ' + valW + '; wrapCount: 17; color: #eef4fb'
    });

    // rodapé: faixa fixa no fundo da caixa
    var footMidY = -H / 2 + footH / 2;
    addTo(g, 'a-plane', { position: '0 ' + footMidY + ' 0.01', width: W - 0.06, height: footH, material: 'shader: flat; color: ' + (sel ? '#0e2c40' : '#0e1a28') + '; opacity: 0.96; transparent: true' });
    addTo(g, 'a-entity', {
      position: '0 ' + footMidY + ' 0.03',
      text: 'value: ' + (v._local ? 'OFFLINE - LOCALSTORAGE' : (sel ? '>>  SELECIONADO  <<' : 'clique para selecionar')) +
        '; align: center; baseline: center; width: ' + (W - 0.3) + '; wrapCount: ' + (sel ? 22 : 30) + '; color: ' + (v._local ? '#f59e0b' : (sel ? '#8fe0ff' : '#8296ad'))
    });
    return g;
  }

  /* cartaz enxuto p/ o modo AR (2 elementos) */
  function makeSimpleLabel(v, sel) {
    var g = document.createElement('a-entity');
    g.setAttribute('position', '0 3.4 0');
    g.setAttribute('face-camera', '');
    var bg = document.createElement('a-plane');
    bg.setAttribute('width', 4.2); bg.setAttribute('height', 1.5);
    bg.setAttribute('material', 'shader: flat; color: ' + (sel ? '#0e2c40' : '#0b1622') + '; opacity: 0.95; transparent: true');
    g.appendChild(bg);
    var t = document.createElement('a-entity');
    t.setAttribute('position', '0 0 0.02');
    t.setAttribute('text', 'value: ' + (v.marca + ' ' + v.modelo).toUpperCase() +
      '\nR$ ' + Number(v.preco).toLocaleString('pt-BR') + '  -  ' + cap(categoriaDe(v)) +
      (sel ? '\n>> SELECIONADO <<' : '') +
      '; align: center; baseline: center; width: 4; wrapCount: 20; color: ' + (sel ? '#8fe0ff' : '#e8f0fa'));
    g.appendChild(t);
    return g;
  }

  function ready(cb) {
    var s = sceneEl();
    if (!s) return;
    if (s.hasLoaded) cb(); else s.addEventListener('loaded', cb, { once: true });
  }

  /* o AR.js redimensiona vídeo/canvas por conta própria e às vezes deixa o
     render menor que a tela -> re-forçamos tela cheia (cover) várias vezes. */
  function fitAR() {
    var css = ';position:fixed!important;top:0!important;left:0!important;right:0!important;bottom:0!important;' +
      'width:100vw!important;height:100vh!important;min-width:100vw!important;min-height:100vh!important;' +
      'max-width:none!important;max-height:none!important;margin:0!important;object-fit:cover!important;transform:none!important;';
    var apply = function (el) { if (el && el.style) el.style.cssText += css; };
    var sc = sceneEl();
    if (sc && sc.canvas) apply(sc.canvas);
    document.querySelectorAll('#arjs-video, #ar-root video, body > video').forEach(apply);
    if (sc && sc.resize) { try { sc.resize(); } catch (e) {} }
  }
  window.__fitAR = fitAR;

  /* ---------------- render ---------------- */
  function render() {
    var content = document.getElementById('content');
    if (!content) return;
    if (state.page >= pageCount()) state.page = pageCount() - 1;
    if (state.page < 0) state.page = 0;

    var start = state.page * PAGE_SIZE;
    var slice = state.vehicles.slice(start, start + PAGE_SIZE);
    var ids = slice.map(function (v) { return String(v.id); });
    while (content.firstChild) content.removeChild(content.firstChild);

    slice.forEach(function (v, i) {
      var sel = sameId(v.id, state.selectedId);
      var isNew = state.prevIds.indexOf(String(v.id)) === -1;

      var wrap = document.createElement('a-entity');
      wrap.classList.add('car-slot');
      wrap.dataset.id = v.id;
      wrap.setAttribute('position', slotX(i, slice.length) + ' ' + LN.y + ' ' + LN.z);

      // tapete
      var pad = document.createElement('a-cylinder');
      pad.setAttribute('radius', 2.3);
      pad.setAttribute('height', 0.06);
      pad.setAttribute('position', '0 0.03 0');
      pad.setAttribute('segments', 32);
      pad.setAttribute('material', 'shader: flat; color: ' + (sel ? '#38bdf8' : '#1b2a3d') + '; opacity: ' + (sel ? 0.95 : 0.85) + '; transparent: true');
      wrap.appendChild(pad);

      // veículo (formato conforme categoria)
      var car = document.createElement('a-entity');
      car.setAttribute('vehicle', 'color: ' + v.cor + '; categoria: ' + categoriaDe(v) + '; selected: ' + sel);
      car.setAttribute('rotation', '0 ' + LN.rotY + ' 0');
      if (isNew) car.setAttribute('animation__in', 'property: scale; from: 0 0 0; to: 1 1 1; dur: 500; easing: easeOutBack');
      if (sameId(state.flashId, v.id)) {
        car.setAttribute('animation__flash', 'property: rotation; from: 0 ' + (LN.rotY - 360) + ' 0; to: 0 ' + LN.rotY + ' 0; dur: 950; easing: easeOutCubic');
      }
      wrap.appendChild(car);

      // cartaz: completo no Showroom, simples no AR (mais leve p/ celular)
      wrap.appendChild(AR ? makeSimpleLabel(v, sel) : makeCard(v, sel));

      // hitbox (clique / gaze)
      var hit = document.createElement('a-box');
      hit.classList.add('clickable');
      hit.setAttribute('position', '0 1.3 0');
      hit.setAttribute('width', 5.4);
      hit.setAttribute('height', 2.8);
      hit.setAttribute('depth', 3);
      hit.setAttribute('material', 'opacity: 0; transparent: true');
      hit.addEventListener('click', function () { select(v.id); });
      wrap.appendChild(hit);

      content.appendChild(wrap);
    });

    state.prevIds = ids;
    state.flashId = null;
    updateHud();
  }

  function updateHud() {
    var hud = document.getElementById('hud');
    if (!hud) return;
    if (window.APP_MODE === 'preview') { hud.setAttribute('visible', false); return; }
    var total = state.vehicles.length;
    var sel = state.selectedId != null ? state.vehicles.find(function (v) { return sameId(v.id, state.selectedId); }) : null;
    hud.setAttribute('text', 'value',
      'PATIO DE EXPOSICAO  -  ' + total + ' veiculo(s)  -  pag. ' + (state.page + 1) + '/' + pageCount() +
      (sel ? '\n> ' + sel.marca + ' ' + sel.modelo + ' (' + (sel.categoria || '') + ')' : '\nclique num veiculo para selecionar'));
  }

  function select(id) {
    state.selectedId = (id == null) ? null : (sameId(state.selectedId, id) ? null : id);
    render();
    document.dispatchEvent(new CustomEvent('vehicle:selected', { detail: state.selectedId }));
  }

  function refresh() {
    return window.API.list().then(function (list) { state.vehicles = list || []; render(); });
  }

  /* ---------------- eventos de dados ---------------- */
  document.addEventListener('api:change', function (e) {
    var d = e.detail || {};
    if (d.item) state.flashId = d.item.id;
    if (d.type === 'delete' && sameId(state.selectedId, d.id)) state.selectedId = null;
    if (d.list) { state.vehicles = d.list; render(); } else refresh();
  });

  document.addEventListener('vbtn', function (e) {
    var a = e.detail;
    if (a === 'next' && state.page < pageCount() - 1) { state.page++; render(); }
    else if (a === 'prev' && state.page > 0) { state.page--; render(); }
    else if (a === 'new') { window.UI && window.UI.createRandom(); }
    else if (a === 'delete') {
      if (state.selectedId != null) window.UI && window.UI.requestDelete(state.selectedId);
      else window.UI && window.UI.toast('Selecione um carro antes de apagar', 'warn');
    }
  });

  // seleção vinda da lista HTML
  document.addEventListener('external:select', function (e) {
    var id = e.detail;
    state.selectedId = id;
    if (id != null) {
      var idx = state.vehicles.findIndex(function (v) { return sameId(v.id, id); });
      if (idx >= 0) state.page = Math.floor(idx / PAGE_SIZE);
    }
    render();
  });

  /*
   * Seleção por clique no Showroom: raycast manual (o look-controls do jogador
   * "engole" o clique do cursor nativo do A-Frame). Ignora arrasto (olhar em volta).
   * Clique fora de um veículo -> deseleciona.
   */
  function enablePreviewPicking() {
    var sc = sceneEl();
    var T = AFRAME.THREE;
    var ray = new T.Raycaster();
    var v2 = new T.Vector2();
    var canvas = sc.canvas;
    var down = null;

    canvas.addEventListener('pointerdown', function (e) {
      down = { x: e.clientX, y: e.clientY, t: Date.now() };
    });

    canvas.addEventListener('pointerup', function (e) {
      if (!down) return;
      var moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      down = null;
      if (moved > 8) return; // foi arrasto p/ olhar em volta

      var r = canvas.getBoundingClientRect();
      v2.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      v2.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      ray.setFromCamera(v2, sc.camera);

      var hits = ray.intersectObjects(sc.object3D.children, true);
      for (var i = 0; i < hits.length; i++) {
        var el = hits[i].object.el;
        if (!el || !el.classList || !el.classList.contains('clickable')) continue;
        var slot = el.closest('.car-slot');
        if (slot) { select(slot.dataset.id); return; }
        var vb = el.closest('[virtual-button]');
        if (vb && vb.components['virtual-button']) {
          document.dispatchEvent(new CustomEvent('vbtn', { detail: vb.components['virtual-button'].data.action }));
        }
        return;
      }
      // clicou no vazio -> fecha a seleção
      if (state.selectedId != null) select(null);
    });
  }

  /* ---------------- boot ---------------- */
  ready(function () {
    /*
     * Componentes em elementos injetados pelo boot.js às vezes não são
     * instanciados pelo A-Frame (registro tardio). Reaplicamos aqui, já com
     * a cena carregada e todos os scripts prontos.
     */
    var cityHost = document.getElementById('city');
    if (cityHost && !cityHost.getAttribute('city')) {
      cityHost.setAttribute('city', { compact: window.APP_MODE !== 'preview' });
    }
    var player = document.getElementById('player');
    if (player && !player.components['player-controls']) {
      player.setAttribute('player-controls', {
        speed: CFG.PLAYER.speed, run: CFG.PLAYER.run, bound: CFG.MAP.half
      });
    }
    var hud = document.getElementById('hud');
    if (hud && !hud.components['face-camera']) hud.setAttribute('face-camera', '');

    // posiciona a área de test drive conforme a config
    var td = document.getElementById('testdrive');
    if (td && CFG.TESTDRIVE) td.setAttribute('position', CFG.TESTDRIVE.center.x + ' 0 ' + CFG.TESTDRIVE.center.z);

    var marker = document.querySelector('a-marker');
    var hint = document.getElementById('marker-hint');
    var status = document.getElementById('ar-status');
    if (marker && window.APP_MODE !== 'preview') {
      if (status) status.hidden = false;
      var everFound = false, lastState = null;
      var setState = function (found) {
        if (found === lastState) return;         // evita "piscar" com detecção instável
        lastState = found;
        if (found) {
          everFound = true;
          if (hint) hint.classList.add('hidden');
          if (status) { status.textContent = 'marcador detectado ✓'; status.classList.add('found'); }
        } else {
          // depois de achar uma vez, NÃO traz o overlay de volta (só o texto do status)
          if (hint && !everFound) hint.classList.remove('hidden');
          if (status) { status.textContent = 'procurando marcador…'; status.classList.remove('found'); }
        }
      };
      marker.addEventListener('markerFound', function () { setState(true); fitAR(); });
      marker.addEventListener('markerLost', function () { setState(false); });
    } else if (hint) {
      hint.classList.add('hidden');
    }

    if (window.APP_MODE === 'ar') {
      if (marker && !marker.getAttribute('ar-freeze')) marker.setAttribute('ar-freeze', '');
      [200, 800, 2000, 4000].forEach(function (t) { setTimeout(fitAR, t); });
      window.addEventListener('resize', function () { setTimeout(fitAR, 60); });
      window.addEventListener('orientationchange', function () { setTimeout(fitAR, 250); });
      document.addEventListener('arjs-video-loaded', fitAR);
    }

    if (window.APP_MODE === 'preview') enablePreviewPicking();
    refresh();
  });

  window.Scene = { refresh: refresh, render: render, select: select, state: state };
})();
