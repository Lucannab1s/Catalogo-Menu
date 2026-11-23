/* =====================================================================
   BACKEND DEL CATALOGO
   Ogni stile ha il suo menù, salvato in data/<stile>.json.
   La prima volta il menù di uno stile è una copia di js/menu.js.

   Avvio:      node server/server.js        (oppure: npm start)
   Sito:       http://localhost:3000
   Gestione:   http://localhost:3000/admin/

   Password e porta si impostano con le variabili d'ambiente
   ADMIN_PASSWORD e PORT. Senza ADMIN_PASSWORD la password è "cambiami".
   ===================================================================== */
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const UPLOADS = path.join(ROOT, 'assets', 'caricate');
const PORT = Number(process.env.PORT) || 3000;
const PASSWORD = process.env.ADMIN_PASSWORD || 'cambiami';
const MAX_BODY = 8 * 1024 * 1024; // le foto arrivano in base64 dentro il JSON
const MAX_FOTO = 5 * 1024 * 1024;

/* ---------- menù di partenza e stili, letti da js/menu.js ---------- */
function loadDefaults() {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'js', 'menu.js'), 'utf8'), sandbox);
  return { menu: sandbox.window.MENU, stili: sandbox.window.STILI.map((s) => s.id) };
}
const DEFAULTS = loadDefaults();
const isStile = (id) => DEFAULTS.stili.includes(id);

/* ---------- archivio: un file JSON per stile ---------- */
const file = (stile) => path.join(DATA, stile + '.json');
async function readMenu(stile) {
  try { return JSON.parse(await fsp.readFile(file(stile), 'utf8')); } catch (e) {
    if (e.code !== 'ENOENT') throw e;
    return structuredClone(DEFAULTS.menu);
  }
}
// scrittura in un file temporaneo e poi rinomina: un file a metà non resta mai
const queues = new Map();
function writeMenu(stile, menu) {
  const prev = queues.get(stile) || Promise.resolve();
  const next = prev.then(async () => {
    await fsp.mkdir(DATA, { recursive: true });
    const tmp = file(stile) + '.tmp';
    await fsp.writeFile(tmp, JSON.stringify(menu, null, 2));
    await fsp.rename(tmp, file(stile));
  });
  queues.set(stile, next.catch(() => {}));
  return next;
}
// le modifiche allo stesso stile passano una alla volta
const locks = new Map();
function withMenu(stile, fn) {
  const prev = locks.get(stile) || Promise.resolve();
  const run = prev.then(async () => { const menu = await readMenu(stile); const out = await fn(menu); await writeMenu(stile, menu); return out; });
  locks.set(stile, run.catch(() => {}));
  return run;
}

/* il menù pubblico: senza piatti nascosti e senza portate rimaste vuote */
function publicMenu(menu) {
  const m = structuredClone(menu);
  m.categorie = m.categorie
    .map((c) => Object.assign(c, { piatti: c.piatti.filter((p) => !p.nascosto).map(({ nascosto, ...p }) => p) }))
    .filter((c) => c.piatti.length);
  return m;
}
const visibleCount = (menu) => menu.categorie.reduce((n, c) => n + c.piatti.filter((p) => !p.nascosto).length, 0);
const findDish = (menu, id) => {
  for (const c of menu.categorie) { const i = c.piatti.findIndex((p) => p.id === id); if (i >= 0) return { c, i, p: c.piatti[i] }; }
  return null;
};

