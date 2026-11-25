'use strict';
const crypto = require('crypto');
const { AsyncLocalStorage } = require('async_hooks');
const transaction = new AsyncLocalStorage();
const connection = () => transaction.getStore() || pool;
let writes = Promise.resolve();
async function withWriteLock(fn) {
  if (pool) {
    const client=await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(71420633)');
      const result=await transaction.run(client,fn);
      await client.query('COMMIT');return result;
    } catch(e) {await client.query('ROLLBACK');throw e;} finally {client.release();}
  }
  const run=writes.then(async()=>{
    const snapshot=structuredClone(mem);
    try{return await fn();}catch(e){mem=snapshot;throw e;}
  });
  writes=run.catch(()=>{});return run;
}
const ADMIN_USER_ID = (process.env.ADMIN_USER_ID || '').toLowerCase(); // immutable Supabase user id; never matched by email

// ---------- storage: in-memory by default, Postgres when DATABASE_URL is set ----------
// Each collection is a table (id text primary key, doc jsonb). Simple and portable.
const COLS = ['users', 'services', 'requests', 'messages', 'feedback', 'content', 'activity'];
let mem = null, pool = null, ready = null;
async function init() {
  if (ready) return ready;
  ready = (async () => {
    if (process.env.DATABASE_URL || process.env.PGHOST) {
      const { Pool } = require('pg');
      pool = new Pool({ ...(process.env.DATABASE_URL ? { connectionString: process.env.DATABASE_URL } : {}), max: 3, ssl: process.env.PGSSL === 'off' ? false : { rejectUnauthorized: true, ...(process.env.PGSSL_CA ? { ca: process.env.PGSSL_CA } : {}) } });
      for (const c of COLS) {
        await pool.query(`create table if not exists ${c} (id text primary key, doc jsonb not null)`);
        await pool.query(`alter table ${c} enable row level security`); // no policies: the Data API cannot read these tables; only this server (direct connection) can
      }
    } else {
      if (process.env.NODE_ENV === 'production' || process.env.VERCEL || process.env.NETLIFY) throw new Error('DATABASE_URL (or PGHOST/PGUSER/PGPASSWORD) is required in production: in-memory storage is not persistent');
      mem = {}; for (const c of COLS) mem[c] = new Map(); }
    if (!(await all('services')).length) await seedServices();
  })();
  return ready;
}
async function all(c) {
  if (pool) return (await connection().query(`select doc from ${c}`)).rows.map(r => r.doc);
  return structuredClone([...mem[c].values()]);
}
async function get(c, id) {
  if (pool) { const r = await connection().query(`select doc from ${c} where id=$1`, [id]); return r.rows[0] && r.rows[0].doc; }
  return structuredClone(mem[c].get(id) || null);
}
async function put(c, doc) {
  if (pool) await connection().query(`insert into ${c}(id,doc) values($1,$2) on conflict (id) do update set doc=excluded.doc`, [doc.id, doc]);
  else mem[c].set(doc.id, structuredClone(doc));
  return doc;
}
async function del(c, id) { if (pool) await connection().query(`delete from ${c} where id=$1`, [id]); else mem[c].delete(id); }
const id = () => crypto.randomBytes(9).toString('hex');

async function seedServices() {
  // Starter company catalog (admin can edit in the dashboard).
  const list = [
    ['finishing-renovation', 'Finishing & Renovation', 'التشطيبات والتجديد'],
    ['ac-maintenance', 'AC Maintenance', 'صيانة التكييف'],
    ['appliance-maintenance', 'Electrical Appliance Maintenance', 'صيانة الأجهزة الكهربائية'],
  ];
  for (const [i, [slug, name, nameAr]] of list.entries())
    await put('services', { id: slug, name, nameAr, popular: true, active: true, order: i });
}

// ---------- auth: Supabase Auth JWTs (ES256/RS256 via the project's JWKS, or HS256 legacy secret) ----------
// The app signs users in directly with Supabase Auth. This server only VERIFIES the access token;
// it never sees passwords. Roles live in our own users table, never in client-editable metadata.
let jwksCache = null, keyOverride = null;
const SUPABASE_URL = () => (process.env.SUPABASE_URL || '').replace(/\/$/, '');
function setKeyResolver(fn) { keyOverride = fn; }            // tests only
async function getKey(kid) {
  if (keyOverride) return keyOverride(kid);
  if (!SUPABASE_URL()) throw new Error('SUPABASE_URL is not set');
  if (!jwksCache || Date.now() - jwksCache.at > 3600e3 || (kid && !jwksCache.keys.find(k => k.kid === kid) && Date.now() - jwksCache.at > 60e3)) {
    const r = await fetch(SUPABASE_URL() + '/auth/v1/.well-known/jwks.json');
    if (!r.ok) throw new Error('JWKS fetch failed');
    jwksCache = { at: Date.now(), keys: (await r.json()).keys || [] };
  }
  const jwk = jwksCache.keys.find(k => k.kid === kid);
  return jwk ? crypto.createPublicKey({ key: jwk, format: 'jwk' }) : null;
}
async function verifySupabase(token) {
  try {
    const parts=String(token||'').split('.');if(parts.length!==3)return null;
    const [h, p, s] = parts;
    if (!h || !p || !s) return null;
    const head = JSON.parse(Buffer.from(h, 'base64url').toString());
    const claims = JSON.parse(Buffer.from(p, 'base64url').toString());
    const data = Buffer.from(h + '.' + p), sig = Buffer.from(s, 'base64url');
    let ok = false;
    if (head.alg === 'ES256' || head.alg === 'RS256') {
      const key = await getKey(head.kid); if (!key) return null;
      ok = head.alg === 'ES256' ? crypto.verify('sha256', data, { key, dsaEncoding: 'ieee-p1363' }, sig) : crypto.verify('sha256', data, key, sig);
    } else if (head.alg === 'HS256' && process.env.SUPABASE_JWT_SECRET) {
      const exp = crypto.createHmac('sha256', process.env.SUPABASE_JWT_SECRET).update(data).digest();
      ok = exp.length === sig.length && crypto.timingSafeEqual(exp, sig);
    }
    if (!ok) return null;
    if ((claims.nbf && claims.nbf>Date.now()/1000+30) || !(claims.exp > Date.now() / 1000) || claims.aud !== 'authenticated' || !claims.sub) return null;
    if (SUPABASE_URL() && claims.iss !== SUPABASE_URL() + '/auth/v1') return null;
    return claims;
  } catch { return null; }
}
// Supabase Admin API (service role key stays on the server, never in the app or dashboard page)
async function sbAdmin(path, body) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL() || !key) throw Object.assign(new Error('Supabase admin access is not configured'), { code: 503 });
  const r = await fetch(SUPABASE_URL() + '/auth/v1/admin' + path, { method: 'POST', headers: { 'content-type': 'application/json', apikey: key, authorization: 'Bearer ' + key }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.msg || j.message || j.error_description || 'Supabase admin call failed'), { code: r.status === 422 ? 409 : 502 });
  return j;
}
const publicUser = u => u && ({ id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email, role: u.role, createdAt: u.createdAt, blocked: !!u.blocked, available: !!u.available, skills: u.skills || [], location: u.location || null, addresses: u.addresses || [], phone: u.phone || '', area: u.area || '' });

module.exports = { withWriteLock, init, all, get, put, del, id, verifySupabase, setKeyResolver, sbAdmin, publicUser, ADMIN_USER_ID };
