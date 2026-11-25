process.env.SITE_URL='http://127.0.0.1:3100';
process.env.ADMIN_USER_ID = '11111111-1111-4111-8111-111111111111';
const http = require('http'); const assert = require('assert'); const crypto = require('crypto');
// Local stand-in for Supabase: real ES256 signing + JWKS verification, and the Admin API endpoints we call.
const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
const L = require('./lib'); L.setKeyResolver(() => publicKey);
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const uids = {};
uids['admin@test.io'] = process.env.ADMIN_USER_ID;
const uid = e => uids[e] || (uids[e] = crypto.randomUUID());
function mint(email, extra = {}, key = privateKey) {
  const h = b64({ alg: 'ES256', kid: 'k1', typ: 'JWT' }), p = b64({ sub: uid(email), email, iss: process.env.SUPABASE_URL + '/auth/v1', aud: 'authenticated', role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600, user_metadata: { first_name: email.split('@')[0] }, ...extra });
  return h + '.' + p + '.' + crypto.sign('sha256', Buffer.from(h + '.' + p), { key, dsaEncoding: 'ieee-p1363' }).toString('base64url');
}
const adminCalls = [];
const fake = http.createServer((q, s) => { let d = ''; q.on('data', c => d += c); q.on('end', () => { const b = JSON.parse(d || '{}'); adminCalls.push({ url: q.url, auth: q.headers.authorization, b }); s.setHeader('content-type', 'application/json');
  if (q.url === '/auth/v1/admin/users') s.end(JSON.stringify({ id: uid(b.email), email: b.email })); else if (q.url === '/auth/v1/admin/generate_link') s.end(JSON.stringify({ action_link: 'https://fake.supabase.test/verify?type=recovery&token=TEST' })); else { s.statusCode = 404; s.end('{}'); } }); });