/* ---------- utilità HTTP ---------- */
class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const send = (res, status, body, type) => {
  res.writeHead(status, { 'Content-Type': type || 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
};
async function readJson(req) {
  let size = 0; const chunks = [];
  for await (const ch of req) { size += ch.length; if (size > MAX_BODY) throw new HttpError(413, 'Richiesta troppo grande.'); chunks.push(ch); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch (e) { throw new HttpError(400, 'JSON non valido.'); }
}
/* ---------- accesso: password, poi un cookie di sessione valido 12 ore ---------- */
const SESSION_MS = 12 * 60 * 60 * 1000;
const sessions = new Map(); // token -> scadenza
const failures = new Map(); // ip -> { n, until }
const samePassword = (p) => {
  const a = crypto.createHash('sha256').update(String(p)).digest(), b = crypto.createHash('sha256').update(PASSWORD).digest();
  return crypto.timingSafeEqual(a, b);
};
const cookieToken = (req) => (/(?:^|;\s*)sessione=([a-f0-9]{64})/.exec(req.headers.cookie || '') || [])[1];
function authorized(req) {
  const t = cookieToken(req), exp = t && sessions.get(t);
  if (!exp) return false;
  if (exp < Date.now()) { sessions.delete(t); return false; }
  return true;
}
function requireAuth(req, res) {
  if (authorized(req)) return true;
  send(res, 401, { errore: 'Accesso scaduto o mancante.' });
  return false;
}
async function login(req, res) {
  const ip = req.socket.remoteAddress, f = failures.get(ip);
  if (f && f.n >= 5 && f.until > Date.now()) throw new HttpError(429, 'Troppi tentativi. Riprova tra qualche minuto.');
  const b = await readJson(req);
  if (!samePassword(b.password || '')) {
    const n = f && f.until > Date.now() ? f.n + 1 : 1;
    failures.set(ip, { n, until: Date.now() + 10 * 60 * 1000 });
    throw new HttpError(401, 'Password sbagliata.');
  }
  failures.delete(ip);
  const t = crypto.randomBytes(32).toString('hex');
  sessions.set(t, Date.now() + SESSION_MS);
  res.setHeader('Set-Cookie', 'sessione=' + t + '; HttpOnly; SameSite=Strict; Path=/; Max-Age=' + SESSION_MS / 1000);
  send(res, 200, { ok: true });
}
function logout(req, res) {
  const t = cookieToken(req); if (t) sessions.delete(t);
  res.setHeader('Set-Cookie', 'sessione=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
  send(res, 200, { ok: true });
}

/* ---------- validazione di un piatto nuovo ---------- */
const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'piatto';
const text = (v, max, label) => {
  const s = typeof v === 'string' ? v.trim() : '';
  if (!s) throw new HttpError(400, 'Manca ' + label + '.');
  if (s.length > max) throw new HttpError(400, label[0].toUpperCase() + label.slice(1) + ' troppo lungo (massimo ' + max + ' caratteri).');
  return s;
};
async function existingPhotos() {
  const list = [];
  for (const [dir, prefix] of [[path.join(ROOT, 'assets'), ''], [UPLOADS, 'caricate/']]) {
    let names = [];
    try { names = await fsp.readdir(dir, { withFileTypes: true }); } catch (e) { continue; }
    for (const d of names) if (d.isFile() && /\.(jpe?g|png|webp)$/i.test(d.name)) list.push(prefix + d.name);
  }
  return list.sort();
}
async function savePhoto(dataUrl, base) {
  const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl || '');
  if (!m) throw new HttpError(400, 'La foto deve essere un JPG, PNG o WebP.');
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > MAX_FOTO) throw new HttpError(400, 'La foto supera 5 MB.');
  const ext = m[1] === 'jpeg' ? 'jpg' : m[1];
  const name = base + '-' + crypto.randomBytes(4).toString('hex') + '.' + ext;
  await fsp.mkdir(UPLOADS, { recursive: true });
  await fsp.writeFile(path.join(UPLOADS, name), buf);
  return 'caricate/' + name;
}
async function removeUploadIfUnused(foto) {
  if (!foto || !foto.startsWith('caricate/')) return;
  for (const s of DEFAULTS.stili) { const m = await readMenu(s); if (m.categorie.some((c) => c.piatti.some((p) => p.foto === foto))) return; }
  await fsp.rm(path.join(UPLOADS, path.basename(foto)), { force: true });
}

/* ---------- API ---------- */
async function api(req, res, url) {
  const parts = url.pathname.split('/').filter(Boolean); // ['api', ...]
  const stile = url.searchParams.get('stile');

  // menù pubblico, caricato da ogni pagina di stile come <script>
  if (req.method === 'GET' && parts[1] === 'menu.js') {
    if (!isStile(stile)) return send(res, 404, '/* stile sconosciuto */', 'text/javascript; charset=utf-8');
    const m = publicMenu(await readMenu(stile));
    return send(res, 200, 'window.MENU = ' + JSON.stringify(m).replace(/</g, '\\u003c') + ';\n', 'text/javascript; charset=utf-8');
  }

  if (req.method === 'POST' && parts[1] === 'login') return login(req, res);
  if (req.method === 'POST' && parts[1] === 'logout') return logout(req, res);
  if (parts[1] !== 'admin') throw new HttpError(404, 'Non trovato.');
  if (!requireAuth(req, res)) return;

  if (req.method === 'GET' && parts[2] === 'stili') return send(res, 200, DEFAULTS.stili);
  if (req.method === 'GET' && parts[2] === 'foto') return send(res, 200, await existingPhotos());
  if (!isStile(stile)) throw new HttpError(400, 'Stile sconosciuto.');

  if (req.method === 'GET' && parts[2] === 'menu') return send(res, 200, await readMenu(stile));

  if (parts[2] !== 'piatti') throw new HttpError(404, 'Non trovato.');

  // aggiungere
  if (req.method === 'POST' && parts.length === 3) {
    const b = await readJson(req);
    const nome = text(b.nome, 80, 'il nome');
    const desc = text(b.desc, 300, 'la descrizione');
    const prezzo = Number(b.prezzo);
    if (!Number.isFinite(prezzo) || prezzo < 0 || prezzo > 10000) throw new HttpError(400, 'Prezzo non valido.');
    const tag = ['v', 'gf'].filter((t) => Array.isArray(b.tag) && b.tag.includes(t));
    let foto;
    if (b.fotoData) foto = await savePhoto(b.fotoData, slug(nome));
    else {
      if (!(await existingPhotos()).includes(b.foto)) throw new HttpError(400, 'Scegli una foto o caricane una.');
      foto = b.foto;
    }
    const piatto = await withMenu(stile, (menu) => {
      const cat = menu.categorie.find((c) => c.id === b.cat);
      if (!cat) throw new HttpError(400, 'Portata sconosciuta.');
      const ids = new Set(menu.categorie.flatMap((c) => c.piatti.map((p) => p.id)));
      let id = slug(nome), n = 2;
      while (ids.has(id)) id = slug(nome) + '-' + n++;
      const p = { id, nome, desc, prezzo: Math.round(prezzo * 100) / 100, foto, tag };
      if (b.nascosto) p.nascosto = true;
      cat.piatti.push(p);
      return p;
    });
    return send(res, 201, piatto);
  }

  const id = decodeURIComponent(parts[3] || '');

  // nascondere o mostrare
  if (req.method === 'PATCH' && parts.length === 4) {
    const b = await readJson(req);
    if (typeof b.nascosto !== 'boolean') throw new HttpError(400, 'Indica "nascosto": true o false.');
    const piatto = await withMenu(stile, (menu) => {
      const f = findDish(menu, id);
      if (!f) throw new HttpError(404, 'Piatto non trovato.');
      if (b.nascosto && !f.p.nascosto && visibleCount(menu) <= 1) throw new HttpError(409, 'Il menù deve avere almeno un piatto visibile.');
      if (b.nascosto) f.p.nascosto = true; else delete f.p.nascosto;
      return f.p;
    });
    return send(res, 200, piatto);
  }

  // rimuovere
  if (req.method === 'DELETE' && parts.length === 4) {
    const removed = await withMenu(stile, (menu) => {
      const f = findDish(menu, id);
      if (!f) throw new HttpError(404, 'Piatto non trovato.');
      if (!f.p.nascosto && visibleCount(menu) <= 1) throw new HttpError(409, 'Il menù deve avere almeno un piatto visibile.');
      return f.c.piatti.splice(f.i, 1)[0];
    });
    await removeUploadIfUnused(removed.foto);
    return send(res, 200, { ok: true });
  }

  // tornare al menù di partenza (js/menu.js)
  if (req.method === 'POST' && parts[3] === 'ripristina') {
    await withMenu(stile, (menu) => { menu.categorie = structuredClone(DEFAULTS.menu.categorie); });
    return send(res, 200, { ok: true });
  }

  throw new HttpError(405, 'Operazione non permessa.');
}

/* ---------- file statici ---------- */
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const BLOCKED = ['data', 'server', '.taste-skill', 'node_modules', '.git'];
async function serveStatic(req, res, url) {
  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const full = path.resolve(ROOT, '.' + rel);
  const top = path.relative(ROOT, full).split(path.sep)[0];
  if (!full.startsWith(ROOT + path.sep) || BLOCKED.includes(top)) throw new HttpError(404, 'Non trovato.');
  let stat;
  try { stat = await fsp.stat(full); } catch (e) { throw new HttpError(404, 'Non trovato.'); }
  if (stat.isDirectory()) { res.writeHead(301, { Location: url.pathname + '/' }); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(full).toLowerCase()] || 'application/octet-stream', 'Content-Length': stat.size, 'Cache-Control': 'no-cache' });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(full).pipe(res);
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname.startsWith('/api/')) await api(req, res, url);
    else if (req.method === 'GET' || req.method === 'HEAD') await serveStatic(req, res, url);
    else throw new HttpError(405, 'Operazione non permessa.');
  } catch (e) {
    if (!(e instanceof HttpError)) console.error(e);
    if (!res.headersSent) send(res, e.status || 500, { errore: e instanceof HttpError ? e.message : 'Errore del server.' });
    else res.end();
  }
}).listen(PORT, () => {
  console.log('Catalogo:  http://localhost:' + PORT);
  console.log('Gestione:  http://localhost:' + PORT + '/admin/');
  if (!process.env.ADMIN_PASSWORD) console.warn('Attenzione: password di gestione predefinita "cambiami". Impostala con ADMIN_PASSWORD.');
});
