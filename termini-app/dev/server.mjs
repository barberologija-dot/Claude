// LOCAL TESTING ONLY.
// A small stand-in for the parts of Supabase the app talks to (auth, REST, RPC,
// image storage), running on top of a local Postgres that has the real
// migrations applied. Row level security is enforced by Postgres exactly as it
// is on Supabase: every request runs as the role and user from its token.
//
//   ./dev/reset-db.sh && node dev/server.mjs
//
// It supports only what src/lib/api.ts uses: select=* with simple filters,
// insert / update / upsert / delete, and rpc calls. No embedded selects.
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const PORT = +(process.env.DEV_API_PORT || 54321);
const SECRET = 'local-dev-secret-not-for-production';
const DATA = path.join(path.dirname(fileURLToPath(import.meta.url)), '.data');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@127.0.0.1:5432/termini_test' });

// ---------- tokens ----------
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
function sign(payload) {
  const body = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}`;
  return `${body}.${crypto.createHmac('sha256', SECRET).update(body).digest('base64url')}`;
}
function verify(token) {
  const [h, p, s] = String(token || '').split('.');
  if (!s) return null;
  const good = crypto.createHmac('sha256', SECRET).update(`${h}.${p}`).digest('base64url');
  if (good !== s) return null;
  const claims = JSON.parse(Buffer.from(p, 'base64url').toString());
  return claims.exp && claims.exp < Date.now() / 1000 ? null : claims;
}
export const ANON_KEY = sign({ role: 'anon', iss: 'local' });
export const SERVICE_KEY = sign({ role: 'service_role', iss: 'local' });

const refreshTokens = new Map(); // token -> user id
const mailTokens = new Map();    // token -> { uid, type, redirect }
const mails = [];                // what a real setup would send by email

const hash = pw => crypto.createHash('sha256').update('local:' + pw).digest('hex');
const userJson = u => ({
  id: u.id, aud: 'authenticated', role: 'authenticated', email: u.email,
  email_confirmed_at: u.email_confirmed_at, confirmed_at: u.email_confirmed_at,
  user_metadata: u.raw_user_meta_data, app_metadata: { provider: 'email', providers: ['email'] },
  identities: [{ id: u.id, user_id: u.id, provider: 'email' }], created_at: u.created_at,
});
function session(u) {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const refresh = crypto.randomBytes(16).toString('hex');
  refreshTokens.set(refresh, u.id);
  return {
    access_token: sign({ sub: u.id, role: 'authenticated', email: u.email, aud: 'authenticated', exp }),
    token_type: 'bearer', expires_in: 3600, expires_at: exp, refresh_token: refresh, user: userJson(u),
  };
}

// ---------- db ----------
const ident = s => { if (!/^[a-z_][a-z0-9_]*$/.test(s)) throw httpErr(400, `bad identifier: ${s}`); return `"${s}"`; };
const httpErr = (status, message, code = 'DEV') => Object.assign(new Error(message), { status, body: { code, message, details: null, hint: null } });

// Run fn inside a transaction as the role / user of the request, like PostgREST does.
async function asRequest(claims, fn) {
  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query('select set_config($1, $2, true), set_config($3, $4, true)', ['role', claims.role, 'request.jwt.claims', JSON.stringify(claims)]);
    const out = await fn(client);
    await client.query('commit');
    return out;
  } catch (e) {
    await client.query('rollback').catch(() => {});
    if (e.status) throw e;
    const status = e.code === '42501' ? (claims.role === 'anon' ? 401 : 403) : /^23(503|505|P01)$/.test(e.code || '') ? 409 : 400;
    throw Object.assign(e, { status, body: { code: e.code, message: e.message, details: e.detail || null, hint: e.hint || null } });
  } finally {
    client.release();
  }
}
const admin = (sql, params) => pool.query(sql, params);

function whereClause(query, params) {
  const parts = [];
  for (const [key, raw] of query) {
    if (['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'].includes(key)) continue;
    const col = ident(key);
    const dot = raw.indexOf('.');
    const op = raw.slice(0, dot), val = raw.slice(dot + 1);
    const cmp = { eq: '=', neq: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=' }[op];
    if (cmp) { params.push(val); parts.push(`${col} ${cmp} $${params.length}`); }
    else if (op === 'in') {
      const list = val.replace(/^\(|\)$/g, '').split(',').filter(Boolean).map(v => v.replace(/^"|"$/g, ''));
      params.push(list); parts.push(`${col} = any($${params.length})`);
    } else if (op === 'is' && ['null', 'true', 'false'].includes(val)) parts.push(`${col} is ${val}`);
    else if (op === 'not' && val === 'is.null') parts.push(`${col} is not null`);
    else throw httpErr(400, `dev server does not support filter ${key}=${raw}`);
  }
  return parts.length ? ' where ' + parts.join(' and ') : '';
}
function selectList(q) {
  const s = q.get('select') || '*';
  if (s === '*') return '*';
  if (/[(:]/.test(s)) throw httpErr(400, 'dev server does not support embedded selects');
  return s.split(',').map(c => ident(c.trim())).join(', ');
}

async function rest(req, res, url, claims, body) {
  const table = url.pathname.split('/')[3];
  const q = url.searchParams;
  const T = `public.${ident(table)}`;
  const prefer = req.headers.prefer || '';
  const wantRows = req.method === 'GET' || prefer.includes('return=representation');
  const single = (req.headers.accept || '').includes('vnd.pgrst.object');
  const params = [];
  let sql;

  if (req.method === 'GET') {
    const where = whereClause(q, params);
    let tail = '';
    if (q.get('order')) tail += ' order by ' + q.get('order').split(',').map(o => { const [c, d] = o.split('.'); return `${ident(c)} ${d === 'desc' ? 'desc' : 'asc'}`; }).join(', ');
    if (q.get('limit')) tail += ` limit ${+q.get('limit') | 0}`;
    sql = `select coalesce(json_agg(t), '[]') as r from (select ${selectList(q)} from ${T}${where}${tail}) t`;
  } else if (req.method === 'POST') {
    const rows = Array.isArray(body) ? body : [body];
    const cols = [...new Set(rows.flatMap(r => Object.keys(r)))].map(ident).join(', ');
    params.push(JSON.stringify(rows));
    let conflict = '';
    if (prefer.includes('resolution=merge-duplicates')) {
      let keys = q.get('on_conflict');
      if (!keys) {
        const pk = await admin(`select a.attname from pg_index i join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey) where i.indrelid = $1::regclass and i.indisprimary`, [`public.${table}`]);
        keys = pk.rows.map(r => r.attname).join(',');
      }
      const k = keys.split(',');
      const set = [...new Set(rows.flatMap(r => Object.keys(r)))].filter(c => !k.includes(c)).map(c => `${ident(c)} = excluded.${ident(c)}`).join(', ');
      conflict = ` on conflict (${k.map(ident).join(', ')}) ` + (set ? `do update set ${set}` : 'do nothing');
    }
    sql = `with w as (insert into ${T} (${cols}) select ${cols} from json_populate_recordset(null::${T}, $1::json)${conflict} returning *)
           select coalesce(json_agg(t), '[]') as r from (select ${selectList(q)} from w) t`;
  } else if (req.method === 'PATCH') {
    params.push(JSON.stringify(body));
    const set = Object.keys(body).map(c => `${ident(c)} = (select ${ident(c)} from json_populate_record(null::${T}, $1::json))`).join(', ');
    const where = whereClause(q, params);
    if (!where) throw httpErr(400, 'update needs a filter');
    sql = `with w as (update ${T} set ${set}${where} returning *) select coalesce(json_agg(t), '[]') as r from (select ${selectList(q)} from w) t`;
  } else if (req.method === 'DELETE') {
    const where = whereClause(q, params);
    if (!where) throw httpErr(400, 'delete needs a filter');
    sql = `with w as (delete from ${T}${where} returning *) select coalesce(json_agg(t), '[]') as r from (select ${selectList(q)} from w) t`;
  } else throw httpErr(405, 'method not allowed');

  const rows = (await asRequest(claims, c => c.query(sql, params))).rows[0].r;
  if (!wantRows) return send(res, req.method === 'POST' ? 201 : 204, null);
  if (single) {
    if (rows.length !== 1) throw httpErr(406, 'JSON object requested, multiple (or no) rows returned', 'PGRST116');
    return send(res, 200, rows[0]);
  }
  send(res, req.method === 'POST' ? 201 : 200, rows);
}

async function rpc(req, res, url, claims, body) {
  const fn = url.pathname.split('/')[4];
  ident(fn);
  const meta = await admin(`select proretset from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and proname = $1`, [fn]);
  if (!meta.rows.length) throw httpErr(404, `function ${fn} not found`, 'PGRST202');
  const keys = Object.keys(body || {});
  const args = keys.map((k, i) => `${ident(k)} := $${i + 1}`).join(', ');
  const vals = keys.map(k => (body[k] !== null && typeof body[k] === 'object' && !Array.isArray(body[k]) ? JSON.stringify(body[k]) : body[k]));
  const sql = meta.rows[0].proretset
    ? `select coalesce(json_agg(t), '[]') as r from public.${ident(fn)}(${args}) t`
    : `select to_json(public.${ident(fn)}(${args})) as r`;
  let r = (await asRequest(claims, c => c.query(sql, vals))).rows[0].r;
  // setof scalar comes back as [{fn: value}]; PostgREST returns plain values
  if (Array.isArray(r) && r.length && Object.keys(r[0] || {}).length === 1 && fn in r[0]) r = r.map(x => x[fn]);
  if ((req.headers.accept || '').includes('vnd.pgrst.object') && Array.isArray(r)) {
    if (r.length !== 1) throw httpErr(406, 'JSON object requested, multiple (or no) rows returned', 'PGRST116');
    r = r[0];
  }
  send(res, 200, r);
}

// ---------- auth ----------
async function auth(req, res, url, claims, body) {
  const p = url.pathname.replace('/auth/v1', '');
  const byEmail = async email => (await admin('select * from auth.users where email = $1', [String(email || '').toLowerCase()])).rows[0];
  const byId = async id => (await admin('select * from auth.users where id = $1', [id])).rows[0];
  const authErr = (status, code, msg) => Object.assign(new Error(msg), { status, body: { code: status, error_code: code, msg } });
  const mail = (u, type, redirect) => {
    const token = crypto.randomBytes(16).toString('hex');
    mailTokens.set(token, { uid: u.id, type, redirect });
    mails.push({ to: u.email, type, link: `http://localhost:${PORT}/auth/v1/verify?token=${token}&type=${type}&redirect_to=${encodeURIComponent(redirect || '')}`, at: new Date().toISOString() });
  };

  if (p === '/signup' && req.method === 'POST') {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.email || '')) throw authErr(422, 'validation_failed', 'Unable to validate email address: invalid format');
    if (String(body.password || '').length < 6) throw authErr(422, 'weak_password', 'Password should be at least 6 characters');
    const existing = await byEmail(body.email);
    if (existing) return send(res, 200, { ...userJson(existing), identities: [] });
    const u = (await admin('insert into auth.users (email, encrypted_password, raw_user_meta_data) values ($1, $2, $3) returning *', [body.email.toLowerCase(), hash(body.password), body.data || {}])).rows[0];
    if (process.env.DEV_AUTOCONFIRM) {   // preview mode: skip the verification email
      await admin('update auth.users set email_confirmed_at = now() where id = $1', [u.id]);
      return send(res, 200, session(await byId(u.id)));
    }
    mail(u, 'signup', url.searchParams.get('redirect_to'));
    return send(res, 200, userJson(u));
  }
  if (p === '/verify' && req.method === 'GET') {
    const t = mailTokens.get(url.searchParams.get('token'));
    const back = url.searchParams.get('redirect_to') || 'http://localhost:5173/';
    if (!t) { res.writeHead(302, { Location: back + '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired' }); return res.end(); }
    mailTokens.delete(url.searchParams.get('token'));
    await admin('update auth.users set email_confirmed_at = coalesce(email_confirmed_at, now()) where id = $1', [t.uid]);
    const s = session(await byId(t.uid));
    res.writeHead(302, { Location: `${back}#access_token=${s.access_token}&expires_in=3600&expires_at=${s.expires_at}&refresh_token=${s.refresh_token}&token_type=bearer&type=${t.type}` });
    return res.end();
  }
  if (p === '/token' && url.searchParams.get('grant_type') === 'password') {
    const u = await byEmail(body.email);
    if (!u || u.encrypted_password !== hash(body.password)) throw authErr(400, 'invalid_credentials', 'Invalid login credentials');
    if (!u.email_confirmed_at) throw authErr(400, 'email_not_confirmed', 'Email not confirmed');
    return send(res, 200, session(u));
  }
  if (p === '/token' && url.searchParams.get('grant_type') === 'refresh_token') {
    const uid = refreshTokens.get(body.refresh_token);
    const u = uid && await byId(uid);
    if (!u) throw authErr(400, 'refresh_token_not_found', 'Invalid Refresh Token: Refresh Token Not Found');
    refreshTokens.delete(body.refresh_token);
    return send(res, 200, session(u));
  }
  if (p === '/user') {
    const u = claims.sub && await byId(claims.sub);
    if (!u) throw authErr(401, 'bad_jwt', 'invalid JWT');
    if (req.method === 'PUT') {
      if (body.password) await admin('update auth.users set encrypted_password = $2 where id = $1', [u.id, hash(body.password)]);
      if (body.data) await admin('update auth.users set raw_user_meta_data = raw_user_meta_data || $2 where id = $1', [u.id, body.data]);
    }
    return send(res, 200, userJson(await byId(u.id)));
  }
  if (p === '/recover') { const u = await byEmail(body.email); if (u) mail(u, 'recovery', url.searchParams.get('redirect_to')); return send(res, 200, {}); }
  if (p === '/resend') { const u = await byEmail(body.email); if (u && !u.email_confirmed_at) mail(u, 'signup', url.searchParams.get('redirect_to')); return send(res, 200, {}); }
  if (p === '/logout') return send(res, 204, null);
  throw authErr(404, 'not_found', 'dev server: unknown auth route ' + p);
}

