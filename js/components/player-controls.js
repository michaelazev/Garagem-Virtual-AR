/*
 * components/player-controls.js — movimentação do jogador no cenário (modo Showroom).
 *
 * - Anda com W A S D  ou  setas.  Shift = correr.
 * - A câmera (filha do rig) usa look-controls -> arrastar o mouse olha em volta.
 *   O jogador anda na direção para onde está olhando (plano XZ, altura fixa).
 * - Limita o jogador aos limites do mapa (APP_CONFIG.MAP.half).
 * - Colisão AABB simples contra window.CITY_BLOCKERS (prédios) -> desliza na parede.
 * - Ignora o teclado quando o foco está num campo de formulário.
 * - Não interfere na seleção de veículos (o clique é tratado à parte).
 */
AFRAME.registerComponent('player-controls', {
  schema: {
    speed: { default: 4.6 },
    run: { default: 8.4 },
    bound: { default: 95 }
  },

  init: function () {
    var self = this;
    this.keys = Object.create(null);
    this.enabled = true;
    this.THREE = AFRAME.THREE;
    this.q = new this.THREE.Quaternion();
    this.fwd = new this.THREE.Vector3();
    this.right = new this.THREE.Vector3();
    this.move = new this.THREE.Vector3();
    this.cameraEl = this.el.querySelector('[camera]') || this.el.querySelector('a-camera');

    function typing() {
      var a = document.activeElement;
      return a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName);
    }
    this._down = function (e) {
      if (typing()) return;
      var k = e.key.toLowerCase();
      self.keys[k] = true;
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].indexOf(k) >= 0) e.preventDefault();
    };
    this._up = function (e) { self.keys[e.key.toLowerCase()] = false; };
    this._blur = function () { self.keys = Object.create(null); };

    window.addEventListener('keydown', this._down);
    window.addEventListener('keyup', this._up);
    window.addEventListener('blur', this._blur);

    this.touch = { f: 0, s: 0 };   // vetor de movimento vindo do joystick (mobile)

    // API pública
    window.Player = {
      teleport: function (x, z, ry) { self.teleport(x, z, ry); },
      setEnabled: function (v) { self.enabled = !!v; if (!v) self.keys = Object.create(null); },
      isEnabled: function () { return self.enabled; },
      // vetor do joystick: fwd em [-1,1] (frente/trás), strafe em [-1,1] (dir/esq)
      setMove: function (fwd, strafe) { self.touch.f = fwd || 0; self.touch.s = strafe || 0; },
      run: function (on) { self.touch.run = !!on; }
    };

    var sp = (window.APP_CONFIG && window.APP_CONFIG.PLAYER && window.APP_CONFIG.PLAYER.spawn) || { x: 0, z: 20, ry: 180 };
    this.teleport(sp.x, sp.z, sp.ry);
  },

  remove: function () {
    window.removeEventListener('keydown', this._down);
    window.removeEventListener('keyup', this._up);
    window.removeEventListener('blur', this._blur);
  },

  teleport: function (x, z, ry) {
    this.el.object3D.position.set(x, 0, z);
    if (ry != null && this.cameraEl) {
      var lc = this.cameraEl.components['look-controls'];
      if (lc && lc.yawObject) lc.yawObject.rotation.y = this.THREE.MathUtils.degToRad(ry);
      else this.cameraEl.object3D.rotation.y = this.THREE.MathUtils.degToRad(ry);
    }
  },

  blocked: function (x, z) {
    var list = window.CITY_BLOCKERS;
    if (!list) return false;
    var pr = 0.55;
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      if (Math.abs(x - b.x) < b.hw + pr && Math.abs(z - b.z) < b.hd + pr) return true;
    }
    return false;
  },

  tick: function (time, dt) {
    if (!this.enabled || !dt) return;
    var k = this.keys;
    var f = (k.w || k.arrowup ? 1 : 0) - (k.s || k.arrowdown ? 1 : 0) + this.touch.f;
    var s = (k.d || k.arrowright ? 1 : 0) - (k.a || k.arrowleft ? 1 : 0) + this.touch.s;
    f = Math.max(-1, Math.min(1, f));
    s = Math.max(-1, Math.min(1, s));
    if (!f && !s) return;
    var running = k.shift || this.touch.run;

    var cam = this.cameraEl && this.cameraEl.object3D;
    if (!cam) return;
    cam.getWorldQuaternion(this.q);
    this.fwd.set(0, 0, -1).applyQuaternion(this.q); this.fwd.y = 0; this.fwd.normalize();
    this.right.set(1, 0, 0).applyQuaternion(this.q); this.right.y = 0; this.right.normalize();

    this.move.set(0, 0, 0)
      .addScaledVector(this.fwd, f)
      .addScaledVector(this.right, s);
    if (this.move.lengthSq() > 1) this.move.normalize();

    var spd = (running ? this.data.run : this.data.speed) * (dt / 1000);
    var p = this.el.object3D.position;
    var b = this.data.bound;

    var nx = this.THREE.MathUtils.clamp(p.x + this.move.x * spd, -b, b);
    var nz = this.THREE.MathUtils.clamp(p.z + this.move.z * spd, -b, b);

    // resolve por eixo para "deslizar" nas paredes
    if (!this.blocked(nx, p.z)) p.x = nx;
    if (!this.blocked(p.x, nz)) p.z = nz;
    p.y = 0;
  }
});
