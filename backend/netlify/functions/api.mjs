// Netlify Function (v2, Fetch API) adapter for the existing Node handler. Not deployed.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { handle } = require('../../handler.js');

export default async (request) => {
  const text = request.method === 'GET' || request.method === 'HEAD' ? '' : await request.text();
  let body = {};
  if (Buffer.byteLength(text)>65536) return new Response(JSON.stringify({error:'Request too large'}),{status:413,headers:{'content-type':'application/json'}});
  if (text) { try { body = JSON.parse(text); } catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { 'content-type': 'application/json' } }); } }
  const url = new URL(request.url);
  const headers = {};
  request.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });
  const req = { method: request.method, url: url.pathname + url.search, headers, body };
  const out = { status: 200, headers: new Headers(), chunks: [] };
  await new Promise((resolve, reject) => {
    const res = {
      get statusCode() { return out.status; }, set statusCode(v) { out.status = v; },
      setHeader: (k, v) => out.headers.set(k, v),
      end: (d) => { if (d) out.chunks.push(d); resolve(); },
    };
    handle(req, res).catch(reject);
  });
  const nobody = out.status === 204 || out.status === 304;
  return new Response(nobody ? null : out.chunks.join(''), { status: out.status, headers: out.headers });
};
export const config = { path: '/api/*' };
