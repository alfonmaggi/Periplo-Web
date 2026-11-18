/* Puntos de venta: mapa interactivo (SVG propio, sin librerías ni servicios externos) + listado filtrable. */
(function () {
  'use strict';
  var M = window.PERIPLO_MAPA, D = window.PERIPLO_PUNTOS;
  var frame = document.getElementById('mapa');
  if (!M || !D || !frame) { return; }

  var NS = 'http://www.w3.org/2000/svg';
  var W = M.W, U = W / 360, S = W / (2 * Math.PI);
  var X = function (lo) { return (lo + 180) * U; };
  var Y = function (la) { return W / 2 - S * Math.log(Math.tan(Math.PI / 4 + la * Math.PI / 360)); };
  var STAR = '<svg class="star" viewBox="0 0 49 54" aria-hidden="true"><path d="M0.3 27.3l2.6.2c11.3 1 20.1 10.1 20.9 21.4l.4 4.8c0 .4.6.4.6 0l.3-4.8c.8-11.3 9.7-20.3 21-21.4l2.6-.2c.4 0 .4-.6 0-.6l-2.6-.2C34.8 25.4 26 16.4 25.2 5.1L24.8.3c0-.4-.6-.4-.6 0l-.3 4.8C23 16.4 14.2 25.4 2.9 26.4l-2.6.2c-.4 0-.4.6 0 .6z" fill="currentColor"/></svg>';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- datos ---------- */
  D.forEach(function (p) { if (p.la !== null) { p.x = X(p.lo); p.y = Y(p.la); } });
  var byId = {}; D.forEach(function (p) { byId[p.i] = p; });
  var norm = function (s) { return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };
  D.forEach(function (p) { p.q = norm([p.n, p.d, p.s, p.c, p.p].join(' ')); });

  /* ---------- svg base ---------- */
  var svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'mapa__svg'); svg.setAttribute('preserveAspectRatio', 'none'); svg.setAttribute('aria-hidden', 'true');
  function path(cls, d) { var e = document.createElementNS(NS, 'path'); e.setAttribute('class', cls); e.setAttribute('d', d); svg.appendChild(e); return e; }
  path('m-base', M.base); path('m-hl', M.hl); path('m-arg', M.arg);
  var grid = path('m-grid', '');
  frame.insertBefore(svg, frame.firstChild);
  var pinsEl = frame.querySelector('.mapa__pins');

  /* ---------- vista ---------- */
  var fw = 880, fh = 760;
  var PRE = {
    mundo: { cx: X(-54), cy: Y(6), w: 30000 },
    arg: { cx: X(-64), cy: Y(-37), w: 11000 },
    ba: { cx: X(-58.42), cy: Y(-34.66), w: 0.95 * U },
    caba: { cx: X(-58.44), cy: Y(-34.595), w: 0.2 * U }
  };
  var MINW = 0.1 * U, MAXW = 31000;
  var view = { cx: PRE.mundo.cx, cy: PRE.mundo.cy, w: PRE.mundo.w };
  var raf = 0;
  var state = { sel: null, g: 'todos', q: '', zone: null };

  function size() { fw = frame.clientWidth; fh = frame.clientHeight; }
  function apply(v) {
    var h = v.w * fh / fw;
    svg.setAttribute('viewBox', (v.cx - v.w / 2) + ' ' + (v.cy - h / 2) + ' ' + v.w + ' ' + h);
  }
  function drawGrid(v) {
    var h = v.w * fh / fw, steps = [20, 10, 5, 2, 1, .5, .2, .1, .05, .02], deg = v.w / U, st = steps[0], i;
    for (i = 0; i < steps.length; i++) { if (deg / steps[i] >= 6) { st = steps[i]; break; } st = steps[i]; }
    var x0 = (v.cx - v.w / 2) / U - 180, x1 = (v.cx + v.w / 2) / U - 180, d = '', k;
    for (k = Math.ceil(x0 / st); k * st <= x1; k++) { var xx = (k * st + 180) * U; d += 'M' + xx + ' ' + (v.cy - h) + 'V' + (v.cy + h); }
    var la0 = Math.atan(Math.sinh((W / 2 - (v.cy + h / 2)) / S)) * 180 / Math.PI, la1 = Math.atan(Math.sinh((W / 2 - (v.cy - h / 2)) / S)) * 180 / Math.PI;
    for (k = Math.ceil(la0 / st); k * st <= la1 && k < 1e5; k++) { var yy = Y(k * st); d += 'M' + (v.cx - v.w) + ' ' + yy + 'H' + (v.cx + v.w); }
    grid.setAttribute('d', d);
  }

  function visible(p) {
    if (state.g !== 'todos' && p.g !== state.g) { return false; }
    if (state.zone && !state.zone[p.i]) { return false; }
    if (state.q && p.q.indexOf(state.q) < 0) { return false; }
    return true;
  }

  /* ---------- pines ---------- */
  function clusters() {
    var pts = D.filter(function (p) { return p.la !== null && visible(p); }), out = [], k = fw / view.w;
    if (view.w >= 20000) { // vista mundial: un pin por pais
      var by = {};
      pts.forEach(function (p) { (by[p.p] = by[p.p] || []).push(p); });
      Object.keys(by).forEach(function (c) {
        var m = by[c], x, y;
        if (c === 'Argentina') { x = X(-65.5); y = Y(-37); } else { x = m.reduce(function (a, p) { return a + p.x; }, 0) / m.length; y = m.reduce(function (a, p) { return a + p.y; }, 0) / m.length; }
        out.push({ x: x, y: y, m: m, name: c });
      });
      return out;
    }
    pts.forEach(function (p) {
      if (p.i === state.sel) { out.push({ x: p.x, y: p.y, m: [p] }); return; }
      var best = null, bd = 1e9;
      out.forEach(function (c) { if (c.m[0].i === state.sel) { return; } var dx = (c.x - p.x) * k, dy = (c.y - p.y) * k, d = Math.sqrt(dx * dx + dy * dy); if (d < 34 && d < bd) { bd = d; best = c; } });
      if (best) { var n = best.m.length; best.x = (best.x * n + p.x) / (n + 1); best.y = (best.y * n + p.y) / (n + 1); best.m.push(p); } else { out.push({ x: p.x, y: p.y, m: [p] }); }
    });
    return out;
  }
  function renderPins() {
    var h = view.w * fh / fw, k = fw / view.w, html = '';
    pinsEl.textContent = '';
    clusters().forEach(function (c) {
      var px = (c.x - (view.cx - view.w / 2)) * k, py = (c.y - (view.cy - h / 2)) * k;
      if (px < -30 || py < -30 || px > fw + 30 || py > fh + 30) { return; }
      var b = document.createElement('button'); b.type = 'button';
      b.style.left = px + 'px'; b.style.top = py + 'px';
      if (c.m.length > 1 || c.name) {
        b.className = 'pin pin--n'; b.textContent = c.m.length;
        var lab = document.createElement('span'); lab.className = 'pin__l';
        lab.textContent = c.name ? c.name + ' · ' + c.m.length + (c.m.length === 1 ? ' punto' : ' puntos') : c.m.length + ' puntos';
        b.appendChild(lab);
        b.setAttribute('aria-label', lab.textContent);
        if (c.m.length === 1 && c.name) { b.dataset.id = c.m[0].i; }
        b.addEventListener('click', function () { clusterClick(c); });
      } else {
        var p = c.m[0];
        b.className = 'pin' + (state.sel === p.i ? ' is-sel' : ''); b.dataset.id = p.i;
        b.innerHTML = STAR + '<span class="pin__l"></span>'; b.lastChild.textContent = p.n;
        b.setAttribute('aria-label', p.n);
        b.addEventListener('click', function () { select(p.i, true); });
      }
      pinsEl.appendChild(b);
    });
    if (html) { pinsEl.innerHTML = html; }
  }

  function fly(to, done) {
    cancelAnimationFrame(raf);
    to.w = Math.max(MINW, Math.min(MAXW, to.w));
    syncTabs(to);
    if (reduce) { view = to; apply(view); drawGrid(view); renderPins(); return; }
    var from = { cx: view.cx, cy: view.cy, w: view.w }, t0 = null, dur = 750;
    pinsEl.classList.add('is-moving');
    function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
    function tick(ts) {
      if (t0 === null) { t0 = ts; }
      var t = Math.min(1, (ts - t0) / dur), e = ease(t);
      var lw = Math.log(from.w) + (Math.log(to.w) - Math.log(from.w)) * e;
      // el centro se interpola en funcion del zoom para que el movimiento se sienta natural
      var f = (from.w - Math.exp(lw)) / (from.w - to.w || 1); if (!isFinite(f)) { f = e; }
      f = from.w === to.w ? e : Math.max(0, Math.min(1, f));
      view = { cx: from.cx + (to.cx - from.cx) * f, cy: from.cy + (to.cy - from.cy) * f, w: Math.exp(lw) };
      apply(view);
      if (t < 1) { raf = requestAnimationFrame(tick); } else { view = to; apply(view); drawGrid(view); renderPins(); pinsEl.classList.remove('is-moving'); if (done) { done(); } }
    }
    raf = requestAnimationFrame(tick);
  }
  function fit(list, pad) {
    var x0 = 1e12, x1 = -1e12, y0 = 1e12, y1 = -1e12;
    list.forEach(function (p) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); });
    var w = Math.max((x1 - x0) * (pad || 1.5), (y1 - y0) * (pad || 1.5) * fw / fh, MINW);
    return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 - w * (fh / fw) * .05, w: w };
  }
  function clusterClick(c) {
    if (c.name === 'Argentina' && view.w >= 20000) { fly(clone(PRE.arg)); return; }
    if (c.m.length === 1) { select(c.m[0].i, true); return; }
    var z = {}; c.m.forEach(function (p) { z[p.i] = true; });
    var to = fit(c.m, 1.7);
    fly(to, function () { state.zone = z; refreshList(); });
  }
  var clone = function (o) { return { cx: o.cx, cy: o.cy, w: o.w }; };

  /* ---------- tabs y zoom ---------- */
  var tabs = frame.querySelectorAll('.mapa__tabs button');
  function syncTabs(v) {
    Array.prototype.forEach.call(tabs, function (b) {
      var p = PRE[b.dataset.view];
      b.setAttribute('aria-pressed', Math.abs(Math.log(p.w / v.w)) < .02 && Math.abs(p.cx - v.cx) < p.w * .02 ? 'true' : 'false');
    });
  }
  Array.prototype.forEach.call(tabs, function (b) {
    b.addEventListener('click', function () { state.zone = null; refreshList(); fly(clone(PRE[b.dataset.view])); });
  });
  frame.querySelector('.mapa__zoom').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) { return; }
    fly({ cx: view.cx, cy: view.cy, w: view.w * (b.dataset.zoom === 'in' ? .45 : 2.2) });
  });

  /* arrastrar para mover el mapa */
  var drag = null;
  frame.addEventListener('pointerdown', function (e) {
    if (e.target.closest('button, a, aside')) { return; }
    cancelAnimationFrame(raf); drag = { x: e.clientX, y: e.clientY, cx: view.cx, cy: view.cy, k: view.w / frame.getBoundingClientRect().width, moved: false };
    frame.setPointerCapture(e.pointerId);
  });
  frame.addEventListener('pointermove', function (e) {
    if (!drag) { return; }
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 4) { return; }
    drag.moved = true; frame.classList.add('is-drag'); pinsEl.classList.add('is-moving');
    view.cx = drag.cx - dx * drag.k; view.cy = drag.cy - dy * drag.k; apply(view);
  });
  function endDrag() { if (!drag) { return; } var m = drag.moved; drag = null; frame.classList.remove('is-drag'); if (m) { drawGrid(view); renderPins(); pinsEl.classList.remove('is-moving'); syncTabs(view); } }
  frame.addEventListener('pointerup', endDrag); frame.addEventListener('pointercancel', endDrag);

  /* ---------- ficha ---------- */
  var card = frame.querySelector('.mapa__card'), cGo = card.querySelector('.mapa__go');
  function showCard(p) {
    card.querySelector('.mapa__sub').textContent = p.g === 'online' ? 'Online' : (p.c && p.c !== p.s ? p.s + ' · ' + p.c : p.s);
    card.querySelector('.mapa__nom').textContent = p.n;
    card.querySelector('.mapa__dir').textContent = p.d;
    card.querySelector('.mapa__nota').textContent = p.nota || '';
    var url = p.u, label = p.cta;
    if (!url && p.la !== null) { url = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(p.n + ', ' + p.d + ', ' + (p.c || '') + ', ' + p.p); label = 'Cómo llegar'; }
    cGo.hidden = !url;
    if (url) { cGo.href = url; cGo.querySelector('.pill__t').textContent = label; if (/^https?:/.test(url)) { cGo.target = '_blank'; } else { cGo.removeAttribute('target'); } }
    card.hidden = false;
  }
  function closeCard() { state.sel = null; card.hidden = true; markSel(); renderPins(); }
  card.querySelector('.mapa__x').addEventListener('click', closeCard);

  function select(id, fromMap) {
    var p = byId[id]; if (!p) { return; }
    state.sel = id; showCard(p); markSel();
    if (p.la !== null) {
      var onScreen = false, k = fw / view.w, h = view.w * fh / fw;
      var px = (p.x - (view.cx - view.w / 2)) * k, py = (p.y - (view.cy - h / 2)) * k;
      var cl = clusters().filter(function (c) { return c.m.indexOf(p) >= 0; })[0];
      onScreen = cl && cl.m.length === 1 && !cl.name && px > 40 && px < fw - 40 && py > 90 && py < fh - 40;
      if (onScreen) { renderPins(); } else {
        var dmin = 1e12;
        D.forEach(function (o) { if (o !== p && o.la !== null && visible(o)) { dmin = Math.min(dmin, Math.hypot(o.x - p.x, o.y - p.y)); } });
        var w = Math.max(MINW, Math.min(dmin * fw / 52, 8 * U));
        fly({ cx: p.x - w * .1, cy: p.y + w * (fh / fw) * .08, w: w });
      }
    } else { renderPins(); }
    if (fromMap) { scrollToItem(id); }
  }

  /* ---------- listado ---------- */
  var lista = document.querySelector('.lista'), body = lista.querySelector('.lista__body');
  var items = Array.prototype.slice.call(body.querySelectorAll('li')), groups = Array.prototype.slice.call(body.querySelectorAll('.lista__g'));
  var cnt = lista.querySelector('.lista__cnt'), zbtn = lista.querySelector('.lista__zona'), vacio = body.querySelector('.lista__vacio');
  function markSel() {
    items.forEach(function (li) { var on = String(state.sel) === li.dataset.id; li.firstChild.classList.toggle('is-sel', on); if (on) { li.firstChild.setAttribute('aria-current', 'true'); } else { li.firstChild.removeAttribute('aria-current'); } });
  }
  function scrollToItem(id) {
    var li = body.querySelector('li[data-id="' + id + '"]'); if (!li || li.hidden) { return; }
    body.scrollTo({ top: li.offsetTop - body.offsetTop - 80, behavior: reduce ? 'auto' : 'smooth' });
  }
  function refreshList() {
    var n = 0;
    items.forEach(function (li) { var ok = visible(byId[li.dataset.id]); li.hidden = !ok; if (ok) { n++; } });
    groups.forEach(function (g) { g.hidden = !g.querySelector('li:not([hidden])'); });
    cnt.textContent = n + (n === 1 ? ' punto' : ' puntos');
    vacio.hidden = n > 0; zbtn.hidden = !state.zone;
    body.scrollTop = 0;
    renderPins();
  }
  items.forEach(function (li) { li.firstChild.addEventListener('click', function () { select(+li.dataset.id, false); frame.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }); }); });
  zbtn.addEventListener('click', function () { state.zone = null; refreshList(); });

  var chips = lista.querySelectorAll('.chip');
  var GVIEW = { todos: 'mundo', exterior: 'mundo', interior: 'arg', gba: 'ba', caba: 'caba' };
  Array.prototype.forEach.call(chips, function (c) {
    c.addEventListener('click', function () {
      state.g = c.dataset.g; state.zone = null;
      Array.prototype.forEach.call(chips, function (o) { o.setAttribute('aria-pressed', o === c ? 'true' : 'false'); });
      refreshList();
      if (GVIEW[state.g]) { fly(clone(PRE[GVIEW[state.g]])); }
    });
  });
  var qIn = lista.querySelector('input'), qT = 0;
  qIn.addEventListener('input', function () { clearTimeout(qT); qT = setTimeout(function () { state.q = norm(qIn.value.trim()); state.zone = null; refreshList(); }, 120); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !card.hidden) { closeCard(); } });

  /* ---------- inicio ---------- */
  var rt = 0;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { size(); apply(view); drawGrid(view); renderPins(); }, 120); });
  size(); apply(view); drawGrid(view); refreshList();
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(function () { size(); apply(view); renderPins(); }); }
})();
