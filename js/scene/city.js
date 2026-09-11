/*
 * scene/city.js — cenário/mapa planejado da concessionária.
 *
 * Layout (metros, plano XZ, +Y para cima):
 *
 *        N (-Z)
 *   [quarteirão]   [ CONCESSIONÁRIA + PÁTIO ]   [quarteirão]     z ≈ -36
 *   ------------- calçada norte -------------                     z ≈ -11
 *   =============  AVENIDA PRINCIPAL  =============  --> rotatória z = 0
 *   ------------- calçada sul   -------------                     z ≈ +11
 *   [quarteirão]   [ praça / spawn do jogador ]   [quarteirão]    z ≈ +34
 *
 * Registra window.CITY_BLOCKERS (AABBs) para a colisão do jogador.
 * Em modo AR ("compact") monta só o núcleo (concessionária + avenida curta).
 */
AFRAME.registerComponent('city', {
  schema: { compact: { type: 'boolean', default: false } },

  init: function () {
    this.blockers = [];
    var cfg = window.APP_CONFIG || {};
    this.td = cfg.TESTDRIVE || { center: { x: 64, z: 0 }, radius: 11 };
    if (this.data.compact) this.buildCompact();
    else this.buildFull();
    window.CITY_BLOCKERS = this.blockers;
  },

  /* ---------------- helpers ---------------- */
  mk: function (tag, attrs, parent) {
    var e = document.createElement(tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    (parent || this.el).appendChild(e);
    return e;
  },
  floor: function (x, z, w, h, color, y) {
    return this.mk('a-plane', {
      position: x + ' ' + (y == null ? 0.01 : y) + ' ' + z, rotation: '-90 0 0',
      width: w, height: h, material: 'shader: flat; color: ' + color
    });
  },
  blocker: function (x, z, hw, hd) { this.blockers.push({ x: x, z: z, hw: hw, hd: hd }); },

  rngFrom: function (seed) {
    return function () { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  },

  building: function (x, z, w, d, h, seed) {
    var pal = ['#26344a', '#2c3d57', '#212f43', '#31435f', '#233248', '#38414f'];
    var r = this.rngFrom(seed);
    var col = pal[Math.floor(r() * pal.length)];
    this.mk('a-box', {
      position: x + ' ' + (h / 2) + ' ' + z, width: w, height: h, depth: d,
      material: 'color: ' + col + '; roughness: 0.95'
    });
    // faixas de janelas acesas nas 4 faces
    var lit = '#a9d3ec';
    for (var wy = 3; wy < h - 2; wy += 4) {
      this.mk('a-plane', { position: x + ' ' + wy + ' ' + (z + d / 2 + 0.05), width: w * 0.82, height: 1.1, material: 'shader: flat; color: ' + lit + '; opacity: 0.75; transparent: true' });
      this.mk('a-plane', { position: x + ' ' + wy + ' ' + (z - d / 2 - 0.05), rotation: '0 180 0', width: w * 0.82, height: 1.1, material: 'shader: flat; color: ' + lit + '; opacity: 0.75; transparent: true' });
      this.mk('a-plane', { position: (x + w / 2 + 0.05) + ' ' + wy + ' ' + z, rotation: '0 90 0', width: d * 0.82, height: 1.1, material: 'shader: flat; color: ' + lit + '; opacity: 0.7; transparent: true' });
      this.mk('a-plane', { position: (x - w / 2 - 0.05) + ' ' + wy + ' ' + z, rotation: '0 -90 0', width: d * 0.82, height: 1.1, material: 'shader: flat; color: ' + lit + '; opacity: 0.7; transparent: true' });
    }
    // topo
    this.mk('a-box', { position: x + ' ' + (h + 0.15) + ' ' + z, width: w * 0.9, height: 0.3, depth: d * 0.9, material: 'color: #1a2231' });
    this.mk('a-box', { position: (x + w * 0.2) + ' ' + (h + 0.7) + ' ' + (z - d * 0.2), width: 1.2, height: 1, depth: 1.2, material: 'color: #1f2836' });
    this.blocker(x, z, w / 2, d / 2);
  },

  tree: function (x, z) {
    var t = this.mk('a-entity', { position: x + ' 0 ' + z });
    this.mk('a-cylinder', { position: '0 0.7 0', radius: 0.16, height: 1.4, material: 'color: #5b4636; roughness: 1' }, t);
    this.mk('a-cone', { position: '0 1.9 0', 'radius-bottom': 1.1, 'radius-top': 0.02, height: 2.1, 'segments-radial': 6, material: 'color: #2f6b3f; roughness: 1' }, t);
    this.mk('a-cone', { position: '0 3.0 0', 'radius-bottom': 0.75, 'radius-top': 0.02, height: 1.6, 'segments-radial': 6, material: 'color: #3a824e; roughness: 1' }, t);
    this.blocker(x, z, 0.5, 0.5);
  },

  lamp: function (x, z, dir) {
    var l = this.mk('a-entity', { position: x + ' 0 ' + z });
    this.mk('a-cylinder', { position: '0 1.8 0', radius: 0.08, height: 3.6, material: 'color: #2b3543' }, l);
    this.mk('a-box', { position: (dir * 0.5) + ' 3.5 0', width: 1, height: 0.1, depth: 0.12, material: 'color: #2b3543' }, l);
    this.mk('a-sphere', { position: (dir * 0.95) + ' 3.4 0', radius: 0.2, material: 'shader: flat; color: #ffe4a0' }, l);
  },

  roadX: function (zc, len, w) {
    this.floor(0, zc, len, w, '#1b2230', 0.02);
    for (var x = -len / 2 + 3; x <= len / 2 - 3; x += 6) {
      this.floor(x, zc, 2.4, 0.35, '#f4c542', 0.03);
    }
  },
  roadZ: function (xc, len, w) {
    this.mk('a-plane', { position: xc + ' 0.02 0', rotation: '-90 0 0', width: len, height: w, material: 'shader: flat; color: #1b2230' });
    for (var z = -len / 2 + 3; z <= len / 2 - 3; z += 6) {
      this.mk('a-plane', { position: xc + ' 0.03 ' + z, rotation: '-90 0 90', width: 2.4, height: 0.35, material: 'shader: flat; color: #f4c542' });
    }
  },
  crosswalk: function (x, z) {
    for (var i = -2.4; i <= 2.4; i += 1.2) {
      this.floor(x + i, z, 0.7, 5.5, '#e5eaf0', 0.04);
    }
  },

  /* ---------------- concessionária ---------------- */
  dealership: function (cx, cz) {
    var d = this.mk('a-entity', { position: cx + ' 0 ' + cz });
    // pátio pavimentado (onde fica a vitrine do CRUD)
    this.mk('a-plane', { position: '0 0.02 9', rotation: '-90 0 0', width: 40, height: 30, material: 'shader: flat; color: #333c48' }, d);
    // faixa da entrada
    this.mk('a-plane', { position: '0 0.03 20', rotation: '-90 0 0', width: 40, height: 0.6, material: 'shader: flat; color: #f4c542; opacity: 0.5; transparent: true' }, d);
    // prédio showroom
    this.mk('a-box', { position: '0 4.5 -3', width: 34, height: 9, depth: 12, material: 'color: #223247; roughness: 0.7' }, d);
    // fachada de vidro
    this.mk('a-box', { position: '0 3.6 3.1', width: 29, height: 6.4, depth: 0.3, material: 'color: #9ad2ef; opacity: 0.32; transparent: true; metalness: 0.2; roughness: 0.05' }, d);
    for (var mx = -12; mx <= 12; mx += 4) {
      this.mk('a-box', { position: mx + ' 3.6 3.25', width: 0.35, height: 6.4, depth: 0.4, material: 'color: #cbd5e1' }, d);
    }
    // marquise + letreiro
    this.mk('a-box', { position: '0 8.4 5', width: 38, height: 0.8, depth: 6, material: 'color: #18222f' }, d);
    this.mk('a-box', { position: '0 10.4 3', width: 22, height: 2.6, depth: 0.5, material: 'shader: flat; color: #1a86c4' }, d);
    this.mk('a-entity', { position: '0 10.4 3.3', text: 'value: GARAGEM VIRTUAL; align: center; width: 40; color: #eaf7ff' }, d);
    // totem
    this.mk('a-box', { position: '15 2.4 6', width: 0.9, height: 4.8, depth: 0.9, material: 'color: #18222f' }, d);
    this.mk('a-box', { position: '15 6 6', width: 3.4, height: 2.6, depth: 0.6, material: 'shader: flat; color: #1f9d4b' }, d);
    this.mk('a-entity', { position: '15 6 6.35', text: 'value: OFERTAS; align: center; width: 8; color: #eafff0' }, d);
    // luz do pátio (para os carros não ficarem escuros)
    this.mk('a-light', { type: 'point', intensity: 0.5, distance: 40, decay: 1, color: '#dbeafe', position: '0 12 6' }, d);
    // colisão do prédio
    this.blocker(cx, cz - 3, 17, 6);
  },

  /* ---------------- estacionamento de seminovos (vagas certinhas) ---------------- */
  parkingLot: function (cx, cz, n) {
    var stall = 3.0;                    // largura da vaga
    var g = this.mk('a-entity', { position: cx + ' 0 ' + cz });
    var W = n * stall + 1.4, D = 13;
    // piso
    this.mk('a-plane', { position: '0 0.02 0', rotation: '-90 0 0', width: W, height: D, material: 'shader: flat; color: #333c48' }, g);
    // mureta ao fundo (os carros encostam nela)
    this.mk('a-box', { position: '0 0.45 ' + (-D / 2 + 0.25), width: W, height: 0.9, depth: 0.4, material: 'color: #2b3543' }, g);
    // placa "SEMINOVOS"
    this.mk('a-box', { position: '0 3.8 ' + (-D / 2 + 0.25), width: 6, height: 1.4, depth: 0.4, material: 'shader: flat; color: #1a86c4' }, g);
    this.mk('a-entity', { position: '0 3.8 ' + (-D / 2 + 0.5), text: 'value: SEMINOVOS; align: center; width: 13; color: #eaf7ff' }, g);

    var cols = ['#e53935', '#1e88e5', '#f2f4f7', '#2e9e5b', '#5b6672', '#f4c025'];
    var cats = ['hatch', 'sedan', 'suv', 'caminhonete', 'sedan', 'hatch'];
    for (var i = 0; i <= n; i++) {
      var lx = (i - n / 2) * stall;                          // linhas divisórias
      this.mk('a-plane', { position: lx + ' 0.03 0.6', rotation: '-90 0 0', width: 0.14, height: 6.2, material: 'shader: flat; color: #d9e2ec; opacity: 0.55; transparent: true' }, g);
      if (i === n) break;
      var sx = (i - (n - 1) / 2) * stall;                    // centro da vaga
      var car = this.mk('a-entity', { position: sx + ' 0 -1.6', rotation: '0 90 0', scale: '0.92 0.92 0.92' }, g);
      car.setAttribute('vehicle', 'color: ' + cols[i % cols.length] + '; categoria: ' + cats[i % cats.length] + '; bob: false');
      this.blocker(cx + sx, cz - 1.6, 1.15, 2.2);
    }
    this.blocker(cx, cz - D / 2 + 0.25, W / 2, 0.4);          // mureta
  },

  /* ---------------- rotatória / área de test drive ---------------- */
  roundabout: function (cx, cz, r) {
    var a = this.mk('a-entity', { position: cx + ' 0 ' + cz });
    this.mk('a-circle', { position: '0 0.02 0', rotation: '-90 0 0', radius: r + 6, material: 'shader: flat; color: #202836', segments: 40 }, a);
    // pista pintada onde o carro anda no test drive
    this.mk('a-ring', { position: '0 0.04 0', rotation: '-90 0 0', 'radius-inner': r - 0.3, 'radius-outer': r + 0.3, material: 'shader: flat; color: #f4c542; opacity: 0.85; transparent: true', segments: 48 }, a);
    // ilha central ajardinada + monumento
    this.mk('a-circle', { position: '0 0.05 0', rotation: '-90 0 0', radius: r - 4, material: 'shader: flat; color: #1c3a28', segments: 32 }, a);
    this.mk('a-cone', { position: '0 3 0', 'radius-bottom': 1.4, 'radius-top': 0.1, height: 6, material: 'color: #3a824e' }, a);
    this.mk('a-cylinder', { position: '0 0.6 0', radius: 1.8, height: 1.2, material: 'color: #5b6672' }, a);
    this.blocker(cx, cz, 2, 2);
  },

  /* ---------------- montagem completa ---------------- */
  buildFull: function () {
    var td = this.td;
    // chão
    this.floor(10, 0, 360, 360, '#12241a', -0.05);

    // avenida principal (E-W) + rotatória a leste
    this.roadX(0, 300, 14);
    this.roundabout(td.center.x, td.center.z, td.radius);

    // calçadas da avenida
    this.floor(0, 9.2, 260, 3.5, '#313d4b', 0.015);
    this.floor(0, -9.2, 260, 3.5, '#313d4b', 0.015);
    this.crosswalk(0, 9.2);
    this.crosswalk(-30, 9.2);

    // entradas (avenida -> pátio da loja e -> estacionamento)
    this.floor(0, 3, 16, 16, '#2b333f', 0.016);
    this.floor(30, 1, 12, 20, '#2b333f', 0.016);

    // concessionária (norte, x=0)
    this.dealership(0, -24);
    // estacionamento de seminovos (leste da loja) — vagas certinhas
    this.parkingLot(30, -22, 6);

    // quarteirões com prédios (cantos, longe do centro)
    var blocks = [
      { x: -48, z: -34 }, { x: -48, z: 34 }, { x: 4, z: 44 }, { x: 46, z: 42 }
    ];
    blocks.forEach(function (b, bi) {
      this.floor(b.x, b.z, 34, 26, '#16281d', 0.008);
      [[-10, -7, 12, 9], [10, 6, 10, 10], [-3, 9, 8, 7]].forEach(function (d, di) {
        this.building(b.x + d[0], b.z + d[1], d[2], d[3], 12 + ((bi * 3 + di * 5) % 6) * 4, bi * 131 + di * 37 + 5);
      }, this);
    }, this);

    // skyline distante (norte e sul, sem colisão)
    for (var i = 0; i < 14; i++) {
      var bx = -100 + i * 15;
      var bh = 18 + ((i * 7) % 5) * 9;
      this.mk('a-box', { position: bx + ' ' + (bh / 2) + ' -94', width: 11, height: bh, depth: 8, material: 'color: #182234; roughness: 1' });
      this.mk('a-box', { position: (bx + 5) + ' ' + (bh * 0.35) + ' 100', width: 10, height: bh * 0.7, depth: 8, material: 'color: #16202f; roughness: 1' });
    }

    // árvores + postes nas calçadas (livre nos acessos: |x|<16 e faixa 20..42 ao norte)
    for (var x = -84; x <= 66; x += 12) {
      var nx = x + 6;
      if (Math.abs(x) > 16 && !(x > 16 && x < 46)) this.tree(x, 11.5);
      if (Math.abs(nx) > 16 && !(nx > 16 && nx < 46)) this.tree(nx, -11.5);
      if (x % 24 === 0 && Math.abs(x) > 12) { this.lamp(x, 9.4, 1); this.lamp(x, -9.4, -1); }
    }
  },

  /* ---------------- versão compacta (AR) ---------------- */
  /* AR: concessionária detalhada, porém contida (roda no celular) */
  buildCompact: function () {
    this.floor(0, -8, 70, 52, '#12241a', -0.05);            // terreno
    // avenida + calçada + faixa em frente à loja
    this.floor(0, 12, 60, 5, '#1b2230', 0.008);
    for (var dx = -24; dx <= 24; dx += 6) this.floor(dx, 12, 2.4, 0.35, '#f4c542', 0.02);
    this.floor(0, 16, 60, 3, '#313d4b', 0.012);
    this.crosswalk(0, 12);
    // concessionária completa (fachada de vidro, marquise, letreiro, totem, luz)
    this.dealership(0, -14);
    // estacionamento de seminovos ao lado
    this.parkingLot(24, -8, 4);
    // árvores + postes na calçada
    for (var t = -22; t <= 22; t += 11) { this.tree(t, 18); }
    this.lamp(-14, 15, 1); this.lamp(14, 15, 1);
    // 3 prédios de fundo (skyline)
    this.mk('a-box', { position: '-26 11 -30', width: 12, height: 22, depth: 8, material: 'color: #26344a; roughness: 1' });
    this.mk('a-box', { position: '-10 8 -34', width: 10, height: 16, depth: 8, material: 'color: #223048; roughness: 1' });
    this.mk('a-box', { position: '22 14 -32', width: 12, height: 28, depth: 8, material: 'color: #2c3d57; roughness: 1' });
  }
});
