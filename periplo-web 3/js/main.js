// Periplo Ediciones – interacciones mínimas
(function () {
  'use strict';

  // Cantidad en la ficha de producto
  var out = document.getElementById('cant');
  document.querySelectorAll('[data-q]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var n = Math.max(1, (parseInt(out.textContent, 10) || 1) + parseInt(btn.dataset.q, 10));
      out.textContent = n;
    });
  });

  // Miniaturas del producto: cambian la imagen principal (click de nuevo vuelve a la portada interior)
  var visor = document.getElementById('visor');
  if (visor) {
    var original = visor.getAttribute('src');
    document.querySelectorAll('.thumb').forEach(function (t) {
      t.addEventListener('click', function () {
        var activa = t.getAttribute('aria-pressed') === 'true';
        document.querySelectorAll('.thumb').forEach(function (x) { x.removeAttribute('aria-pressed'); });
        if (activa) { visor.src = original; return; }
        t.setAttribute('aria-pressed', 'true');
        visor.src = t.dataset.full;
      });
    });
  }

  // Filtros del catálogo (de momento solo marcan la colección elegida)
  document.querySelectorAll('[data-filter]').forEach(function (f) {
    f.addEventListener('click', function (e) {
      e.preventDefault();
      document.querySelectorAll('[data-filter]').forEach(function (x) { x.removeAttribute('aria-pressed'); });
      f.setAttribute('aria-pressed', 'true');
    });
  });


  // ---------------------------------------------------------------- Carrito
  var KEY = 'periplo-cart';
  var mem = [];
  function load() {
    try { var v = JSON.parse(window.sessionStorage.getItem(KEY)); if (Array.isArray(v)) { return v; } } catch (e) { /* sin storage */ }
    return mem;
  }
  function save(items) {
    mem = items;
    try { window.sessionStorage.setItem(KEY, JSON.stringify(items)); } catch (e) { /* sin storage: queda en memoria */ }
  }
  var money = function (n) { return '$' + Math.round(n).toLocaleString('es-AR'); };
  var FREE = 65000;

  var cartBtn = document.querySelector('.hdr__cart');
  var badge = document.querySelector('.hdr__badge');
  var drawer = document.getElementById('cart');
  var overlay = document.querySelector('.cart-ov');
  var lastFocus = null;

  function render() {
    var items = load();
    var count = items.reduce(function (a, i) { return a + i.qty; }, 0);
    var sum = items.reduce(function (a, i) { return a + i.qty * i.price; }, 0);
    if (badge) { badge.textContent = count > 99 ? '99+' : count; badge.hidden = count === 0; }
    if (cartBtn) { cartBtn.setAttribute('aria-label', count ? 'Carrito, ' + count + (count === 1 ? ' producto' : ' productos') : 'Carrito'); }
    if (!drawer) { return; }
    drawer.classList.toggle('cart--empty', items.length === 0);
    var list = drawer.querySelector('.cart__list');
    list.textContent = '';
    items.forEach(function (it) {
      var li = document.createElement('li'); li.className = 'cart__item';
      var img = document.createElement('img'); img.src = it.img; img.alt = '';
      var box = document.createElement('div');
      var nm = document.createElement('p'); nm.className = 'cart__name'; nm.textContent = it.name;
      var pr = document.createElement('p'); pr.className = 'cart__price'; pr.textContent = money(it.price * it.qty);
      var row = document.createElement('div'); row.className = 'cart__row';
      var q = document.createElement('div'); q.className = 'cart__qty';
      var minus = document.createElement('button'); minus.type = 'button'; minus.textContent = '-'; minus.setAttribute('aria-label', 'Menos');
      var out = document.createElement('output'); out.textContent = it.qty;
      var plus = document.createElement('button'); plus.type = 'button'; plus.textContent = '+'; plus.setAttribute('aria-label', 'Más');
      q.appendChild(minus); q.appendChild(out); q.appendChild(plus);
      var rm = document.createElement('button'); rm.type = 'button'; rm.className = 'cart__rm'; rm.textContent = 'Quitar';
      minus.addEventListener('click', function () { change(it.id, -1); });
      plus.addEventListener('click', function () { change(it.id, 1); });
      rm.addEventListener('click', function () { save(load().filter(function (x) { return x.id !== it.id; })); render(); });
      row.appendChild(q); row.appendChild(rm);
      box.appendChild(nm); box.appendChild(pr); box.appendChild(row);
      li.appendChild(img); li.appendChild(box); list.appendChild(li);
    });
    drawer.querySelector('.cart__sum').textContent = money(sum);
    drawer.querySelector('.cart__ship').textContent = sum >= FREE ? '¡Tenés envío gratis!' : 'Te faltan ' + money(FREE - sum) + ' para el envío gratis.';
  }
  function change(id, d) {
    var items = load();
    items.forEach(function (i) { if (i.id === id) { i.qty = Math.max(1, i.qty + d); } });
    save(items); render();
  }
  function open() {
    lastFocus = document.activeElement;
    render();
    overlay.hidden = false;
    requestAnimationFrame(function () { overlay.classList.add('on'); drawer.classList.add('on'); });
    drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('cart-open');
    drawer.focus();
  }
  function close() {
    overlay.classList.remove('on'); drawer.classList.remove('on');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('cart-open');
    setTimeout(function () { overlay.hidden = true; }, 300);
    if (lastFocus && lastFocus.focus) { lastFocus.focus(); }
  }
  if (cartBtn && drawer) {
    cartBtn.addEventListener('click', open);
    overlay.addEventListener('click', close);
    drawer.querySelector('.cart__x').addEventListener('click', close);
    drawer.querySelector('.cart__clear').addEventListener('click', function () { save([]); render(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && drawer.classList.contains('on')) { close(); } });
  }

  // "Agregar al carrito": suma la cantidad elegida
  document.querySelectorAll('[data-add]').forEach(function (b) {
    b.addEventListener('click', function () {
      var n = out ? Math.max(1, parseInt(out.textContent, 10) || 1) : 1;
      var items = load();
      var found = items.filter(function (i) { return i.id === b.dataset.id; })[0];
      if (found) { found.qty += n; } else { items.push({ id: b.dataset.id, name: b.dataset.name, price: +b.dataset.price, img: b.dataset.img, qty: n }); }
      save(items); render();
      if (cartBtn) { cartBtn.classList.remove('bump'); void cartBtn.offsetWidth; cartBtn.classList.add('bump'); }
      var t = b.querySelector('.pill__t');
      if (t && !b.dataset.busy) {
        b.dataset.busy = '1'; var old = t.textContent; t.textContent = '¡Agregado!';
        setTimeout(function () { t.textContent = old; delete b.dataset.busy; }, 1400);
      }
    });
  });
  render();

  // Formularios: por ahora sin backend, solo confirmación en pantalla
  document.querySelectorAll('form.news, form.cont').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = form.querySelector('button[type=submit]');
      if (btn) { btn.setAttribute('disabled', ''); btn.style.opacity = '.7'; }
    });
  });
})();
