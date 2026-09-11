/*
 * ui/panel.js — painel de controle da concessionária (interface HTML auxiliar).
 *
 * - Lista dinâmica + log dos verbos HTTP + badge de conexão + toasts.
 * - Formulário CRUD (POST/PUT/PATCH) com CATEGORIA do veículo.
 * - Cartão de edição / controle aparece SÓ quando um veículo é selecionado
 *   (ou "+ Novo carro"); ao deselecionar, ele fecha.
 * - Botão de Test Drive (integra com scene/test-drive.js).
 * - No modo Showroom o painel inteiro fica recolhido até haver seleção.
 */
(function () {
  'use strict';

  var $ = function (s) { return document.querySelector(s); };
  var Mock = window.Mock;
  var Catalog = window.Catalog;
  var API = window.API;

  var form = $('#veh-form');
  var editCard = $('#edit-card');
  var panel = $('#panel');
  var preview = (window.APP_MODE === 'preview');
  var current = [];
  var selectedId = null;

  function brl(n) { return Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }); }
  function sameId(a, b) { return String(a) === String(b); }
  function vehById(id) { return current.find(function (x) { return sameId(x.id, id); }); }

  /* ---------------- toasts ---------------- */
  function toast(msg, kind) {
    var box = $('#toasts');
    var el = document.createElement('div');
    el.className = 'toast ' + (kind || 'ok');
    el.textContent = msg;
    box.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('show'); });
    setTimeout(function () { el.classList.remove('show'); setTimeout(function () { el.remove(); }, 300); }, 3200);
  }

  /* ---------------- confirmação custom ---------------- */
  function askConfirm(text) {
    return new Promise(function (resolve) {
      var m = $('#confirm-modal'), ok = $('#confirm-ok'), cancel = $('#confirm-cancel');
      $('#confirm-text').textContent = text;
      m.hidden = false;
      function done(v) {
        m.hidden = true;
        ok.removeEventListener('click', onOk); cancel.removeEventListener('click', onCancel);
        m.removeEventListener('click', onBackdrop); document.removeEventListener('keydown', onKey);
        resolve(v);
      }
      function onOk() { done(true); }
      function onCancel() { done(false); }
      function onBackdrop(e) { if (e.target === m) done(false); }
      function onKey(e) { if (e.key === 'Escape') done(false); }
      ok.addEventListener('click', onOk); cancel.addEventListener('click', onCancel);
      m.addEventListener('click', onBackdrop); document.addEventListener('keydown', onKey);
    });
  }

  /* ---------------- formulário ---------------- */
  function fillSelects() {
    $('#f-marca').innerHTML = Catalog.MARCAS.map(function (m) { return '<option>' + m + '</option>'; }).join('');
    $('#f-categoria').innerHTML = Catalog.CATEGORIAS.map(function (c) { return '<option>' + c + '</option>'; }).join('');
  }

  function readForm() {
    var hex = $('#f-cor').value;
    var corObj = Catalog.CORES.find(function (c) { return c.hex.toLowerCase() === hex.toLowerCase(); });
    return {
      marca: $('#f-marca').value,
      modelo: $('#f-modelo').value.trim(),
      categoria: $('#f-categoria').value,
      ano: Number($('#f-ano').value),
      cor: hex,
      corNome: corObj ? corObj.nome : 'Personalizada',
      potenciaCv: Number($('#f-cv').value),
      preco: Number($('#f-preco').value),
      placa: ($('#f-placa').value.trim() || Mock.randomPlaca()).toUpperCase()
    };
  }

  function fillForm(v) {
    $('#f-id').value = v ? v.id : '';
    $('#f-marca').value = v ? v.marca : Catalog.MARCAS[0];
    $('#f-modelo').value = v ? v.modelo : '';
    $('#f-categoria').value = v ? (v.categoria || Catalog.categoriaDe(v.marca, v.modelo)) : 'hatch';
    $('#f-ano').value = v ? v.ano : 2024;
    $('#f-cor').value = v ? v.cor : '#1e88e5';
    $('#f-cv').value = v ? v.potenciaCv : 110;
    $('#f-preco').value = v ? v.preco : 90000;
    $('#f-placa').value = v ? v.placa : Mock.randomPlaca();
    setMode(v ? 'edit' : 'create');
    syncTestDriveBtn();
  }

  function setMode(mode) {
    form.dataset.mode = mode;
    $('#f-submit').textContent = mode === 'edit' ? 'Atualizar (PUT)' : 'Criar (POST)';
    $('#f-patch').hidden = mode !== 'edit';
    $('#f-testdrive').hidden = mode !== 'edit';
    $('#form-title').textContent = mode === 'edit' ? 'Veículo #' + $('#f-id').value : 'Novo veículo';
  }

  /* ---------------- abrir/fechar o cartão ---------------- */
  var isMobile = function () { return window.matchMedia('(max-width: 860px)').matches; };

  function openEdit(v) {
    fillForm(v || null);
    editCard.hidden = false;
    editCard.classList.remove('flash'); void editCard.offsetWidth; editCard.classList.add('flash');
    panel.classList.add('open');
    editCard.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  function closeEdit(keepSelection) {
    editCard.hidden = true;
    if (window.TestDrive && window.TestDrive.isRunning()) window.TestDrive.stop();
    fillForm(null);
    if (!keepSelection && selectedId != null) {
      selectedId = null;
      renderList(current);
      document.dispatchEvent(new CustomEvent('external:select', { detail: null }));
    }
    // no Showroom (desktop) e no mobile, recolhe o painel quando nada está selecionado
    if (selectedId == null && (preview || isMobile())) panel.classList.remove('open');
  }

  /* ---------------- Test Drive ---------------- */
  function syncTestDriveBtn() {
    var btn = $('#f-testdrive');
    if (!btn) return;
    var running = window.TestDrive && window.TestDrive.isRunning() &&
      sameId(window.TestDrive.currentId(), $('#f-id').value);
    btn.textContent = running ? '⏹ Encerrar test drive' : '▶ Test drive';
    btn.classList.toggle('active', !!running);
  }
  function onTestDrive() {
    var id = $('#f-id').value;
    var v = vehById(id);
    if (!v || !window.TestDrive) return;
    if (window.TestDrive.isRunning() && sameId(window.TestDrive.currentId(), id)) {
      window.TestDrive.stop();
      toast('Test drive encerrado', 'ok');
    } else {
      window.TestDrive.start(v);
      toast('Test drive: ' + v.marca + ' ' + v.modelo, 'ok');
    }
    syncTestDriveBtn();
  }
  document.addEventListener('testdrive:start', syncTestDriveBtn);
  document.addEventListener('testdrive:stop', syncTestDriveBtn);

  /* ---------------- ações CRUD ---------------- */
  function onSubmit(e) {
    e.preventDefault();
    var data = readForm();
    if (!data.modelo) { toast('Informe o modelo', 'warn'); return; }
    var id = $('#f-id').value;
    if (id) API.update(id, data).then(function () { toast('#' + id + ' atualizado via PUT', 'ok'); closeEdit(); });
    else API.create(data).then(function (c) { toast('#' + c.id + ' criado via POST', 'ok'); closeEdit(); });
  }
  function onPatch() {
    var id = $('#f-id').value;
    if (!id) return;
    API.patch(id, { preco: Number($('#f-preco').value), potenciaCv: Number($('#f-cv').value) })
      .then(function () { toast('#' + id + ' atualizado via PATCH', 'ok'); });
  }
  function createRandom() {
    return API.create(Mock.randomVehicle()).then(function (c) {
      toast('#' + c.id + ' ' + c.marca + ' ' + c.modelo + ' criado via POST', 'ok'); return c;
    });
  }
  function requestDelete(id) {
    var v = vehById(id);
    askConfirm('Remover ' + (v ? v.marca + ' ' + v.modelo : '#' + id) + ' ?\nDELETE /vehicles/' + id).then(function (ok) {
      if (!ok) return;
      API.remove(id).then(function () {
        toast('#' + id + ' removido via DELETE', 'ok');
        if (sameId($('#f-id').value, id)) closeEdit();
      });
    });
  }
  function seed() {
    var jobs = [];
    for (var i = 0; i < 6; i++) jobs.push(API.create(Mock.randomVehicle()));
    Promise.all(jobs).then(function () { toast('6 veículos adicionados (6x POST)', 'ok'); });
  }
  function clearAll() {
    if (!current.length) return;
    askConfirm('Remover TODOS os ' + current.length + ' veículos?\n(DELETE em lote)').then(function (ok) {
      if (!ok) return;
      current.reduce(function (p, v) { return p.then(function () { return API.remove(v.id); }); }, Promise.resolve())
        .then(function () { toast('Garagem esvaziada', 'ok'); closeEdit(); });
    });
  }

  /* ---------------- lista ---------------- */
  function renderList(list) {
    current = list;
    $('#count-chip').textContent = list.length;
    var m = API.meta();
    $('#meta-line').textContent = m
      ? 'LocalStorage: ' + m.count + ' itens · ' + new Date(m.savedAt).toLocaleTimeString('pt-BR')
      : 'LocalStorage: vazio';
    var ul = $('#veh-list');
    if (!list.length) { ul.innerHTML = '<li class="empty">Garagem vazia — use “Popular garagem”.</li>'; return; }
    ul.innerHTML = list.map(function (v) {
      var cat = v.categoria || Catalog.categoriaDe(v.marca, v.modelo);
      return '<li data-id="' + v.id + '" class="' + (sameId(v.id, selectedId) ? 'sel' : '') + '">' +
        '<span class="sw" style="background:' + v.cor + '"></span>' +
        '<div class="li-main"><strong>' + v.marca + ' ' + v.modelo + ' <em class="cat">' + cat + '</em></strong>' +
        '<small>' + v.ano + ' · ' + brl(v.preco) + ' · ' + v.potenciaCv + ' cv · ' + v.placa + (v._local ? ' · <i>local</i>' : '') + '</small></div>' +
        '<button class="mini" data-edit="' + v.id + '" title="Selecionar">&#9998;</button>' +
        '<button class="mini danger" data-del="' + v.id + '" title="Excluir">&#128465;</button></li>';
    }).join('');
  }

  /* ---------------- log ---------------- */
  function pushLog(d) {
    var log = $('#req-log');
    var row = document.createElement('div');
    row.className = 'lg';
    var body = d.body ? ' <em>' + JSON.stringify(d.body).slice(0, 60) + '</em>' : '';
    row.innerHTML = '<span class="m ' + d.method + '">' + d.method + '</span> ' + d.path + body;
    log.prepend(row);
    while (log.children.length > 40) log.removeChild(log.lastChild);
  }

  /* ---------------- badges / modo ---------------- */
  function setNet(v) {
    var b = $('#net-badge');
    if (v === null) { b.textContent = 'verificando…'; b.className = 'badge off'; return; }
    b.textContent = v ? 'API on-line (:3001)' : 'off-line (LocalStorage)';
    b.className = 'badge ' + (v ? 'on' : 'warn');
  }

  function setupMode() {
    document.body.classList.add(preview ? 'mode-preview' : 'mode-ar');
    $('#mode-chip').textContent = preview ? 'SHOWROOM' : 'AR';
    var btn = $('#btn-mode');
    btn.textContent = preview ? 'Modo AR' : 'Showroom';
    btn.onclick = function () { location.href = preview ? './' : './?preview=1'; };
    $('#btn-marker').onclick = function () { window.open('marcador.html', '_blank', 'noopener'); };
    $('#panel-toggle').onclick = function () { panel.classList.toggle('open'); };
    var cam = $('#btn-cam');
    if (cam) cam.onclick = function () {
      var off = document.body.classList.toggle('hide-cam');
      cam.textContent = off ? 'Com câmera' : 'Sem câmera';
      var mh = $('#marker-hint'); if (mh && off) mh.classList.add('hidden');
      if (window.__fitAR) setTimeout(window.__fitAR, 30);
    };
    var grip = document.querySelector('.panel-grip');
    if (grip) grip.onclick = function () { panel.classList.toggle('open'); };
    if ($('#dock-panel')) $('#dock-panel').onclick = function () { panel.classList.toggle('open'); };
    if ($('#dock-new')) $('#dock-new').onclick = function () { openEdit(null); panel.classList.add('open'); };
    if ($('#dock-seed')) $('#dock-seed').onclick = seed;

    // Estado inicial do painel:
    //  - desktop AR: sempre visível (é a tela de demonstração do CRUD)
    //  - mobile (AR ou Showroom): recolhido, abre no botão ☰
    //  - desktop Showroom: recolhido, abre ao selecionar um veículo
    if (!preview && !isMobile()) panel.classList.add('open');
    else panel.classList.remove('open');
  }

  /* ---------------- wiring ---------------- */
  form.addEventListener('submit', onSubmit);
  $('#f-patch').addEventListener('click', onPatch);
  $('#f-testdrive').addEventListener('click', onTestDrive);
  $('#f-cancel').addEventListener('click', function () { closeEdit(); });
  $('#f-close').addEventListener('click', function () { closeEdit(); });
  $('#act-new').addEventListener('click', function () { openEdit(null); });
  $('#act-seed').addEventListener('click', seed);
  $('#act-random').addEventListener('click', createRandom);
  $('#act-reload').addEventListener('click', function () { window.Scene.refresh(); toast('Recarregado via GET', 'ok'); });
  $('#act-clear').addEventListener('click', clearAll);
  $('#log-clear').addEventListener('click', function () { $('#req-log').innerHTML = ''; });
  $('#f-modelo').addEventListener('blur', function () {
    var cat = Catalog.categoriaDe($('#f-marca').value, $('#f-modelo').value.trim());
    if ($('#f-modelo').value.trim()) $('#f-categoria').value = cat;
  });

  $('#veh-list').addEventListener('click', function (e) {
    var editBtn = e.target.closest('[data-edit]');
    var delBtn = e.target.closest('[data-del]');
    var li = e.target.closest('li[data-id]');
    if (delBtn) { requestDelete(delBtn.getAttribute('data-del')); return; }
    if (editBtn || li) {
      var id = (editBtn && editBtn.getAttribute('data-edit')) || li.getAttribute('data-id');
      var v = vehById(id);
      if (v) {
        selectedId = id;
        renderList(current);
        openEdit(v);
        document.dispatchEvent(new CustomEvent('external:select', { detail: id }));
      }
    }
  });

  document.addEventListener('api:change', function (e) {
    if (e.detail && e.detail.list) renderList(e.detail.list); else API.list().then(renderList);
    setNet(API.online);
  });
  document.addEventListener('api:status', function (e) { setNet(e.detail.online); });
  document.addEventListener('api:log', function (e) { pushLog(e.detail); });

  /* seleção feita clicando num veículo na cena */
  document.addEventListener('vehicle:selected', function (e) {
    selectedId = e.detail;
    renderList(current);
    if (selectedId == null) { closeEdit(true); return; }
    var v = vehById(selectedId);
    if (v) openEdit(v);
    var row = document.querySelector('#veh-list li[data-id="' + selectedId + '"]');
    if (row) row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });

  /* ---------------- init ---------------- */
  fillSelects();
  fillForm(null);
  editCard.hidden = true;
  setNet(null);
  setupMode();
  API.list().then(function (l) { renderList(l); setNet(API.online); });

  window.UI = { toast: toast, createRandom: createRandom, requestDelete: requestDelete };
})();
