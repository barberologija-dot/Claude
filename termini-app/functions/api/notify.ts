// Cloudflare Pages Function: POST /api/notify
// Sends the emails that are waiting in the database (booking confirmations).
// It is deployed automatically together with the website.
//
// Settings (Cloudflare dashboard > the Pages project > Settings > Variables and Secrets):
//   SUPABASE_URL               https://<project>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY  secret key from Supabase (never put it in the code)
//   BREVO_API_KEY              API key from Brevo
//   MAIL_FROM                  sender address, e.g. termini@barberologija.si
//   MAIL_FROM_NAME             optional, default "Termini"
//   MAIL_REPLY_TO              optional, where replies should go
//   PUBLIC_URL                 https://termini.barberologija.si
import sl from '../../src/i18n/sl.json';

type Env = Record<string, string | undefined>;
const dictionaries: Record<string, any> = { sl };

function text(locale: string, key: string, vars: Record<string, string> = {}): string {
  const find = (d: any) => key.split('.').reduce((o, k) => (o == null ? o : o[k]), d);
  const v = find(dictionaries[locale]) ?? find(dictionaries.sl) ?? key;
  return String(v).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

function render(m: any, env: Env) {
  const locale = dictionaries[m.locale] ? m.locale : 'sl';
  const tag = locale === 'sl' ? 'sl-SI' : locale;
  const when = new Date(m.starts_at);
  const date = new Intl.DateTimeFormat(tag, { timeZone: m.timezone, weekday: 'long', day: 'numeric', month: 'long' }).format(when);
  const time = new Intl.DateTimeFormat(tag, { timeZone: m.timezone, hour: '2-digit', minute: '2-digit', hour12: false }).format(when);
  const price = new Intl.NumberFormat(tag, { style: 'currency', currency: 'EUR' }).format(Number(m.price));
  const where = [m.location_name, m.address, m.city].filter(Boolean).join(', ');
  const k = `email.${m.kind}`;
  const T = (name: string, vars: Record<string, string> = {}) => text(locale, `${k}.${name}`, vars);
  const link = `${(env.PUBLIC_URL || '').replace(/\/$/, '')}/moji-termini`;
  const rows: [string, string][] = [[T('when'), `${date} ${text(locale, 'common.at')} ${time}`], [T('service'), m.service_name], [T('barber'), m.barber_name], [T('where'), where], [T('price'), price]];
  const footer = T('footer', { phone: m.shop_phone ? ` (${m.shop_phone})` : '' });

  const html = `<!doctype html><html lang="${locale}"><body style="margin:0;background:#eef3ef;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#12261d">
<div style="max-width:480px;margin:0 auto;padding:24px 16px">
  <div style="background:#0f4d36;color:#fff;border-radius:16px 16px 0 0;padding:20px 20px 16px">
    <div style="font-size:13px;color:#5fe0a8;font-weight:700">${esc(m.shop_name)}</div>
    <div style="font-size:22px;font-weight:800;margin-top:4px">${esc(T('title'))}</div>
  </div>
  <div style="background:#fff;border-radius:0 0 16px 16px;padding:20px">
    <p style="margin:0 0 4px">${esc(T('hello', { name: m.customer_name || '' }))}</p>
    <p style="margin:0 0 16px;color:#5f7469">${esc(T('intro', { shop: m.shop_name }))}</p>
    <table style="width:100%;border-collapse:collapse">${rows.map(([a, b]) => `<tr><td style="padding:8px 0;color:#5f7469;border-top:1px solid #d8e3dc;width:90px;vertical-align:top">${esc(a)}</td><td style="padding:8px 0;border-top:1px solid #d8e3dc;font-weight:600">${esc(b)}</td></tr>`).join('')}</table>
    <p style="margin:20px 0 0"><a href="${esc(link)}" style="display:block;text-align:center;background:#0f4d36;color:#fff;text-decoration:none;font-weight:700;padding:14px;border-radius:12px">${esc(T('manage'))}</a></p>
    <p style="margin:16px 0 0;font-size:13px;color:#5f7469">${esc(footer)}</p>
  </div>
</div></body></html>`;
  const plain = [T('hello', { name: m.customer_name || '' }), T('intro', { shop: m.shop_name }), '', ...rows.map(([a, b]) => `${a}: ${b}`), '', `${T('manage')}: ${link}`, '', footer].join('\n');
  return { subject: T('subject', { date, time, shop: m.shop_name }), html, plain };
}

export const onRequestPost = async ({ env }: { env: Env }) => {
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return json({ error: 'not configured' }, 500);
  // Without an email key the messages stay queued and go out once it is set.
  if (!env.BREVO_API_KEY || !env.MAIL_FROM) return json({ sent: 0, skipped: 'email not configured' });

  const rpc = (fn: string, body: unknown) => fetch(`${env.SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY!, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const claimed = await rpc('claim_outbox', { p_limit: 20 });
  if (!claimed.ok) return json({ error: 'database' }, 502);
  const messages: any[] = await claimed.json();

  let sent = 0, failed = 0;
  for (const m of messages) {
    let ok = false, error: string | null = null;
    try {
      if (!m.email) throw new Error('no recipient');
      // the appointment was cancelled before the email went out: nothing to confirm
      if (m.status !== 'booked') { await rpc('finish_outbox', { p_id: m.id, p_ok: true, p_error: 'skipped: not booked' }); continue; }
      const mail = render(m, env);
      const r = await fetch(env.BREVO_API_URL || 'https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': env.BREVO_API_KEY!, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          sender: { email: env.MAIL_FROM, name: env.MAIL_FROM_NAME || m.shop_name || 'Termini' },
          to: [{ email: m.email, name: m.customer_name || undefined }],
          replyTo: env.MAIL_REPLY_TO ? { email: env.MAIL_REPLY_TO } : undefined,
          subject: mail.subject, htmlContent: mail.html, textContent: mail.plain,
        }),
      });
      ok = r.ok;
      if (!ok) error = `email service ${r.status}: ${(await r.text()).slice(0, 200)}`;
    } catch (e) { error = String((e as Error).message || e); }
    await rpc('finish_outbox', { p_id: m.id, p_ok: ok, p_error: error });
    ok ? sent++ : failed++;
  }
  return json({ sent, failed });
};
