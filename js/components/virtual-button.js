/* components/virtual-button.js — botão virtual clicável/gaze dentro da cena 3D/AR */
AFRAME.registerComponent('virtual-button', {
  schema: {
    label: { default: 'BTN' },
    action: { default: '' },
    color: { type: 'color', default: '#1e293b' },
    size: { type: 'number', default: 1 }   // multiplicador (1 = ~0.3 x 0.15)
  },

  init: function () {
    var d = this.data;
    var el = this.el;
    var w = 0.3 * d.size, h = 0.15 * d.size;

    var plane = document.createElement('a-plane');
    plane.setAttribute('width', w);
    plane.setAttribute('height', h);
    plane.setAttribute('class', 'clickable');
    plane.setAttribute('material', 'shader: flat; color: ' + d.color + '; opacity: 0.95; transparent: true');
    el.appendChild(plane);

    var label = document.createElement('a-entity');
    label.setAttribute('text', 'value: ' + d.label + '; align: center; width: ' + (1.3 * d.size) + '; color: #f8fafc; baseline: center');
    label.setAttribute('position', '0 0 0.01');
    el.appendChild(label);

    function fire(e) {
      if (e && e.stopPropagation) e.stopPropagation();
      document.dispatchEvent(new CustomEvent('vbtn', { detail: d.action }));
      el.setAttribute('animation__press', 'property: scale; from: 0.86 0.86 0.86; to: 1 1 1; dur: 220; easing: easeOutBack');
    }
    plane.addEventListener('click', fire);
    plane.addEventListener('mouseenter', function () {
      el.setAttribute('animation__h', 'property: scale; to: 1.12 1.12 1.12; dur: 120');
    });
    plane.addEventListener('mouseleave', function () {
      el.setAttribute('animation__h', 'property: scale; to: 1 1 1; dur: 120');
    });
  }
});
