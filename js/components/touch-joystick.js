/*
 * components/touch-joystick.js — joystick na tela para ANDAR no celular (modo Showroom).
 *
 * - Aparece só no modo Showroom e em telas de toque / pequenas.
 * - Polegar esquerdo: arrasta o joystick -> anda (frente/trás/lados).
 * - O resto da tela continua servindo para OLHAR (look-controls, touchEnabled).
 * - Puxar até o limite = correr.
 */
(function () {
  'use strict';

  function start() {
    var mode = window.APP_MODE || 'ar';
    var touch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    var small = window.matchMedia('(max-width: 860px)').matches;
    var el = document.getElementById('joystick');
    if (!el || mode !== 'preview' || (!touch && !small)) return;

    var knob = el.querySelector('.joy-knob');
    var R = 46;                 // raio de curso do knob (px)
    var active = false, id = null, cx = 0, cy = 0;

    function setMove(fx, fy) {
      // fy negativo (dedo p/ cima) = andar p/ frente
      var fwd = -fy, strafe = fx;
      var mag = Math.hypot(fwd, strafe);
      if (window.Player && window.Player.setMove) {
        window.Player.setMove(fwd, strafe);
        window.Player.run(mag > 0.92);
      }
    }
    function place(px, py) {
      var dx = px - cx, dy = py - cy;
      var d = Math.hypot(dx, dy);
      if (d > R) { dx = dx / d * R; dy = dy / d * R; }
      knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
      setMove(dx / R, dy / R);
    }
    function reset() {
      active = false; id = null;
      knob.style.transform = 'translate(0,0)';
      if (window.Player && window.Player.setMove) { window.Player.setMove(0, 0); window.Player.run(false); }
    }

    el.addEventListener('touchstart', function (e) {
      var t = e.changedTouches[0];
      var r = el.getBoundingClientRect();
      cx = r.left + r.width / 2; cy = r.top + r.height / 2;
      active = true; id = t.identifier;
      place(t.clientX, t.clientY);
      e.preventDefault(); e.stopPropagation();
    }, { passive: false });

    el.addEventListener('touchmove', function (e) {
      if (!active) return;
      for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        if (t.identifier === id) { place(t.clientX, t.clientY); break; }
      }
      e.preventDefault(); e.stopPropagation();
    }, { passive: false });

    el.addEventListener('touchend', function (e) {
      for (var i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === id) { reset(); break; }
      }
      e.preventDefault(); e.stopPropagation();
    }, { passive: false });
    el.addEventListener('touchcancel', reset);

    el.hidden = false;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
