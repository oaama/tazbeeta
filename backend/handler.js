'use strict';
const L = require('./lib');
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STATUSES = ['pending', 'inspection', 'quoted', 'approved', 'assigned', 'in_progress', 'completed', 'cancelled'];

class HttpError extends Error { constructor(code, msg) { super(msg); this.code = code; } }
const bad = (m) => new HttpError(400, m);

async function auth(req) {
  const hd = req.headers['authorization'] || '';
  const c = await L.verifySupabase(hd.startsWith('Bearer ') ? hd.slice(7) : '');
  if (!c) throw new HttpError(401, 'Unauthorized');
  let u = await L.get('users', c.sub);
  if (!u) {
    // First authenticated call creates the profile. Always a customer unless the immutable verified user id is the configured admin id.
    // Technicians are only created by an admin (POST /api/admin/technicians), which pre-creates their profile.
    const email = String(c.email || '').toLowerCase();
    if (!email) throw new HttpError(401, 'Unauthorized');
    const md = c.user_metadata || {};
    u = await L.put('users', { id: c.sub, firstName: String(md.first_name || '').slice(0, 60), lastName: String(md.last_name || '').slice(0, 60), email, role: L.ADMIN_USER_ID && String(c.sub).toLowerCase() === L.ADMIN_USER_ID ? 'admin' : 'customer', createdAt: new Date().toISOString(), addresses: [] });
  }
  if (u.blocked) throw new HttpError(403, 'Account blocked');
  return u;
}
const needAdmin = async (req) => { const u = await auth(req); if (u.role !== 'admin') throw new HttpError(403, 'Admins only'); return u; };

const routes = [];
const route = (m, path, fn) => routes.push({ m, re: new RegExp('^' + path.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), fn });

route('GET', '/api/health', async () => ({ ok: true }));

// Public, non-secret client config (anon key is designed to be public; RLS blocks the tables anyway).
route('GET', '/api/config', async () => ({ supabaseUrl: process.env.SUPABASE_URL || null, supabaseAnonKey: process.env.SUPABASE_ANON_KEY || null }));

route('GET', '/api/me', async ({ req }) => ({ user: L.publicUser(await auth(req)) }));
route('PUT', '/api/me', async ({ req, body }) => {
  const u = await auth(req);
  for (const k of ['firstName', 'lastName']) if (k in body) {
    if (typeof body[k] !== 'string' || !body[k].trim() || body[k].length > 60) throw bad('Name must contain 1 to 60 characters');
  }
  if ('phone' in body && (typeof body.phone !== 'string' || body.phone.length > 30 || (body.phone.trim() && !/^[+0-9 ()-]{7,30}$/.test(body.phone.trim())))) throw bad('Enter a valid phone number');
  if ('area' in body && (typeof body.area !== 'string' || body.area.length > 100)) throw bad('Area must be at most 100 characters');
  if ('addresses' in body && (!Array.isArray(body.addresses) || body.addresses.length > 10 || body.addresses.some(a => !a || typeof a.label !== 'string' || !a.label.trim() || a.label.length > 40 || typeof a.line !== 'string' || a.line.trim().length < 4 || a.line.length > 200))) throw bad('Each address needs a label and a full address (max 10)');
  for (const k of ['firstName','lastName','phone','area']) if (k in body) u[k] = body[k].trim();
  if (body.location != null && !validLoc(body.location)) throw bad('Invalid location');
  if (validLoc(body.location)) u.location = { lat: +body.location.lat, lon: +body.location.lon, at: new Date().toISOString() };
  if (Array.isArray(body.addresses)) u.addresses = body.addresses.slice(0, 10).map(a => ({ label: String(a.label || '').slice(0, 40), line: String(a.line || '').slice(0, 200) }));
  await L.put('users', u); return { user: L.publicUser(u) };
});

route('GET', '/api/admin/services', async ({req}) => {await needAdmin(req);return {services:await L.all('services')};});
route('GET', '/api/services', async () => ({ services: (await L.all('services')).filter(s => s.active).sort((a, b) => a.order - b.order) }));