// ---------- storage (public bucket "images") ----------
async function storage(req, res, url, claims, raw) {
  const m = url.pathname.match(/^\/storage\/v1\/object\/(public\/)?([a-z0-9-]+)\/(.+)$/);
  if (!m) throw httpErr(404, 'not found');
  const [, pub, bucket, name] = m;
  const file = path.join(DATA, bucket, name);
  if (!file.startsWith(DATA)) throw httpErr(400, 'bad path');
  if (req.method === 'GET' && pub) {
    if (!fs.existsSync(file)) throw httpErr(404, 'not found');
    res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Access-Control-Allow-Origin': '*' });
    return res.end(fs.readFileSync(file));
  }
  if (req.method === 'POST' || req.method === 'PUT') {
    // the storage policies decide who may write here
    await asRequest(claims, c => c.query('insert into storage.objects (bucket_id, name, owner) values ($1, $2, $3)', [bucket, name, claims.sub || null]));
    let data = raw;
    const boundary = (req.headers['content-type'] || '').match(/boundary=(.+)$/);
    if (boundary) {
      const parts = raw.toString('latin1').split('--' + boundary[1]);
      const part = parts.find(x => /filename=/.test(x)) || parts.find(x => x.includes('\r\n\r\n') && !/name="cacheControl"/.test(x));
      const start = part.indexOf('\r\n\r\n') + 4;
      data = Buffer.from(part.slice(start, part.lastIndexOf('\r\n')), 'latin1');
    }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, data);
    return send(res, 200, { Key: `${bucket}/${name}`, Id: crypto.randomUUID() });
  }
  throw httpErr(405, 'method not allowed');
}

