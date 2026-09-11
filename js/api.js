/*
 * api.js — camada de dados do CRUD.
 *
 * Fonte da verdade: JSON Server 0.17.4  (http://localhost:3001/vehicles)
 * Espelho / fallback offline: LocalStorage
 *
 * Verbos HTTP aplicados conforme o conceito de cada ação:
 *   POST   /vehicles       -> Create
 *   GET    /vehicles       -> Read (listar)
 *   GET    /vehicles/:id   -> Read (um)
 *   PUT    /vehicles/:id   -> Update completo
 *   PATCH  /vehicles/:id   -> Update parcial
 *   DELETE /vehicles/:id   -> Delete
 */
(function (global) {
  'use strict';

  var CFG = global.APP_CONFIG;
  var NO_API = !CFG.API_URL;                       // hospedagem estática -> só LocalStorage
  var BASE = (CFG.API_URL || '') + '/' + CFG.RESOURCE;

  var listeners = {};
  var online = null; // null = ainda não testado

  function on(evt, cb) { (listeners[evt] = listeners[evt] || []).push(cb); }
  function emit(evt, detail) {
    (listeners[evt] || []).forEach(function (cb) { try { cb(detail); } catch (e) { console.error(e); } });
    document.dispatchEvent(new CustomEvent('api:' + evt, { detail: detail }));
  }

  /* ---------- LocalStorage (requisito: armazenar os dados do CRUD) ---------- */
  var cache = {
    read: function () {
      try { return JSON.parse(localStorage.getItem(CFG.LS_KEY)) || []; }
      catch (e) { return []; }
    },
    write: function (list) {
      localStorage.setItem(CFG.LS_KEY, JSON.stringify(list));
      localStorage.setItem(CFG.LS_META, JSON.stringify({
        savedAt: new Date().toISOString(),
        count: list.length
      }));
    }
  };
  function meta() { try { return JSON.parse(localStorage.getItem(CFG.LS_META)); } catch (e) { return null; } }

  /* ---------- log visual das requisições ---------- */
  function logReq(method, path, body) {
    var colors = { GET: '#38bdf8', POST: '#22c55e', PUT: '#f59e0b', PATCH: '#eab308', DELETE: '#ef4444' };
    console.log(
      '%c ' + method + ' %c ' + path,
      'background:' + (colors[method] || '#64748b') + ';color:#04121f;font-weight:700;border-radius:4px',
      'color:#94a3b8',
      body || ''
    );
    emit('log', { method: method, path: path, body: body, time: new Date() });
  }

  function setOnline(v) {
    if (v === online) return;
    online = v;
    emit('status', { online: v });
  }

  // 1ª chamada usa timeout curto (detecta rápido "sem API" -> LocalStorage);
  // depois de confirmar online, deixa mais folgado.
  function timeoutMs() { return online === true ? 8000 : 2500; }

  function http(method, path, body) {
    var url = BASE + (path || '');
    logReq(method, '/' + CFG.RESOURCE + (path || ''), body);
    if (NO_API) { setOnline(false); return Promise.reject(new Error('sem API (hospedagem estática)')); }
    var opts = { method: method, cache: 'no-store' };
    if (body !== undefined) {
      opts.headers = { 'Content-Type': 'application/json' };
      opts.body = JSON.stringify(body);
    }
    var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var timer = null;
    if (ctrl) {
      opts.signal = ctrl.signal;
      timer = setTimeout(function () { ctrl.abort(); }, timeoutMs());
    }
    return fetch(url, opts).then(function (res) {
      if (timer) clearTimeout(timer);
      if (!res.ok) throw new Error(method + ' ' + url + ' -> ' + res.status);
      setOnline(true);
      return res.text().then(function (t) { return t ? JSON.parse(t) : null; });
    }, function (err) {
      if (timer) clearTimeout(timer);
      throw err;
    });
  }

  function nextId(list) {
    return list.reduce(function (m, v) { return Math.max(m, Number(v.id) || 0); }, 0) + 1;
  }
  function sameId(a, b) { return String(a) === String(b); }

  /* ---------- READ (GET) ---------- */
  function list() {
    return http('GET', '').then(function (data) {
      cache.write(data);
      return data;
    }).catch(function (err) {
      console.warn('[API] sem conexão com o JSON Server — usando LocalStorage.', err.message);
      setOnline(false);
      return cache.read();
    });
  }

  function get(id) {
    return http('GET', '/' + id).catch(function () {
      setOnline(false);
      return cache.read().find(function (v) { return sameId(v.id, id); }) || null;
    });
  }

  /*
   * Após cada escrita, relista (GET) para manter a lista virtual sincronizada
   * e dispara UM evento 'change' já com os dados novos (evita refetch duplicado
   * nos consumidores: cena AR + painel HTML).
   */
  function commit(payload) {
    return list().then(function (fresh) {
      emit('change', Object.assign({ list: fresh }, payload));
      return payload.item;
    });
  }

  /* ---------- CREATE (POST) ---------- */
  function create(data) {
    return http('POST', '', data).then(function (created) {
      return commit({ type: 'create', item: created });
    }).catch(function () {
      setOnline(false);
      var list0 = cache.read();
      var created = Object.assign({}, data, { id: nextId(list0), _local: true });
      list0.push(created);
      cache.write(list0);
      return commit({ type: 'create', item: created });
    });
  }

  /* ---------- UPDATE completo (PUT) ---------- */
  function update(id, data) {
    var payload = Object.assign({}, data, { id: isNaN(Number(id)) ? id : Number(id) });
    return http('PUT', '/' + id, payload).then(function (updated) {
      return commit({ type: 'update', item: updated });
    }).catch(function () {
      setOnline(false);
      var local = Object.assign({}, payload, { _local: true });
      cache.write(cache.read().map(function (v) { return sameId(v.id, id) ? local : v; }));
      return commit({ type: 'update', item: local });
    });
  }

  /* ---------- UPDATE parcial (PATCH) ---------- */
  function patch(id, partial) {
    return http('PATCH', '/' + id, partial).then(function (updated) {
      return commit({ type: 'patch', item: updated });
    }).catch(function () {
      setOnline(false);
      var local = null;
      cache.write(cache.read().map(function (v) {
        if (!sameId(v.id, id)) return v;
        local = Object.assign({}, v, partial, { _local: true });
        return local;
      }));
      return commit({ type: 'patch', item: local });
    });
  }

  /* ---------- DELETE ---------- */
  function remove(id) {
    return http('DELETE', '/' + id).then(finish).catch(function () {
      setOnline(false);
      return finish();
    });
    function finish() {
      cache.write(cache.read().filter(function (v) { return !sameId(v.id, id); }));
      return commit({ type: 'delete', id: id }).then(function () { return true; });
    }
  }

  global.API = {
    list: list, get: get, create: create, update: update, patch: patch, remove: remove,
    on: on, meta: meta,
    get online() { return online; }
  };
})(window);