// Company service requests. Customers create them; the company (admin) assigns an available
// technician (nearest suggestion, no automatic dispatch). Technicians only see jobs assigned to them.
const km = (a, b) => { const R = 6371, d = x => x * Math.PI / 180; const dl = d(b.lat - a.lat), dn = d(b.lon - a.lon); const h2 = Math.sin(dl / 2) ** 2 + Math.cos(d(a.lat)) * Math.cos(d(b.lat)) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h2)); };
route('POST', '/api/requests', async ({ req, body }) => {
  const u = await auth(req);
  if (u.role !== 'customer') throw new HttpError(403, 'Only customers create requests');
  const custom=body.custom===true;
  if(custom && (typeof body.customTitle!=='string'||body.customTitle.trim().length<3||body.customTitle.length>100))throw bad('Describe the service you need (3 to 100 characters)');
  if(body.contactPhone!=null && (typeof body.contactPhone!=='string'||body.contactPhone.length>30||(body.contactPhone.trim()&&!/^[+0-9 ()-]{7,30}$/.test(body.contactPhone.trim()))))throw bad('Enter a valid phone number');
  const s = custom?{id:'custom-unclassified',name:body.customTitle.trim()}:await L.get('services', String(body.serviceId || ''));
  if (!s || (!custom&&!s.active)) throw bad('Unknown service');
  if (!body.description || String(body.description).length < 5) throw bad('Please describe the problem');
  if (!body.address || String(body.address).trim().length < 4) throw bad('Address is required');
  if (body.location != null && !validLoc(body.location)) throw bad('Invalid location');
  const loc = validLoc(body.location) ? { lat: +body.location.lat, lon: +body.location.lon } : null;
  const r = await L.put('requests', { id: L.id(), customerId: u.id, custom, customTitle:custom?body.customTitle.trim():null, contactPhone:typeof body.contactPhone==='string'?body.contactPhone.trim():(u.phone||''),contactName:(u.firstName+' '+u.lastName).trim(), contactEmail:u.email, serviceId: s.id, serviceName: s.name, description: String(body.description).slice(0, 2000), address: String(body.address).slice(0, 200), location: loc, status: 'pending', technicianId: null, createdAt: new Date().toISOString() });
  return { request: r };
});
route('GET', '/api/requests', async ({ req }) => {
  const u = await auth(req);
  let list = await L.all('requests');
  if (u.role === 'customer') list = list.filter(r => r.customerId === u.id);
  else if (u.role === 'technician') list = list.filter(r => r.technicianId === u.id);
  const users = await L.all('users');
  const nm = id => { const x = users.find(y => y.id === id); return x ? x.firstName + ' ' + x.lastName : null; };
  return { requests: list.map(r => ({ ...r, customerName: u.role === 'customer' ? undefined : nm(r.customerId), technicianName: nm(r.technicianId) })).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) };
});
// Company workflow: inspection record, priced scope, explicit owner acceptance.
route('POST', '/api/admin/requests/:id/inspection', async ({req,body,params})=>{
 await needAdmin(req);const r=await L.get('requests',params.id);if(!r)throw new HttpError(404,'Not found');
 if(!['pending','inspection'].includes(r.status))throw bad('Inspection cannot be changed at this stage');
 if(typeof body.note!=='string'||body.note.trim().length<3||body.note.length>2000)throw bad('Inspection note is required');
 r.inspection={note:body.note.trim(),recordedAt:new Date().toISOString()};r.status='inspection';await L.put('requests',r);return {request:r};
});
route('POST', '/api/admin/requests/:id/quote', async ({req,body,params})=>{
 await needAdmin(req);const r=await L.get('requests',params.id);if(!r)throw new HttpError(404,'Not found');
 if(r.custom&&!r.classifiedAt)throw bad('Classify the custom request before quoting');
 if(!['inspection','quoted'].includes(r.status)||!r.inspection)throw bad('Record inspection before quoting');
 if(typeof body.amount!=='number'||!Number.isFinite(body.amount)||body.amount<=0||body.amount>1e9||typeof body.currency!=='string'||!(/^[A-Z]{3}$/).test(body.currency)||typeof body.scope!=='string'||body.scope.trim().length<5||body.scope.length>2000)throw bad('Valid amount, currency and scope are required');
 r.quote={amount:body.amount,currency:body.currency,scope:body.scope.trim(),version:(r.quote?.version||0)+1,issuedAt:new Date().toISOString()};r.status='quoted';r.quoteAccepted=null;await L.put('requests',r);return {request:r};
});
route('POST', '/api/requests/:id/accept-quote',async({req,body,params})=>{
 const u=await auth(req);const r=await L.get('requests',params.id);if(!r)throw new HttpError(404,'Not found');
 if(u.role!=='customer'||r.customerId!==u.id)throw new HttpError(403,'Only the request customer can accept');
 if(r.status!=='quoted'||!r.quote||body.version!==r.quote.version)throw bad('Quote changed. Review the latest quote');
 r.quoteAccepted={version:r.quote.version,customerId:u.id,acceptedAt:new Date().toISOString()};r.status='approved';await L.put('requests',r);return {request:r};
});
route('POST', '/api/requests/:id/status', async ({ req, body, params }) => {
  const u = await auth(req);
  const r = await L.get('requests', params.id);
  if (!r) throw new HttpError(404, 'Not found');
  const st = body.status;
  if (!STATUSES.includes(st)) throw bad('Bad status');
  const done = ['completed', 'cancelled'].includes(r.status);
  if (u.role === 'technician') {
    if (r.technicianId !== u.id || done || !((r.status === 'assigned' && st === 'in_progress') || (r.status === 'in_progress' && st === 'completed'))) throw new HttpError(403, 'Not allowed');
  } else if (u.role === 'customer') {
    if (r.customerId !== u.id || st !== 'cancelled' || done || r.status === 'in_progress') throw new HttpError(403, 'Not allowed');
  } else if (u.role !== 'admin' || done || st !== 'cancelled') throw new HttpError(403, 'Not allowed');
  r.status = st; await L.put('requests', r); return { request: r };
});
// Technician availability + a manual location snapshot (foreground only; no background tracking).
function validLoc(l) { return l && typeof l.lat === 'number' && typeof l.lon === 'number' && Number.isFinite(l.lat) && Number.isFinite(l.lon) && Math.abs(l.lat) <= 90 && Math.abs(l.lon) <= 180; }
route('PUT', '/api/tech/availability', async ({ req, body }) => {
  const u = await auth(req);
  if (u.role !== 'technician') throw new HttpError(403, 'Technicians only');
  if(typeof body.available!=='boolean') throw bad('Invalid availability');
  u.available = body.available;
  if (body.location !== undefined && body.location !== null && !validLoc(body.location)) throw bad('Invalid location');
  if (validLoc(body.location)) u.location = { lat: +body.location.lat, lon: +body.location.lon, at: new Date().toISOString() }; // timestamp is always server time; client timestamps are ignored
  await L.put('users', u); return { user: L.publicUser(u) };
});

