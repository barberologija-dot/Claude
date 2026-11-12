// Walk-in queue server for a barbershop. Zero dependencies: `node server.js`.
// Customers take a number from their phone, see how many people are ahead
// and a live ETA, and come back when it's their turn.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const wa = require('./whatsapp');

const PORT = process.env.PORT || 3000;
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data.json');
const PUBLIC = path.join(__dirname, 'public');

// ---------- state ----------
const defaultState = () => ({
  shop: { name: 'Barberologija', open: true, chairs: 2, pin: process.env.BARBER_PIN || '1234' },
  services: [
    { id: 'cut', name: 'Striženje', price: 10, minutes: 20 },
    { id: 'beard', name: 'Brada', price: 5, minutes: 10 },
    { id: 'full', name: 'Striženje + brada', price: 14, minutes: 30 },
  ],
  day: today(),
  nextNumber: 1,
  tickets: [],
  recent: [], // last actual durations, in minutes, used to learn real speed
});

// Calendar day in the shop's time zone (numbers restart at #1 each day).
function today() { return new Date().toLocaleDateString('sv-SE', { timeZone: process.env.TZ_SHOP || 'Europe/Ljubljana' }); }

let state;
try { state = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
catch { state = defaultState(); }

let saveTimer;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => fs.writeFile(DATA_FILE, JSON.stringify(state, null, 2), () => {}), 200);
}

// New day: start numbering from 1 again and drop yesterday's tickets.
function rollDay() {
  if (state.day !== today()) {
    state.day = today();
    state.nextNumber = 1;
    state.tickets = state.tickets.filter(t => t.status === 'waiting' || t.status === 'serving');
    save();
  }
}

// ---------- estimates ----------
const MIN = 60000;
const service = id => state.services.find(s => s.id === id) || state.services[0];

// Ratio of real time to listed time, learned from the last finished cuts.
function speedFactor() {
  const r = state.recent.slice(-20);
  if (r.length < 3) return 1;
  const f = r.reduce((a, x) => a + x.actual / x.expected, 0) / r.length;
  return Math.min(2, Math.max(0.5, f));
}
const expectedMin = t => service(t.serviceId).minutes * speedFactor();

function avgCut() {
  const r = state.recent.slice(-20);
  if (r.length >= 3) return Math.round(r.reduce((a, x) => a + x.actual, 0) / r.length);
  return Math.round(state.services.reduce((a, s) => a + s.minutes, 0) / state.services.length);
}

const waiting = () => state.tickets.filter(t => t.status === 'waiting').sort((a, b) => a.number - b.number);
const serving = () => state.tickets.filter(t => t.status === 'serving');

// Simulate the chairs to estimate when each waiting ticket will start.
function etas() {
  const now = Date.now();
  const chairs = Array(Math.max(1, state.shop.chairs)).fill(0);
  serving().forEach((t, i) => {
    if (i < chairs.length) chairs[i] = Math.max(1, (t.startedAt + expectedMin(t) * MIN - now) / MIN);
  });
  const out = {};
  for (const t of waiting()) {
    let c = 0;
    for (let i = 1; i < chairs.length; i++) if (chairs[i] < chairs[c]) c = i;
    out[t.id] = Math.round(chairs[c]);
    chairs[c] += expectedMin(t);
  }
  out.next = Math.round(Math.min(...chairs)); // wait for someone joining now
  return out;
}

function publicView(token) {
  rollDay();
  const w = waiting();
  const e = etas();
  const view = {
    shop: { name: state.shop.name, open: state.shop.open, chairs: state.shop.chairs },
    services: state.services,
    avgCut: avgCut(),
    serving: serving().map(t => ({ number: t.number, chair: t.chair })),
    waitingCount: w.length,
    queue: w.map(t => ({ number: t.number, eta: e[t.id] })),
    nextWait: e.next,
    whatsapp: wa.enabled,
  };
  if (token) {
    const t = state.tickets.find(x => x.token === token);
    if (t) {
      view.me = {
        number: t.number, name: t.name, status: t.status, chair: t.chair,
        service: service(t.serviceId).name,
        ahead: t.status === 'waiting' ? w.findIndex(x => x.id === t.id) : 0,
        eta: t.status === 'waiting' ? e[t.id] : 0,
        joinedAt: t.joinedAt,
        whatsapp: !!t.waPhone,
        waLink: t.waPhone ? null : wa.waLink(t.code),
      };
    }
  }
  return view;
}

function adminView() {
  const e = etas();
  return {
    ...publicView(),
    shop: state.shop,
    tickets: state.tickets
      .filter(t => t.status === 'waiting' || t.status === 'serving')
      .sort((a, b) => a.number - b.number)
      .map(t => ({ ...t, token: undefined, code: undefined, waPhone: undefined, waSent: undefined, whatsapp: !!t.waPhone, eta: e[t.id], serviceName: service(t.serviceId).name })),
    doneToday: state.tickets.filter(t => t.status === 'done').length,
  };
}

