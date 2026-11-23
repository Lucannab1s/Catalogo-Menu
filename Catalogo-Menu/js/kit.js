/* Kit condiviso dagli stili del catalogo.
   - un solo requestAnimationFrame per pagina: le demo si registrano e girano solo quando sono visibili
   - piccole utilità (DOM, prezzi, foto, scroll) e le entrate a cascata
   - la barra del catalogo (precedente, successivo, preferiti) e l'anteprima che scorre da sola */
(function () {
  'use strict';
  const K = (window.K = {});
  const html = document.documentElement;
  const ROOT = html.dataset.root || '.';
  const params = new URLSearchParams(location.search);

  K.preview = params.has('anteprima');
  if (K.preview) html.classList.add('anteprima');
  K.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  K.coarse = matchMedia('(pointer: coarse)').matches;
  K.clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  K.lerp = (a, b, t) => a + (b - a) * t;
  K.ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  K.img = (file) => ROOT + '/assets/' + file;
  K.isPhone = () => innerWidth <= 760;

  const fmt = new Intl.NumberFormat('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const fmt2 = new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  K.euro = (n) => (Number.isInteger(n) ? fmt.format(n) : fmt2.format(n)) + ' €';
  K.euro2 = (n) => fmt2.format(n) + ' €';
  K.tagNames = { v: 'Vegetariano', gf: 'Senza glutine' };
  K.all = () => window.MENU.categorie.flatMap((c) => c.piatti.map((p) => Object.assign({ cat: c }, p)));

  /* h('p', { class: 'x', text: 'ciao' }, figlio, 'testo') */
  K.h = (tag, attrs, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'style') el.style.cssText = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : String(kid));
    return el;
  };
  // le prime sei foto di ogni pagina si caricano subito, le altre quando servono
  let shots = 0;
  K.photo = (p, cls, extra) => K.h('img', Object.assign({ class: cls, src: K.img(p.foto), alt: p.nome + ': ' + p.desc, loading: shots++ < 6 ? 'eager' : 'lazy', decoding: 'async' }, extra || {}));
  K.tags = (p, cls) => p.tag.length ? K.h('p', { class: cls || 'tags' }, p.tag.map((t) => K.h('span', { text: K.tagNames[t] }))) : null;

  /* lettere separate, per animarle una per una (la parola intera resta leggibile agli screen reader) */
  K.split = (el) => {
    const text = el.textContent;
    el.setAttribute('aria-label', text);
    el.textContent = '';
    // le lettere stanno dentro la loro parola (che non si spezza); gli spazi restano veri, così il titolo va a capo solo tra le parole.
    // U+2060 (word joiner) non si vede: tiene ogni lettera "testo" anche per gli strumenti che misurano la pagina
    const letters = [];
    text.split(' ').forEach((word, wi) => {
      if (wi) el.append(' ');
      const w = K.h('span', { 'aria-hidden': 'true', style: 'display:inline-block;white-space:nowrap' });
      for (const ch of word) { const s = K.h('span', { text: ch + '⁠' }); w.append(s); letters.push(s); }
      el.append(w);
    });
    return letters;
  };

  /* ---------- puntatore ---------- */
  K.pointer = { x: innerWidth / 2, y: innerHeight / 2, last: 0 };
  const onPtr = (e) => { K.pointer.x = e.clientX; K.pointer.y = e.clientY; K.pointer.last = performance.now(); };
  addEventListener('pointermove', onPtr, { passive: true });
  addEventListener('pointerdown', onPtr, { passive: true });
  K.recent = (ms) => performance.now() - K.pointer.last < (ms || 2000);

  /* ---------- visibilità e battito ---------- */
  const seen = new WeakMap();
  const io = new IntersectionObserver((es) => { for (const e of es) seen.set(e.target, e.isIntersecting); }, { rootMargin: '120px 0px' });
  K.watch = (el) => { seen.set(el, false); io.observe(el); };
  K.visible = (el) => seen.get(el) === true;
  const tasks = [];
  K.add = (el, fn) => { if (el) K.watch(el); tasks.push({ el, fn }); };
  K.frame = { dt: 1 / 60, time: 0 };
  let prev = performance.now();
  const tick = (now) => {
    K.frame.dt = Math.min(now - prev, 50) / 1000; prev = now;
    K.frame.time += K.frame.dt;
    for (const t of tasks) if (!t.el || K.visible(t.el)) t.fn(K.frame, now);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  /* avanzamento dello scroll dentro un elemento: 0 quando la sua cima tocca lo schermo in alto, 1 alla fine */
  K.progress = (el) => { const r = el.getBoundingClientRect(); return K.clamp(-r.top / Math.max(1, r.height - innerHeight), 0, 1); };

  /* ---------- entrate a cascata ---------- */
  const rise = new IntersectionObserver((es) => {
    for (const e of es) if (e.isIntersecting) { e.target.classList.add('in'); rise.unobserve(e.target); }
  }, { threshold: 0, rootMargin: '0px 0px -4% 0px' });
  K.reveal = (scope) => {
    const counts = new Map();
    (scope || document).querySelectorAll('[data-rise]:not(.in)').forEach((el) => {
      const host = el.parentElement;
      const n = counts.get(host) || 0; counts.set(host, n + 1);
      el.style.setProperty('--d', Math.min(n, 6) * 70 + 'ms');
      rise.observe(el);
    });
  };

  /* ---------- preferiti (restano in questo browser) ---------- */
  const KEY = 'menu-catalogo-preferiti';
  K.fav = {
    get() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } },
    has(id) { return K.fav.get().includes(id); },
    toggle(id) {
      const list = K.fav.get(); const i = list.indexOf(id);
      if (i >= 0) list.splice(i, 1); else list.push(id);
      try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { /* senza memoria: va bene lo stesso */ }
      return i < 0;
    },
  };

  /* ---------- barra del catalogo ---------- */
  K.bar = (id) => {
    if (K.preview) return;
    const list = window.STILI, i = list.findIndex((s) => s.id === id), s = list[i];
    const prev = list[(i - 1 + list.length) % list.length], next = list[(i + 1) % list.length];
    const fav = K.h('button', { class: 'kb__fav', type: 'button', 'aria-pressed': String(K.fav.has(id)) }, 'Mi piace');
    fav.addEventListener('click', () => fav.setAttribute('aria-pressed', String(K.fav.toggle(id))));
    const bar = K.h('nav', { class: 'kb', 'aria-label': 'Catalogo degli stili di menù' },
      K.h('a', { class: 'kb__back', href: ROOT + '/index.html#stile-' + id }, '← Catalogo'),
      K.h('p', { class: 'kb__name' }, K.h('b', { style: 'view-transition-name: titolo-' + id, text: s.nome }), K.h('span', { text: s.tecnica })),
      K.h('a', { class: 'kb__step', href: prev.id + '.html', 'aria-label': 'Stile precedente: ' + prev.nome }, '←', K.h('span', { text: ' Precedente' })),
      K.h('a', { class: 'kb__step', href: next.id + '.html', 'aria-label': 'Stile successivo: ' + next.nome }, K.h('span', { text: 'Successivo ' }), '→'),
      fav);
    const skip = document.querySelector('.skip');
    if (skip) skip.after(bar); else document.body.prepend(bar);
    // la barra si ritira mentre si scende e torna appena si risale (o in fondo alla pagina)
    let lastY = scrollY;
    addEventListener('scroll', () => {
      const y = scrollY, dy = y - lastY; lastY = y;
      const end = y + innerHeight >= document.documentElement.scrollHeight - 80;
      if (Math.abs(dy) < 4 && !end) return;
      bar.classList.toggle('off', dy > 0 && y > 80 && !end && !bar.contains(document.activeElement));
    }, { passive: true });
  };

  /* ---------- anteprima: dentro il catalogo la pagina scorre da sola ---------- */
  if (K.preview) {
    let y = 0, pause = 1.2;
    K.add(null, (f) => {
      if (pause > 0) { pause -= f.dt; return; }
      const max = document.documentElement.scrollHeight - innerHeight;
      y += f.dt * Math.max(90, innerHeight * 0.12);
      if (y >= max) { y = 0; pause = 1.6; }
      scrollTo(0, y);
    });
  }
})();