// Messages, scoped to a request: only its customer and provider (and admin) can read/write.
async function canChat(u, r) { return u.role === 'admin' || r.customerId === u.id || r.technicianId === u.id; }
route('GET', '/api/requests/:id/messages', async ({ req, params }) => {
  const u = await auth(req); const r = await L.get('requests', params.id);
  if (!r || !(await canChat(u, r))) throw new HttpError(404, 'Not found');
  return { messages: (await L.all('messages')).filter(m => m.requestId === r.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt)) };
});
route('POST', '/api/requests/:id/messages', async ({ req, body, params }) => {
  const u = await auth(req); const r = await L.get('requests', params.id);
  if (!r || !(await canChat(u, r))) throw new HttpError(404, 'Not found');
  if (!body.text || !String(body.text).trim()) throw bad('Empty message');
  return { message: await L.put('messages', { id: L.id(), requestId: r.id, senderId: u.id, text: String(body.text).slice(0, 2000), createdAt: new Date().toISOString() }) };
});
route('GET', '/api/conversations', async ({ req }) => {
  const u = await auth(req);
  const reqs = (await L.all('requests')).filter(r => u.role === 'admin' || r.customerId === u.id || r.technicianId === u.id);
  const msgs = await L.all('messages'); const out = [];
  for (const r of reqs) {
    const m = msgs.filter(x => x.requestId === r.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (m.length) out.push({ request: r, last: m[0] });
  }
  return { conversations: out.sort((a, b) => b.last.createdAt.localeCompare(a.last.createdAt)) };
});

// Admin
route('GET', '/api/admin/stats', async ({ req }) => {
  await needAdmin(req);
  const [u, r] = [await L.all('users'), await L.all('requests')];
  const by = (a, f) => a.reduce((o, x) => (o[f(x)] = (o[f(x)] || 0) + 1, o), {});
  return { users: u.length, byRole: by(u, x => x.role), requests: r.length, byStatus: by(r, x => x.status) };
});
route('GET', '/api/admin/users', async ({ req }) => { await needAdmin(req); return { users: (await L.all('users')).map(L.publicUser) }; });
route('POST', '/api/admin/users/:id/block', async ({ req, body, params }) => {
  const a = await needAdmin(req); const u = await L.get('users', params.id);
  if (!u) throw new HttpError(404, 'Not found'); if (u.id === a.id) throw bad('Cannot block yourself');
  if(typeof body.blocked!=='boolean') throw bad('Invalid block status');
  u.blocked = body.blocked; await L.put('users', u); return { user: L.publicUser(u) };
});
const siteUrl = () => {const value=process.env.SITE_URL;if(!value)throw new HttpError(503,'Public site URL is not configured');let u;try{u=new URL(value);}catch{throw new HttpError(503,'Public site URL is invalid');}if(u.protocol!=='https:' && !(process.env.NODE_ENV!=='production' && ['localhost','127.0.0.1'].includes(u.hostname)))throw new HttpError(503,'Public site URL must use HTTPS');return u.origin;};
route('POST', '/api/admin/users/:id/reset-link', async ({ req, params }) => {
  await needAdmin(req); const u = await L.get('users', params.id);
  if (!u) throw new HttpError(404, 'Not found');
  const r = await L.sbAdmin('/generate_link', { type: 'recovery', email: u.email, redirect_to: siteUrl() + '/reset' });
  return { link: r.action_link, note: 'Bearer link: whoever opens it can set this account password. Send it only over a trusted channel. Not stored by this server.' };
});
route('GET', '/api/admin/requests', async ({ req }) => { await needAdmin(req); return { requests: await L.all('requests') }; });
route('POST', '/api/admin/technicians', async ({ req, body }) => {
  await needAdmin(req);
  const { firstName, lastName, email } = body;
  if (typeof firstName !== 'string' || !firstName.trim() || firstName.length>60 || typeof lastName !== 'string' || !lastName.trim() || lastName.length>60 || !EMAIL.test(email || '')) throw bad('Name and a valid email are required');
  const e = email.toLowerCase();
  if ((await L.all('users')).some(u => u.email === e)) throw new HttpError(409, 'This email already has an account');
  const redirect=siteUrl();
  const skills = Array.isArray(body.skills) ? [...new Set(body.skills)] : [];
  const serviceIds=new Set((await L.all('services')).filter(s=>s.active).map(s=>s.id));
  if(skills.some(id=>!serviceIds.has(id)))throw bad('Unknown service');
  // Supabase creates the auth user without any password; the technician sets their own via the recovery link.
  const created = await L.sbAdmin('/users', { email: e, email_confirm: true, user_metadata: { first_name: firstName.trim(), last_name: lastName.trim() } });
  const u = await L.put('users', { id: created.id, firstName: firstName.trim(), lastName: lastName.trim(), email: e, role: 'technician', available: false, skills, createdAt: new Date().toISOString(), addresses: [] });
  const link = await L.sbAdmin('/generate_link', { type: 'recovery', email: e, redirect_to: redirect + '/reset' });
  return { user: L.publicUser(u), setupLink: link.action_link };
});
route('PUT', '/api/admin/users/:id/skills', async ({ req, body, params }) => {
  await needAdmin(req); const u = await L.get('users', params.id);
  if (!u || u.role !== 'technician') throw new HttpError(404, 'Not found');
  if (!Array.isArray(body.skills) || body.skills.some(id => typeof id !== 'string')) throw bad('Skills must be a list of service ids');
  const ids = new Set((await L.all('services')).filter(s => s.active).map(s => s.id));
  if (body.skills.some(id => !ids.has(id))) throw bad('Unknown service');
  u.skills = [...new Set(body.skills)]; await L.put('users', u); return { user: L.publicUser(u) };
});
const MAX_LOCATION_AGE_MIN_V = +(process.env.MAX_LOCATION_AGE_MIN || 15);
route('GET', '/api/admin/requests/:id/suggest', async ({ req, params }) => {
  await needAdmin(req); const r = await L.get('requests', params.id);
  if (!r) throw new HttpError(404, 'Not found');
  const busy = new Set((await L.all('requests')).filter(x => ['assigned', 'in_progress'].includes(x.status)).map(x => x.technicianId));
  const nearest = [], manual = [], excluded = [];
  for (const t of (await L.all('users')).filter(u => u.role === 'technician' && !u.blocked)) {
    const why = [];
    if (!t.available) why.push('not available');
    if (busy.has(t.id)) why.push('has an active job');
    if (t.skills && t.skills.length && !t.skills.includes(r.serviceId)) why.push('does not cover this service');
    if (!t.skills || !t.skills.length) why.push('no services set for this technician');
    const ageMin = t.location ? (Date.now() - Date.parse(t.location.at)) / 60000 : null;
    const fresh = ageMin !== null && ageMin < MAX_LOCATION_AGE_MIN_V;
    const item = { ...L.publicUser(t), distanceKm: fresh && r.location ? Math.round(km(r.location, t.location) * 10) / 10 : null, locationAgeMin: ageMin === null ? null : Math.round(ageMin), locationFresh: fresh };
    if (why.length) excluded.push({ ...item, reasons: why }); else if (fresh && r.location) nearest.push(item); else manual.push({ ...item, reasons: [ageMin === null ? 'location never shared' : 'location is stale (' + Math.round(ageMin) + ' min old)'] });
  }
  nearest.sort((a, b) => (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9));
  return { technicians: nearest, manualOnly: manual, excluded, maxLocationAgeMin: MAX_LOCATION_AGE_MIN_V,
    note: nearest.length ? 'Ranked by distance using location fixes younger than the limit. Technicians with stale or no location are listed separately for manual choice only.' : 'No technician with a fresh location is eligible. Nobody is auto-selected; choose manually from the list below or wait.' };
});
route('POST','/api/admin/requests/:id/classify',async({req,body,params})=>{
 await needAdmin(req);const r=await L.get('requests',params.id);
 if(!r)throw new HttpError(404,'Not found');
 if(!r.custom||!['pending','inspection'].includes(r.status)||r.quote)throw bad('Only unquoted custom requests can be classified');
 const service=await L.get('services',String(body.serviceId||''));if(!service||!service.active)throw bad('Choose an active company service');
 r.serviceId=service.id;r.serviceName=service.name;r.classifiedAt=new Date().toISOString();await L.put('requests',r);return {request:r};
});
route('POST', '/api/admin/requests/:id/assign', async ({ req, body, params }) => {
  await needAdmin(req); const r = await L.get('requests', params.id);
  if (!r) throw new HttpError(404, 'Not found');
  if (!['approved', 'assigned'].includes(r.status)||!r.quoteAccepted||r.quoteAccepted.version!==r.quote?.version) throw bad('Customer must accept the quote before assignment');
  if(r.custom && !r.classifiedAt)throw bad('Classify the custom request before assignment');
  const t = await L.get('users', String(body.technicianId || ''));
  if (!t || t.role !== 'technician' || t.blocked) throw bad('Unknown technician');
  if (!t.available) throw bad('Technician is unavailable');
  if (!(t.skills || []).includes(r.serviceId)) throw bad('Technician does not cover this service');
  if ((await L.all('requests')).some(x => x.id !== r.id && x.technicianId === t.id && ['assigned','in_progress'].includes(x.status))) throw bad('Technician has an active job');
  r.technicianId = t.id; r.status = 'assigned'; await L.put('requests', r); return { request: r };
});
route('POST', '/api/admin/services', async ({ req, body }) => {
  await needAdmin(req);
  if (typeof body.name !== 'string' || !body.name.trim() || body.name.length > 100 || typeof body.nameAr !== 'string' || !body.nameAr.trim() || body.nameAr.length > 100) throw bad('Both service names are required (max 100 characters)');
  const slug = String(body.id || body.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (!slug) throw bad('A valid service id is required');
  const old = await L.get('services', slug);
  const all = await L.all('services');
  return { service: await L.put('services', { id: slug, name: body.name, nameAr: body.nameAr || '', popular: !!body.popular, active: body.active !== false, order: old ? old.order : all.length }) };
});

// Expanded dashboard data. Content is public only after an admin explicitly saves it.
const defaultContent = {id:'app',announcement:'',cashEnabled:true,help:[]};
const appContent = async () => (await L.get('content','app')) || defaultContent;
route('GET','/api/content',async () => ({content:await appContent()}));
route('PUT','/api/admin/content',async ({req,body}) => {
  await needAdmin(req);
  if(typeof body.announcement !== 'string' || body.announcement.length>500 || typeof body.cashEnabled !== 'boolean') throw bad('Invalid app settings');
  if(!Array.isArray(body.help) || body.help.length>30 || body.help.some(h => ['q','qAr','answer','answerAr'].some(k => typeof h[k] !== 'string' || !h[k].trim() || h[k].length>2000))) throw bad('Invalid Help content');
  const content=await L.put('content',{id:'app',announcement:body.announcement.trim(),cashEnabled:body.cashEnabled,help:body.help.map(h=>Object.fromEntries(['q','qAr','answer','answerAr'].map(k=>[k,h[k].trim()]))) });
  return {content};
});
route('POST','/api/feedback',async ({req,body}) => {
  const u=await auth(req);
  if(!Number.isInteger(body.stars) || body.stars<1 || body.stars>5 || typeof body.note!=='string' || body.note.length>2000) throw bad('Invalid feedback');
  return {feedback:await L.put('feedback',{id:L.id(),userId:u.id,stars:body.stars,note:body.note.trim(),reviewed:false,createdAt:new Date().toISOString()})};
});
route('GET','/api/admin/feedback',async ({req}) => {await needAdmin(req);return {feedback:(await L.all('feedback')).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))};});
route('PUT','/api/admin/feedback/:id',async ({req,body,params}) => {
  await needAdmin(req);const f=await L.get('feedback',params.id);if(!f)throw new HttpError(404,'Not found');
  if(typeof body.reviewed!=='boolean')throw bad('Invalid review status');
  f.reviewed=body.reviewed;await L.put('feedback',f);return {feedback:f};
});
route('PUT','/api/admin/technicians/:id/availability',async ({req,body,params}) => {
  await needAdmin(req);const u=await L.get('users',params.id);if(!u||u.role!=='technician')throw new HttpError(404,'Not found');
  if(typeof body.available!=='boolean')throw bad('Invalid availability');
  u.available=body.available;await L.put('users',u);return {user:L.publicUser(u)};
});
route('GET','/api/admin/activity',async ({req}) => {await needAdmin(req);return {activity:(await L.all('activity')).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,200)};});