// ---------- actions ----------
function addTicket(name, serviceId, phone) {
  rollDay();
  const t = {
    id: crypto.randomUUID(),
    token: crypto.randomBytes(16).toString('hex'),
    code: newCode(),
    number: state.nextNumber++,
    name: String(name || '').trim().slice(0, 40) || 'Gost',
    serviceId: state.services.some(s => s.id === serviceId) ? serviceId : state.services[0].id,
    phone: !!phone,
    status: 'waiting',
    joinedAt: Date.now(),
  };
  state.tickets.push(t);
  return t;
}

// Short code the customer sends on WhatsApp to link their phone to the ticket.
function newCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c;
  do c = Array.from(crypto.randomBytes(5), b => A[b % A.length]).join('');
  while (state.tickets.some(t => t.code === c));
  return c;
}

function freeChair() {
  const used = new Set(serving().map(t => t.chair));
  for (let c = 1; c <= state.shop.chairs; c++) if (!used.has(c)) return c;
  return null;
}

function finish(t, status) {
  if (t.status === 'serving' && status === 'done') {
    const actual = (Date.now() - t.startedAt) / MIN;
    if (actual > 2 && actual < 120) state.recent.push({ actual, expected: service(t.serviceId).minutes });
    state.recent = state.recent.slice(-50);
  }
  t.status = status;
  t.endedAt = Date.now();
}

// ---------- WhatsApp ----------
// Send each alert once: "head over soon", "nobody ahead", "your turn", "skipped".
function whatsappAlerts() {
  if (!wa.enabled) return;
  const w = waiting(), e = etas();
  for (const t of state.tickets) {
    if (!t.waPhone || !wa.inWindow(t)) continue;
    const sent = t.waSent || (t.waSent = {});
    const once = (key, text) => { if (!sent[key]) { sent[key] = Date.now(); wa.send(t.waPhone, text); } };
    if (t.status === 'serving') { sent.soon ||= 1; sent.next ||= 1; once('turn', wa.T.turn(t)); }
    else if (t.status === 'noshow') once('noshow', wa.T.noshow(t));
    else if (t.status === 'waiting') {
      const ahead = w.indexOf(t), eta = e[t.id];
      if (ahead === 0) { sent.soon ||= 1; once('next', wa.T.next(t)); }
      else if (eta <= wa.cfg.soonMin) once('soon', wa.T.soon(t, ahead, eta));
    }
  }
}

function handleWhatsApp(from, text) {
  rollDay();
  const cmd = text.trim().toUpperCase();
  const code = wa.parseCode(text);
  const active = state.tickets.find(t => t.waPhone === from && (t.status === 'waiting' || t.status === 'serving'));
  const pos = t => { const w = waiting(); return { ahead: Math.max(0, w.indexOf(t)), eta: etas()[t.id] || 0 }; };

  if (code) {
    const t = state.tickets.find(x => x.code === code && (x.status === 'waiting' || x.status === 'serving'));
    if (!t) return wa.send(from, wa.T.unknownCode());
    t.waPhone = from; t.waAt = Date.now(); t.waSent = {};
    const { ahead, eta } = pos(t);
    wa.send(from, wa.T.linked(t, state.shop.name, ahead, eta));
    if (ahead === 0 || t.status === 'serving') t.waSent.soon = t.waSent.next = 1; // already told in the welcome
    else if (eta <= wa.cfg.soonMin) t.waSent.soon = 1;
    return broadcast();
  }
  if (active) active.waAt = Date.now(); // keeps the 24 h reply window open
  if (active && /^(ODJAVA|PREKLI[CČ]I|STOP)\b/.test(cmd)) {
    if (active.status === 'waiting') finish(active, 'cancelled');
    wa.send(from, wa.T.cancelled());
    return broadcast();
  }
  if (active && /^(STANJE|STATUS)\b/.test(cmd)) {
    const { ahead, eta } = pos(active);
    return wa.send(from, wa.T.status(active, ahead, eta));
  }
  wa.send(from, wa.T.help());
}

// ---------- live updates (Server-Sent Events) ----------
const clients = new Set();
function broadcast() {
  save();
  whatsappAlerts();
  for (const res of clients) res.write('data: update\n\n');
}
setInterval(() => { for (const res of clients) res.write(': ping\n\n'); }, 25000);
setInterval(broadcast, 60000); // refresh ETAs (and WhatsApp alerts) each minute

// ---------- http ----------
const json = (res, code, body) => {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
};

