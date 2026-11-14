// WhatsApp alerts (Meta WhatsApp Cloud API), all messages in Slovenian.
//
// Flow: after taking a number, the customer taps "Obvesti me na WhatsApp".
// WhatsApp opens with a prefilled message containing their ticket code
// (e.g. "#K7QF2"). When they send it, the webhook links their phone to the
// ticket. Because the customer wrote first, we may reply with normal text
// messages for 24 hours, so no Meta template approval is needed.
const crypto = require('crypto');

const cfg = {
  token: process.env.WA_TOKEN,                 // permanent access token
  phoneId: process.env.WA_PHONE_ID,            // "Phone number ID" from Meta
  number: (process.env.WA_NUMBER || '').replace(/\D/g, ''), // shop's WhatsApp number, e.g. 38640123456
  verifyToken: process.env.WA_VERIFY_TOKEN || 'brivnica',   // any string, same as in Meta webhook setup
  appSecret: process.env.WA_APP_SECRET,        // used to check that webhooks really come from Meta
  api: process.env.WA_API_BASE || 'https://graph.facebook.com/v21.0',
  soonMin: +process.env.WA_SOON_MIN || 15,     // "head over now" alert this many minutes before
  publicUrl: (process.env.PUBLIC_URL || '').replace(/\/$/, ''),
};
const enabled = !!(cfg.token && cfg.phoneId && cfg.number);
const TZ = process.env.TZ_SHOP || 'Europe/Ljubljana';

// ---------- Slovenian texts ----------
const time = minutes => new Date(Date.now() + minutes * 60000)
  .toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
const link = () => cfg.publicUrl ? `\n${cfg.publicUrl}/` : '';

const T = {
  prefill: code => `Obvesti me, ko pridem na vrsto. Koda: #${code}`,
  linked: (t, shop, ahead, eta) =>
    `✅ Živjo, ${t.name}! Si v vrsti – *${shop}*.\n\n` +
    `Tvoja številka: *${t.number}*\nPred tabo: *${ahead}*\n` +
    (ahead ? `Na vrsti predvidoma čez ~${eta} min (okoli ${time(eta)}).\n\n` : 'Pridi kar zdaj v brivnico.\n\n') +
    `Ko bo čas, da se odpraviš, ti pišemo tukaj.\n` +
    `Odgovori *STANJE* za trenutno stanje ali *ODJAVA* za izstop iz vrste.`,
  status: (t, ahead, eta) => t.status === 'serving'
    ? `✂️ Na vrsti si – stol ${t.chair}.`
    : `Tvoja številka: *${t.number}*\nPred tabo: *${ahead}*\nNa vrsti predvidoma čez ~${eta} min (okoli ${time(eta)}).`,
  soon: (t, ahead, eta) =>
    `⏰ ${t.name}, kmalu boš na vrsti – čez približno ${eta} min (pred tabo: ${ahead}).\nČas je, da se odpraviš v brivnico.`,
  next: t => `🔔 Pred tabo ni nikogar več! Pridi zdaj v brivnico.\nTvoja številka: *${t.number}*`,
  turn: t => `✂️ Na vrsti si! Pridi na stol ${t.chair}.`,
  noshow: t => `Tvoja številka ${t.number} je bila preskočena, ker te ni bilo v brivnici. Novo številko lahko vzameš tukaj:${link() || ' v brivnici.'}`,
  cancelled: () => `Izstop iz vrste je potrjen. Hvala in se vidimo! 👋`,
  closed: () => `Brivnica trenutno ne sprejema strank brez naročila.`,
  unknownCode: () => `Te kode ne najdemo ali pa je že potekla. Novo številko vzameš tukaj:${link() || ' v brivnici.'}`,
  help: () => `Živjo! 👋 Številko v vrsti vzameš tukaj:${link() || ' v brivnici.'}\n\nČe si že v vrsti, odgovori *STANJE* ali *ODJAVA*.`,
};

// ---------- Cloud API ----------
async function send(to, body) {
  if (!enabled || !to) return false;
  try {
    const r = await fetch(`${cfg.api}/${cfg.phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body, preview_url: true } }),
    });
    if (!r.ok) console.error('WhatsApp send failed:', r.status, await r.text());
    return r.ok;
  } catch (e) {
    console.error('WhatsApp send error:', e.message);
    return false;
  }
}

function validSignature(raw, header) {
  if (!cfg.appSecret) return true;
  const expected = 'sha256=' + crypto.createHmac('sha256', cfg.appSecret).update(raw).digest('hex');
  return typeof header === 'string' && header.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(header), Buffer.from(expected));
}

// Pull plain text messages out of a webhook payload.
function inboundMessages(payload) {
  const out = [];
  for (const e of payload.entry || [])
    for (const c of e.changes || [])
      for (const m of (c.value && c.value.messages) || [])
        out.push({ from: m.from, text: (m.text && m.text.body) || (m.button && m.button.text) || '' });
  return out;
}

const parseCode = text => (String(text).match(/#\s*([A-Z0-9]{5})/i) || [])[1]?.toUpperCase();
const waLink = code => enabled ? `https://wa.me/${cfg.number}?text=${encodeURIComponent(T.prefill(code))}` : null;

// Free-form replies are only allowed within 24 h of the customer's last message.
const inWindow = t => t.waAt && Date.now() - t.waAt < 23.5 * 3600 * 1000;

module.exports = { cfg, enabled, T, send, validSignature, inboundMessages, parseCode, waLink, inWindow };