async function handle(req, res) {
  const send = (code, obj) => { res.statusCode = code; res.setHeader('content-type', 'application/json'); res.setHeader('access-control-allow-origin', '*'); res.setHeader('access-control-allow-headers', 'authorization,content-type'); res.setHeader('access-control-allow-methods', 'GET,POST,PUT,OPTIONS'); res.end(JSON.stringify(obj)); };
  try {
    if (req.method === 'OPTIONS') return send(204, {});
    await L.init();
    const path = new URL(req.url, 'http://x').pathname.replace(/\/$/, '');
    let body = req.body;
    if (body === undefined) { const chunks = []; let size=0; for await (const c of req) {size+=c.length;if(size>65536)throw new HttpError(413,'Request too large');chunks.push(c);} const t = Buffer.concat(chunks).toString(); try { body = t ? JSON.parse(t) : {}; } catch { throw bad('Invalid JSON'); } }
    if (typeof body === 'string') {try {body = body ? JSON.parse(body) : {};} catch {throw bad('Invalid JSON');}}
    if (Buffer.byteLength(JSON.stringify(body || {}))>65536) throw new HttpError(413,'Request too large');
    if (body !== null && (typeof body !== 'object' || Array.isArray(body))) throw bad('JSON object required');
    for (const r of routes) {
      if (r.m !== req.method) continue; const m = r.re.exec(path); if (!m) continue;
      const execute=async()=>{
        const result=await r.fn({ req, body: body || {}, params: m.groups || {} });
        if (req.method !== 'GET') {
          const token=(req.headers.authorization||'').replace(/^Bearer /,'');
          const claims=await L.verifySupabase(token);
          await L.put('activity',{id:L.id(),actorId:claims?.sub || null,method:req.method,path,createdAt:new Date().toISOString()});
        }
        return result;
      };
      const result=req.method === 'GET' ? await execute() : await L.withWriteLock(execute);
      return send(200,result);
    }
    send(404, { error: 'Not found' });
  } catch (e) {
    if (e instanceof HttpError) return send(e.code, { error: e.message });
    if(Number.isInteger(e.code) && e.code>=400 && e.code<=599) return send(e.code,{error:e.code===503?'Service is not configured':'Upstream service failed'});
    console.error(e); send(500, { error: 'Server error' });
  }
}
module.exports = { handle };