function readRaw(req) {
  return new Promise(resolve => {
    const chunks = []; let n = 0;
    req.on('data', c => { n += c.length; if (n > 1e6) req.destroy(); else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
  });
}
async function readBody(req) {
  try { return JSON.parse((await readRaw(req)).toString() || '{}'); } catch { return {}; }
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png' };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;

  if (p === '/events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write('retry: 3000\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  // WhatsApp webhook (set this URL in the Meta developer console)
  if (p === '/webhook/whatsapp') {
    if (req.method === 'GET') {
      const q = url.searchParams;
      if (q.get('hub.mode') === 'subscribe' && q.get('hub.verify_token') === wa.cfg.verifyToken) {
        res.writeHead(200); return res.end(q.get('hub.challenge'));
      }
      res.writeHead(403); return res.end();
    }
    const raw = await readRaw(req);
    if (!wa.validSignature(raw, req.headers['x-hub-signature-256'])) { res.writeHead(401); return res.end(); }
    res.writeHead(200); res.end(); // answer Meta quickly
    let payload; try { payload = JSON.parse(raw.toString()); } catch { return; }
    for (const m of wa.inboundMessages(payload)) handleWhatsApp(m.from, m.text);
    return;
  }

  if (p.startsWith('/api/')) {
    if (req.method === 'GET' && p === '/api/state') return json(res, 200, publicView(url.searchParams.get('token')));

    const body = req.method === 'POST' ? await readBody(req) : {};

    if (p === '/api/join' && req.method === 'POST') {
      if (!state.shop.open) return json(res, 409, { error: 'Brivnica trenutno ne sprejema strank brez naročila.' });
      const t = addTicket(body.name, body.serviceId, true);
      broadcast();
      return json(res, 200, { token: t.token, number: t.number });
    }
    if (p === '/api/cancel' && req.method === 'POST') {
      const t = state.tickets.find(x => x.token === body.token && x.status === 'waiting');
      if (t) { finish(t, 'cancelled'); broadcast(); }
      return json(res, 200, { ok: true });
    }

    // Barber-only endpoints
    if (p.startsWith('/api/admin/')) {
      if (req.headers['x-pin'] !== String(state.shop.pin)) return json(res, 401, { error: 'Napačen PIN' });
      const t = body.id && state.tickets.find(x => x.id === body.id);
      switch (p) {
        case '/api/admin/state': return json(res, 200, adminView());
        case '/api/admin/add': addTicket(body.name, body.serviceId, false); break;
        case '/api/admin/next': {
          const chair = body.chair || freeChair();
          if (!chair) return json(res, 409, { error: 'Vsi stoli so zasedeni. Najprej zaključi striženje.' });
          const cur = serving().find(x => x.chair === chair);
          if (cur) finish(cur, 'done');
          const n = waiting()[0];
          if (!n) return json(res, 409, { error: 'Nihče ne čaka.' });
          n.status = 'serving'; n.chair = chair; n.startedAt = Date.now();
          break;
        }
        case '/api/admin/start':
          if (t && t.status === 'waiting') {
            const chair = body.chair || freeChair();
            if (!chair) return json(res, 409, { error: 'Vsi stoli so zasedeni.' });
            t.status = 'serving'; t.chair = chair; t.startedAt = Date.now();
          }
          break;
        case '/api/admin/done': if (t) finish(t, 'done'); break;
        case '/api/admin/noshow': if (t) finish(t, 'noshow'); break;
        case '/api/admin/remove': if (t) finish(t, 'cancelled'); break;
        case '/api/admin/settings': {
          const s = state.shop;
          if (typeof body.open === 'boolean') s.open = body.open;
          if (body.name) s.name = String(body.name).slice(0, 40);
          if (body.chairs) s.chairs = Math.min(10, Math.max(1, +body.chairs | 0));
          if (body.pin) s.pin = String(body.pin).slice(0, 12);
          if (Array.isArray(body.services) && body.services.length) {
            state.services = body.services.slice(0, 12).map((x, i) => ({
              id: String(x.id || 's' + i).slice(0, 20), name: String(x.name || 'Storitev').slice(0, 30),
              price: +x.price || 0, minutes: Math.max(1, +x.minutes || 15),
            }));
          }
          break;
        }
        case '/api/admin/reset':
          state.tickets = []; state.nextNumber = 1; break;
        default: return json(res, 404, { error: 'Ni najdeno' });
      }
      broadcast();
      return json(res, 200, adminView());
    }
    return json(res, 404, { error: 'Ni najdeno' });
  }

  // Static files
  const routes = { '/': 'index.html', '/barber': 'barber.html', '/tv': 'tv.html' };
  const file = path.join(PUBLIC, routes[p] || p);
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Walk-in queue running:
  Customers : http://localhost:${PORT}/
  Barber    : http://localhost:${PORT}/barber   (PIN ${state.shop.pin})
  Shop TV   : http://localhost:${PORT}/tv
  WhatsApp  : ${wa.enabled ? 'ON, webhook at /webhook/whatsapp' : 'off (set WA_TOKEN, WA_PHONE_ID, WA_NUMBER)'}`);
});