fake.listen(0, () => { process.env.SUPABASE_URL = 'http://127.0.0.1:' + fake.address().port; process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'; });
const { handle } = require('./handler');
const srv = http.createServer(handle).listen(0, async () => {
  const port = srv.address().port;
  const call = (m, p, b, t) => new Promise(r => { const q = http.request({ port, method: m, path: p, headers: { 'content-type': 'application/json', ...(t ? { authorization: 'Bearer ' + t } : {}) } }, s => { let d = ''; s.on('data', c => d += c); s.on('end', () => r({ code: s.statusCode, j: JSON.parse(d || '{}') })); }); q.end(b ? JSON.stringify(b) : undefined); });
  const reg = async (f, e) => { const token = mint(e, { user_metadata: { first_name: f, last_name: 'T' } }); const r = await call('GET', '/api/me', null, token); return { token, user: r.j.user }; };
  const login = async (e) => reg(e.split('@')[0], e);
  try {
    let r = await call('GET', '/api/me'); assert.equal(r.code, 401, 'no token');
    assert.equal((await call('GET', '/api/me', null, mint('ann@x.io', {}, crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' }).privateKey))).code, 401, 'token signed by another key');
    assert.equal((await call('GET', '/api/me', null, mint('ann@x.io', { exp: 1 }))).code, 401, 'expired token');
    assert.equal((await call('GET', '/api/me', null, mint('ann@x.io', { aud: 'anon' }))).code, 401, 'wrong audience');
    const ann = await reg('Ann', 'ann@x.io'); assert.equal(ann.user.role, 'customer'); assert.equal((await call('GET', '/api/me', null, mint('tech@x.io', { user_metadata: { role: 'technician' }, app_metadata: { role: 'admin' } }))).j.user.role, 'customer', 'client metadata cannot grant a role');
    const ct = ann.token;
    const adm = await reg('Ad', 'admin@test.io'); assert.equal(adm.user.role, 'admin'); const at = adm.token;
    const other = (await reg('Other', 'other@x.io')).token;
    r = await call('GET', '/api/services'); assert.equal(r.j.services.length, 3);

    r=await call('PUT','/api/me',{firstName:'Anna',lastName:'Test',phone:'+201000000000',area:'Cairo',role:'admin',skills:['x'],email:'else@x.io'},ct);
    assert.equal(r.code,200); assert.equal(r.j.user.phone,'+201000000000');assert.equal(r.j.user.area,'Cairo');assert.equal(r.j.user.role,'customer');assert.equal(r.j.user.email,'ann@x.io');assert.deepEqual(r.j.user.skills,[]);
    assert.equal((await call('PUT','/api/me',{phone:'invalid'},ct)).code,400);
    assert.equal((await call('PUT','/api/me',{firstName:'Mutated',lastName:''},ct)).code,400);
    assert.equal((await call('GET','/api/me',null,ct)).j.user.firstName,'Anna','invalid edit is atomic');
    assert.equal((await call('PUT','/api/me',{addresses:[{label:'Home',line:'ab'}]},ct)).code,400);
    const ads=[{label:'Home',line:'Nasr City, Cairo'}];
    assert.deepEqual((await call('PUT','/api/me',{addresses:ads},ct)).j.user.addresses,ads);
    assert.equal((await call('PUT','/api/me',{addresses:[]},ct)).j.user.addresses.length,0);
    // admin creates technicians; non-admin cannot
    assert.equal((await call('POST', '/api/admin/technicians', { firstName: 'T', lastName: 'One', email: 't1@x.io' }, ct)).code, 403);
    r = await call('POST', '/api/admin/technicians', { firstName: 'Tech', lastName: 'One', email: 't1@x.io', skills: ['ac-maintenance'] }, at); assert.equal(r.code, 200);
    assert.equal(r.j.tempPassword, undefined, 'no generated password'); assert(r.j.setupLink.includes('recovery'));
    assert.equal(adminCalls[0].auth, 'Bearer test-service-key'); assert.equal(adminCalls[0].b.password, undefined, 'no password sent to Supabase');
    const t1 = (await login('t1@x.io')); assert.equal(t1.user.role, 'technician'); const t1id = t1.user.id;
    r = await call('POST', '/api/admin/technicians', { firstName: 'Tech', lastName: 'Two', email: 't2@x.io', skills: ['ac-maintenance', 'finishing-renovation'] }, at);
    const t2 = await login('t2@x.io'); const t2id = t2.user.id;

    const approve=async(id)=>{
     assert.equal((await call('POST',`/api/admin/requests/${id}/assign`,{technicianId:t1id},at)).code,400,'no assignment before quote acceptance');
     assert.equal((await call('POST',`/api/admin/requests/${id}/quote`,{amount:100,currency:'EGP',scope:'Test repair scope'},at)).code,400,'inspection required');
     assert.equal((await call('POST',`/api/admin/requests/${id}/inspection`,{note:'Inspected and recorded'},ct)).code,403);
     assert.equal((await call('POST',`/api/admin/requests/${id}/inspection`,{note:'Inspected and recorded'},at)).code,200);
     assert.equal((await call('POST',`/api/admin/requests/${id}/quote`,{amount:100,currency:'EGP',scope:'Test repair scope'},at)).code,200);
     assert.equal((await call('POST',`/api/requests/${id}/accept-quote`,{version:1},other)).code,403,'only owner accepts');
     assert.equal((await call('POST',`/api/requests/${id}/accept-quote`,{version:0},ct)).code,400,'stale quote rejected');
     assert.equal((await call('POST',`/api/requests/${id}/accept-quote`,{version:1},ct)).j.request.status,'approved');
    };
    // Custom need does not get forced into an unrelated catalog service.
    assert.equal((await call('POST','/api/requests',{custom:true,customTitle:'x',description:'Custom need details',address:'Cairo'},ct)).code,400);
    const custom=(await call('POST','/api/requests',{custom:true,customTitle:'Kitchen plumbing',description:'Leak below the sink',address:'Cairo local test',contactPhone:'+201000000000',technicianId:t1id,classifiedAt:'forged'},ct)).j.request;
    assert.equal(custom.custom,true);assert.equal(custom.serviceId,'custom-unclassified');assert.equal(custom.technicianId,null);assert.equal(custom.classifiedAt,undefined);assert.equal(custom.contactPhone,'+201000000000');
    assert.equal((await call('POST',`/api/admin/requests/${custom.id}/classify`,{serviceId:'ac-maintenance'},ct)).code,403);
    assert.equal((await call('POST',`/api/admin/requests/${custom.id}/inspection`,{note:'Custom need inspected'},at)).code,200);
    assert.equal((await call('POST',`/api/admin/requests/${custom.id}/quote`,{amount:100,currency:'EGP',scope:'Local custom scope'},at)).code,400,'unclassified request cannot be quoted');
    assert.equal((await call('POST',`/api/admin/requests/${custom.id}/classify`,{serviceId:'not-real'},at)).code,400);
    await call('POST','/api/admin/services',{id:'plumbing',name:'Plumbing',nameAr:'السباكة'},at);
    let classified=await call('POST',`/api/admin/requests/${custom.id}/classify`,{serviceId:'plumbing'},at);assert.equal(classified.code,200);assert.equal(classified.j.request.customTitle,'Kitchen plumbing');
    assert.equal((await call('POST',`/api/admin/requests/${custom.id}/quote`,{amount:100,currency:'EGP',scope:'Local custom scope'},at)).code,200);
    assert.equal((await call('POST',`/api/admin/requests/${custom.id}/classify`,{serviceId:'ac-maintenance'},at)).code,400,'cannot change priced scope category');
    assert.equal((await call('POST',`/api/requests/${custom.id}/accept-quote`,{version:1},ct)).code,200);
    assert.equal((await call('PUT','/api/tech/availability',{available:true},t1.token)).code,200);
    assert.equal((await call('POST',`/api/admin/requests/${custom.id}/assign`,{technicianId:t1id},at)).code,400,'unrelated skills cannot handle custom need');
    await call('POST',`/api/requests/${custom.id}/status`,{status:'cancelled'},ct);
    // customer creates request (needs address)
    assert.equal((await call('POST', '/api/requests', { serviceId: 'ac-maintenance', description: 'AC not cooling' }, ct)).code, 400);
    r = await call('POST', '/api/requests', { serviceId: 'ac-maintenance', description: 'AC not cooling', address: 'Nasr City, Cairo', location: { lat: 30.05, lon: 31.34 } }, ct); assert.equal(r.code, 200); const rid = r.j.request.id; assert.equal(r.j.request.status, 'pending');
    assert.equal((await call('POST', '/api/requests', { serviceId: 'nope', description: 'xxxxx', address: 'abcd' }, ct)).code, 400);
    assert.equal((await call('POST', '/api/requests', { serviceId: 'ac-maintenance', description: 'xxxxx', address: 'abcd' }, t1.token)).code, 403, 'technician cannot create requests');

    // technicians see nothing until assigned; not suggested until available
    assert.equal((await call('GET', '/api/requests', null, t1.token)).j.requests.length, 0);
    r = await call('GET', `/api/admin/requests/${rid}/suggest`, null, at); assert.equal(r.j.technicians.length, 0, 'unavailable technicians are not suggested'); assert(r.j.note.includes('No technician'));
    assert.equal((await call('PUT', '/api/tech/availability', { available: true }, ct)).code, 403, 'customer cannot set availability');
    await call('PUT', '/api/tech/availability', { available: true, location: { lat: 30.06, lon: 31.35 } }, t1.token); // ~1.5km
    await call('PUT', '/api/tech/availability', { available: true, location: { lat: 30.5, lon: 31.0 } }, t2.token); // far
    r = await call('GET', `/api/admin/requests/${rid}/suggest`, null, at); assert.equal(r.j.technicians.length, 2); assert.equal(r.j.maxLocationAgeMin, 15);
    // skill filter: a finishing request must not suggest the AC-only technician
    const fr = (await call('POST', '/api/requests', { serviceId: 'finishing-renovation', description: 'Repaint two rooms', address: 'Giza' }, ct)).j.request;
    r = await call('GET', `/api/admin/requests/${fr.id}/suggest`, null, at); assert.deepEqual(r.j.manualOnly.map(x => x.id), [t2id]); assert.equal(r.j.technicians.length, 0); assert.equal(r.j.excluded.find(x => x.id === t1id).reasons[0], 'does not cover this service'); assert.equal(r.j.manualOnly[0].distanceKm, null, 'no coords on request');
    assert.equal((await call('PUT', '/api/tech/availability', { available: true, location: { lat: 999, lon: 0, at: '2099-01-01' } }, t1.token)).code, 400, 'bad location rejected');
    r = await call('GET', `/api/admin/requests/${rid}/suggest`, null, at); assert.equal(r.j.technicians[0].id, t1id, 'nearest first'); assert(r.j.technicians[0].distanceKm < 5);
    assert.equal((await call('GET', `/api/admin/requests/${rid}/suggest`, null, ct)).code, 403);
    assert.equal((await call('POST', `/api/admin/requests/${rid}/assign`, { technicianId: t1id }, ct)).code, 403);
    await approve(rid);
    assert.equal((await call('POST', `/api/admin/requests/${rid}/assign`, { technicianId: ann.user.id }, at)).code, 400, 'cannot assign a customer');
    r = await call('POST', `/api/admin/requests/${rid}/assign`, { technicianId: t1id }, at); assert.equal(r.j.request.status, 'assigned');
    assert.equal((await call('GET', `/api/admin/requests/${rid}/suggest`, null, at)).j.technicians.some(t => t.id === t1id), false, 'busy technician not suggested');

    // isolation
    assert.equal((await call('GET', '/api/requests', null, t1.token)).j.requests.length, 1);
    assert.equal((await call('GET', '/api/requests', null, t2.token)).j.requests.length, 0);
    assert.equal((await call('GET', '/api/requests', null, other)).j.requests.length, 0);
    for (const [who, tok] of [['other customer', other], ['other technician', t2.token]]) {
      assert.equal((await call('GET', `/api/requests/${rid}/messages`, null, tok)).code, 404, who + ' cannot read chat');
      assert.equal((await call('POST', `/api/requests/${rid}/messages`, { text: 'hi' }, tok)).code, 404, who + ' cannot post');
      assert.equal((await call('POST', `/api/requests/${rid}/status`, { status: 'in_progress' }, tok)).code, 403, who + ' cannot change status');
    }
    assert.equal((await call('POST', `/api/requests/${rid}/status`, { status: 'cancelled' }, other)).code, 403);
    assert.equal((await call('GET', '/api/me')).code, 401);
    assert.equal((await call('GET', '/api/me', null, ct.slice(0, -4) + 'AAAA')).code, 401, 'tampered token');

    // chat + lifecycle
    assert.equal((await call('POST', `/api/requests/${rid}/messages`, { text: 'On my way' }, t1.token)).code, 200);
    assert.equal((await call('GET', `/api/requests/${rid}/messages`, null, ct)).j.messages.length, 1);
    assert.equal((await call('GET', '/api/conversations', null, ct)).j.conversations.length, 1);
    assert.equal((await call('POST', `/api/requests/${rid}/status`, { status: 'completed' }, t1.token)).code, 403, 'cannot skip in_progress');
    assert.equal((await call('POST', `/api/requests/${rid}/status`, { status: 'in_progress' }, t1.token)).code, 200);
    assert.equal((await call('POST', `/api/requests/${rid}/status`, { status: 'cancelled' }, ct)).code, 403, 'customer cannot cancel in progress');
    assert.equal((await call('POST', `/api/requests/${rid}/status`, { status: 'completed' }, t1.token)).code, 200);
    assert.equal((await call('POST', `/api/requests/${rid}/status`, { status: 'in_progress' }, t1.token)).code, 403, 'completed is final');

    // admin
    r = await call('GET', '/api/admin/stats', null, at); assert.equal(r.j.byRole.technician, 2); assert.equal(r.j.byStatus.completed, 1);
    assert.equal((await call('GET', '/api/admin/stats', null, ct)).code, 403);
    assert.equal((await call('GET', '/api/admin/users', null, t1.token)).code, 403);
    assert.equal((await call('POST', '/api/admin/services', { name: 'Hack' }, ct)).code, 403);
    r = await call('POST', `/api/admin/users/${t2id}/reset-link`, {}, at); assert.equal(r.code, 200);
    assert(r.j.link.includes('recovery')); assert.equal((await call('POST', `/api/admin/users/${t2id}/reset-link`, {}, ct)).code, 403);
    await call('POST', `/api/admin/users/${t2id}/block`, { blocked: true }, at);
    assert.equal((await call('GET', '/api/me', null, t2.token)).code, 403, 'blocked user token rejected');

    // Expanded dashboard access and validation.
    assert.equal((await call('GET','/api/content')).j.content.cashEnabled,true);
    const content={announcement:'Team update',cashEnabled:false,help:[{q:'Timing?',qAr:'الموعد؟',answer:'Contact the team',answerAr:'تواصل مع الفريق'}]};
    assert.equal((await call('PUT','/api/admin/content',content,ct)).code,403);
    assert.equal((await call('PUT','/api/admin/content',{...content,help:[{q:'x'}]},at)).code,400);
    assert.equal((await call('PUT','/api/admin/content',content,at)).code,200);
    assert.equal((await call('GET','/api/content')).j.content.announcement,'Team update');
    assert.equal((await call('POST','/api/feedback',{stars:7,note:'bad'},ct)).code,400);
    assert.equal((await call('POST','/api/feedback',{stars:5,note:'good'})).code,401);
    const fb=await call('POST','/api/feedback',{stars:5,note:'good'},ct);assert.equal(fb.code,200);
    assert.equal((await call('GET','/api/admin/feedback',null,ct)).code,403);
    assert.equal((await call('PUT','/api/admin/feedback/'+fb.j.feedback.id,{reviewed:true},ct)).code,403);
    assert.equal((await call('PUT','/api/admin/feedback/'+fb.j.feedback.id,{reviewed:true},at)).j.feedback.reviewed,true);
    assert.equal((await call('GET','/api/admin/feedback',null,at)).j.feedback.length,1);
    assert.equal((await call('POST',`/api/requests/${rid}/messages`,{text:'Team reply'},at)).code,200);
    assert.equal((await call('GET','/api/conversations',null,at)).j.conversations.length,1);
    assert.equal((await call('GET',`/api/requests/${rid}/messages`,null,ct)).j.messages.at(-1).text,'Team reply');
    assert.equal((await call('POST',`/api/requests/${rid}/status`,{status:'pending'},at)).code,403,'admin cannot reopen completed request');
    assert.equal((await call('POST',`/api/requests/${fr.id}/status`,{status:'completed'},at)).code,403,'admin cannot skip lifecycle');
    assert.equal((await call('PUT','/api/me',{location:{lat:null,lon:0}},ct)).code,400);
    assert.equal((await call('PUT','/api/tech/availability',{available:'false'},t1.token)).code,400);
    assert.equal((await call('PUT',`/api/admin/users/${t1id}/skills`,{skills:['unknown']},at)).code,400);
    assert.equal((await call('POST',`/api/admin/requests/${fr.id}/assign`,{technicianId:t1id},at)).code,400,'wrong skills');
    const reqBody={serviceId:'ac-maintenance',description:'Air conditioner test',address:'Cairo home'};
    const r2=(await call('POST','/api/requests',reqBody,ct)).j.request;
    await call('PUT',`/api/admin/technicians/${t1id}/availability`,{available:false},at);
    assert.equal((await call('POST',`/api/admin/requests/${r2.id}/assign`,{technicianId:t1id},at)).code,400,'unavailable');
    await call('PUT',`/api/admin/technicians/${t1id}/availability`,{available:true},at);
    const r3=(await call('POST','/api/requests',reqBody,ct)).j.request;
    await approve(r2.id);await approve(r3.id);
    const race=await Promise.all([r2,r3].map(x=>call('POST',`/api/admin/requests/${x.id}/assign`,{technicianId:t1id},at)));
    assert.deepEqual(race.map(x=>x.code).sort(),[200,400],'cannot double-book concurrent assignment');
    assert.equal((await call('GET','/api/admin/activity',null,ct)).code,403);
    const activity=(await call('GET','/api/admin/activity',null,at)).j.activity;
    assert(activity.some(x=>x.path==='/api/admin/content'));
    assert(!JSON.stringify(activity).includes('test-service-key'),'audit excludes secrets and request bodies');
    assert.equal((await call('POST','/api/feedback',{stars:5,note:'x'.repeat(70000)},ct)).code,413);
    assert.equal((await call('POST','/api/feedback',[],ct)).code,400);
    console.log('Expanded dashboard, role isolation, validation and concurrent assignment checks passed');
    console.log('ALL BACKEND TESTS PASSED');
  } catch (e) { console.error('FAIL', e); process.exitCode = 1; }
  srv.close(); fake.close();
});
