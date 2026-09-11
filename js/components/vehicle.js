/*
 * components/vehicle.js — modelo 3D procedural de um veículo, em escala de metros.
 * O FORMATO muda conforme a categoria:
 *    hatch        -> compacto, traseira curta
 *    sedan        -> 3 volumes, porta-malas definido, teto mais baixo
 *    caminhonete  -> cabine + caçamba, mais alto e robusto, rodas maiores
 *    suv          -> alto e "quadrado", teto longo, sem degrau de porta-malas
 *
 * Reutiliza peças comuns (rodas, vidros, faróis) entre as categorias.
 * O carro aponta para +X (frente). Origem no centro, chão em y = 0.
 */
AFRAME.registerComponent('vehicle', {
  schema: {
    color: { type: 'color', default: '#e53935' },
    categoria: { default: 'hatch' },
    selected: { type: 'boolean', default: false },
    bob: { type: 'boolean', default: true }
  },

  init: function () {
    this.paint = [];              // peças que recebem a cor da carroceria
    this.build();
    if (this.data.bob) {
      this.el.setAttribute('animation__bob', {
        property: 'object3D.position.y', dir: 'alternate', loop: true,
        dur: 2800, easing: 'easeInOutSine', from: 0, to: 0.05
      });
    }
    this.apply();
  },

  update: function (old) {
    if (old && old.categoria !== undefined && old.categoria !== this.data.categoria) {
      // categoria mudou -> reconstrói
      while (this.el.firstChild) this.el.removeChild(this.el.firstChild);
      this.paint = [];
      this.build();
    }
    this.apply();
  },

  apply: function () {
    var d = this.data;
    this.paint.forEach(function (p) { p.setAttribute('material', 'color', d.color); });
    if (this.glow) this.glow.setAttribute('visible', d.selected);
    this.el.setAttribute('animation__sel', {
      property: 'scale', to: (d.selected ? '1.05 1.05 1.05' : '1 1 1'),
      dur: 220, easing: 'easeOutBack'
    });
  },

  /* helper: cria filho com atributos */
  mk: function (tag, attrs, paint) {
    var e = document.createElement(tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    this.el.appendChild(e);
    if (paint) this.paint.push(e);
    return e;
  },

  bodyMat: 'metalness: 0.35; roughness: 0.45',

  wheels: function (r, xs, z, y) {
    var self = this;
    xs.forEach(function (x) {
      [z, -z].forEach(function (zz) {
        self.mk('a-cylinder', {
          position: x + ' ' + (y || r) + ' ' + zz, radius: r, height: 0.28,
          rotation: '90 0 0', segments: 14, material: 'color: #15181d; roughness: 0.95'
        });
        self.mk('a-cylinder', {
          position: x + ' ' + (y || r) + ' ' + zz, radius: r * 0.5, height: 0.3,
          rotation: '90 0 0', segments: 10, material: 'color: #9aa6b2; metalness: 0.7; roughness: 0.3'
        });
      });
    });
  },

  glass: function (len, h, w, x, y) {
    this.mk('a-box', {
      position: x + ' ' + y + ' 0', width: len, height: h, depth: w,
      material: 'color: #cfe6f7; opacity: 0.5; transparent: true; metalness: 0.1; roughness: 0.05'
    });
  },

  lights: function (frontX, rearX, y) {
    var self = this;
    [0.62, -0.62].forEach(function (zz) {
      self.mk('a-box', { position: frontX + ' ' + y + ' ' + zz, width: 0.12, height: 0.22, depth: 0.34, material: 'shader: flat; color: #fff3c4' });
      self.mk('a-box', { position: rearX + ' ' + y + ' ' + zz, width: 0.1, height: 0.2, depth: 0.34, material: 'shader: flat; color: #ff5555' });
    });
  },

  glowRing: function (radius) {
    this.glow = this.mk('a-ring', {
      'radius-inner': radius, 'radius-outer': radius + 0.35, rotation: '-90 0 0',
      position: '0 0.02 0', material: 'shader: flat; color: #38bdf8; opacity: 0.7; transparent: true',
      visible: false
    });
  },

  build: function () {
    var c = this.data.categoria;
    if (c === 'sedan') this.buildSedan();
    else if (c === 'caminhonete') this.buildPickup();
    else if (c === 'suv') this.buildSuv();
    else this.buildHatch();
  },

  /* ---------------- HATCH ---------------- */
  buildHatch: function () {
    this.mk('a-box', { position: '0 0.62 0', width: 3.7, height: 0.72, depth: 1.66, material: this.bodyMat }, true);
    this.mk('a-box', { position: '-0.15 1.02 0', width: 2.2, height: 0.28, depth: 1.6, material: this.bodyMat }, true);
    this.mk('a-box', { position: '-0.35 1.34 0', width: 1.75, height: 0.62, depth: 1.5, material: this.bodyMat }, true);
    this.glass(1.55, 0.5, 1.42, -0.35, 1.4);
    this.wheels(0.36, [1.25, -1.2], 0.82, 0.36);
    this.lights(1.9, -1.9, 0.72);
    this.glowRing(2.3);
  },

  /* ---------------- SEDAN ---------------- */
  buildSedan: function () {
    this.mk('a-box', { position: '0 0.6 0', width: 4.5, height: 0.66, depth: 1.72, material: this.bodyMat }, true);
    // capô e porta-malas (degraus dos 3 volumes)
    this.mk('a-box', { position: '1.35 0.95 0', width: 1.7, height: 0.22, depth: 1.66, material: this.bodyMat }, true);
    this.mk('a-box', { position: '-1.55 0.98 0', width: 1.3, height: 0.28, depth: 1.66, material: this.bodyMat }, true);
    // cabine (baixa)
    this.mk('a-box', { position: '-0.25 1.28 0', width: 1.95, height: 0.56, depth: 1.56, material: this.bodyMat }, true);
    this.glass(1.75, 0.46, 1.48, -0.25, 1.34);
    this.wheels(0.36, [1.45, -1.4], 0.84, 0.36);
    this.lights(2.3, -2.3, 0.72);
    this.glowRing(2.7);
  },

  /* ---------------- CAMINHONETE (PICKUP) ---------------- */
  buildPickup: function () {
    var r = 0.46;
    // chassi alto
    this.mk('a-box', { position: '0 1.0 0', width: 5.1, height: 0.8, depth: 1.94, material: this.bodyMat }, true);
    // cabine na frente
    this.mk('a-box', { position: '0.95 1.78 0', width: 1.9, height: 0.9, depth: 1.86, material: this.bodyMat }, true);
    this.glass(1.55, 0.62, 1.7, 0.95, 1.85);
    // caçamba: assoalho + 4 paredes baixas
    this.mk('a-box', { position: '-1.45 1.5 0', width: 2.5, height: 0.12, depth: 1.86, material: this.bodyMat }, true);
    this.mk('a-box', { position: '-1.45 1.82 0.92', width: 2.5, height: 0.62, depth: 0.1, material: this.bodyMat }, true);
    this.mk('a-box', { position: '-1.45 1.82 -0.92', width: 2.5, height: 0.62, depth: 0.1, material: this.bodyMat }, true);
    this.mk('a-box', { position: '-2.68 1.82 0', width: 0.1, height: 0.62, depth: 1.86, material: this.bodyMat }, true);
    this.mk('a-box', { position: '-0.22 1.82 0', width: 0.1, height: 0.7, depth: 1.86, material: this.bodyMat }, true);
    // santantônio
    this.mk('a-box', { position: '-0.25 2.35 0', width: 0.08, height: 0.5, depth: 1.7, material: 'color: #20262e; metalness: 0.6' });
    this.wheels(r, [1.55, -1.55], 0.9, r);
    this.lights(2.6, -2.75, 1.15);
    this.glowRing(3.0);
  },

  /* ---------------- SUV ---------------- */
  buildSuv: function () {
    var r = 0.42;
    this.mk('a-box', { position: '0 0.98 0', width: 4.5, height: 0.9, depth: 1.9, material: this.bodyMat }, true);
    this.mk('a-box', { position: '-0.1 1.74 0', width: 3.1, height: 0.78, depth: 1.74, material: this.bodyMat }, true);
    this.glass(2.7, 0.6, 1.66, -0.1, 1.78);
    // teto plano + longarinas
    this.mk('a-box', { position: '-0.1 2.16 0', width: 2.9, height: 0.08, depth: 1.6, material: this.bodyMat }, true);
    this.mk('a-box', { position: '-0.1 2.24 0.62', width: 2.4, height: 0.06, depth: 0.08, material: 'color: #20262e' });
    this.mk('a-box', { position: '-0.1 2.24 -0.62', width: 2.4, height: 0.06, depth: 0.08, material: 'color: #20262e' });
    // para-choques robustos
    this.mk('a-box', { position: '2.15 0.7 0', width: 0.3, height: 0.5, depth: 1.96, material: 'color: #20262e; roughness: 0.9' });
    this.mk('a-box', { position: '-2.15 0.7 0', width: 0.3, height: 0.5, depth: 1.96, material: 'color: #20262e; roughness: 0.9' });
    this.wheels(r, [1.5, -1.5], 0.88, r);
    this.lights(2.35, -2.35, 1.05);
    this.glowRing(2.85);
  }
});

/* alias: mantém "low-poly-car" funcionando (usado no cenário e no código antigo) */
AFRAME.registerComponent('low-poly-car', {
  schema: {
    color: { type: 'color', default: '#e53935' },
    categoria: { default: 'hatch' },
    selected: { type: 'boolean', default: false }
  },
  init: function () {
    this.el.setAttribute('vehicle', {
      color: this.data.color, categoria: this.data.categoria, selected: this.data.selected
    });
  },
  update: function () {
    if (this.el.components.vehicle) {
      this.el.setAttribute('vehicle', {
        color: this.data.color, categoria: this.data.categoria, selected: this.data.selected
      });
    }
  }
});
