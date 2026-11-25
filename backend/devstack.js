process.env.SITE_URL='http://127.0.0.1:3100';
// LOCAL DEMO ONLY: a stand-in for Supabase Auth (real ES256 signing, password grant, admin API) plus the real Node handler,
// in-memory storage. Used to take dashboard screenshots. It is not the live Supabase and proves nothing about it.
process.env.ADMIN_USER_ID = '11111111-1111-4111-8111-111111111111';
const http = require('http'), crypto = require('crypto');
const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
const L = require('./lib'); L.setKeyResolver(() => publicKey);
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const ids = { 'admin@hexaplus.demo': process.env.ADMIN_USER_ID };
const uid = e => ids[e] || (ids[e] = crypto.randomUUID());
const mint = (email, name) => { const h = b64({ alg: 'ES256', kid: 'k1', typ: 'JWT' }), p = b64({ sub: uid(email), email, iss: process.env.SUPABASE_URL + '/auth/v1', aud: 'authenticated', role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600, user_metadata: { first_name: name } }); return h + '.' + p + '.' + crypto.sign('sha256', Buffer.from(h + '.' + p), { key: privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64url'); };
const fake = http.createServer((q, s) => { let d = ''; q.on('data', c => d += c); q.on('end', () => {
  s.setHeader('access-control-allow-origin', '*'); s.setHeader('access-control-allow-headers', '*'); s.setHeader('access-control-allow-methods', '*'); s.setHeader('content-type', 'application/json');
  if (q.method === 'OPTIONS') return s.end();
  const b = JSON.parse(d || '{}');
  if (q.url.startsWith('/auth/v1/token')) return s.end(JSON.stringify({ access_token: mint(b.email, b.email.split('@')[0]), refresh_token: 'r', token_type: 'bearer' }));
  if (q.url === '/auth/v1/admin/users') return s.end(JSON.stringify({ id: uid(b.email), email: b.email }));
  if (q.url === '/auth/v1/admin/generate_link') return s.end(JSON.stringify({ action_link: 'https://demo.invalid/recovery-link-shown-once' }));
  s.end('{}'); }); });
fake.listen(3101, async () => {
  process.env.SUPABASE_URL = 'http://127.0.0.1:3101'; process.env.SUPABASE_ANON_KEY = 'demo-anon'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'demo-service';
  const { handle } = require('./handler');
  const fs = require('fs'), path = require('path');
  const srv = http.createServer((req, res) => { if (req.url.startsWith('/api/')) return handle(req, res); if(req.url==='/brand.png'){res.setHeader('content-type','image/png');return res.end(fs.readFileSync(path.join(__dirname,'public','brand.png')));} const f = req.url.startsWith('/admin') ? 'admin.html' : req.url.startsWith('/reset') ? 'reset.html' : null; if (!f) { res.statusCode = 404; return res.end('not found'); } res.setHeader('content-type', 'text/html; charset=utf-8'); res.end(fs.readFileSync(path.join(__dirname, 'public', f))); }).listen(3100, async () => {
    const call = (m, p, b, t) => new Promise(r => { const q = http.request({ port: 3100, method: m, path: p, headers: { 'content-type': 'application/json', ...(t ? { authorization: 'Bearer ' + t } : {}) } }, s => { let d = ''; s.on('data', c => d += c); s.on('end', () => r(JSON.parse(d || '{}'))); }); q.end(b ? JSON.stringify(b) : undefined); });
    const A = mint('admin@hexaplus.demo', 'admin'); await call('GET', '/api/me', null, A);
    for (const [e, n] of [['hasnaa@demo.io', 'Hasnaa'], ['omar@demo.io', 'Omar']]) await call('GET', '/api/me', null, mint(e, n));
    const t1 = await call('POST', '/api/admin/technicians', { firstName: 'Mostafa', lastName: 'Ali', email: 'mostafa@demo.io', skills: ['ac-maintenance'] }, A);
    const t2 = await call('POST', '/api/admin/technicians', { firstName: 'Karim', lastName: 'Samy', email: 'karim@demo.io', skills: ['finishing-renovation', 'appliance-maintenance'] }, A);
    const T1 = mint('mostafa@demo.io', 'mostafa'); await call('GET', '/api/me', null, T1); await call('PUT', '/api/tech/availability', { available: true, location: { lat: 30.0626, lon: 31.3219 } }, T1);
    const T2 = mint('karim@demo.io', 'karim'); await call('GET', '/api/me', null, T2); await call('PUT', '/api/tech/availability', { available: true }, T2);
    const C = mint('hasnaa@demo.io', 'Hasnaa');
    const r1 = await call('POST', '/api/requests', { serviceId: 'ac-maintenance', description: 'AC is not cooling, makes noise', address: 'Nasr City, Cairo', location: { lat: 30.0561, lon: 31.3301 } }, C);
    await call('POST', '/api/requests', { serviceId: 'finishing-renovation', description: 'Repaint two rooms and fix ceiling cracks', address: 'New Cairo, 5th Settlement' }, mint('omar@demo.io', 'Omar'));
    console.log('READY');
  });
});