// ---------- http ----------
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, prefer, accept, accept-profile, content-profile, x-client-info, x-upsert, x-supabase-api-version, cache-control, range',
  'Access-Control-Expose-Headers': 'content-range',
};
function send(res, status, body) {
  res.writeHead(status, { ...CORS, 'Content-Type': 'application/json' });
  res.end(body === null || body === undefined ? '' : JSON.stringify(body));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }
  try {
    const chunks = []; for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks);
    const isJson = (req.headers['content-type'] || '').includes('json');
    const body = isJson && raw.length ? JSON.parse(raw.toString()) : {};
    const bearer = (req.headers.authorization || '').replace(/^Bearer /i, '') || req.headers.apikey;
    const claims = verify(bearer) || (url.pathname.startsWith('/storage/v1/object/public/') || url.pathname === '/auth/v1/verify' || url.pathname.startsWith('/dev/') ? { role: 'anon' } : null);
    if (!claims) return send(res, 401, { code: 'PGRST301', message: 'JWT expired or invalid' });

    if (url.pathname.startsWith('/rest/v1/rpc/')) return await rpc(req, res, url, claims, body);
    if (url.pathname.startsWith('/rest/v1/')) return await rest(req, res, url, claims, body);
    if (url.pathname.startsWith('/auth/v1/')) return await auth(req, res, url, claims, body);
    if (url.pathname.startsWith('/storage/v1/')) return await storage(req, res, url, claims, raw);
    if (url.pathname === '/dev/mails') return send(res, 200, mails);   // what would have been emailed
    send(res, 404, { message: 'not found' });
  } catch (e) {
    if (!e.status) console.error(e);
    send(res, e.status || 500, e.body || { message: e.message });
  }
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  server.listen(PORT, () => console.log(`dev backend on http://localhost:${PORT}\nVITE_SUPABASE_URL=http://localhost:${PORT}\nVITE_SUPABASE_ANON_KEY=${ANON_KEY}\nSERVICE_KEY=${SERVICE_KEY}`));
}
