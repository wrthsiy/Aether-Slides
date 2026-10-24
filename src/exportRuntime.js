/* Runtime of an exported deck (inlined as a <script>). Plain ES2015, no dependencies.
   Structure expected: #deck.deck > .deck-stage > .deck-canvas > section.slide[data-trs] ; .deck-progress > i
   Keys: ←/→ Space Shift+Space PageUp/PageDown Home End · F fullscreen · O overview · Esc closes the overview · #/N in the URL. */
(function () {
  var W = 1920, H = 1080;
  var deck = document.getElementById('deck');
  var stage = deck.querySelector('.deck-stage');
  var canvas = deck.querySelector('.deck-canvas');
  var slides = Array.prototype.slice.call(canvas.children).filter(function (e) { return e.classList.contains('slide'); });
  var bar = deck.querySelector('.deck-progress > i');
  var live = document.getElementById('live');
  var n = slides.length, cur = 0, ov = null, ovSel = 0, ovCols = 1;

  function fit() {
    var w = deck.clientWidth, h = deck.clientHeight, s = Math.min(w / W, h / H) || 1;
    stage.style.width = W * s + 'px'; stage.style.height = H * s + 'px';
    canvas.style.transform = 'scale(' + s + ')';
    if (w < 700) canvas.setAttribute('data-narrow', ''); else canvas.removeAttribute('data-narrow');
    if (ov) layoutOv();
  }

  function render() {
    var tr = slides[cur].getAttribute('data-trs') || 'fade';
    slides.forEach(function (s, i) {
      s.setAttribute('data-tr', tr);
      s.classList.toggle('is-before', i < cur);
      s.classList.toggle('is-active', i === cur);
      s.classList.toggle('is-after', i > cur);
      s.setAttribute('aria-hidden', i === cur ? 'false' : 'true');
    });
    bar.style.width = ((cur + 1) / n) * 100 + '%';
    if (live) live.textContent = 'Slide ' + (cur + 1) + ' of ' + n;
    try { history.replaceState(null, '', '#/' + (cur + 1)); } catch (e) { /* file:// in some browsers */ }
  }

  function go(i, instant) {
    i = Math.max(0, Math.min(n - 1, i));
    if (i === cur && !instant) return;
    if (instant) deck.classList.add('no-tr');
    cur = i; render();
    if (instant) { void deck.offsetWidth; deck.classList.remove('no-tr'); }
  }

  function fromHash() {
    var m = /^#\/(\d+)$/.exec(location.hash);
    return m ? Math.min(n, Math.max(1, +m[1])) - 1 : null;
  }

  function fullscreen() {
    var d = document;
    if (d.fullscreenElement || d.webkitFullscreenElement) { (d.exitFullscreen || d.webkitExitFullscreen).call(d); return; }
    var f = deck.requestFullscreen || deck.webkitRequestFullscreen;
    if (f) { try { f.call(deck); } catch (e) { /* unsupported */ } }
  }

  /* ---------- overview ---------- */
  function layoutOv() {
    var avail = Math.max(200, ov.clientWidth - 48);
    ovCols = Math.max(1, Math.min(n, avail > 1500 ? 5 : avail > 1100 ? 4 : avail > 700 ? 3 : avail > 440 ? 2 : 1));
    var w = Math.floor((avail - 16 * (ovCols - 1)) / ovCols);
    ov.style.setProperty('--ov-w', w); ov.style.setProperty('--ov-s', w / W); ov.style.setProperty('--ov-cols', ovCols);
  }
  function selOv(i) {
    ovSel = Math.max(0, Math.min(n - 1, i));
    var th = ov.querySelectorAll('.ov-thumb');
    for (var k = 0; k < th.length; k++) th[k].classList.toggle('sel', k === ovSel);
    if (th[ovSel].scrollIntoView) th[ovSel].scrollIntoView({ block: 'nearest' });
  }
  function closeOv() { if (!ov) return; ov.remove(); ov = null; deck.focus(); }
  function openOv() {
    if (ov) return;
    ov = document.createElement('div');
    ov.className = 'ov'; ov.tabIndex = -1; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Slide overview');
    var hint = document.createElement('p'); hint.className = 'ov-hint'; hint.textContent = 'Arrows move · Enter opens · Esc closes';
    var grid = document.createElement('div'); grid.className = 'ov-grid';
    var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target); fill(e.target);
      });
    }, { root: ov, rootMargin: '300px' }) : null;
    function fill(th) {
      var view = th.firstChild, i = +th.getAttribute('data-i');
      var c = document.createElement('div'); c.className = 'ov-canvas';
      var cl = slides[i].cloneNode(true);
      cl.className = cl.className.replace(/is-(before|after)/g, '') + ' is-active'; cl.setAttribute('data-tr', 'none'); cl.setAttribute('aria-hidden', 'true');
      c.appendChild(cl); view.appendChild(c);
    }
    slides.forEach(function (_s, i) {
      var th = document.createElement('button'); th.type = 'button'; th.className = 'ov-thumb'; th.setAttribute('data-i', i);
      th.setAttribute('aria-label', 'Slide ' + (i + 1));
      var view = document.createElement('div'); view.className = 'ov-view'; th.appendChild(view);
      var num = document.createElement('span'); num.className = 'ov-num'; num.textContent = i + 1; th.appendChild(num);
      th.addEventListener('click', function () { go(i, true); closeOv(); });
      grid.appendChild(th);
      if (io) io.observe(th); else fill(th);
    });
    ov.appendChild(hint); ov.appendChild(grid);
    ['pointerdown', 'pointerup'].forEach(function (t) { ov.addEventListener(t, function (e) { e.stopPropagation(); }); });
    ov.addEventListener('click', function (e) { if (e.target === ov) closeOv(); });
    deck.appendChild(ov); layoutOv(); selOv(cur); ov.focus();
  }

  /* ---------- keys ---------- */
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var k = e.key;
    if (k === 'f' || k === 'F') { e.preventDefault(); fullscreen(); return; }
    if (ov) {
      var to = ovSel;
      if (k === 'ArrowRight') to++; else if (k === 'ArrowLeft') to--; else if (k === 'ArrowDown') to += ovCols; else if (k === 'ArrowUp') to -= ovCols;
      else if (k === 'Home') to = 0; else if (k === 'End') to = n - 1;
      else if (k === 'Enter' || k === ' ') { e.preventDefault(); go(ovSel, true); closeOv(); return; }
      else if (k === 'Escape' || k === 'o' || k === 'O') { e.preventDefault(); closeOv(); return; }
      else return;
      e.preventDefault(); selOv(to); return;
    }
    if (k === 'o' || k === 'O') { e.preventDefault(); openOv(); return; }
    var t = e.target;
    if (k === ' ' && t && t.closest && t.closest('button, a, summary')) return;
    if (k === 'ArrowRight' || k === 'PageDown') go(cur + 1);
    else if (k === 'ArrowLeft' || k === 'PageUp') go(cur - 1);
    else if (k === ' ') go(cur + (e.shiftKey ? -1 : 1));
    else if (k === 'Home') go(0, true);
    else if (k === 'End') go(n - 1, true);
    else return;
    e.preventDefault();
  });

  /* ---------- swipe + click zones (touch/pen: halves; mouse: outer 20% edges only, so text stays selectable) ---------- */
  var g = null;
  deck.addEventListener('pointerdown', function (e) { g = { x: e.clientX, y: e.clientY, t: Date.now() }; });
  deck.addEventListener('pointercancel', function () { g = null; });
  deck.addEventListener('pointerup', function (e) {
    var s = g; g = null;
    if (!s || ov) return;
    var dx = e.clientX - s.x, dy = e.clientY - s.y, dt = Date.now() - s.t;
    var touch = e.pointerType !== 'mouse';
    if (touch && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5 && dt < 800) { go(cur + (dx < 0 ? 1 : -1)); return; }
    if (Math.hypot(dx, dy) >= 10 || dt >= 500) return;
    if (e.target.closest && e.target.closest('a, button, input, summary')) return;
    if (window.getSelection && String(window.getSelection())) return;
    var r = deck.getBoundingClientRect(), x = (e.clientX - r.left) / r.width;
    if (touch) go(cur + (x < 0.5 ? -1 : 1));
    else if (x < 0.2) go(cur - 1); else if (x > 0.8) go(cur + 1);
  });

  // in-page links (footnotes) must not touch the hash that stores the slide number
  deck.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a');
    if (a && (a.getAttribute('href') || '').charAt(0) === '#') e.preventDefault();
  });
  window.addEventListener('hashchange', function () { var i = fromHash(); if (i !== null && i !== cur) go(i); });
  window.addEventListener('resize', fit);
  document.addEventListener('fullscreenchange', fit);

  deck.classList.add('no-tr');
  var h = fromHash(); if (h !== null) cur = h;
  fit(); render();
  void deck.offsetWidth; deck.classList.remove('no-tr');
  deck.focus();
})();
