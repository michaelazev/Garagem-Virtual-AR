/*
 * scene/test-drive.js — sistema de Test Drive.
 *
 * Ao iniciar, cria um veículo (mesmo modelo/cor do selecionado) na rotatória e
 * o anima numa trajetória CIRCULAR suave, orientando a frente do carro pela
 * tangente da curva. Usa tick() -> não trava a aplicação.
 *
 * O carro da vitrine NÃO é movido: ao encerrar, o test-drive apenas some e o
 * veículo original continua no lugar (estado anterior preservado).
 *
 * API:  window.TestDrive.start(vehicle) / .stop() / .isRunning()
 */

/* componente que percorre o círculo */
AFRAME.registerComponent('orbit-drive', {
  schema: {
    radius: { default: 11 },
    speed: { default: 55 },      // graus por segundo (regime)
    height: { default: 0 },
    startAngle: { default: 0 }
  },
  init: function () {
    this.angle = this.data.startAngle;
    this.ramp = 0;               // acelera suave de 0 -> 1 em ~1.4s
    this.D2R = Math.PI / 180;
  },
  tick: function (t, dt) {
    if (!dt) return;
    this.ramp = Math.min(1, this.ramp + dt / 1400);
    var ease = this.ramp * this.ramp * (3 - 2 * this.ramp);
    this.angle += this.data.speed * ease * (dt / 1000);

    var rad = this.angle * this.D2R;
    var r = this.data.radius;
    var o = this.el.object3D;
    o.position.set(Math.cos(rad) * r, this.data.height + Math.sin(t / 260) * 0.04, Math.sin(rad) * r);
    // frente do carro (+X local) alinhada à tangente do círculo
    o.rotation.y = Math.atan2(-Math.cos(rad), -Math.sin(rad));
    o.rotation.z = -0.05 * ease;   // leve inclinação na curva
  }
});

(function (global) {
  'use strict';

  var cfg = (global.APP_CONFIG && global.APP_CONFIG.TESTDRIVE) || { center: { x: 64, z: 0 }, radius: 11, speed: 55, height: 0 };
  var host = null;
  var carEl = null;
  var currentId = null;

  function getHost() {
    if (host && host.isConnected) return host;
    host = document.getElementById('testdrive');
    if (host) host.setAttribute('position', cfg.center.x + ' ' + (cfg.height || 0) + ' ' + cfg.center.z);
    return host;
  }

  function stop() {
    if (carEl && carEl.parentNode) carEl.parentNode.removeChild(carEl);
    carEl = null;
    var wasId = currentId;
    currentId = null;
    if (wasId != null) document.dispatchEvent(new CustomEvent('testdrive:stop', { detail: wasId }));
  }

  function start(v) {
    var h = getHost();
    if (!h || !v) return;
    stop();
    currentId = v.id != null ? v.id : '?';
    carEl = document.createElement('a-entity');
    carEl.classList.add('testdrive-car');
    carEl.setAttribute('vehicle', {
      color: v.cor || '#e53935',
      categoria: v.categoria || (global.Catalog && global.Catalog.categoriaDe(v.marca, v.modelo)) || 'hatch',
      bob: false
    });
    carEl.setAttribute('orbit-drive', {
      radius: cfg.radius, speed: cfg.speed, height: cfg.height || 0,
      startAngle: Math.random() * 360
    });
    carEl.setAttribute('animation__in', 'property: scale; from: 0 0 0; to: 1 1 1; dur: 400; easing: easeOutBack');
    h.appendChild(carEl);
    document.dispatchEvent(new CustomEvent('testdrive:start', { detail: currentId }));
  }

  // encerra se o veículo em test drive for desmarcado / trocado / apagado
  document.addEventListener('vehicle:selected', function (e) {
    if (currentId != null && String(e.detail) !== String(currentId)) stop();
  });
  document.addEventListener('api:change', function (e) {
    var d = e.detail || {};
    if (currentId != null && d.type === 'delete' && String(d.id) === String(currentId)) stop();
  });

  global.TestDrive = {
    start: start,
    stop: stop,
    isRunning: function () { return !!carEl; },
    currentId: function () { return currentId; }
  };
})(window);
