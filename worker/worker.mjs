var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toBinary = Uint8Array.fromBase64 || /* @__PURE__ */ (() => {
  var table = new Uint8Array(128);
  for (var i = 0; i < 64; i++) table[i < 26 ? i + 65 : i < 52 ? i + 71 : i < 62 ? i - 4 : i * 4 - 205] = i;
  return (base64) => {
    var n = base64.length, bytes = new Uint8Array((n - (base64[n - 1] == "=") - (base64[n - 2] == "=")) * 3 / 4 | 0);
    for (var i2 = 0, j = 0; i2 < n; ) {
      var c0 = table[base64.charCodeAt(i2++)], c1 = table[base64.charCodeAt(i2++)];
      var c2 = table[base64.charCodeAt(i2++)], c3 = table[base64.charCodeAt(i2++)];
      bytes[j++] = c0 << 2 | c1 >> 4;
      bytes[j++] = c1 << 4 | c2 >> 2;
      bytes[j++] = c2 << 6 | c3;
    }
    return bytes;
  };
})();

// src/lib.js
var require_lib = __commonJS({
  "src/lib.js"(exports, module) {
    "use strict";
    var DB = null;
    var ready = null;
    var overlay = null;
    var queue = Promise.resolve();
    var env = () => globalThis.process && globalThis.process.env || {};
    var ADMIN_USER_ID = "admin-1";
    function bind2(d) {
      if (DB !== d) {
        DB = d;
        ready = null;
      }
    }
    var enc = new TextEncoder();
    var dec = new TextDecoder();
    var b64u = (buf) => {
      let s = "";
      const a = new Uint8Array(buf);
      for (const x of a) s += String.fromCharCode(x);
      return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    };
    var unb64u = (t) => {
      t = t.replace(/-/g, "+").replace(/_/g, "/");
      while (t.length % 4) t += "=";
      const s = atob(t);
      const a = new Uint8Array(s.length);
      for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i);
      return a;
    };
    var id = () => {
      const a = new Uint8Array(9);
      crypto.getRandomValues(a);
      return [...a].map((x) => x.toString(16).padStart(2, "0")).join("");
    };
    async function init() {
      if (ready) return ready;
      ready = (async () => {
        await DB.prepare("CREATE TABLE IF NOT EXISTS docs (c TEXT NOT NULL, id TEXT NOT NULL, doc TEXT NOT NULL, PRIMARY KEY (c, id))").run();
        if (!(await all("services")).length) {
          const list = [["finishing-renovation", "Finishing & Renovation", "\u0627\u0644\u062A\u0634\u0637\u064A\u0628\u0627\u062A \u0648\u0627\u0644\u062A\u062C\u062F\u064A\u062F"], ["ac-maintenance", "AC Maintenance", "\u0635\u064A\u0627\u0646\u0629 \u0627\u0644\u062A\u0643\u064A\u064A\u0641"], ["appliance-maintenance", "Electrical Appliance Maintenance", "\u0635\u064A\u0627\u0646\u0629 \u0627\u0644\u0623\u062C\u0647\u0632\u0629 \u0627\u0644\u0643\u0647\u0631\u0628\u0627\u0626\u064A\u0629"]];
          for (const [i, [slug, name, nameAr]] of list.entries()) await put("services", { id: slug, name, nameAr, popular: true, active: true, order: i });
        }
        const email = String(env().ADMIN_EMAIL || "").trim().toLowerCase();
        if (email) {
          const a = await get("users", ADMIN_USER_ID);
          if (!a) await put("users", { id: ADMIN_USER_ID, firstName: "Admin", lastName: "", email, role: "admin", createdAt: (/* @__PURE__ */ new Date()).toISOString(), addresses: [] });
          else if (a.email !== email) await put("users", { ...a, email });
        }
      })().catch((e) => {
        ready = null;
        throw e;
      });
      return ready;
    }
    var parse = (r) => JSON.parse(r.doc);
    async function all(c) {
      const rows = (await DB.prepare("SELECT id, doc FROM docs WHERE c = ?").bind(c).all()).results;
      const m = new Map(rows.map((r) => [r.id, parse(r)]));
      if (overlay) for (const [k, v] of overlay) {
        const [cc, ii] = k.split("\0");
        if (cc === c) {
          if (v === null) m.delete(ii);
          else m.set(ii, structuredClone(v));
        }
      }
      return [...m.values()];
    }
    async function get(c, i) {
      if (overlay && overlay.has(c + "\0" + i)) {
        const v = overlay.get(c + "\0" + i);
        return v === null ? null : structuredClone(v);
      }
      const r = await DB.prepare("SELECT doc FROM docs WHERE c = ? AND id = ?").bind(c, i).first();
      return r ? parse(r) : null;
    }
    var upsert = (c, doc) => DB.prepare("INSERT INTO docs (c, id, doc) VALUES (?, ?, ?) ON CONFLICT (c, id) DO UPDATE SET doc = excluded.doc").bind(c, doc.id, JSON.stringify(doc));
    async function put(c, doc) {
      if (overlay) overlay.set(c + "\0" + doc.id, structuredClone(doc));
      else await upsert(c, doc).run();
      return doc;
    }
    async function del(c, i) {
      if (overlay) overlay.set(c + "\0" + i, null);
      else await DB.prepare("DELETE FROM docs WHERE c = ? AND id = ?").bind(c, i).run();
    }
    async function withWriteLock(fn) {
      const run = queue.then(async () => {
        overlay = /* @__PURE__ */ new Map();
        try {
          const result = await fn();
          const stmts = [...overlay].map(([k, v]) => {
            const [c, i] = k.split("\0");
            return v === null ? DB.prepare("DELETE FROM docs WHERE c = ? AND id = ?").bind(c, i) : upsert(c, v);
          });
          overlay = null;
          for (let k = 0; k < stmts.length; k += 90) await DB.batch(stmts.slice(k, k + 90));
          return result;
        } finally {
          overlay = null;
        }
      });
      queue = run.catch(() => {
      });
      return run;
    }
    async function putNow(c, doc) {
      await upsert(c, doc).run();
    }
    var secret = () => {
      const s = env().JWT_SECRET;
      if (!s || s.length < 32) throw Object.assign(new Error("not configured"), { code: 503 });
      return s;
    };
    var hmacKey = async (usage) => crypto.subtle.importKey("raw", enc.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, usage);
    async function signJwt(claims) {
      const h = b64u(enc.encode(JSON.stringify({ alg: "HS256", typ: "JWT" }))), p = b64u(enc.encode(JSON.stringify(claims)));
      const sig = await crypto.subtle.sign("HMAC", await hmacKey(["sign"]), enc.encode(h + "." + p));
      return h + "." + p + "." + b64u(sig);
    }
    async function verifyJwt(token, purpose) {
      try {
        const parts = String(token || "").split(".");
        if (parts.length !== 3) return null;
        const ok = await crypto.subtle.verify("HMAC", await hmacKey(["verify"]), unb64u(parts[2]), enc.encode(parts[0] + "." + parts[1]));
        if (!ok) return null;
        const c = JSON.parse(dec.decode(unb64u(parts[1])));
        if (!(c.exp > Date.now() / 1e3) || c.aud !== purpose || !c.sub) return null;
        return c;
      } catch {
        return null;
      }
    }
    var verifyToken = (t) => verifyJwt(t, "tazbeeta");
    var signToken = (u) => signJwt({ sub: u.id, email: u.email, aud: "tazbeeta", exp: Math.floor(Date.now() / 1e3) + 30 * 86400 });
    async function pbkdf2(pw, salt, iter) {
      const k = await crypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveBits"]);
      return b64u(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: iter }, k, 256));
    }
    var iters = () => Math.max(1e3, Math.min(1e5, +(env().PBKDF2_ITER || 1e5)));
    async function setPassword(uid, pw) {
      const salt = crypto.getRandomValues(new Uint8Array(16)), iter = iters();
      await put("creds", { id: uid, salt: b64u(salt), iter, hash: await pbkdf2(pw, salt, iter) });
    }
    async function checkPassword(uid, pw) {
      const c = await get("creds", uid);
      if (!c) return false;
      const h = await pbkdf2(pw, unb64u(c.salt), c.iter);
      let d = h.length ^ c.hash.length;
      for (let i = 0; i < h.length; i++) d |= h.charCodeAt(i) ^ (c.hash.charCodeAt(i) || 0);
      return d === 0;
    }
    async function makeResetToken(uid) {
      const c = await get("creds", uid);
      return signJwt({ sub: uid, aud: "reset", pv: c ? c.hash.slice(0, 10) : "none", exp: Math.floor(Date.now() / 1e3) + 7 * 86400 });
    }
    async function verifyResetToken(t) {
      const c = await verifyJwt(t, "reset");
      if (!c) return null;
      const cr = await get("creds", c.sub);
      return (cr ? cr.hash.slice(0, 10) : "none") === c.pv ? c.sub : null;
    }
    async function throttled(email, max = 8) {
      const r = await DB.prepare("SELECT doc FROM docs WHERE c = ? AND id = ?").bind("throttle", email).first();
      if (!r) return false;
      const d = parse(r);
      return d.count >= max && Date.now() - d.last < 15 * 6e4;
    }
    async function recordFailure(email) {
      const r = await DB.prepare("SELECT doc FROM docs WHERE c = ? AND id = ?").bind("throttle", email).first();
      const d = r ? parse(r) : { id: email, count: 0, last: 0 };
      if (Date.now() - d.last > 15 * 6e4) d.count = 0;
      d.count++;
      d.last = Date.now();
      await putNow("throttle", d);
    }
    async function clearFailures(email) {
      await DB.prepare("DELETE FROM docs WHERE c = ? AND id = ?").bind("throttle", email).run();
    }
    var publicUser = (u) => u && { id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email, role: u.role, createdAt: u.createdAt, blocked: !!u.blocked, available: !!u.available, skills: u.skills || [], location: u.location || null, addresses: u.addresses || [], phone: u.phone || "", bio: u.bio || "", area: u.area || "", positionIds: u.positionIds || [], areaIds: u.areaIds || [] };
    module.exports = { bind: bind2, withWriteLock, init, all, get, put, del, id, verifyToken, signToken, setPassword, checkPassword, makeResetToken, verifyResetToken, throttled, recordFailure, clearFailures, publicUser, ADMIN_USER_ID };
  }
});

// src/handler.js
var require_handler = __commonJS({
  "src/handler.js"(exports, module) {
    "use strict";
    var L2 = require_lib();
    var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    var STATUSES = ["pending", "inspection", "quoted", "approved", "assigned", "in_progress", "completed", "cancelled"];
    var HttpError = class extends Error {
      constructor(code, msg) {
        super(msg);
        this.code = code;
      }
    };
    var bad = (m) => new HttpError(400, m);
    async function auth(req) {
      const hd = req.headers["authorization"] || "";
      const c = await L2.verifyToken(hd.startsWith("Bearer ") ? hd.slice(7) : "");
      if (!c) throw new HttpError(401, "Unauthorized");
      const u = await L2.get("users", c.sub);
      if (!u) throw new HttpError(401, "Unauthorized");
      if (u.blocked) throw new HttpError(403, "Account blocked");
      if (u.verified === false) throw new HttpError(403, "Email not verified");
      return u;
    }
    var needAdmin = async (req) => {
      const u = await auth(req);
      if (u.role !== "admin") throw new HttpError(403, "Admins only");
      return u;
    };
    var NOW = () => (/* @__PURE__ */ new Date()).toISOString();
    async function notify(userId, text, requestId) {
      if (!userId) return;
      await L2.put("notifs", { id: L2.id(), userId, text, requestId: requestId || null, read: false, createdAt: NOW() });
      try { await sendPush(userId, text, requestId); } catch (_) {}
    }
    var fcmTok = null;
    async function fcmToken(sa) {
      if (fcmTok && fcmTok.exp > Date.now() + 6e4) return fcmTok.t;
      const b64u2 = (b) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      const te = new TextEncoder(), now = Math.floor(Date.now() / 1e3);
      const head = b64u2(te.encode(JSON.stringify({ alg: "RS256", typ: "JWT" }))), pay = b64u2(te.encode(JSON.stringify({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/firebase.messaging", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 })));
      const der = Uint8Array.from(atob(sa.private_key.replace(/-----[A-Z ]+-----/g, "").replace(/\s/g, "")), (c) => c.charCodeAt(0));
      const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
      const sig = b64u2(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, te.encode(head + "." + pay)));
      const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: head + "." + pay + "." + sig }) });
      const j = await r.json();
      if (!j.access_token) throw new Error("fcm auth");
      fcmTok = { t: j.access_token, exp: Date.now() + 3e6 };
      return j.access_token;
    }
    async function sendPush(userId, text, requestId) {
      const raw = globalThis.process && globalThis.process.env && globalThis.process.env.FCM_SERVICE_ACCOUNT;
      if (!raw) return;
      const sa = JSON.parse(raw);
      const devs = (await L2.all("devices")).filter((d) => d.userId === userId);
      if (!devs.length) return;
      const at = await fcmToken(sa);
      for (const d of devs.slice(0, 5)) {
        const r = await fetch("https://fcm.googleapis.com/v1/projects/" + sa.project_id + "/messages:send", { method: "POST", headers: { authorization: "Bearer " + at, "content-type": "application/json" }, body: JSON.stringify({ message: { token: d.token, notification: { title: "Tazbeeta", body: text.slice(0, 120) }, data: { requestId: requestId || "" }, android: { priority: "HIGH" } } }) });
        if (r.status === 404 || r.status === 400) await L2.del("devices", d.id);
      }
    }
    async function notifyAdmins(text, requestId) {
      for (const a of (await L2.all("users")).filter((x) => x.role === "admin")) await notify(a.id, text, requestId);
    }
    var maskNums = (t) => String(t).replace(/\+?\d[\d\s().-]{6,}\d/g, "[number hidden]");
    var routes = [];
    var route = (m, path, fn) => routes.push({ m, re: new RegExp("^" + path.replace(/:(\w+)/g, "(?<$1>[^/]+)") + "$"), fn });
    route("GET", "/api/health", async () => ({ ok: true }));
    route("GET", "/api/config", async () => ({ auth: "builtin" }));
    var pwOk = (p) => typeof p === "string" && p.length >= 8 && p.length <= 200;
    var vEnv = () => globalThis.process && globalThis.process.env || {};
    async function gmailSend(to, subject, text, html) {
      const e = vEnv();
      if (!e.GMAIL_CLIENT_ID || !e.GMAIL_CLIENT_SECRET || !e.GMAIL_REFRESH_TOKEN) throw new HttpError(503, "Email is not configured");
      const tr = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: e.GMAIL_CLIENT_ID, client_secret: e.GMAIL_CLIENT_SECRET, refresh_token: e.GMAIL_REFRESH_TOKEN, grant_type: "refresh_token" }) });
      const tj = await tr.json().catch(() => ({}));
      if (!tj.access_token) throw new HttpError(502, "Could not send the email. Try again.");
      const b64 = (str) => btoa(String.fromCharCode(...new TextEncoder().encode(str)));
      const b64w = (str) => b64(str).replace(/.{76}/g, "$&\r\n");
      const bnd = "tzb" + Date.now().toString(36);
      const from = e.GMAIL_FROM || "Tazbeeta";
      const raw = ["From: =?UTF-8?B?" + b64(from) + "?= <" + (e.GMAIL_SENDER || "") + ">", "To: " + to, "Subject: =?UTF-8?B?" + b64(subject) + "?=", "MIME-Version: 1.0", "Content-Type: multipart/alternative; boundary=" + bnd, "", "--" + bnd, "Content-Type: text/plain; charset=UTF-8", "Content-Transfer-Encoding: base64", "", b64w(text), "--" + bnd, "Content-Type: text/html; charset=UTF-8", "Content-Transfer-Encoding: base64", "", b64w(html), "--" + bnd + "--", ""].join("\r\n");
      const rawU = btoa(String.fromCharCode(...new TextEncoder().encode(raw))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      const gr = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", { method: "POST", headers: { authorization: "Bearer " + tj.access_token, "content-type": "application/json" }, body: JSON.stringify({ raw: rawU }) });
      if (!gr.ok) throw new HttpError(502, "Could not send the email. Try again.");
    }
    var codeHash = async (uid, code) => {
      const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(uid + ":" + code + ":" + vEnv().JWT_SECRET));
      return Array.from(new Uint8Array(d), (x) => x.toString(16).padStart(2, "0")).join("");
    };
    async function issueCode(u) {
      const buf = new Uint32Array(1);
      crypto.getRandomValues(buf);
      const code = String(buf[0] % 1e6).padStart(6, "0");
      await L2.clearFailures("vt:" + u.id);
      await L2.put("emailcodes", { id: u.id, hash: await codeHash(u.id, code), exp: Date.now() + 15 * 6e4, tries: 0, sentAt: Date.now() });
      const name = u.firstName || "";
      const text = "Tazbeeta\n\nHi " + name + ",\nYour verification code is: " + code + "\nIt expires in 15 minutes. If you did not create an account, ignore this email.\n\n\u0643\u0648\u062f \u0627\u0644\u062a\u0641\u0639\u064a\u0644: " + code;
      const html = '<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;color:#222"><h2 style="margin:0 0 16px">Tazbeeta</h2><p>Hi ' + name.replace(/[<>&]/g, "") + ',</p><p>Your verification code is:</p><p style="font-size:32px;letter-spacing:6px;font-weight:bold;margin:16px 0">' + code + '</p><p>This code expires in 15 minutes. If you did not create an account, you can ignore this email.</p><p dir="rtl" style="color:#555">\u0643\u0648\u062f \u0627\u0644\u062a\u0641\u0639\u064a\u0644 \u0627\u0644\u062e\u0627\u0635 \u0628\u0643: <b>' + code + '</b></p></div>';
      await gmailSend(u.email, "Your Tazbeeta verification code", text, html);
    }
    route("POST", "/api/auth/signup", async ({ body }) => {
      const email = String(body.email || "").trim().toLowerCase();
      if (!EMAIL.test(email) || email.length > 120) throw bad("Enter a valid email");
      if (!pwOk(body.password)) throw bad("Password must be 8 to 200 characters");
      const fn = String(body.firstName || "").trim(), ln = String(body.lastName || "").trim();
      if (!fn || fn.length > 60 || ln.length > 60) throw bad("Enter your name");
      const ph = String(body.phone || "").trim();
      if (ph && !/^[+0-9 ()-]{7,30}$/.test(ph)) throw bad("Enter a valid phone number");
      const verify = body.verify === true || vEnv().REQUIRE_VERIFY === "1";
      const existing = (await L2.all("users")).find((u2) => u2.email === email);
      if (existing && !(verify && existing.verified === false && existing.role === "customer")) throw new HttpError(409, "This email already has an account");
      if (verify) {
        if (await L2.throttled("vs:" + email)) throw new HttpError(429, "Too many attempts. Try again in 15 minutes");
        await L2.recordFailure("vs:" + email);
        const base = existing || { id: L2.id(), role: "customer", createdAt: (/* @__PURE__ */ new Date()).toISOString(), addresses: [] };
        const u2 = await L2.put("users", { ...base, firstName: fn, lastName: ln, email, phone: ph, verified: false });
        await L2.setPassword(u2.id, body.password);
        await issueCode(u2);
        return { needsVerification: true, email };
      }
      const u = await L2.put("users", { id: L2.id(), firstName: fn, lastName: ln, email, phone: ph, role: "customer", createdAt: (/* @__PURE__ */ new Date()).toISOString(), addresses: [] });
      await L2.setPassword(u.id, body.password);
      return { token: await L2.signToken(u), user: L2.publicUser(u) };
    });
    route("POST", "/api/auth/verify-email", async ({ body }) => {
      const email = String(body.email || "").trim().toLowerCase();
      const code = String(body.code || "").trim();
      if (!EMAIL.test(email) || !/^\d{6}$/.test(code)) throw bad("Enter the 6-digit code");
      if (await L2.throttled("vc:" + email)) throw new HttpError(429, "Too many attempts. Try again in 15 minutes");
      const u = (await L2.all("users")).find((x) => x.email === email);
      const rec = u && await L2.get("emailcodes", u.id);
      const wrong = () => bad("The code is wrong or expired. Request a new one.");
      if (!u || u.verified !== false || !rec) { await L2.recordFailure("vc:" + email); throw wrong(); }
      if (rec.exp < Date.now() || await L2.throttled("vt:" + u.id, 5)) throw wrong();
      if ((await codeHash(u.id, code)) !== rec.hash) {
        await L2.recordFailure("vt:" + u.id);
        await L2.recordFailure("vc:" + email);
        throw wrong();
      }
      const u2 = await L2.put("users", { ...u, verified: true });
      await L2.del("emailcodes", u.id);
      await L2.clearFailures("vc:" + email);
      return { token: await L2.signToken(u2), user: L2.publicUser(u2) };
    });
    route("POST", "/api/auth/resend-code", async ({ body }) => {
      const email = String(body.email || "").trim().toLowerCase();
      if (!EMAIL.test(email) || email.length > 120) throw bad("Enter a valid email");
      if (await L2.throttled("vr:" + email)) throw new HttpError(429, "Too many attempts. Try again in 15 minutes");
      await L2.recordFailure("vr:" + email);
      const u = (await L2.all("users")).find((x) => x.email === email);
      if (u && u.verified === false) {
        const rec = await L2.get("emailcodes", u.id);
        if (rec && Date.now() - rec.sentAt < 45e3) throw new HttpError(429, "Wait a moment before asking for another code");
        await issueCode(u);
      }
      return { ok: true };
    });
    route("POST", "/api/auth/login", async ({ body }) => {
      const email = String(body.email || "").trim().toLowerCase();
      if (await L2.throttled(email)) throw new HttpError(429, "Too many attempts. Try again in 15 minutes");
      const u = (await L2.all("users")).find((x) => x.email === email);
      const ok = u && typeof body.password === "string" && await L2.checkPassword(u.id, body.password);
      if (!ok) {
        await L2.recordFailure(email);
        throw new HttpError(401, "Wrong email or password");
      }
      if (u.blocked) throw new HttpError(403, "Account blocked");
      if (u.verified === false) throw new HttpError(403, "Email not verified");
      await L2.clearFailures(email);
      return { token: await L2.signToken(u), user: L2.publicUser(u) };
    });
    route("POST", "/api/auth/forgot", async ({ body }) => {
      const email = String(body.email || "").trim().toLowerCase();
      if (!EMAIL.test(email) || email.length > 120) throw bad("Enter a valid email");
      if (await L2.throttled("fg:" + email)) return { ok: true };
      await L2.recordFailure("fg:" + email);
      const u = (await L2.all("users")).find((x) => x.email === email && x.role !== "admin");
      const open = (await L2.all("resets")).find((r) => r.email === email && !r.done);
      if (open) await L2.put("resets", { ...open, lastAt: (/* @__PURE__ */ new Date()).toISOString(), count: (open.count || 1) + 1 });
      else await L2.put("resets", { id: L2.id(), email, userId: u ? u.id : null, phone: u ? u.phone || "" : "", done: false, createdAt: (/* @__PURE__ */ new Date()).toISOString(), lastAt: (/* @__PURE__ */ new Date()).toISOString(), count: 1 });
      return { ok: true };
    });
    route("GET", "/api/admin/reset-requests", async ({ req }) => {
      await needAdmin(req);
      return { requests: (await L2.all("resets")).filter((r) => !r.done).sort((a, b) => (b.lastAt || "").localeCompare(a.lastAt || "")) };
    });
    route("POST", "/api/admin/reset-requests/:id/done", async ({ req, params }) => {
      await needAdmin(req);
      const r = await L2.get("resets", params.id);
      if (!r) throw new HttpError(404, "Not found");
      await L2.put("resets", { ...r, done: true, doneAt: (/* @__PURE__ */ new Date()).toISOString() });
      return { ok: true };
    });
    route("POST", "/api/auth/reset", async ({ body }) => {
      if (!pwOk(body.password)) throw bad("Password must be 8 to 200 characters");
      const id = await L2.verifyResetToken(body.token);
      if (!id) throw bad("This link is invalid or expired. Ask for a new one.");
      const u = await L2.get("users", id);
      if (!u) throw bad("This link is invalid or expired. Ask for a new one.");
      await L2.setPassword(id, body.password);
      return { ok: true };
    });
    route("POST", "/api/auth/change-password", async ({ req, body }) => {
      const u = await auth(req);
      if (!pwOk(body.newPassword) || !await L2.checkPassword(u.id, String(body.password || ""))) throw bad("Current password is wrong or the new one is too short");
      await L2.setPassword(u.id, body.newPassword);
      return { ok: true };
    });
    route("GET", "/api/me", async ({ req }) => ({ user: L2.publicUser(await auth(req)) }));
    route("PUT", "/api/me", async ({ req, body }) => {
      const u = await auth(req);
      for (const k of ["firstName", "lastName"]) if (k in body) {
        if (typeof body[k] !== "string" || !body[k].trim() || body[k].length > 60) throw bad("Name must contain 1 to 60 characters");
      }
      if ("phone" in body && (typeof body.phone !== "string" || body.phone.length > 30 || body.phone.trim() && !/^[+0-9 ()-]{7,30}$/.test(body.phone.trim()))) throw bad("Enter a valid phone number");
      if ("area" in body && (typeof body.area !== "string" || body.area.length > 100)) throw bad("Area must be at most 100 characters");
      if ("addresses" in body && (!Array.isArray(body.addresses) || body.addresses.length > 10 || body.addresses.some((a) => !a || typeof a.label !== "string" || !a.label.trim() || a.label.length > 40 || typeof a.line !== "string" || a.line.trim().length < 4 || a.line.length > 200))) throw bad("Each address needs a label and a full address (max 10)");
      if ("bio" in body && (typeof body.bio !== "string" || body.bio.length > 300)) throw bad("Bio must be at most 300 characters");
      for (const k of ["firstName", "lastName", "phone", "area", "bio"]) if (k in body) u[k] = body[k].trim();
      if (body.location != null && !validLoc(body.location)) throw bad("Invalid location");
      if (validLoc(body.location)) u.location = { lat: +body.location.lat, lon: +body.location.lon, at: (/* @__PURE__ */ new Date()).toISOString() };
      if (Array.isArray(body.addresses)) u.addresses = body.addresses.slice(0, 10).map((a) => ({ label: String(a.label || "").slice(0, 40), line: String(a.line || "").slice(0, 200) }));
      await L2.put("users", u);
      return { user: L2.publicUser(u) };
    });
    route("GET", "/api/admin/services", async ({ req }) => {
      await needAdmin(req);
      return { services: await L2.all("services") };
    });
    route("GET", "/api/services", async () => ({ services: (await L2.all("services")).filter((s) => s.active).sort((a, b) => a.order - b.order) }));
    var km = (a, b) => {
      const R = 6371, d = (x) => x * Math.PI / 180;
      const dl = d(b.lat - a.lat), dn = d(b.lon - a.lon);
      const h2 = Math.sin(dl / 2) ** 2 + Math.cos(d(a.lat)) * Math.cos(d(b.lat)) * Math.sin(dn / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(h2));
    };
    async function reqArea(id) {
      if (id == null || id === "") return null;
      const a = (await L2.all("tags")).find((x) => x.id === id && (x.type === "area" || x.type === "village") && x.active);
      if (!a) throw bad("Unknown area");
      return a.id;
    }
    route("POST", "/api/requests", async ({ req, body }) => {
      const u = await auth(req);
      if (u.role !== "customer") throw new HttpError(403, "Only customers create requests");
      const custom = body.custom === true;
      if (custom && (typeof body.customTitle !== "string" || body.customTitle.trim().length < 3 || body.customTitle.length > 100)) throw bad("Describe the service you need (3 to 100 characters)");
      if (body.contactPhone != null && (typeof body.contactPhone !== "string" || body.contactPhone.length > 30 || body.contactPhone.trim() && !/^[+0-9 ()-]{7,30}$/.test(body.contactPhone.trim()))) throw bad("Enter a valid phone number");
      const s = custom ? { id: "custom-unclassified", name: body.customTitle.trim() } : await L2.get("services", String(body.serviceId || ""));
      if (!s || !custom && !s.active) throw bad("Unknown service");
      if (!body.description || String(body.description).length < 5) throw bad("Please describe the problem");
      if (!body.address || String(body.address).trim().length < 4) throw bad("Address is required");
      if (body.location != null && !validLoc(body.location)) throw bad("Invalid location");
      const loc = validLoc(body.location) ? { lat: +body.location.lat, lon: +body.location.lon } : null;
      const r = await L2.put("requests", { id: L2.id(), customerId: u.id, custom, customTitle: custom ? body.customTitle.trim() : null, contactPhone: typeof body.contactPhone === "string" ? body.contactPhone.trim() : u.phone || "", contactName: (u.firstName + " " + u.lastName).trim(), contactEmail: u.email, areaId: await reqArea(body.areaId), placeText: typeof body.placeText === "string" ? body.placeText.trim().slice(0, 100) : "", serviceId: s.id, serviceName: s.name, description: String(body.description).slice(0, 2e3), address: String(body.address).slice(0, 200), visit: cleanVisit(body.visit), location: loc, status: "pending", technicianId: null, createdAt: (/* @__PURE__ */ new Date()).toISOString() });
      return { request: r };
    });
    route("GET", "/api/requests", async ({ req }) => {
      const u = await auth(req);
      let list = await L2.all("requests");
      if (u.role === "customer") list = list.filter((r) => r.customerId === u.id);
      else if (u.role === "technician") list = list.filter((r) => r.technicianId === u.id);
      const users = await L2.all("users");
      const nm = (id) => {
        const x = users.find((y) => y.id === id);
        return x ? x.firstName + " " + x.lastName : null;
      };
      const all = await L2.all("requests");
      const tinfo = (id) => {
        if (!id) return null;
        const x = users.find((y) => y.id === id);
        const rs = all.filter((q) => q.technicianId === id && q.rating && q.rating.tech).map((q) => +q.rating.tech);
        return x ? { name: x.firstName + " " + x.lastName, rating: rs.length ? +(rs.reduce((a, b) => a + b, 0) / rs.length).toFixed(1) : null, jobs: rs.length } : null;
      };
      const out = list.map((r) => {
        const o = { ...r, customerName: u.role === "customer" ? void 0 : nm(r.customerId), technicianName: nm(r.technicianId), technician: u.role === "technician" ? void 0 : tinfo(r.technicianId), warrantyDays: 30, warrantyUntil: r.completedAt ? new Date(Date.parse(r.completedAt) + 30 * 864e5).toISOString() : null };
        if (u.role === "technician") { delete o.contactPhone; delete o.customerPhone; }
        return o;
      });
      return { requests: out.sort((a, b) => b.createdAt.localeCompare(a.createdAt)) };
    });
    route("POST", "/api/admin/requests/:id/inspection", async ({ req, body, params }) => {
      await needAdmin(req);
      const r = await L2.get("requests", params.id);
      if (!r) throw new HttpError(404, "Not found");
      if (!["pending", "inspection"].includes(r.status)) throw bad("Inspection cannot be changed at this stage");
      if (typeof body.note !== "string" || body.note.trim().length < 3 || body.note.length > 2e3) throw bad("Inspection note is required");
      r.inspection = { note: body.note.trim(), recordedAt: (/* @__PURE__ */ new Date()).toISOString() };
      r.status = "inspection";
      await L2.put("requests", r);
      return { request: r };
    });
    route("POST", "/api/admin/requests/:id/quote", async ({ req, body, params }) => {
      await needAdmin(req);
      const r = await L2.get("requests", params.id);
      if (!r) throw new HttpError(404, "Not found");
      if (r.custom && !r.classifiedAt) throw bad("Classify the custom request before quoting");
      if (!["inspection", "quoted"].includes(r.status) || !r.inspection) throw bad("Record inspection before quoting");
      if (typeof body.amount !== "number" || !Number.isFinite(body.amount) || body.amount <= 0 || body.amount > 1e9 || typeof body.currency !== "string" || !/^[A-Z]{3}$/.test(body.currency) || typeof body.scope !== "string" || body.scope.trim().length < 5 || body.scope.length > 2e3) throw bad("Valid amount, currency and scope are required");
      r.quote = { amount: body.amount, currency: body.currency, scope: body.scope.trim(), version: (r.quote?.version || 0) + 1, issuedAt: (/* @__PURE__ */ new Date()).toISOString() };
      r.status = "quoted";
      r.quoteAccepted = null;
      await L2.put("requests", r);
      await notify(r.customerId, "Your quote is ready. Review and accept it.", r.id);
      return { request: r };
    });
    route("POST", "/api/requests/:id/accept-quote", async ({ req, body, params }) => {
      const u = await auth(req);
      const r = await L2.get("requests", params.id);
      if (!r) throw new HttpError(404, "Not found");
      if (u.role !== "customer" || r.customerId !== u.id) throw new HttpError(403, "Only the request customer can accept");
      if (r.status !== "quoted" || !r.quote || body.version !== r.quote.version) throw bad("Quote changed. Review the latest quote");
      r.quoteAccepted = { version: r.quote.version, customerId: u.id, acceptedAt: (/* @__PURE__ */ new Date()).toISOString() };
      r.status = "approved";
      await L2.put("requests", r);
      return { request: r };
    });
    route("POST", "/api/requests/:id/status", async ({ req, body, params }) => {
      const u = await auth(req);
      const r = await L2.get("requests", params.id);
      if (!r) throw new HttpError(404, "Not found");
      const st = body.status;
      if (!STATUSES.includes(st)) throw bad("Bad status");
      const done = ["completed", "cancelled"].includes(r.status);
      if (u.role === "technician") {
        if (r.technicianId !== u.id || done || !(r.status === "assigned" && st === "in_progress" || r.status === "in_progress" && st === "completed")) throw new HttpError(403, "Not allowed");
      } else if (u.role === "customer") {
        if (r.customerId !== u.id || st !== "cancelled" || done || r.status === "in_progress") throw new HttpError(403, "Not allowed");
      } else if (u.role !== "admin" || done || st !== "cancelled") throw new HttpError(403, "Not allowed");
      r.status = st;
      if (st === "completed") r.completedAt = NOW();
      await L2.put("requests", r);
      const lbl = { in_progress: "Work started", completed: "Work completed", cancelled: "Request cancelled" }[st];
      if (lbl) {
        if (u.id !== r.customerId) await notify(r.customerId, lbl, r.id);
        if (u.role !== "admin") await notifyAdmins(lbl + " (request " + r.id.slice(0, 6) + ")", r.id);
      }
      return { request: r };
    });
    function validLoc(l) {
      return l && typeof l.lat === "number" && typeof l.lon === "number" && Number.isFinite(l.lat) && Number.isFinite(l.lon) && Math.abs(l.lat) <= 90 && Math.abs(l.lon) <= 180;
    }
    route("PUT", "/api/tech/availability", async ({ req, body }) => {
      const u = await auth(req);
      if (u.role !== "technician") throw new HttpError(403, "Technicians only");
      if (typeof body.available !== "boolean") throw bad("Invalid availability");
      u.available = body.available;
      if (body.location !== void 0 && body.location !== null && !validLoc(body.location)) throw bad("Invalid location");
      if (validLoc(body.location)) u.location = { lat: +body.location.lat, lon: +body.location.lon, at: (/* @__PURE__ */ new Date()).toISOString() };
      await L2.put("users", u);
      return { user: L2.publicUser(u) };
    });
    async function canChat(u, r) {
      return u.role === "admin" || r.customerId === u.id || r.technicianId === u.id;
    }
    route("GET", "/api/requests/:id/messages", async ({ req, params }) => {
      const u = await auth(req);
      const r = await L2.get("requests", params.id);
      if (!r || !await canChat(u, r)) throw new HttpError(404, "Not found");
      const us = await L2.all("users");
      const content = await appContent();
      const msgs = (await L2.all("messages")).filter((m) => m.requestId === r.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((m) => {
        const x = us.find((y) => y.id === m.senderId);
        const role = m.senderRole || (x ? x.role : "system");
        return { ...m, senderRole: role, senderName: m.senderName || (role === "admin" ? "Tazbeeta team" : x ? x.firstName : "Tazbeeta") };
      });
      return { messages: msgs, adminCanReply: u.role !== "admin" || !r.technicianId || !!content.adminChatReply };
    });
    route("POST", "/api/requests/:id/messages", async ({ req, body, params }) => {
      const u = await auth(req);
      const r = await L2.get("requests", params.id);
      if (!r || !await canChat(u, r)) throw new HttpError(404, "Not found");
      if (!body.text || !String(body.text).trim()) throw bad("Empty message");
      if (u.role === "admin" && r.technicianId && !(await appContent()).adminChatReply) throw new HttpError(403, "Chat is view-only for the company once a technician is assigned");
      let text = String(body.text).slice(0, 2e3);
      if (u.role !== "admin" && r.technicianId) text = maskNums(text);
      const m = await L2.put("messages", { id: L2.id(), requestId: r.id, senderId: u.id, senderRole: u.role, senderName: u.role === "admin" ? "Tazbeeta team" : u.firstName, text, createdAt: NOW() });
      for (const to of [r.customerId, r.technicianId].filter((x) => x && x !== u.id)) await notify(to, "New message: " + text.slice(0, 60), r.id);
      return { message: m };
    });
    route("GET", "/api/conversations", async ({ req }) => {
      const u = await auth(req);
      const reqs = (await L2.all("requests")).filter((r) => u.role === "admin" || r.customerId === u.id || r.technicianId === u.id);
      const msgs = await L2.all("messages");
      const out = [];
      for (const r of reqs) {
        const m = msgs.filter((x) => x.requestId === r.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        if (m.length) out.push({ request: r, last: m[0] });
      }
      return { conversations: out.sort((a, b) => b.last.createdAt.localeCompare(a.last.createdAt)) };
    });
    route("GET", "/api/admin/stats", async ({ req }) => {
      await needAdmin(req);
      const [u, r] = [await L2.all("users"), await L2.all("requests")];
      const by = (a, f) => a.reduce((o, x) => (o[f(x)] = (o[f(x)] || 0) + 1, o), {});
      return { users: u.length, byRole: by(u, (x) => x.role), requests: r.length, byStatus: by(r, (x) => x.status) };
    });
    route("GET", "/api/admin/users", async ({ req }) => {
      await needAdmin(req);
      return { users: (await L2.all("users")).map(L2.publicUser) };
    });
    route("POST", "/api/admin/users/:id/block", async ({ req, body, params }) => {
      const a = await needAdmin(req);
      const u = await L2.get("users", params.id);
      if (!u) throw new HttpError(404, "Not found");
      if (u.id === a.id) throw bad("Cannot block yourself");
      if (typeof body.blocked !== "boolean") throw bad("Invalid block status");
      u.blocked = body.blocked;
      await L2.put("users", u);
      return { user: L2.publicUser(u) };
    });
    route("DELETE", "/api/admin/requests/:id", async ({ req, params }) => {
      await needAdmin(req);
      const r = await L2.get("requests", params.id);
      if (!r) throw new HttpError(404, "Not found");
      for (const m of (await L2.all("messages")).filter((m) => m.requestId === r.id)) await L2.del("messages", m.id);
      await L2.del("requests", r.id);
      return { ok: true };
    });
    route("DELETE", "/api/admin/users/:id", async ({ req, params }) => {
      const a = await needAdmin(req);
      const u = await L2.get("users", params.id);
      if (!u) throw new HttpError(404, "Not found");
      if (u.role === "admin") throw bad("Cannot delete an admin account");
      if (u.id === a.id) throw bad("Cannot delete yourself");
      const reqs = await L2.all("requests");
      if (u.role === "technician" && reqs.some((r) => r.technicianId === u.id)) throw bad("This technician still has requests assigned");
      const mine = reqs.filter((r) => r.customerId === u.id);
      for (const r of mine) {
        for (const m of (await L2.all("messages")).filter((m) => m.requestId === r.id)) await L2.del("messages", m.id);
        await L2.del("requests", r.id);
      }
      for (const r of (await L2.all("resets")).filter((r) => r.userId === u.id || r.email === u.email)) await L2.del("resets", r.id);
      for (const f of (await L2.all("feedback")).filter((f) => f.userId === u.id)) await L2.del("feedback", f.id);
      await L2.del("creds", u.id);
      await L2.del("users", u.id);
      return { ok: true, deletedRequests: mine.length };
    });
    var siteUrl = () => {
      const value = process.env.SITE_URL;
      if (!value) throw new HttpError(503, "Public site URL is not configured");
      let u;
      try {
        u = new URL(value);
      } catch {
        throw new HttpError(503, "Public site URL is invalid");
      }
      if (u.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(u.hostname)) throw new HttpError(503, "Public site URL must use HTTPS");
      return u.origin;
    };
    route("POST", "/api/admin/users/:id/reset-link", async ({ req, params }) => {
      await needAdmin(req);
      const u = await L2.get("users", params.id);
      if (!u) throw new HttpError(404, "Not found");
      return { phone: u.phone || "", name: u.firstName, link: siteUrl() + "/reset?token=" + await L2.makeResetToken(u.id), note: "Bearer link: whoever opens it can set this account password. Send it only over a trusted channel. Not stored by this server." };
    });
    var SIGN_AR = "\u062A\u0638\u0628\u064A\u0637\u0647 - Tazbeeta";
    var SIGN_EN = "Tazbeeta";
    var waText = (kind, name, link) => kind === "reset" ? `\u0623\u0647\u0644\u0627 ${name}\u060C
\u062F\u0647 \u0631\u0627\u0628\u0637 \u062A\u0639\u064A\u064A\u0646 \u0643\u0644\u0645\u0629 \u0645\u0631\u0648\u0631 \u062C\u062F\u064A\u062F\u0629 \u0644\u062D\u0633\u0627\u0628\u0643 \u0641\u064A \u062A\u0638\u0628\u064A\u0637\u0647:
${link}
\u0627\u0644\u0631\u0627\u0628\u0637 \u064A\u062A\u0641\u062A\u062D \u0645\u0631\u0629 \u0648\u0627\u062D\u062F\u0629. \u0644\u0648 \u0645\u0637\u0644\u0628\u062A\u0647\u0648\u0634 \u062A\u062C\u0627\u0647\u0644 \u0627\u0644\u0631\u0633\u0627\u0644\u0629.

${SIGN_AR}

Hello ${name}, here is your link to set a new Tazbeeta password. If you did not ask for it, ignore this message.
${SIGN_EN}` : `\u0623\u0647\u0644\u0627 ${name}\u060C
${link}

${SIGN_AR}`;
    var botKey = (req) => {
      const k = process.env.BOT_KEY || "", h = req.headers["x-bot-key"] || "";
      if (k.length < 24 || h.length !== k.length) throw new HttpError(401, "Unauthorized");
      let d = 0;
      for (let i = 0; i < k.length; i++) d |= k.charCodeAt(i) ^ h.charCodeAt(i);
      if (d) throw new HttpError(401, "Unauthorized");
    };
    route("POST", "/api/admin/users/:id/send-reset", async ({ req, params }) => {
      await needAdmin(req);
      const u = await L2.get("users", params.id);
      if (!u || u.role === "admin") throw new HttpError(404, "Not found");
      const ph = String(u.phone || "").replace(/[^0-9]/g, "").replace(/^00/, "");
      if (ph.length < 8) throw bad("No phone number saved for this user");
      const to = ph.startsWith("0") ? "2" + ph : ph;
      const seen = await L2.get("content", "bot-seen");
      if (!seen || Date.now() - (seen.at || 0) > 5 * 60 * 1e3) throw new HttpError(409, "The WhatsApp bot is not online. Use the WhatsApp link instead.");
      const text = waText("reset", u.firstName || "", siteUrl() + "/reset?token=" + await L2.makeResetToken(u.id));
      await L2.put("outbox", { id: L2.id(), to, text, status: "queued", userId: u.id, createdAt: (/* @__PURE__ */ new Date()).toISOString() });
      return { queued: true };
    });
    route("GET", "/api/admin/bot-status", async ({ req }) => {
      await needAdmin(req);
      const s = await L2.get("content", "bot-seen");
      return { online: !!s && Date.now() - (s.at || 0) < 5 * 60 * 1e3, lastSeen: s ? new Date(s.at).toISOString() : null };
    });
    route("GET", "/api/bot/outbox", async ({ req }) => {
      botKey(req);
      if (req.headers["x-bot-linked"] === "1") await L2.put("content", { id: "bot-seen", at: Date.now() });
      const ox = (await L2.all("outbox")).filter((m) => m.status === "queued" && Date.now() - Date.parse(m.createdAt) < 60 * 60 * 1e3).slice(0, 10);
      return { messages: ox.map((m) => ({ id: m.id, to: m.to, text: m.text })) };
    });
    route("POST", "/api/bot/ack", async ({ req, body }) => {
      botKey(req);
      const m = await L2.get("outbox", String(body.id || ""));
      if (!m) throw new HttpError(404, "Not found");
      await L2.put("outbox", { id: m.id, to: m.to, text: "", status: body.ok ? "sent" : "failed", error: body.ok ? void 0 : String(body.error || "").slice(0, 200), userId: m.userId, createdAt: m.createdAt, doneAt: (/* @__PURE__ */ new Date()).toISOString() });
      return { ok: true };
    });
    route("GET", "/api/admin/requests", async ({ req }) => {
      await needAdmin(req);
      return { requests: await L2.all("requests") };
    });
    route("POST", "/api/admin/technicians", async ({ req, body }) => {
      await needAdmin(req);
      const { firstName, lastName, email } = body;
      if (typeof firstName !== "string" || !firstName.trim() || firstName.length > 60 || typeof lastName !== "string" || !lastName.trim() || lastName.length > 60 || !EMAIL.test(email || "")) throw bad("Name and a valid email are required");
      const e = email.toLowerCase();
      if ((await L2.all("users")).some((u2) => u2.email === e)) throw new HttpError(409, "This email already has an account");
      const redirect = siteUrl();
      const skills = Array.isArray(body.skills) ? [...new Set(body.skills)] : [];
      const serviceIds = new Set((await L2.all("services")).filter((s) => s.active).map((s) => s.id));
      if (skills.some((id) => !serviceIds.has(id))) throw bad("Unknown service");
      const tg = await tagIds(body);
      const u = await L2.put("users", { id: L2.id(), firstName: firstName.trim(), lastName: lastName.trim(), email: e, role: "technician", available: false, skills, positionIds: tg.positionIds, areaIds: tg.areaIds, createdAt: (/* @__PURE__ */ new Date()).toISOString(), addresses: [] });
      return { user: L2.publicUser(u), setupLink: redirect + "/reset?token=" + await L2.makeResetToken(u.id) };
    });
    route("PUT", "/api/admin/users/:id/skills", async ({ req, body, params }) => {
      await needAdmin(req);
      const u = await L2.get("users", params.id);
      if (!u || u.role !== "technician") throw new HttpError(404, "Not found");
      if (!Array.isArray(body.skills) || body.skills.some((id) => typeof id !== "string")) throw bad("Skills must be a list of service ids");
      const ids = new Set((await L2.all("services")).filter((s) => s.active).map((s) => s.id));
      if (body.skills.some((id) => !ids.has(id))) throw bad("Unknown service");
      u.skills = [...new Set(body.skills)];
      await L2.put("users", u);
      return { user: L2.publicUser(u) };
    });
    var TAG_TYPES = ["position", "area", "village"];
    async function tagIds(body) {
      const tags = (await L2.all("tags")).filter((x) => x.active);
      const pick = (key, type) => {
        if (body[key] === void 0) return void 0;
        if (!Array.isArray(body[key]) || body[key].length > 60 || body[key].some((x) => typeof x !== "string")) throw bad("Invalid " + key);
        const ok = new Set(tags.filter((x) => [].concat(type).includes(x.type)).map((x) => x.id));
        if (body[key].some((x) => !ok.has(x))) throw bad("Unknown " + type);
        return [...new Set(body[key])];
      };
      return { positionIds: pick("positionIds", "position") || [], areaIds: pick("areaIds", ["area", "village"]) || [] };
    }
    var tagSort = (a, b) => (a.order ?? 1e3) - (b.order ?? 1e3) || a.name.localeCompare(b.name);
    route("GET", "/api/tags", async () => ({ tags: (await L2.all("tags")).filter((x) => x.active).sort(tagSort) }));
    route("GET", "/api/admin/tags", async ({ req }) => {
      await needAdmin(req);
      return { tags: (await L2.all("tags")).sort((a, b) => a.type.localeCompare(b.type) || b.active - a.active || tagSort(a, b)) };
    });
    var parentOf = (all, id) => {
      const p = all.find((x) => x.id === id);
      if (!p) return null;
      if (p.type === "area") return { id: p.id, markazId: null };
      if (p.type === "village" && p.parentId && !p.level) return { id: p.id, markazId: p.parentId };
      return null;
    };
    route("POST", "/api/admin/tags", async ({ req, body }) => {
      await needAdmin(req);
      if (!TAG_TYPES.includes(body.type)) throw bad("Type must be position, area or village");
      let name = typeof body.name === "string" ? body.name.trim() : "", nameAr = typeof body.nameAr === "string" ? body.nameAr.trim() : "";
      if (body.type === "village" && !name) name = nameAr;
      if (!name || name.length > 60 || nameAr.length > 60) throw bad("Name is required (max 60 characters)");
      const all = await L2.all("tags");
      if (body.id) {
        const old = all.find((x) => x.id === body.id);
        if (!old) throw new HttpError(404, "Not found");
        if (old.type === "village" && typeof body.parentId === "string") {
          const pr = parentOf(all, body.parentId);
          if (!pr || body.parentId === old.id || pr.markazId && all.some((x) => x.parentId === old.id)) throw bad("Unknown markaz or village");
          old.parentId = body.parentId;
          if (pr.markazId) {
            old.markazId = pr.markazId;
            old.level = "hamlet";
          } else {
            delete old.markazId;
            delete old.level;
          }
        }
        old.name = name;
        old.nameAr = nameAr;
        if (typeof body.active === "boolean") old.active = body.active;
        if (Number.isInteger(body.order)) old.order = body.order;
        return { tag: await L2.put("tags", old) };
      }
      let parentId = null;
      let markazId = null;
      if (body.type === "village") {
        parentId = typeof body.parentId === "string" ? body.parentId : "";
        const pr = parentOf(all, parentId);
        if (!pr) throw bad("Choose the markaz (or the village, for a hamlet) it belongs to");
        markazId = pr.markazId || null;
      }
      if (all.some((x) => x.type === body.type && x.active && (x.parentId || null) === parentId && (x.name.toLowerCase() === name.toLowerCase() || nameAr && x.nameAr === nameAr))) throw new HttpError(409, "This name already exists");
      return { tag: await L2.put("tags", { id: L2.id(), type: body.type, name, nameAr, active: true, ...parentId ? { parentId } : {}, ...markazId ? { markazId, level: "hamlet" } : {}, ...body.cityArea === true && body.type === "village" && !markazId ? { cityArea: true, src: String(body.src || "").slice(0, 60), verified: body.verified === true } : {}, order: Number.isInteger(body.order) ? body.order : 1e3, createdAt: (/* @__PURE__ */ new Date()).toISOString() }) };
    });
    route("PUT", "/api/admin/users/:id/tags", async ({ req, body, params }) => {
      await needAdmin(req);
      const u = await L2.get("users", params.id);
      if (!u || u.role !== "technician") throw new HttpError(404, "Not found");
      const tg = await tagIds(body);
      if (body.positionIds !== void 0) u.positionIds = tg.positionIds;
      if (body.areaIds !== void 0) u.areaIds = tg.areaIds;
      await L2.put("users", u);
      return { user: L2.publicUser(u) };
    });
    route("PUT", "/api/admin/requests/:id/area", async ({ req, body, params }) => {
      await needAdmin(req);
      const r = await L2.get("requests", params.id);
      if (!r) throw new HttpError(404, "Not found");
      if (body.areaId === null || body.areaId === "") {
        r.areaId = null;
      } else {
        const a = (await L2.all("tags")).find((x) => x.id === body.areaId && (x.type === "area" || x.type === "village") && x.active);
        if (!a) throw bad("Unknown area");
        r.areaId = a.id;
      }
      await L2.put("requests", r);
      return { request: r };
    });
    var normAr = (s) => String(s || "").toLowerCase().replace(/[\u064B-\u065F\u0670\u0640]/g, "").replace(/[أإآٱ]/g, "\u0627").replace(/ى/g, "\u064A").replace(/ة/g, "\u0647").replace(/[^\p{L}\p{N} ]/gu, " ").replace(/\s+/g, " ").trim();
    var MINYA = { lat0: 27.4, lat1: 29.1, lon0: 29.9, lon1: 31.5 };
    var inMinya = (la, lo) => la >= MINYA.lat0 && la <= MINYA.lat1 && lo >= MINYA.lon0 && lo <= MINYA.lon1;
    var placeHits = /* @__PURE__ */ new Map();
    function placeLimit(uid) {
      const now = Date.now(), a = (placeHits.get(uid) || []).filter((x) => now - x < 6e4);
      if (a.length >= 40) return false;
      a.push(now);
      placeHits.set(uid, a);
      return true;
    }
    async function osm(url) {
      const cache = typeof caches !== "undefined" ? caches.default : null;
      const key = new Request(url);
      if (cache) {
        const hit = await cache.match(key);
        if (hit) return hit.json();
      }
      try {
        const res = await fetch(url, { headers: { "User-Agent": "Tazbeeta/0.6 (https://tazbeeta.angluosr.workers.dev)", "Accept-Language": "ar,en" } });
        if (!res.ok) return null;
        const body = await res.text();
        if (cache) await cache.put(key, new Response(body, { headers: { "content-type": "application/json", "cache-control": "public, max-age=86400" } }));
        return JSON.parse(body);
      } catch {
        return null;
      }
    }
    var placeLabel = (t, byId) => {
      const p = t.parentId ? byId.get(t.parentId) : null;
      return { id: t.id, type: t.type, name: t.name, nameAr: t.nameAr, parentId: t.parentId || null, parentName: p ? p.name : null, parentNameAr: p ? p.nameAr : null };
    };
    route("GET", "/api/places/search", async ({ req, query }) => {
      const u = await auth(req);
      if (!placeLimit(u.id)) throw new HttpError(429, "Too many searches, wait a moment");
      const q = String(query && query.q || "").trim().slice(0, 60);
      const nq = normAr(q);
      if (nq.length < 2) return { places: [] };
      const tags = (await L2.all("tags")).filter((x) => x.active && (x.type === "village" || x.type === "area"));
      const byId = new Map(tags.map((x) => [x.id, x]));
      const score = (t) => {
        const a = normAr(t.nameAr), e = normAr(t.name);
        if (a === nq || e === nq) return 0;
        if (a.startsWith(nq) || e.startsWith(nq)) return 1;
        if (a.includes(nq) || e.includes(nq)) return 2;
        return 9;
      };
      const local = tags.map((t) => [score(t), t]).filter((x) => x[0] < 9).sort((a, b) => a[0] - b[0] || (a[1].type === "village") - (b[1].type === "village")).slice(0, 8).map((x) => ({ source: "list", ...placeLabel(x[1], byId) }));
      let remote = [];
      if (nq.length >= 3) {
        const j = await osm("https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=eg&accept-language=ar&limit=6&viewbox=29.9%2C29.1%2C31.5%2C27.4&q=" + encodeURIComponent(q));
        if (Array.isArray(j)) remote = j.filter((x) => inMinya(+x.lat, +x.lon) && /المنيا|Minya|Minia/.test(x.display_name || "")).slice(0, 5).map((x) => ({ source: "osm", name: String(x.name || x.display_name.split(",")[0]).slice(0, 80), nameAr: String(x.name || "").slice(0, 80), label: String(x.display_name).slice(0, 160), lat: +x.lat, lon: +x.lon, kind: x.addresstype || x.type || "" }));
      }
      return { places: [...local, ...remote] };
    });
    route("GET", "/api/places/reverse", async ({ req, query }) => {
      const u = await auth(req);
      if (!placeLimit(u.id)) throw new HttpError(429, "Too many lookups, wait a moment");
      const lat = Number(query && query.lat), lon = Number(query && query.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) throw bad("Invalid location");
      const tags = (await L2.all("tags")).filter((x) => x.active && (x.type === "village" || x.type === "area"));
      const byId = new Map(tags.map((x) => [x.id, x]));
      const out = { inMinya: inMinya(lat, lon), match: null, osm: null };
      const j = await osm("https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1&accept-language=ar&lat=" + lat.toFixed(5) + "&lon=" + lon.toFixed(5));
      if (j && j.address) {
        const a = j.address;
        const names = [a.village, a.hamlet, a.suburb, a.neighbourhood, a.quarter, a.town, a.city_district, a.city, a.municipality, a.county, a.state_district].filter(Boolean);
        const vnames = [...names];
        for (const s of String(j.display_name || "").split(",").map((s2) => s2.trim()).filter(Boolean)) if (!vnames.includes(s)) vnames.push(s);
        const road = a.road || a.pedestrian || a.residential || a.footway || a.path || "";
        const hn = a.house_number || "";
        const loc2 = a.neighbourhood || a.suburb || a.quarter || a.village || a.hamlet || a.city_district || "";
        const city = a.city || a.town || a.municipality || a.county || a.state_district || "";
        const line = [hn && road ? hn + "، " + road : road, loc2 !== road ? loc2 : "", city && city !== loc2 ? city : ""].filter(Boolean).join("، ");
        out.osm = { name: names[0] || null, display: String(j.display_name || "").slice(0, 160), road, houseNumber: hn, locality: loc2, city, line: line.slice(0, 160) };
        for (const kind of ["village", "area"]) {
          for (const n of kind === "village" ? vnames : names) {
            const nn = normAr(n).replace(/^(مركز|مدينه|قريه|نجع|عزبه) /, "");
            const hit = tags.find((t) => t.type === kind && (normAr(t.nameAr) === nn || normAr(t.name) === nn));
            if (hit) {
              out.match = { source: "list", ...placeLabel(hit, byId) };
              break;
            }
          }
          if (out.match) break;
        }
      }
      return out;
    });
    var MAX_LOCATION_AGE_MIN_V = 15;
    route("GET", "/api/admin/requests/:id/suggest", async ({ req, params }) => {
      await needAdmin(req);
      const r = await L2.get("requests", params.id);
      if (!r) throw new HttpError(404, "Not found");
      const tags = (await L2.all("tags")).filter((x) => x.active);
      const areas = tags.filter((x) => x.type === "area" || x.type === "village"), poss = new Map(tags.filter((x) => x.type === "position").map((x) => [x.id, x]));
      const addr = ((r.address || "") + " " + (r.placeText || "")).toLowerCase();
      let areaId = r.areaId || null, areaGuess = false;
      if (!areaId) {
        const g = [...areas].sort((x, y) => y.name.length + (y.nameAr || "").length - (x.name.length + (x.nameAr || "").length)).find((a) => a.name && addr.includes(a.name.toLowerCase()) || a.nameAr && addr.includes(a.nameAr));
        if (g) {
          areaId = g.id;
          areaGuess = true;
        }
      }
      const area = areas.find((a) => a.id === areaId) || null;
      const markazOf = (id) => {
        const a = areas.find((x) => x.id === id);
        return a ? a.markazId || a.parentId || a.id : null;
      };
      const reqMarkaz = areaId ? markazOf(areaId) : null;
      const parent = area && area.parentId ? areas.find((x) => x.id === area.parentId) : null;
      const busy = new Set((await L2.all("requests")).filter((x) => ["assigned", "in_progress"].includes(x.status)).map((x) => x.technicianId));
      const nearest = [], manual = [], excluded = [];
      for (const t of (await L2.all("users")).filter((u) => u.role === "technician" && !u.blocked)) {
        const why = [];
        if (!t.available) why.push("not_available");
        if (busy.has(t.id)) why.push("active_job");
        if (!t.skills || !t.skills.length) why.push("no_services");
        else if (!t.skills.includes(r.serviceId)) why.push("no_service");
        const ageMin = t.location ? (Date.now() - Date.parse(t.location.at)) / 6e4 : null;
        const fresh = ageMin !== null && ageMin < MAX_LOCATION_AGE_MIN_V;
        const sameArea = !!reqMarkaz && (t.areaIds || []).some((id) => markazOf(id) === reqMarkaz);
        const sameVillage = !!areaId && (t.areaIds || []).includes(areaId);
        const item = { ...L2.publicUser(t), sameArea, sameVillage, positions: (t.positionIds || []).map((id) => poss.get(id)).filter(Boolean).map((p) => ({ id: p.id, name: p.name, nameAr: p.nameAr })), areas: (t.areaIds || []).map((id) => areas.find((a) => a.id === id)).filter(Boolean).map((a) => ({ id: a.id, name: a.name, nameAr: a.nameAr })), distanceKm: fresh && r.location ? Math.round(km(r.location, t.location) * 10) / 10 : null, locationAgeMin: ageMin === null ? null : Math.round(ageMin), locationFresh: fresh };
        if (why.length) excluded.push({ ...item, reasons: why });
        else if (sameArea || fresh && r.location) nearest.push(item);
        else manual.push({ ...item, reasons: [ageMin === null ? "no_location" : "stale_location"] });
      }
      nearest.sort((a, b) => (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9) || b.sameVillage - a.sameVillage || b.sameArea - a.sameArea);
      return {
        technicians: nearest,
        manualOnly: manual,
        excluded,
        maxLocationAgeMin: MAX_LOCATION_AGE_MIN_V,
        area: area ? { id: area.id, name: area.name, nameAr: area.nameAr, guessed: areaGuess, type: area.type, parentName: parent ? parent.name : null, parentNameAr: parent ? parent.nameAr : null } : null,
        placeText: r.placeText || "",
        requestLocation: r.location || null,
        note: "Closest by fresh GPS location first; the same area breaks ties and lists technicians with no fresh location after. Nobody is auto-selected."
      };
    });
    route("POST", "/api/admin/requests/:id/classify", async ({ req, body, params }) => {
      await needAdmin(req);
      const r = await L2.get("requests", params.id);
      if (!r) throw new HttpError(404, "Not found");
      if (!r.custom || !["pending", "inspection"].includes(r.status) || r.quote) throw bad("Only unquoted custom requests can be classified");
      const service = await L2.get("services", String(body.serviceId || ""));
      if (!service || !service.active) throw bad("Choose an active company service");
      r.serviceId = service.id;
      r.serviceName = service.name;
      r.classifiedAt = (/* @__PURE__ */ new Date()).toISOString();
      await L2.put("requests", r);
      return { request: r };
    });
    route("POST", "/api/admin/requests/:id/assign", async ({ req, body, params }) => {
      await needAdmin(req);
      const r = await L2.get("requests", params.id);
      if (!r) throw new HttpError(404, "Not found");
      if (!["approved", "assigned"].includes(r.status) || !r.quoteAccepted || r.quoteAccepted.version !== r.quote?.version) throw bad("Customer must accept the quote before assignment");
      if (r.custom && !r.classifiedAt) throw bad("Classify the custom request before assignment");
      const t = await L2.get("users", String(body.technicianId || ""));
      if (!t || t.role !== "technician" || t.blocked) throw bad("Unknown technician");
      if (!t.available) throw bad("Technician is unavailable");
      if (!(t.skills || []).includes(r.serviceId)) throw bad("Technician does not cover this service");
      if ((await L2.all("requests")).some((x) => x.id !== r.id && x.technicianId === t.id && ["assigned", "in_progress"].includes(x.status))) throw bad("Technician has an active job");
      r.technicianId = t.id;
      r.status = "assigned";
      r.techAccepted = null;
      r.onTheWay = null;
      await L2.put("requests", r);
      await L2.put("messages", { id: L2.id(), requestId: r.id, senderId: "system", senderRole: "system", senderName: "Tazbeeta", system: true, text: "Technician " + t.firstName + " " + t.lastName + " is assigned to this request.", createdAt: NOW() });
      await notify(r.customerId, "A technician was assigned: " + t.firstName + " " + t.lastName, r.id);
      await notify(t.id, "New job assigned to you", r.id);
      return { request: r };
    });
    route("POST", "/api/admin/services", async ({ req, body }) => {
      await needAdmin(req);
      if (typeof body.name !== "string" || !body.name.trim() || body.name.length > 100 || typeof body.nameAr !== "string" || !body.nameAr.trim() || body.nameAr.length > 100) throw bad("Both service names are required (max 100 characters)");
      const slug = String(body.id || body.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      if (!slug) throw bad("A valid service id is required");
      const old = await L2.get("services", slug);
      const all = await L2.all("services");
      return { service: await L2.put("services", { id: slug, name: body.name, nameAr: body.nameAr || "", popular: !!body.popular, active: body.active !== false, startingPrice: Number.isFinite(+body.startingPrice) && +body.startingPrice > 0 ? Math.round(+body.startingPrice) : null, order: old ? old.order : all.length }) };
    });
    var defaultContent = { id: "app", announcement: "", cashEnabled: true, help: [], payNumber: "", payName: "", whatsapp: "201202422997", commissionPct: 20, adminChatReply: false };
    var TERMS_EN = "Tazbeeta terms and privacy (default text, the company can edit it in the dashboard).\n\n1. Tazbeeta connects you with the company team for repair and maintenance services.\n2. Every request gets a quote after inspection. Nothing starts until you accept the quote.\n3. Payment is manual: cash or InstaPay / wallet transfer with a receipt photo. The company confirms payments from its dashboard.\n4. We keep your name, email, phone, addresses and request details only to run your requests and contact you. We do not sell your data.\n5. You can ask the company to delete your account and data at any time.\n6. Using the app means you agree to these terms. The company may update them and will show the latest version here.";
    var TERMS_AR = "\u0634\u0631\u0648\u0637 \u0648\u062E\u0635\u0648\u0635\u064A\u0629 \u062A\u0638\u0628\u064A\u0637\u0647 (\u0646\u0635 \u0645\u0628\u062F\u0626\u064A\u060C \u0627\u0644\u0634\u0631\u0643\u0629 \u062A\u0642\u062F\u0631 \u062A\u0639\u062F\u0644\u0647 \u0645\u0646 \u0644\u0648\u062D\u0629 \u0627\u0644\u062A\u062D\u0643\u0645).\n\n\u0661. \u062A\u0638\u0628\u064A\u0637\u0647 \u0628\u064A\u0648\u0635\u0644\u0643 \u0628\u0641\u0631\u064A\u0642 \u0627\u0644\u0634\u0631\u0643\u0629 \u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0635\u064A\u0627\u0646\u0629 \u0648\u0627\u0644\u0625\u0635\u0644\u0627\u062D.\n\u0662. \u0643\u0644 \u0637\u0644\u0628 \u0628\u064A\u0648\u0635\u0644\u0647 \u0639\u0631\u0636 \u0633\u0639\u0631 \u0628\u0639\u062F \u0627\u0644\u0645\u0639\u0627\u064A\u0646\u0629. \u0645\u0641\u064A\u0634 \u0634\u063A\u0644 \u0628\u064A\u0628\u062F\u0623 \u063A\u064A\u0631 \u0628\u0639\u062F \u0645\u0648\u0627\u0641\u0642\u062A\u0643 \u0639\u0644\u0649 \u0627\u0644\u0633\u0639\u0631.\n\u0663. \u0627\u0644\u062F\u0641\u0639 \u064A\u062F\u0648\u064A: \u0643\u0627\u0634 \u0623\u0648 \u062A\u062D\u0648\u064A\u0644 \u0625\u0646\u0633\u062A\u0627\u0628\u0627\u064A / \u0645\u062D\u0641\u0638\u0629 \u0645\u0639 \u0635\u0648\u0631\u0629 \u0627\u0644\u0625\u064A\u0635\u0627\u0644. \u0627\u0644\u0634\u0631\u0643\u0629 \u0628\u062A\u0623\u0643\u062F \u0627\u0644\u062F\u0641\u0639 \u0645\u0646 \u0644\u0648\u062D\u0629 \u0627\u0644\u062A\u062D\u0643\u0645.\n\u0664. \u0628\u0646\u062D\u062A\u0641\u0638 \u0628\u0627\u0633\u0645\u0643 \u0648\u0628\u0631\u064A\u062F\u0643 \u0648\u0631\u0642\u0645\u0643 \u0648\u0639\u0646\u0627\u0648\u064A\u0646\u0643 \u0648\u062A\u0641\u0627\u0635\u064A\u0644 \u0637\u0644\u0628\u0627\u062A\u0643 \u0628\u0633 \u0644\u062A\u0646\u0641\u064A\u0630 \u0637\u0644\u0628\u0627\u062A\u0643 \u0648\u0627\u0644\u062A\u0648\u0627\u0635\u0644 \u0645\u0639\u0627\u0643. \u0645\u0634 \u0628\u0646\u0628\u064A\u0639 \u0628\u064A\u0627\u0646\u0627\u062A\u0643.\n\u0665. \u062A\u0642\u062F\u0631 \u062A\u0637\u0644\u0628 \u0645\u0646 \u0627\u0644\u0634\u0631\u0643\u0629 \u062D\u0630\u0641 \u062D\u0633\u0627\u0628\u0643 \u0648\u0628\u064A\u0627\u0646\u0627\u062A\u0643 \u0641\u064A \u0623\u064A \u0648\u0642\u062A.\n\u0666. \u0627\u0633\u062A\u062E\u062F\u0627\u0645\u0643 \u0644\u0644\u062A\u0637\u0628\u064A\u0642 \u0645\u0639\u0646\u0627\u0647 \u0645\u0648\u0627\u0641\u0642\u062A\u0643 \u0639\u0644\u0649 \u0627\u0644\u0634\u0631\u0648\u0637 \u062F\u064A. \u0627\u0644\u0634\u0631\u0643\u0629 \u0645\u0645\u0643\u0646 \u062A\u062D\u062F\u0651\u062B\u0647\u0627 \u0648\u0647\u062A\u0638\u0647\u0631 \u0622\u062E\u0631 \u0646\u0633\u062E\u0629 \u0647\u0646\u0627.";
    var appContent = async () => {
      const c = { ...defaultContent, ...await L2.get("content", "app") || {} };
      return { ...c, terms: c.terms || TERMS_EN, termsAr: c.termsAr || TERMS_AR };
    };
    route("GET", "/api/content", async () => ({ content: await appContent() }));
    route("PUT", "/api/admin/content", async ({ req, body }) => {
      await needAdmin(req);
      if (typeof body.announcement !== "string" || body.announcement.length > 500 || typeof body.cashEnabled !== "boolean") throw bad("Invalid app settings");
      if (!Array.isArray(body.help) || body.help.length > 30 || body.help.some((h) => ["q", "qAr", "answer", "answerAr"].some((k) => typeof h[k] !== "string" || !h[k].trim() || h[k].length > 2e3))) throw bad("Invalid Help content");
      const prev = await appContent();
      const content = await L2.put("content", { ...prev, id: "app", payNumber: prev.payNumber || "", payName: prev.payName || "", ...typeof body.terms === "string" && typeof body.termsAr === "string" && body.terms.length <= 8e3 && body.termsAr.length <= 8e3 ? { terms: body.terms.trim(), termsAr: body.termsAr.trim() } : { terms: prev.terms || "", termsAr: prev.termsAr || "" }, announcement: body.announcement.trim(), cashEnabled: body.cashEnabled, help: body.help.map((h) => Object.fromEntries(["q", "qAr", "answer", "answerAr"].map((k) => [k, h[k].trim()]))) });
      return { content };
    });
    route("POST", "/api/feedback", async ({ req, body }) => {
      const u = await auth(req);
      if (!Number.isInteger(body.stars) || body.stars < 1 || body.stars > 5 || typeof body.note !== "string" || body.note.length > 2e3) throw bad("Invalid feedback");
      return { feedback: await L2.put("feedback", { id: L2.id(), userId: u.id, stars: body.stars, note: body.note.trim(), reviewed: false, createdAt: (/* @__PURE__ */ new Date()).toISOString() }) };
    });
    route("GET", "/api/admin/feedback", async ({ req }) => {
      await needAdmin(req);
      return { feedback: (await L2.all("feedback")).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) };
    });
    route("PUT", "/api/admin/feedback/:id", async ({ req, body, params }) => {
      await needAdmin(req);
      const f = await L2.get("feedback", params.id);
      if (!f) throw new HttpError(404, "Not found");
      if (typeof body.reviewed !== "boolean") throw bad("Invalid review status");
      f.reviewed = body.reviewed;
      await L2.put("feedback", f);
      return { feedback: f };
    });
    route("PUT", "/api/admin/technicians/:id/availability", async ({ req, body, params }) => {
      await needAdmin(req);
      const u = await L2.get("users", params.id);
      if (!u || u.role !== "technician") throw new HttpError(404, "Not found");
      if (typeof body.available !== "boolean") throw bad("Invalid availability");
      u.available = body.available;
      await L2.put("users", u);
      return { user: L2.publicUser(u) };
    });
    route("GET", "/api/admin/activity", async ({ req }) => {
      await needAdmin(req);
      return { activity: (await L2.all("activity")).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 200) };
    });
    var PAY_OPEN = ["approved", "assigned", "in_progress", "completed"];
    var total = (r) => r.quote && Number(r.quote.amount) || 0;
    route("PUT", "/api/admin/payment-settings", async ({ req, body }) => {
      await needAdmin(req);
      const num = typeof body.payNumber === "string" ? body.payNumber.trim() : "", name = typeof body.payName === "string" ? body.payName.trim() : "";
      if (num.length > 40 || name.length > 80 || num && !/^[+0-9 ()-]{5,40}$/.test(num)) throw bad("Enter a valid InstaPay or wallet number");
      const prev = await appContent();
      const wa = typeof body.whatsapp === "string" ? body.whatsapp.replace(/[^0-9]/g, "") : prev.whatsapp || "";
      if (wa && (wa.length < 8 || wa.length > 15)) throw bad("Enter the WhatsApp number with country code");
      const cp = body.commissionPct === void 0 ? prev.commissionPct : Number(body.commissionPct);
      if (cp !== void 0 && cp !== null && (!Number.isFinite(cp) || cp < 0 || cp > 90)) throw bad("Commission must be between 0 and 90");
      const ar = typeof body.adminChatReply === "boolean" ? body.adminChatReply : !!prev.adminChatReply;
      const cn = typeof body.companyName === "string" ? body.companyName.trim().slice(0, 120) : prev.companyName || "";
      const ca = typeof body.companyAddress === "string" ? body.companyAddress.trim().slice(0, 250) : prev.companyAddress || "";
      const se = typeof body.supportEmail === "string" ? body.supportEmail.trim().slice(0, 120) : prev.supportEmail || "";
      if (se && !EMAIL.test(se)) throw bad("Enter a valid support email");
      return { content: await L2.put("content", { ...prev, id: "app", payNumber: num, payName: name, whatsapp: wa, commissionPct: cp === void 0 ? 20 : cp, adminChatReply: ar, companyName: cn, companyAddress: ca, supportEmail: se }) };
    });
    route("POST", "/api/requests/:id/pay", async ({ req, body, params }) => {
      const u = await auth(req);
      const r = await L2.get("requests", params.id);
      if (!r) throw new HttpError(404, "Not found");
      if (u.role !== "customer" || r.customerId !== u.id) throw new HttpError(403, "Only the request customer can pay");
      if (!r.quote || !PAY_OPEN.includes(r.status)) throw bad("Payment opens after the quote is accepted");
      const p = r.payment || {};
      if (p.status === "paid" || p.status === "pending") throw bad("This payment is already being handled");
      if (!["cash", "wallet"].includes(body.method)) throw bad("Choose cash or wallet transfer");
      const receipt = typeof body.receipt === "string" ? body.receipt.trim().slice(0, 400) : "";
      if (body.method === "wallet" && !receipt) throw bad("Upload the transfer receipt first");
      r.payment = { method: body.method, status: body.method === "cash" ? "unpaid" : "pending", ...receipt && body.method === "wallet" ? { receipt } : {}, amount: total(r), at: (/* @__PURE__ */ new Date()).toISOString(), history: [...p.history || [], ...p.status === "rejected" ? [{ status: "rejected", note: p.note || "", at: p.reviewedAt }] : []] };
      await L2.put("requests", r);
      return { request: r };
    });
    route("GET", "/api/admin/payments", async ({ req }) => {
      await needAdmin(req);
      const rows = (await L2.all("requests")).filter((r) => r.payment).map((r) => ({ requestId: r.id, customerId: r.customerId, serviceId: r.serviceId, total: total(r), currency: r.quote && r.quote.currency || "EGP", payment: r.payment }));
      return { payments: rows.sort((a, b) => String(b.payment.at).localeCompare(String(a.payment.at))) };
    });
    route("POST", "/api/admin/payments/:id/verify", async ({ req, body, params }) => {
      const a = await needAdmin(req);
      const r = await L2.get("requests", params.id);
      if (!r || !r.payment) throw new HttpError(404, "Not found");
      const p = r.payment;
      if (p.method !== "wallet" || p.status !== "pending") throw bad("There is no transfer waiting for review");
      if (!["approve", "reject"].includes(body.decision)) throw bad("Choose approve or reject");
      const note = typeof body.note === "string" ? body.note.trim().slice(0, 300) : "";
      if (body.decision === "reject" && note.length < 3) throw bad("Tell the customer why the transfer was rejected");
      r.payment = { ...p, status: body.decision === "approve" ? "paid" : "rejected", note, reviewedBy: a.id, reviewedAt: (/* @__PURE__ */ new Date()).toISOString() };
      await L2.put("requests", r);
      return { request: r };
    });
    route("POST", "/api/admin/payments/:id/cash-received", async ({ req, params }) => {
      const a = await needAdmin(req);
      const r = await L2.get("requests", params.id);
      if (!r || !r.payment) throw new HttpError(404, "Not found");
      if (r.payment.method !== "cash" || r.payment.status !== "unpaid") throw bad("There is no cash payment waiting");
      r.payment = { ...r.payment, status: "paid", reviewedBy: a.id, reviewedAt: (/* @__PURE__ */ new Date()).toISOString() };
      await L2.put("requests", r);
      return { request: r };
    });
    route("GET", "/api/admin/invoices", async ({ req }) => {
      await needAdmin(req);
      const inv = (await L2.all("requests")).filter((r) => r.quote && PAY_OPEN.includes(r.status)).map((r) => {
        const t = total(r), paid = r.payment && r.payment.status === "paid" ? t : 0;
        return { requestId: r.id, customerId: r.customerId, serviceId: r.serviceId, status: r.status, currency: r.quote.currency || "EGP", total: t, paid, remaining: t - paid, paymentStatus: r.payment && r.payment.status || "unpaid", createdAt: r.createdAt };
      });
      return { invoices: inv.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))) };
    });
    var PHOTO_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+\/=]+$/;
    route("POST", "/api/requests/:id/photos", async ({ req, body, params }) => {
      const u = await auth(req);
      const r = await L2.get("requests", params.id);
      if (!r || !await canChat(u, r)) throw new HttpError(404, "Not found");
      if (u.role === "admin") throw new HttpError(403, "Not allowed");
      if (typeof body.data !== "string" || body.data.length > 22e4 || !PHOTO_RE.test(body.data)) throw bad("Send a smaller JPEG or PNG photo");
      const kind = u.role === "technician" ? (body.kind === "after" ? "after" : "before") : body.kind === "receipt" ? "receipt" : "request";
      if (["cancelled"].includes(r.status) || u.role === "customer" && ["completed"].includes(r.status)) throw bad("Photos cannot be added now");
      const mine = (await L2.all("photos")).filter((x) => x.requestId === r.id && x.kind === kind);
      if (mine.length >= (kind === "request" ? 3 : kind === "receipt" ? 3 : 6)) throw bad("Photo limit reached");
      const ph = await L2.put("photos", { id: L2.id(), requestId: r.id, kind, by: u.id, data: body.data, createdAt: NOW() });
      if (u.role === "technician") await notify(r.customerId, "The technician added a photo", r.id);
      return { photo: { id: ph.id, kind } };
    });
    route("GET", "/api/requests/:id/photos", async ({ req, params }) => {
      const u = await auth(req);
      const r = await L2.get("requests", params.id);
      if (!r || !await canChat(u, r)) throw new HttpError(404, "Not found");
      return { photos: (await L2.all("photos")).filter((x) => x.requestId === r.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((x) => ({ id: x.id, kind: x.kind, data: x.data, createdAt: x.createdAt })) };
    });
    route("POST", "/api/devices", async ({ req, body }) => {
      const u = await auth(req);
      const tk = String(body.token || "");
      if (tk.length < 20 || tk.length > 400) throw bad("Invalid token");
      const id = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(tk))), (x) => x.toString(16).padStart(2, "0")).join("").slice(0, 32);
      await L2.put("devices", { id, userId: u.id, token: tk, at: NOW() });
      return { ok: true };
    });
    route("POST", "/api/me/delete", async ({ req, body }) => {
      const u = await auth(req);
      if (u.role === "admin") throw new HttpError(403, "The admin account cannot be deleted here");
      if (typeof body.password !== "string" || !await L2.checkPassword(u.id, body.password)) throw new HttpError(401, "Wrong password");
      const active = (await L2.all("requests")).filter((r) => (r.customerId === u.id || r.technicianId === u.id) && ["in_progress"].includes(r.status));
      if (active.length) throw new HttpError(409, "You have a job in progress. Finish or cancel it first, or contact support");
      const mine = (await L2.all("requests")).filter((r) => r.customerId === u.id);
      for (const r of mine) {
        for (const m of (await L2.all("messages")).filter((m) => m.requestId === r.id)) await L2.del("messages", m.id);
        for (const p of (await L2.all("photos")).filter((p) => p.requestId === r.id && p.kind !== "before" && p.kind !== "after")) await L2.del("photos", p.id);
        await L2.put("requests", { ...r, contactName: "Deleted user", contactPhone: "", contactEmail: "", address: "", placeText: "", location: null, description: "", customTitle: r.customTitle ? "Deleted" : r.customTitle, customerDeleted: true });
      }
      for (const m of (await L2.all("messages")).filter((m) => m.senderId === u.id)) await L2.del("messages", m.id);
      for (const d of (await L2.all("devices")).filter((d) => d.userId === u.id)) await L2.del("devices", d.id);
      for (const n of (await L2.all("notifs")).filter((n) => n.userId === u.id)) await L2.del("notifs", n.id);
      for (const c of ["creds", "emailcodes"]) { try { await L2.del(c, u.id); } catch (e) { } }
      for (const rs of (await L2.all("resets")).filter((x) => x.userId === u.id)) await L2.del("resets", rs.id);
      await L2.put("users", { id: u.id, firstName: "Deleted", lastName: "user", email: "deleted-" + u.id + "@deleted.invalid", phone: "", role: u.role, createdAt: u.createdAt, addresses: [], skills: [], blocked: true, deleted: true, verified: true, available: false });
      return { ok: true };
    });
    route("GET", "/api/notifications", async ({ req }) => {
      const u = await auth(req);
      const list = (await L2.all("notifs")).filter((n) => n.userId === u.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return { notifications: list.slice(0, 60), unread: list.filter((n) => !n.read).length };
    });
    route("POST", "/api/notifications/read", async ({ req }) => {
      const u = await auth(req);
      for (const n of (await L2.all("notifs")).filter((x) => x.userId === u.id && !x.read)) await L2.put("notifs", { ...n, read: true });
      return { ok: true };
    });
    route("POST", "/api/requests/:id/v4", async ({ req, body, params }) => {
      const u = await auth(req);
      const r = await L2.get("requests", params.id);
      if (!r) throw new HttpError(404, "Not found");
      const cust = u.role === "customer" && r.customerId === u.id, tech = u.role === "technician" && r.technicianId === u.id;
      if (!cust && !tech) throw new HttpError(403, "Not allowed");
      const st = r.status, a = body.action;
      const txt = (k, max = 500) => String(body[k] == null ? "" : body[k]).trim().slice(0, max);
      const p = r.payment || {};
      if (cust && a === "rejectQuote") {
        if (st !== "quoted") throw bad("There is no quote to decline.");
        if (txt("reason").length < 3) throw bad("Tell us why (at least 3 characters).");
        r.quoteRejected = { reason: txt("reason"), version: r.quote.version };
        r.status = "inspection";
        await notifyAdmins("Customer declined the quote: " + txt("reason", 80), r.id);
      } else if (cust && a === "cancel") {
        if (!["pending", "inspection", "quoted", "approved", "assigned"].includes(st)) throw bad("This request can no longer be cancelled.");
        if (txt("reason").length < 3) throw bad("Choose or write a reason.");
        r.cancelReason = txt("reason");
        r.status = "cancelled";
        await notifyAdmins("Customer cancelled a request: " + txt("reason", 80), r.id);
        if (r.technicianId) await notify(r.technicianId, "A job was cancelled by the customer", r.id);
      } else if (cust && a === "pay") {
        if (!r.quote || !PAY_OPEN.includes(st)) throw bad("Payment opens after the quote is accepted.");
        if (!["cash", "wallet"].includes(body.method)) throw bad("Choose cash or wallet transfer.");
        if (p.status === "paid" || p.status === "pending") throw bad("This payment is already being handled.");
        const receipt = txt("receipt", 400);
        if (body.method === "wallet" && !receipt) throw bad("Upload the transfer receipt first.");
        r.payment = { method: body.method, status: body.method === "cash" ? "unpaid" : "pending", ...body.method === "wallet" ? { receipt } : {}, amount: total(r), at: NOW(), history: [...p.history || []] };
        await notifyAdmins("Payment " + body.method + " for request " + r.id.slice(0, 6), r.id);
      } else if (cust && a === "rate") {
        if (st !== "completed") throw bad("You can rate after the job is completed.");
        const t = Number(body.tech || 0), sv = Number(body.service || 0);
        if (!(t >= 1 && t <= 5 && sv >= 1 && sv <= 5)) throw bad("Choose 1 to 5 stars.");
        r.rating = { tech: t, service: sv, note: txt("note") };
      } else if (tech && a === "accept") {
        if (st !== "assigned") throw bad("This task is not waiting for you.");
        r.techAccepted = NOW();
        await notify(r.customerId, "Your technician accepted the job", r.id);
      } else if (tech && a === "onway") {
        if (st !== "assigned" || !r.techAccepted) throw bad("Accept the task first.");
        r.onTheWay = NOW();
        await notify(r.customerId, "Your technician is on the way", r.id);
      } else if (tech && a === "reject") {
        if (st !== "assigned" || r.techAccepted) throw bad("This task cannot be declined now.");
        if (txt("reason").length < 3) throw bad("Tell the team why.");
        r.techDeclined = { by: u.id, reason: txt("reason") };
        r.technicianId = null;
        r.status = "approved";
        await notifyAdmins("Technician declined a job: " + txt("reason", 80), r.id);
      } else if (tech && a === "arrive") {
        if (st !== "assigned" || !r.techAccepted) throw bad("Accept the task first.");
        r.arrivedAt = NOW();
        r.status = "in_progress";
        await notify(r.customerId, "Work started", r.id);
      } else if (tech && a === "part") {
        if (st !== "in_progress") throw bad("Start the task first.");
        const cost = Number(body.cost || 0), n = Number(body.qty || 1);
        if (!txt("name", 80) || !(cost >= 0) || !(n >= 1)) throw bad("Name, quantity and cost are required.");
        r.parts = [...r.parts || [], { name: txt("name", 80), qty: n, cost }].slice(-30);
      } else if (tech && a === "report") {
        if (st !== "in_progress") throw bad("Start the task first.");
        if (txt("text").length < 5) throw bad("Write what was done.");
        r.report = { text: txt("text", 1e3), hours: body.hours == null ? null : Number(body.hours) || null };
      } else if (tech && a === "confirmCash") {
        throw bad("The company confirms cash. Hand the money to the company.");
      } else if (tech && a === "photo") {
        throw bad("Use the photo upload.");
      } else throw bad("This action is not allowed.");
      await L2.put("requests", r);
      return { request: r };
    });
    async function settleRows() {
      const content = await appContent();
      const users = await L2.all("users");
      return (await L2.all("requests")).filter((r) => r.status === "completed" && r.technicianId && r.quote && r.payment && r.payment.status === "paid").map((r) => {
        const t = users.find((x) => x.id === r.technicianId);
        const pct = t && typeof t.commissionPct === "number" ? t.commissionPct : typeof content.commissionPct === "number" ? content.commissionPct : 20;
        const tot = total(r), com = Math.round(tot * pct) / 100;
        return { requestId: r.id, technicianId: r.technicianId, technicianName: t ? t.firstName + " " + t.lastName : "", serviceId: r.serviceId, currency: r.quote.currency || "EGP", collected: tot, commissionPct: pct, commission: com, technicianShare: tot - com, completedAt: r.completedAt || null, settled: !!r.settlement, settledAt: r.settlement ? r.settlement.at : null };
      }).sort((a, b) => String(b.completedAt).localeCompare(String(a.completedAt)));
    }
    route("GET", "/api/admin/settlements", async ({ req }) => {
      await needAdmin(req);
      const rows = await settleRows();
      const by = {};
      for (const x of rows) { const b = by[x.technicianId] = by[x.technicianId] || { technicianId: x.technicianId, technicianName: x.technicianName, jobs: 0, collected: 0, commission: 0, owed: 0, paid: 0 }; b.jobs++; b.collected += x.collected; b.commission += x.commission; if (x.settled) b.paid += x.technicianShare; else b.owed += x.technicianShare; }
      return { rows, technicians: Object.values(by) };
    });
    route("POST", "/api/admin/settlements/:id/pay", async ({ req, params }) => {
      const a = await needAdmin(req);
      const r = await L2.get("requests", params.id);
      if (!r) throw new HttpError(404, "Not found");
      const row = (await settleRows()).find((x) => x.requestId === r.id);
      if (!row) throw bad("Only completed jobs with money collected can be settled");
      if (r.settlement) throw bad("Already settled");
      r.settlement = { at: NOW(), amount: row.technicianShare, commission: row.commission, by: a.id };
      await L2.put("requests", r);
      await notify(r.technicianId, "Payment for a completed job was sent to you", r.id);
      return { request: r };
    });
    route("PUT", "/api/admin/technicians/:id/commission", async ({ req, body, params }) => {
      await needAdmin(req);
      const t = await L2.get("users", params.id);
      if (!t || t.role !== "technician") throw new HttpError(404, "Not found");
      const v = body.commissionPct === null ? null : Number(body.commissionPct);
      if (v !== null && !(Number.isFinite(v) && v >= 0 && v <= 90)) throw bad("Commission must be between 0 and 90");
      await L2.put("users", { ...t, commissionPct: v });
      return { ok: true };
    });
    var CSTAT = ["open", "in_review", "resolved"];
    route("POST", "/api/complaints", async ({ req, body }) => {
      const u = await auth(req);
      if (u.role !== "customer") throw new HttpError(403, "Only customers send complaints");
      const text = typeof body.text === "string" ? body.text.trim() : "";
      if (text.length < 5 || text.length > 1e3) throw bad("Describe the problem (5 to 1000 characters)");
      let requestId = null;
      if (body.requestId) {
        const r = await L2.get("requests", String(body.requestId));
        if (!r || r.customerId !== u.id) throw bad("Request not found");
        requestId = r.id;
      }
      const type = ["service", "payment", "technician", "app", "other"].includes(body.type) ? body.type : "other";
      return { complaint: await L2.put("complaints", { id: L2.id(), userId: u.id, requestId, type, text, status: "open", reply: "", createdAt: (/* @__PURE__ */ new Date()).toISOString() }) };
    });
    route("GET", "/api/complaints", async ({ req }) => {
      const u = await auth(req);
      return { complaints: (await L2.all("complaints")).filter((c) => c.userId === u.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) };
    });
    route("GET", "/api/admin/complaints", async ({ req }) => {
      await needAdmin(req);
      return { complaints: (await L2.all("complaints")).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) };
    });
    route("POST", "/api/admin/complaints/:id", async ({ req, body, params }) => {
      await needAdmin(req);
      const c = await L2.get("complaints", params.id);
      if (!c) throw new HttpError(404, "Not found");
      if (!CSTAT.includes(body.status)) throw bad("Bad status");
      const reply = typeof body.reply === "string" ? body.reply.trim().slice(0, 1e3) : c.reply;
      if (body.status === "resolved" && !reply) throw bad("Write a reply before resolving");
      return { complaint: await L2.put("complaints", { ...c, status: body.status, reply, updatedAt: (/* @__PURE__ */ new Date()).toISOString() }) };
    });
    route("GET", "/api/admin/reports", async ({ req }) => {
      await needAdmin(req);
      const rs = await L2.all("requests"), fb = await L2.all("feedback"), cp = await L2.all("complaints");
      const by = {};
      rs.forEach((r) => {
        by[r.status] = (by[r.status] || 0) + 1;
      });
      const paid = rs.filter((r) => r.payment && r.payment.status === "paid");
      const perService = {};
      rs.forEach((r) => {
        perService[r.serviceId] = (perService[r.serviceId] || 0) + 1;
      });
      const perTech = {};
      rs.filter((r) => r.technicianId && r.status === "completed").forEach((r) => {
        perTech[r.technicianId] = (perTech[r.technicianId] || 0) + 1;
      });
      return {
        requests: rs.length,
        byStatus: by,
        revenue: paid.reduce((s, r) => s + total(r), 0),
        paidCount: paid.length,
        awaitingReview: rs.filter((r) => r.payment && r.payment.status === "pending").length,
        outstanding: rs.filter((r) => r.quote && PAY_OPEN.includes(r.status) && !(r.payment && r.payment.status === "paid")).reduce((s, r) => s + total(r), 0),
        avgRating: fb.length ? +(fb.reduce((s, f) => s + f.stars, 0) / fb.length).toFixed(2) : null,
        ratings: fb.length,
        openComplaints: cp.filter((c) => c.status !== "resolved").length,
        perService,
        perTech
      };
    });
    async function handle2(req, res) {
      const send = (code, obj) => {
        res.statusCode = code;
        res.setHeader("content-type", "application/json");
        res.setHeader("access-control-allow-origin", "*");
        res.setHeader("access-control-allow-headers", "authorization,content-type");
        res.setHeader("access-control-allow-methods", "GET,POST,PUT,OPTIONS");
        res.end(JSON.stringify(obj));
      };
      try {
        if (req.method === "OPTIONS") return send(204, {});
        await L2.init();
        const path = new URL(req.url, "http://x").pathname.replace(/\/$/, "");
        let body = req.body;
        if (body === void 0) {
          const chunks = [];
          let size = 0;
          const t = "";
          try {
            body = t ? JSON.parse(t) : {};
          } catch {
            throw bad("Invalid JSON");
          }
        }
        if (typeof body === "string") {
          try {
            body = body ? JSON.parse(body) : {};
          } catch {
            throw bad("Invalid JSON");
          }
        }
        if (new TextEncoder().encode(JSON.stringify(body || {})).length > 65536) throw new HttpError(413, "Request too large");
        if (body !== null && (typeof body !== "object" || Array.isArray(body))) throw bad("JSON object required");
        for (const r of routes) {
          if (r.m !== req.method) continue;
          const m = r.re.exec(path);
          if (!m) continue;
          const execute = async () => {
            const result2 = await r.fn({ req, body: body || {}, params: m.groups || {}, query: Object.fromEntries(new URL(req.url, "http://x").searchParams) });
            if (req.method !== "GET") {
              const token = (req.headers.authorization || "").replace(/^Bearer /, "");
              const claims = await L2.verifyToken(token);
              await L2.put("activity", { id: L2.id(), actorId: claims?.sub || null, method: req.method, path, createdAt: (/* @__PURE__ */ new Date()).toISOString() });
            }
            return result2;
          };
          const result = req.method === "GET" ? await execute() : await L2.withWriteLock(execute);
          return send(200, result);
        }
        send(404, { error: "Not found" });
      } catch (e) {
        if (e instanceof HttpError) return send(e.code, { error: e.message });
        if (Number.isInteger(e.code) && e.code >= 400 && e.code <= 599) return send(e.code, { error: e.code === 503 ? "Service is not configured" : "Upstream service failed" });
        console.error(e);
        send(500, { error: "Server error" });
      }
    }
    module.exports = { handle: handle2 };
  }
});

// src/worker.js
var import_handler = __toESM(require_handler());
var L = __toESM(require_lib());

// legal pages (company details are placeholders until the company supplies them)
var LEGAL = { company: "[COMPANY LEGAL NAME]", address: "[COMPANY ADDRESS, EGYPT]", email: "angluosr@gmail.com", wa: "201202422997" };
function cleanVisit(v) { if (!v || typeof v !== "object") return null; const d = String(v.date || ""), t = String(v.time || ""); if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null; return { date: d, time: /^([01]\d|2[0-3]):[0-5]\d$/.test(t) ? t : null }; }
var LEGAL_PAGES = {"privacy": "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Privacy Policy | Tazbeeta</title><style>body{margin:0;font-family:system-ui,'Segoe UI',Roboto,'Noto Naskh Arabic',Tahoma,sans-serif;color:#12313a;background:#f6f9f9;line-height:1.65}main{max-width:760px;margin:0 auto;padding:24px 18px 60px}h1{color:#0b5d5a;margin:8px 0 4px}h2{margin:26px 0 6px;font-size:18px;color:#0b5d5a}.bar{display:flex;gap:8px;margin:12px 0 18px}.bar button{border:1px solid #0b5d5a;background:#fff;color:#0b5d5a;border-radius:20px;padding:6px 16px;font-size:14px;cursor:pointer}.bar button.on{background:#0b5d5a;color:#fff}.muted{color:#5d6f75;font-size:13px}.ar{direction:rtl;text-align:right}.box{background:#fff;border:1px solid #dbe5e6;border-radius:10px;padding:14px 16px;margin:14px 0}input{width:100%;padding:10px;margin:6px 0;border:1px solid #c5d3d5;border-radius:8px;font-size:15px;box-sizing:border-box}button.go{background:#b3261e;color:#fff;border:0;border-radius:8px;padding:10px 18px;font-size:15px;cursor:pointer}</style></head><body><main>\n<div class=\"bar\"><button id=\"be\" onclick=\"lg('en')\">English</button><button id=\"ba\" onclick=\"lg('ar')\">\u0627\u0644\u0639\u0631\u0628\u064a\u0629</button></div>\n<div id=\"en\"><h1>Privacy Policy</h1><p class=\"muted\">Last updated: November 27, 2026 \u00b7 Tazbeeta app (package com.sallehli.sallehli)</p>\n<p>This policy explains what {{COMPANY}} (\"we\", \"the company\", operator of the Tazbeeta app) collects when you use the app, why, and the choices you have. Tazbeeta is a home-services app: you request a service, the company inspects and quotes, and a technician assigned by the company does the work.</p>\n<h2>1. What we collect</h2>\n<ul><li><b>Account:</b> first and last name, email address, phone number, and a password (stored only as a salted hash, never readable by us).</li>\n<li><b>Requests:</b> the service you choose, your description, your address and area, notes, quotes, invoices, payment method and status, ratings and complaints.</li>\n<li><b>Location:</b> approximate or precise location, only when you tap \"use my location\" while the app is open. We do not track your location in the background.</li>\n<li><b>Photos:</b> photos you attach to a request, payment transfer receipts you upload, and before/after photos uploaded by the technician. We only receive the photos you choose; the app does not read your gallery.</li>\n<li><b>Messages:</b> chat between you and your technician for a request. The company can view chats to supervise service quality and resolve disputes.</li>\n<li><b>Device notification token:</b> a technical identifier so we can send you order status notifications (through Google Firebase Cloud Messaging).</li>\n<li><b>Technicians</b> also have skills, availability and job history.</li></ul>\n<h2>2. How we use it</h2>\n<p>To create and manage your account, handle requests, quotes, invoices, payments and warranty, assign a technician, let you and your technician chat, send status notifications and verification emails, support you, prevent abuse, and improve the service. We do not sell your data and we do not show ads.</p>\n<h2>3. Who sees it</h2>\n<ul><li><b>The company</b> (admins) sees account and request data to run the service.</li>\n<li><b>Your assigned technician</b> sees your first name, service details, address, photos and chat. Your phone number is not shared with the technician; contact is through the in-app chat. The technician's phone is likewise not shown to you.</li>\n<li><b>Service providers</b> that process data for us: Cloudflare (hosting and database), Google (Firebase Cloud Messaging for notifications, Gmail for verification emails). They process data only to provide those services.</li>\n<li>Authorities, only if the law requires it.</li></ul>\n<h2>4. Security</h2><p>All traffic uses HTTPS. Passwords are hashed. Access to admin tools is limited to the company. No system is perfectly secure, so please use a strong password.</p>\n<h2>5. Retention and deletion</h2>\n<p>We keep your data while your account is active. You can delete your account inside the app (More, then Delete account) or on the web at <a href=\"/delete-account\">/delete-account</a>. On deletion we remove your profile, addresses, location, photos, chat messages and notification tokens, and anonymize your past requests. Invoices and payment records may be kept in anonymized form where needed for accounting and legal reasons.</p>\n<h2>6. Your rights</h2><p>You can view and edit your details in the app, ask for a copy of your data, correct it, or delete it. Contact us below. This policy is intended to follow Egypt's Personal Data Protection Law (Law 151 of 2020).</p>\n<h2>7. Children</h2><p>The app is for people 18 and over and is not directed to children.</p>\n<h2>8. Changes</h2><p>If we change this policy we will update the date above and, for material changes, tell you in the app.</p>\n<h2>9. Contact</h2><p>{{COMPANY}}<br>{{ADDRESS}}<br>Email: <a href=\"mailto:{{EMAIL}}\">{{EMAIL}}</a><br>WhatsApp: <a href=\"https://wa.me/{{WA}}\">+{{WA}}</a></p></div>\n<div id=\"ar\" class=\"ar\" style=\"display:none\"><h1>\u0633\u064a\u0627\u0633\u0629 \u0627\u0644\u062e\u0635\u0648\u0635\u064a\u0629</h1><p class=\"muted\">\u0622\u062e\u0631 \u062a\u062d\u062f\u064a\u062b: 27 \u0646\u0648\u0641\u0645\u0628\u0631 2026 \u00b7 \u062a\u0637\u0628\u064a\u0642 \u062a\u0638\u0628\u064a\u0637\u0647</p>\n<p>\u062a\u0648\u0636\u062d \u0647\u0630\u0647 \u0627\u0644\u0633\u064a\u0627\u0633\u0629 \u0645\u0627 \u0627\u0644\u0630\u064a \u062a\u062c\u0645\u0639\u0647 {{COMPANY}} (\u00ab\u0646\u062d\u0646\u00bb \u0623\u0648 \u00ab\u0627\u0644\u0634\u0631\u0643\u0629\u00bb\u060c \u0645\u0634\u063a\u0651\u0644 \u062a\u0637\u0628\u064a\u0642 \u062a\u0638\u0628\u064a\u0637\u0647) \u0639\u0646\u062f \u0627\u0633\u062a\u062e\u062f\u0627\u0645\u0643 \u0627\u0644\u062a\u0637\u0628\u064a\u0642\u060c \u0648\u0644\u0645\u0627\u0630\u0627\u060c \u0648\u0645\u0627 \u0647\u064a \u062e\u064a\u0627\u0631\u0627\u062a\u0643. \u062a\u0638\u0628\u064a\u0637\u0647 \u062a\u0637\u0628\u064a\u0642 \u062e\u062f\u0645\u0627\u062a \u0645\u0646\u0632\u0644\u064a\u0629: \u062a\u0637\u0644\u0628 \u0627\u0644\u062e\u062f\u0645\u0629\u060c \u0641\u062a\u0642\u0648\u0645 \u0627\u0644\u0634\u0631\u0643\u0629 \u0628\u0627\u0644\u0645\u0639\u0627\u064a\u0646\u0629 \u0648\u062a\u0642\u062f\u064a\u0645 \u0639\u0631\u0636 \u0627\u0644\u0633\u0639\u0631\u060c \u062b\u0645 \u064a\u0646\u0641\u0651\u0630 \u0627\u0644\u0639\u0645\u0644 \u0641\u0646\u064a \u062a\u0639\u064a\u0651\u0646\u0647 \u0627\u0644\u0634\u0631\u0643\u0629.</p>\n<h2>1. \u0645\u0627 \u0627\u0644\u0630\u064a \u0646\u062c\u0645\u0639\u0647</h2>\n<ul><li><b>\u0627\u0644\u062d\u0633\u0627\u0628:</b> \u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0623\u0648\u0644 \u0648\u0627\u0644\u0623\u062e\u064a\u0631\u060c \u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a\u060c \u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062a\u0641\u060c \u0648\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 (\u062a\u064f\u062d\u0641\u0638 \u0641\u0642\u0637 \u0641\u064a \u0635\u0648\u0631\u0629 \u0645\u0634\u0641\u0651\u0631\u0629 \u0648\u0644\u0627 \u064a\u0645\u0643\u0646\u0646\u0627 \u0642\u0631\u0627\u0621\u062a\u0647\u0627).</li>\n<li><b>\u0627\u0644\u0637\u0644\u0628\u0627\u062a:</b> \u0627\u0644\u062e\u062f\u0645\u0629 \u0627\u0644\u062a\u064a \u062a\u062e\u062a\u0627\u0631\u0647\u0627\u060c \u0627\u0644\u0648\u0635\u0641\u060c \u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u0648\u0627\u0644\u0645\u0646\u0637\u0642\u0629\u060c \u0627\u0644\u0645\u0644\u0627\u062d\u0638\u0627\u062a\u060c \u0639\u0631\u0648\u0636 \u0627\u0644\u0623\u0633\u0639\u0627\u0631 \u0648\u0627\u0644\u0641\u0648\u0627\u062a\u064a\u0631\u060c \u0637\u0631\u064a\u0642\u0629 \u0627\u0644\u062f\u0641\u0639 \u0648\u062d\u0627\u0644\u062a\u0647\u060c \u0627\u0644\u062a\u0642\u064a\u064a\u0645\u0627\u062a \u0648\u0627\u0644\u0634\u0643\u0627\u0648\u0649.</li>\n<li><b>\u0627\u0644\u0645\u0648\u0642\u0639:</b> \u0645\u0648\u0642\u0639\u0643 \u0627\u0644\u062a\u0642\u0631\u064a\u0628\u064a \u0623\u0648 \u0627\u0644\u062f\u0642\u064a\u0642\u060c \u0641\u0642\u0637 \u0639\u0646\u062f\u0645\u0627 \u062a\u0636\u063a\u0637 \u00ab\u0627\u0633\u062a\u062e\u062f\u0645 \u0645\u0648\u0642\u0639\u064a\u00bb \u0648\u0627\u0644\u062a\u0637\u0628\u064a\u0642 \u0645\u0641\u062a\u0648\u062d. \u0644\u0627 \u0646\u062a\u062a\u0628\u0639 \u0645\u0648\u0642\u0639\u0643 \u0641\u064a \u0627\u0644\u062e\u0644\u0641\u064a\u0629.</li>\n<li><b>\u0627\u0644\u0635\u0648\u0631:</b> \u0627\u0644\u0635\u0648\u0631 \u0627\u0644\u062a\u064a \u062a\u0631\u0641\u0642\u0647\u0627 \u0628\u0627\u0644\u0637\u0644\u0628\u060c \u0648\u0625\u064a\u0635\u0627\u0644\u0627\u062a \u0627\u0644\u062a\u062d\u0648\u064a\u0644 \u0627\u0644\u062a\u064a \u062a\u0631\u0641\u0639\u0647\u0627\u060c \u0648\u0635\u0648\u0631 \u00ab\u0642\u0628\u0644 \u0648\u0628\u0639\u062f\u00bb \u0627\u0644\u062a\u064a \u064a\u0631\u0641\u0639\u0647\u0627 \u0627\u0644\u0641\u0646\u064a. \u0646\u0633\u062a\u0644\u0645 \u0641\u0642\u0637 \u0627\u0644\u0635\u0648\u0631 \u0627\u0644\u062a\u064a \u062a\u062e\u062a\u0627\u0631\u0647\u0627 \u0623\u0646\u062a\u060c \u0648\u0627\u0644\u062a\u0637\u0628\u064a\u0642 \u0644\u0627 \u064a\u0642\u0631\u0623 \u0645\u0639\u0631\u0636 \u0635\u0648\u0631\u0643.</li>\n<li><b>\u0627\u0644\u0631\u0633\u0627\u0626\u0644:</b> \u0627\u0644\u0645\u062d\u0627\u062f\u062b\u0629 \u0628\u064a\u0646\u0643 \u0648\u0628\u064a\u0646 \u0627\u0644\u0641\u0646\u064a \u0627\u0644\u062e\u0627\u0635 \u0628\u0637\u0644\u0628\u0643. \u064a\u0645\u0643\u0646 \u0644\u0644\u0634\u0631\u0643\u0629 \u0627\u0644\u0627\u0637\u0644\u0627\u0639 \u0639\u0644\u0649 \u0627\u0644\u0645\u062d\u0627\u062f\u062b\u0627\u062a \u0644\u0644\u0625\u0634\u0631\u0627\u0641 \u0639\u0644\u0649 \u062c\u0648\u062f\u0629 \u0627\u0644\u062e\u062f\u0645\u0629 \u0648\u062d\u0644 \u0627\u0644\u062e\u0644\u0627\u0641\u0627\u062a.</li>\n<li><b>\u0631\u0645\u0632 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062a \u0644\u0644\u062c\u0647\u0627\u0632:</b> \u0645\u0639\u0631\u0651\u0641 \u062a\u0642\u0646\u064a \u0644\u0646\u0631\u0633\u0644 \u0644\u0643 \u0625\u0634\u0639\u0627\u0631\u0627\u062a \u062d\u0627\u0644\u0629 \u0627\u0644\u0637\u0644\u0628 (\u0639\u0628\u0631 Google Firebase Cloud Messaging).</li>\n<li>\u0627\u0644\u0641\u0646\u064a\u0648\u0646 \u0644\u062f\u064a\u0647\u0645 \u0623\u064a\u0636\u064b\u0627 \u0627\u0644\u0645\u0647\u0627\u0631\u0627\u062a \u0648\u0627\u0644\u062a\u0648\u0627\u0641\u0631 \u0648\u0633\u062c\u0644 \u0627\u0644\u0623\u0639\u0645\u0627\u0644.</li></ul>\n<h2>2. \u0643\u064a\u0641 \u0646\u0633\u062a\u062e\u062f\u0645\u0647\u0627</h2>\n<p>\u0644\u0625\u0646\u0634\u0627\u0621 \u062d\u0633\u0627\u0628\u0643 \u0648\u0625\u062f\u0627\u0631\u062a\u0647\u060c \u0648\u0645\u0639\u0627\u0644\u062c\u0629 \u0627\u0644\u0637\u0644\u0628\u0627\u062a \u0648\u0639\u0631\u0648\u0636 \u0627\u0644\u0623\u0633\u0639\u0627\u0631 \u0648\u0627\u0644\u0641\u0648\u0627\u062a\u064a\u0631 \u0648\u0627\u0644\u062f\u0641\u0639 \u0648\u0627\u0644\u0636\u0645\u0627\u0646\u060c \u0648\u062a\u0639\u064a\u064a\u0646 \u0627\u0644\u0641\u0646\u064a\u060c \u0648\u0627\u0644\u0645\u062d\u0627\u062f\u062b\u0629 \u0628\u064a\u0646\u0643 \u0648\u0628\u064a\u0646\u0647\u060c \u0648\u0625\u0631\u0633\u0627\u0644 \u0625\u0634\u0639\u0627\u0631\u0627\u062a \u0627\u0644\u062d\u0627\u0644\u0629 \u0648\u0631\u0633\u0627\u0626\u0644 \u0627\u0644\u062a\u0641\u0639\u064a\u0644\u060c \u0648\u062f\u0639\u0645\u0643\u060c \u0648\u0645\u0646\u0639 \u0625\u0633\u0627\u0621\u0629 \u0627\u0644\u0627\u0633\u062a\u062e\u062f\u0627\u0645\u060c \u0648\u062a\u062d\u0633\u064a\u0646 \u0627\u0644\u062e\u062f\u0645\u0629. \u0644\u0627 \u0646\u0628\u064a\u0639 \u0628\u064a\u0627\u0646\u0627\u062a\u0643 \u0648\u0644\u0627 \u0646\u0639\u0631\u0636 \u0625\u0639\u0644\u0627\u0646\u0627\u062a.</p>\n<h2>3. \u0645\u0646 \u064a\u0631\u0649 \u0628\u064a\u0627\u0646\u0627\u062a\u0643</h2>\n<ul><li><b>\u0627\u0644\u0634\u0631\u0643\u0629</b> (\u0627\u0644\u0645\u0634\u0631\u0641\u0648\u0646) \u062a\u0631\u0649 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u062d\u0633\u0627\u0628 \u0648\u0627\u0644\u0637\u0644\u0628\u0627\u062a \u0644\u062a\u0634\u063a\u064a\u0644 \u0627\u0644\u062e\u062f\u0645\u0629.</li>\n<li><b>\u0627\u0644\u0641\u0646\u064a \u0627\u0644\u0645\u0639\u064a\u0651\u0646 \u0644\u0637\u0644\u0628\u0643</b> \u064a\u0631\u0649 \u0627\u0633\u0645\u0643 \u0627\u0644\u0623\u0648\u0644 \u0648\u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u062e\u062f\u0645\u0629 \u0648\u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u0648\u0627\u0644\u0635\u0648\u0631 \u0648\u0627\u0644\u0645\u062d\u0627\u062f\u062b\u0629. \u0644\u0627 \u064a\u064f\u0634\u0627\u0631\u064e\u0643 \u0631\u0642\u0645 \u0647\u0627\u062a\u0641\u0643 \u0645\u0639 \u0627\u0644\u0641\u0646\u064a\u060c \u0648\u0627\u0644\u062a\u0648\u0627\u0635\u0644 \u064a\u062a\u0645 \u0639\u0628\u0631 \u0627\u0644\u0634\u0627\u062a \u062f\u0627\u062e\u0644 \u0627\u0644\u062a\u0637\u0628\u064a\u0642\u060c \u0648\u0643\u0630\u0644\u0643 \u0644\u0627 \u064a\u0638\u0647\u0631 \u0644\u0643 \u0631\u0642\u0645 \u0627\u0644\u0641\u0646\u064a.</li>\n<li><b>\u0645\u0632\u0648\u0651\u062f\u0648 \u0627\u0644\u062e\u062f\u0645\u0629</b> \u0627\u0644\u0630\u064a\u0646 \u064a\u0639\u0627\u0644\u062c\u0648\u0646 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0644\u0635\u0627\u0644\u062d\u0646\u0627: Cloudflare (\u0627\u0644\u0627\u0633\u062a\u0636\u0627\u0641\u0629 \u0648\u0642\u0627\u0639\u062f\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a)\u060c \u0648Google (\u0625\u0634\u0639\u0627\u0631\u0627\u062a Firebase \u0648\u0628\u0631\u064a\u062f \u0627\u0644\u062a\u0641\u0639\u064a\u0644 \u0639\u0628\u0631 Gmail). \u064a\u0639\u0627\u0644\u062c\u0648\u0646\u0647\u0627 \u0641\u0642\u0637 \u0644\u062a\u0642\u062f\u064a\u0645 \u0647\u0630\u0647 \u0627\u0644\u062e\u062f\u0645\u0627\u062a.</li>\n<li>\u0627\u0644\u062c\u0647\u0627\u062a \u0627\u0644\u0631\u0633\u0645\u064a\u0629\u060c \u0641\u0642\u0637 \u0639\u0646\u062f \u0625\u0644\u0632\u0627\u0645 \u0627\u0644\u0642\u0627\u0646\u0648\u0646.</li></ul>\n<h2>4. \u0627\u0644\u0623\u0645\u0627\u0646</h2><p>\u0643\u0644 \u0627\u0644\u0627\u062a\u0635\u0627\u0644\u0627\u062a \u0639\u0628\u0631 HTTPS\u060c \u0648\u0643\u0644\u0645\u0627\u062a \u0627\u0644\u0645\u0631\u0648\u0631 \u0645\u0634\u0641\u0651\u0631\u0629\u060c \u0648\u0627\u0644\u0648\u0635\u0648\u0644 \u0644\u0623\u062f\u0648\u0627\u062a \u0627\u0644\u0625\u062f\u0627\u0631\u0629 \u0645\u0642\u0635\u0648\u0631 \u0639\u0644\u0649 \u0627\u0644\u0634\u0631\u0643\u0629. \u0644\u0627 \u064a\u0648\u062c\u062f \u0646\u0638\u0627\u0645 \u0622\u0645\u0646 \u062a\u0645\u0627\u0645\u064b\u0627\u060c \u0641\u0646\u0631\u062c\u0648 \u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0643\u0644\u0645\u0629 \u0645\u0631\u0648\u0631 \u0642\u0648\u064a\u0629.</p>\n<h2>5. \u0627\u0644\u0627\u062d\u062a\u0641\u0627\u0638 \u0648\u0627\u0644\u062d\u0630\u0641</h2>\n<p>\u0646\u062d\u062a\u0641\u0638 \u0628\u0628\u064a\u0627\u0646\u0627\u062a\u0643 \u0637\u0627\u0644\u0645\u0627 \u062d\u0633\u0627\u0628\u0643 \u0646\u0634\u0637. \u064a\u0645\u0643\u0646\u0643 \u062d\u0630\u0641 \u062d\u0633\u0627\u0628\u0643 \u0645\u0646 \u062f\u0627\u062e\u0644 \u0627\u0644\u062a\u0637\u0628\u064a\u0642 (\u0627\u0644\u0645\u0632\u064a\u062f \u062b\u0645 \u062d\u0630\u0641 \u0627\u0644\u062d\u0633\u0627\u0628) \u0623\u0648 \u0645\u0646 \u0627\u0644\u0648\u064a\u0628 \u0639\u0628\u0631 <a href=\"/delete-account\">/delete-account</a>. \u0639\u0646\u062f \u0627\u0644\u062d\u0630\u0641 \u0646\u0632\u064a\u0644 \u0645\u0644\u0641\u0643 \u0627\u0644\u0634\u062e\u0635\u064a \u0648\u0639\u0646\u0627\u0648\u064a\u0646\u0643 \u0648\u0645\u0648\u0642\u0639\u0643 \u0648\u0635\u0648\u0631\u0643 \u0648\u0631\u0633\u0627\u0626\u0644\u0643 \u0648\u0631\u0645\u0648\u0632 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062a\u060c \u0648\u0646\u062c\u0639\u0644 \u0637\u0644\u0628\u0627\u062a\u0643 \u0627\u0644\u0633\u0627\u0628\u0642\u0629 \u0645\u062c\u0647\u0648\u0644\u0629 \u0627\u0644\u0647\u0648\u064a\u0629. \u0642\u062f \u062a\u064f\u062d\u0641\u0638 \u0627\u0644\u0641\u0648\u0627\u062a\u064a\u0631 \u0648\u0633\u062c\u0644\u0627\u062a \u0627\u0644\u062f\u0641\u0639 \u0628\u0635\u0648\u0631\u0629 \u0645\u062c\u0647\u0648\u0644\u0629 \u0627\u0644\u0647\u0648\u064a\u0629 \u0639\u0646\u062f \u0627\u0644\u062d\u0627\u062c\u0629 \u0644\u0623\u063a\u0631\u0627\u0636 \u0645\u062d\u0627\u0633\u0628\u064a\u0629 \u0648\u0642\u0627\u0646\u0648\u0646\u064a\u0629.</p>\n<h2>6. \u062d\u0642\u0648\u0642\u0643</h2><p>\u064a\u0645\u0643\u0646\u0643 \u0627\u0644\u0627\u0637\u0644\u0627\u0639 \u0639\u0644\u0649 \u0628\u064a\u0627\u0646\u0627\u062a\u0643 \u0648\u062a\u0639\u062f\u064a\u0644\u0647\u0627 \u0645\u0646 \u0627\u0644\u062a\u0637\u0628\u064a\u0642\u060c \u0623\u0648 \u0637\u0644\u0628 \u0646\u0633\u062e\u0629 \u0645\u0646\u0647\u0627 \u0623\u0648 \u062a\u0635\u062d\u064a\u062d\u0647\u0627 \u0623\u0648 \u062d\u0630\u0641\u0647\u0627. \u062a\u0648\u0627\u0635\u0644 \u0645\u0639\u0646\u0627 \u0628\u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0623\u062f\u0646\u0627\u0647. \u062a\u0647\u062f\u0641 \u0647\u0630\u0647 \u0627\u0644\u0633\u064a\u0627\u0633\u0629 \u0625\u0644\u0649 \u0627\u0644\u0627\u0644\u062a\u0632\u0627\u0645 \u0628\u0642\u0627\u0646\u0648\u0646 \u062d\u0645\u0627\u064a\u0629 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0634\u062e\u0635\u064a\u0629 \u0627\u0644\u0645\u0635\u0631\u064a (\u0627\u0644\u0642\u0627\u0646\u0648\u0646 151 \u0644\u0633\u0646\u0629 2020).</p>\n<h2>7. \u0627\u0644\u0623\u0637\u0641\u0627\u0644</h2><p>\u0627\u0644\u062a\u0637\u0628\u064a\u0642 \u0644\u0645\u0646 \u0639\u0645\u0631\u0647 18 \u0633\u0646\u0629 \u0641\u0623\u0643\u062b\u0631 \u0648\u063a\u064a\u0631 \u0645\u0648\u062c\u0651\u0647 \u0644\u0644\u0623\u0637\u0641\u0627\u0644.</p>\n<h2>8. \u0627\u0644\u062a\u0639\u062f\u064a\u0644\u0627\u062a</h2><p>\u0625\u0630\u0627 \u063a\u064a\u0651\u0631\u0646\u0627 \u0647\u0630\u0647 \u0627\u0644\u0633\u064a\u0627\u0633\u0629 \u0633\u0646\u062d\u062f\u0651\u062b \u0627\u0644\u062a\u0627\u0631\u064a\u062e \u0623\u0639\u0644\u0627\u0647\u060c \u0648\u0639\u0646\u062f \u0627\u0644\u062a\u063a\u064a\u064a\u0631\u0627\u062a \u0627\u0644\u062c\u0648\u0647\u0631\u064a\u0629 \u0633\u0646\u062e\u0628\u0631\u0643 \u062f\u0627\u062e\u0644 \u0627\u0644\u062a\u0637\u0628\u064a\u0642.</p>\n<h2>9. \u0627\u0644\u062a\u0648\u0627\u0635\u0644</h2><p>{{COMPANY}}<br>{{ADDRESS}}<br>\u0627\u0644\u0628\u0631\u064a\u062f: <a href=\"mailto:{{EMAIL}}\">{{EMAIL}}</a><br>\u0648\u0627\u062a\u0633\u0627\u0628: <a href=\"https://wa.me/{{WA}}\">+{{WA}}</a></p></div><script>function lg(l){document.getElementById('en').style.display=l=='en'?'block':'none';document.getElementById('ar').style.display=l=='ar'?'block':'none';document.getElementById('be').className=l=='en'?'on':'';document.getElementById('ba').className=l=='ar'?'on':''}lg(/^ar/i.test(navigator.language)?'ar':'en')</script></main></body></html>", "terms": "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Terms of Service | Tazbeeta</title><style>body{margin:0;font-family:system-ui,'Segoe UI',Roboto,'Noto Naskh Arabic',Tahoma,sans-serif;color:#12313a;background:#f6f9f9;line-height:1.65}main{max-width:760px;margin:0 auto;padding:24px 18px 60px}h1{color:#0b5d5a;margin:8px 0 4px}h2{margin:26px 0 6px;font-size:18px;color:#0b5d5a}.bar{display:flex;gap:8px;margin:12px 0 18px}.bar button{border:1px solid #0b5d5a;background:#fff;color:#0b5d5a;border-radius:20px;padding:6px 16px;font-size:14px;cursor:pointer}.bar button.on{background:#0b5d5a;color:#fff}.muted{color:#5d6f75;font-size:13px}.ar{direction:rtl;text-align:right}.box{background:#fff;border:1px solid #dbe5e6;border-radius:10px;padding:14px 16px;margin:14px 0}input{width:100%;padding:10px;margin:6px 0;border:1px solid #c5d3d5;border-radius:8px;font-size:15px;box-sizing:border-box}button.go{background:#b3261e;color:#fff;border:0;border-radius:8px;padding:10px 18px;font-size:15px;cursor:pointer}</style></head><body><main>\n<div class=\"bar\"><button id=\"be\" onclick=\"lg('en')\">English</button><button id=\"ba\" onclick=\"lg('ar')\">\u0627\u0644\u0639\u0631\u0628\u064a\u0629</button></div>\n<div id=\"en\"><h1>Terms of Service</h1><p class=\"muted\">Last updated: November 27, 2026 \u00b7 Tazbeeta app (package com.sallehli.sallehli)</p>\n<p>These terms govern your use of the Tazbeeta app operated by {{COMPANY}} (\"the company\"). By creating an account you agree to them.</p>\n<h2>1. The service</h2><p>Tazbeeta lets you request home services (such as plumbing, electrical, carpentry and painting). The company inspects, gives you a price quote, and assigns a technician. The contract for the service is with the company, not with the individual technician.</p>\n<h2>2. Accounts</h2><p>You must be 18 or older, give accurate details, and keep your password private. You are responsible for activity on your account. The company may suspend accounts that break these terms.</p>\n<h2>3. Prices and payment</h2><p>Prices shown as \"starting from\" are indicative only. The final price is the quote the company gives you after inspection, and you can accept or decline it. Pay the company only, by cash (confirmed by the company) or by transfer with a receipt that the company verifies. Do not pay a technician directly unless the company told you to, and do not rely on a payment until the app shows it as paid.</p>\n<h2>4. Cancellation</h2><p>You can cancel a request before work starts. Once a technician is on the way or working, cancellation may be refused or may carry an inspection fee, as stated in your quote.</p>\n<h2>5. Warranty</h2><p>Completed work carries a 30-day warranty from the completion date, shown on your invoice. It covers defects in the work performed. It does not cover misuse, damage by others, or parts and issues outside the original scope. Contact support within the warranty period.</p>\n<h2>6. Chat and photos</h2><p>Use the in-app chat for communication with your technician. Do not share offensive, illegal or misleading content. The company can view chats and photos and may remove content or accounts that abuse the service. Only upload photos you have the right to share.</p>\n<h2>7. Responsibility</h2><p>We work to provide reliable service but cannot guarantee uninterrupted availability. To the extent the law allows, our liability is limited to the amount you paid for the affected service. Nothing here limits rights you have under Egyptian consumer law.</p>\n<h2>8. Privacy</h2><p>See our <a href=\"/privacy\">Privacy Policy</a>. You can delete your account any time (<a href=\"/delete-account\">/delete-account</a>).</p>\n<h2>9. Changes and law</h2><p>We may update these terms and will update the date above. These terms are governed by the laws of Egypt.</p>\n<h2>10. Contact</h2><p>{{COMPANY}}<br>{{ADDRESS}}<br>Email: <a href=\"mailto:{{EMAIL}}\">{{EMAIL}}</a><br>WhatsApp: <a href=\"https://wa.me/{{WA}}\">+{{WA}}</a></p></div>\n<div id=\"ar\" class=\"ar\" style=\"display:none\"><h1>\u0634\u0631\u0648\u0637 \u0627\u0644\u0627\u0633\u062a\u062e\u062f\u0627\u0645</h1><p class=\"muted\">\u0622\u062e\u0631 \u062a\u062d\u062f\u064a\u062b: 27 \u0646\u0648\u0641\u0645\u0628\u0631 2026 \u00b7 \u062a\u0637\u0628\u064a\u0642 \u062a\u0638\u0628\u064a\u0637\u0647</p>\n<p>\u062a\u062d\u0643\u0645 \u0647\u0630\u0647 \u0627\u0644\u0634\u0631\u0648\u0637 \u0627\u0633\u062a\u062e\u062f\u0627\u0645\u0643 \u0644\u062a\u0637\u0628\u064a\u0642 \u062a\u0638\u0628\u064a\u0637\u0647 \u0627\u0644\u0630\u064a \u062a\u0634\u063a\u0651\u0644\u0647 {{COMPANY}} (\u00ab\u0627\u0644\u0634\u0631\u0643\u0629\u00bb). \u0628\u0625\u0646\u0634\u0627\u0621 \u062d\u0633\u0627\u0628 \u0641\u0625\u0646\u0643 \u062a\u0648\u0627\u0641\u0642 \u0639\u0644\u064a\u0647\u0627.</p>\n<h2>1. \u0627\u0644\u062e\u062f\u0645\u0629</h2><p>\u064a\u062a\u064a\u062d \u0644\u0643 \u062a\u0638\u0628\u064a\u0637\u0647 \u0637\u0644\u0628 \u062e\u062f\u0645\u0627\u062a \u0645\u0646\u0632\u0644\u064a\u0629 (\u0645\u062b\u0644 \u0627\u0644\u0633\u0628\u0627\u0643\u0629 \u0648\u0627\u0644\u0643\u0647\u0631\u0628\u0627\u0621 \u0648\u0627\u0644\u0646\u062c\u0627\u0631\u0629 \u0648\u0627\u0644\u062f\u0647\u0627\u0646). \u062a\u0642\u0648\u0645 \u0627\u0644\u0634\u0631\u0643\u0629 \u0628\u0627\u0644\u0645\u0639\u0627\u064a\u0646\u0629 \u0648\u062a\u0642\u062f\u0651\u0645 \u0644\u0643 \u0639\u0631\u0636 \u0633\u0639\u0631 \u0648\u062a\u0639\u064a\u0651\u0646 \u0641\u0646\u064a\u064b\u0627. \u0627\u0644\u062a\u0639\u0627\u0642\u062f \u0639\u0644\u0649 \u0627\u0644\u062e\u062f\u0645\u0629 \u064a\u0643\u0648\u0646 \u0645\u0639 \u0627\u0644\u0634\u0631\u0643\u0629 \u0648\u0644\u064a\u0633 \u0645\u0639 \u0627\u0644\u0641\u0646\u064a \u0628\u0634\u062e\u0635\u0647.</p>\n<h2>2. \u0627\u0644\u062d\u0633\u0627\u0628\u0627\u062a</h2><p>\u064a\u062c\u0628 \u0623\u0646 \u064a\u0643\u0648\u0646 \u0639\u0645\u0631\u0643 18 \u0633\u0646\u0629 \u0641\u0623\u0643\u062b\u0631\u060c \u0648\u0623\u0646 \u062a\u064f\u062f\u062e\u0644 \u0628\u064a\u0627\u0646\u0627\u062a \u0635\u062d\u064a\u062d\u0629 \u0648\u062a\u062d\u0627\u0641\u0638 \u0639\u0644\u0649 \u0633\u0631\u064a\u0629 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631. \u0623\u0646\u062a \u0645\u0633\u0624\u0648\u0644 \u0639\u0645\u0627 \u064a\u062d\u062f\u062b \u0641\u064a \u062d\u0633\u0627\u0628\u0643. \u064a\u062d\u0642 \u0644\u0644\u0634\u0631\u0643\u0629 \u0625\u064a\u0642\u0627\u0641 \u0627\u0644\u062d\u0633\u0627\u0628\u0627\u062a \u0627\u0644\u0645\u062e\u0627\u0644\u0641\u0629 \u0644\u0647\u0630\u0647 \u0627\u0644\u0634\u0631\u0648\u0637.</p>\n<h2>3. \u0627\u0644\u0623\u0633\u0639\u0627\u0631 \u0648\u0627\u0644\u062f\u0641\u0639</h2><p>\u0627\u0644\u0623\u0633\u0639\u0627\u0631 \u0627\u0644\u0645\u0643\u062a\u0648\u0628\u0629 \u00ab\u0627\u0628\u062a\u062f\u0627\u0621\u064b \u0645\u0646\u00bb \u0627\u0633\u062a\u0631\u0634\u0627\u062f\u064a\u0629 \u0641\u0642\u0637. \u0627\u0644\u0633\u0639\u0631 \u0627\u0644\u0646\u0647\u0627\u0626\u064a \u0647\u0648 \u0639\u0631\u0636 \u0627\u0644\u0634\u0631\u0643\u0629 \u0628\u0639\u062f \u0627\u0644\u0645\u0639\u0627\u064a\u0646\u0629\u060c \u0648\u0644\u0643 \u0642\u0628\u0648\u0644\u0647 \u0623\u0648 \u0631\u0641\u0636\u0647. \u0627\u062f\u0641\u0639 \u0644\u0644\u0634\u0631\u0643\u0629 \u0641\u0642\u0637\u060c \u0646\u0642\u062f\u064b\u0627 (\u062a\u0624\u0643\u062f\u0647 \u0627\u0644\u0634\u0631\u0643\u0629) \u0623\u0648 \u0628\u062a\u062d\u0648\u064a\u0644 \u0645\u0639 \u0625\u064a\u0635\u0627\u0644 \u062a\u0631\u0627\u062c\u0639\u0647 \u0627\u0644\u0634\u0631\u0643\u0629. \u0644\u0627 \u062a\u062f\u0641\u0639 \u0644\u0644\u0641\u0646\u064a \u0645\u0628\u0627\u0634\u0631\u0629 \u0625\u0644\u0627 \u0625\u0630\u0627 \u0637\u0644\u0628\u062a \u0645\u0646\u0643 \u0627\u0644\u0634\u0631\u0643\u0629 \u0630\u0644\u0643\u060c \u0648\u0644\u0627 \u062a\u0639\u062a\u0645\u062f \u0639\u0644\u0649 \u0627\u0644\u062f\u0641\u0639 \u0642\u0628\u0644 \u0623\u0646 \u064a\u0638\u0647\u0631 \u0641\u064a \u0627\u0644\u062a\u0637\u0628\u064a\u0642 \u00ab\u0645\u062f\u0641\u0648\u0639\u00bb.</p>\n<h2>4. \u0627\u0644\u0625\u0644\u063a\u0627\u0621</h2><p>\u064a\u0645\u0643\u0646\u0643 \u0625\u0644\u063a\u0627\u0621 \u0627\u0644\u0637\u0644\u0628 \u0642\u0628\u0644 \u0628\u062f\u0621 \u0627\u0644\u0639\u0645\u0644. \u0628\u0639\u062f \u0623\u0646 \u064a\u0643\u0648\u0646 \u0627\u0644\u0641\u0646\u064a \u0641\u064a \u0627\u0644\u0637\u0631\u064a\u0642 \u0623\u0648 \u064a\u0639\u0645\u0644\u060c \u0642\u062f \u064a\u064f\u0631\u0641\u0636 \u0627\u0644\u0625\u0644\u063a\u0627\u0621 \u0623\u0648 \u062a\u064f\u062d\u062a\u0633\u0628 \u0631\u0633\u0648\u0645 \u0645\u0639\u0627\u064a\u0646\u0629 \u0643\u0645\u0627 \u0647\u0648 \u0645\u0630\u0643\u0648\u0631 \u0641\u064a \u0639\u0631\u0636 \u0627\u0644\u0633\u0639\u0631.</p>\n<h2>5. \u0627\u0644\u0636\u0645\u0627\u0646</h2><p>\u0627\u0644\u0623\u0639\u0645\u0627\u0644 \u0627\u0644\u0645\u0646\u0641\u0630\u0629 \u0639\u0644\u064a\u0647\u0627 \u0636\u0645\u0627\u0646 30 \u064a\u0648\u0645\u064b\u0627 \u0645\u0646 \u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0625\u0646\u062c\u0627\u0632 \u0643\u0645\u0627 \u064a\u0638\u0647\u0631 \u0641\u064a \u0627\u0644\u0641\u0627\u062a\u0648\u0631\u0629. \u064a\u063a\u0637\u064a \u0639\u064a\u0648\u0628 \u0627\u0644\u0639\u0645\u0644 \u0627\u0644\u0645\u0646\u0641\u0630 \u0648\u0644\u0627 \u064a\u063a\u0637\u064a \u0633\u0648\u0621 \u0627\u0644\u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0623\u0648 \u0627\u0644\u062a\u0644\u0641 \u0628\u0641\u0639\u0644 \u0627\u0644\u063a\u064a\u0631 \u0623\u0648 \u0627\u0644\u0642\u0637\u0639 \u0648\u0627\u0644\u0645\u0634\u0643\u0644\u0627\u062a \u062e\u0627\u0631\u062c \u0646\u0637\u0627\u0642 \u0627\u0644\u0639\u0645\u0644 \u0627\u0644\u0623\u0635\u0644\u064a. \u062a\u0648\u0627\u0635\u0644 \u0645\u0639 \u0627\u0644\u062f\u0639\u0645 \u062e\u0644\u0627\u0644 \u0641\u062a\u0631\u0629 \u0627\u0644\u0636\u0645\u0627\u0646.</p>\n<h2>6. \u0627\u0644\u0634\u0627\u062a \u0648\u0627\u0644\u0635\u0648\u0631</h2><p>\u0627\u0633\u062a\u062e\u062f\u0645 \u0627\u0644\u0634\u0627\u062a \u062f\u0627\u062e\u0644 \u0627\u0644\u062a\u0637\u0628\u064a\u0642 \u0644\u0644\u062a\u0648\u0627\u0635\u0644 \u0645\u0639 \u0627\u0644\u0641\u0646\u064a. \u0644\u0627 \u062a\u0634\u0627\u0631\u0643 \u0645\u062d\u062a\u0648\u0649 \u0645\u0633\u064a\u0626\u064b\u0627 \u0623\u0648 \u063a\u064a\u0631 \u0642\u0627\u0646\u0648\u0646\u064a \u0623\u0648 \u0645\u0636\u0644\u0644\u064b\u0627. \u064a\u062d\u0642 \u0644\u0644\u0634\u0631\u0643\u0629 \u0627\u0644\u0627\u0637\u0644\u0627\u0639 \u0639\u0644\u0649 \u0627\u0644\u0645\u062d\u0627\u062f\u062b\u0627\u062a \u0648\u0627\u0644\u0635\u0648\u0631 \u0648\u062d\u0630\u0641 \u0627\u0644\u0645\u062d\u062a\u0648\u0649 \u0623\u0648 \u0627\u0644\u062d\u0633\u0627\u0628\u0627\u062a \u0627\u0644\u0645\u0633\u064a\u0626\u0629. \u0627\u0631\u0641\u0639 \u0641\u0642\u0637 \u0635\u0648\u0631\u064b\u0627 \u064a\u062d\u0642 \u0644\u0643 \u0645\u0634\u0627\u0631\u0643\u062a\u0647\u0627.</p>\n<h2>7. \u0627\u0644\u0645\u0633\u0624\u0648\u0644\u064a\u0629</h2><p>\u0646\u062d\u0631\u0635 \u0639\u0644\u0649 \u062a\u0642\u062f\u064a\u0645 \u062e\u062f\u0645\u0629 \u0645\u0648\u062b\u0648\u0642\u0629 \u0644\u0643\u0646 \u0644\u0627 \u0646\u0636\u0645\u0646 \u062a\u0648\u0641\u0631\u0647\u0627 \u062f\u0648\u0646 \u0627\u0646\u0642\u0637\u0627\u0639. \u0628\u0627\u0644\u0642\u062f\u0631 \u0627\u0644\u0630\u064a \u064a\u0633\u0645\u062d \u0628\u0647 \u0627\u0644\u0642\u0627\u0646\u0648\u0646 \u062a\u0642\u062a\u0635\u0631 \u0645\u0633\u0624\u0648\u0644\u064a\u062a\u0646\u0627 \u0639\u0644\u0649 \u0627\u0644\u0645\u0628\u0644\u063a \u0627\u0644\u0630\u064a \u062f\u0641\u0639\u062a\u0647 \u0644\u0644\u062e\u062f\u0645\u0629 \u0627\u0644\u0645\u0639\u0646\u064a\u0629. \u0644\u0627 \u064a\u0642\u064a\u0651\u062f \u0634\u064a\u0621 \u0647\u0646\u0627 \u062d\u0642\u0648\u0642\u0643 \u0628\u0645\u0648\u062c\u0628 \u0642\u0627\u0646\u0648\u0646 \u062d\u0645\u0627\u064a\u0629 \u0627\u0644\u0645\u0633\u062a\u0647\u0644\u0643 \u0627\u0644\u0645\u0635\u0631\u064a.</p>\n<h2>8. \u0627\u0644\u062e\u0635\u0648\u0635\u064a\u0629</h2><p>\u0631\u0627\u062c\u0639 <a href=\"/privacy\">\u0633\u064a\u0627\u0633\u0629 \u0627\u0644\u062e\u0635\u0648\u0635\u064a\u0629</a>. \u064a\u0645\u0643\u0646\u0643 \u062d\u0630\u0641 \u062d\u0633\u0627\u0628\u0643 \u0641\u064a \u0623\u064a \u0648\u0642\u062a (<a href=\"/delete-account\">/delete-account</a>).</p>\n<h2>9. \u0627\u0644\u062a\u0639\u062f\u064a\u0644 \u0648\u0627\u0644\u0642\u0627\u0646\u0648\u0646</h2><p>\u0642\u062f \u0646\u062d\u062f\u0651\u062b \u0647\u0630\u0647 \u0627\u0644\u0634\u0631\u0648\u0637 \u0648\u0633\u0646\u063a\u064a\u0651\u0631 \u0627\u0644\u062a\u0627\u0631\u064a\u062e \u0623\u0639\u0644\u0627\u0647. \u062a\u062e\u0636\u0639 \u0647\u0630\u0647 \u0627\u0644\u0634\u0631\u0648\u0637 \u0644\u0642\u0648\u0627\u0646\u064a\u0646 \u062c\u0645\u0647\u0648\u0631\u064a\u0629 \u0645\u0635\u0631 \u0627\u0644\u0639\u0631\u0628\u064a\u0629.</p>\n<h2>10. \u0627\u0644\u062a\u0648\u0627\u0635\u0644</h2><p>{{COMPANY}}<br>{{ADDRESS}}<br>\u0627\u0644\u0628\u0631\u064a\u062f: <a href=\"mailto:{{EMAIL}}\">{{EMAIL}}</a><br>\u0648\u0627\u062a\u0633\u0627\u0628: <a href=\"https://wa.me/{{WA}}\">+{{WA}}</a></p></div><script>function lg(l){document.getElementById('en').style.display=l=='en'?'block':'none';document.getElementById('ar').style.display=l=='ar'?'block':'none';document.getElementById('be').className=l=='en'?'on':'';document.getElementById('ba').className=l=='ar'?'on':''}lg(/^ar/i.test(navigator.language)?'ar':'en')</script></main></body></html>", "delete-account": "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Delete your account | Tazbeeta</title><style>body{margin:0;font-family:system-ui,'Segoe UI',Roboto,'Noto Naskh Arabic',Tahoma,sans-serif;color:#12313a;background:#f6f9f9;line-height:1.65}main{max-width:760px;margin:0 auto;padding:24px 18px 60px}h1{color:#0b5d5a;margin:8px 0 4px}h2{margin:26px 0 6px;font-size:18px;color:#0b5d5a}.bar{display:flex;gap:8px;margin:12px 0 18px}.bar button{border:1px solid #0b5d5a;background:#fff;color:#0b5d5a;border-radius:20px;padding:6px 16px;font-size:14px;cursor:pointer}.bar button.on{background:#0b5d5a;color:#fff}.muted{color:#5d6f75;font-size:13px}.ar{direction:rtl;text-align:right}.box{background:#fff;border:1px solid #dbe5e6;border-radius:10px;padding:14px 16px;margin:14px 0}input{width:100%;padding:10px;margin:6px 0;border:1px solid #c5d3d5;border-radius:8px;font-size:15px;box-sizing:border-box}button.go{background:#b3261e;color:#fff;border:0;border-radius:8px;padding:10px 18px;font-size:15px;cursor:pointer}</style></head><body><main>\n<div class=\"bar\"><button id=\"be\" onclick=\"lg('en')\">English</button><button id=\"ba\" onclick=\"lg('ar')\">\u0627\u0644\u0639\u0631\u0628\u064a\u0629</button></div>\n<div id=\"en\"><h1>Delete your account</h1><p class=\"muted\">Last updated: November 27, 2026 \u00b7 Tazbeeta app (package com.sallehli.sallehli)</p><p>You can delete your Tazbeeta account and data in two ways.</p>\n<h2>In the app</h2><p>Open the app, go to <b>More</b>, then <b>Delete account</b> and confirm with your password.</p>\n<h2>On this page</h2><div class=\"box\"><p>Enter your account email and password. This permanently deletes your account.</p><input id=\"e\" type=\"email\" placeholder=\"Email\" autocomplete=\"username\"><input id=\"p\" type=\"password\" placeholder=\"Password\" autocomplete=\"current-password\"><button class=\"go\" onclick=\"del()\">Delete my account</button><p id=\"m\" class=\"muted\"></p></div>\n<h2>What is deleted</h2><p>Your profile, saved addresses, location, uploaded photos, chat messages and notification tokens are removed. Your past requests stay only in anonymized form (no name, phone, email, address or photos). Invoices and payment records may be kept anonymized where needed for accounting and legal reasons.</p>\n<p>Can't sign in? Message us on <a href=\"https://wa.me/{{WA}}\">WhatsApp</a> or email <a href=\"mailto:{{EMAIL}}\">{{EMAIL}}</a> from your account email and we will delete it.</p></div>\n<div id=\"ar\" class=\"ar\" style=\"display:none\"><h1>\u062d\u0630\u0641 \u0627\u0644\u062d\u0633\u0627\u0628</h1><p class=\"muted\">\u0622\u062e\u0631 \u062a\u062d\u062f\u064a\u062b: 27 \u0646\u0648\u0641\u0645\u0628\u0631 2026 \u00b7 \u062a\u0637\u0628\u064a\u0642 \u062a\u0638\u0628\u064a\u0637\u0647</p><p>\u064a\u0645\u0643\u0646\u0643 \u062d\u0630\u0641 \u062d\u0633\u0627\u0628\u0643 \u0648\u0628\u064a\u0627\u0646\u0627\u062a\u0643 \u0641\u064a \u062a\u0638\u0628\u064a\u0637\u0647 \u0628\u0637\u0631\u064a\u0642\u062a\u064a\u0646.</p>\n<h2>\u0645\u0646 \u0627\u0644\u062a\u0637\u0628\u064a\u0642</h2><p>\u0627\u0641\u062a\u062d \u0627\u0644\u062a\u0637\u0628\u064a\u0642\u060c \u0627\u0630\u0647\u0628 \u0625\u0644\u0649 <b>\u0627\u0644\u0645\u0632\u064a\u062f</b> \u062b\u0645 <b>\u062d\u0630\u0641 \u0627\u0644\u062d\u0633\u0627\u0628</b> \u0648\u0623\u0643\u0651\u062f \u0628\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631.</p>\n<h2>\u0645\u0646 \u0647\u0630\u0647 \u0627\u0644\u0635\u0641\u062d\u0629</h2><div class=\"box\"><p>\u0627\u0643\u062a\u0628 \u0628\u0631\u064a\u062f \u062d\u0633\u0627\u0628\u0643 \u0648\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631. \u0633\u064a\u062a\u0645 \u062d\u0630\u0641 \u062d\u0633\u0627\u0628\u0643 \u0646\u0647\u0627\u0626\u064a\u064b\u0627.</p><input id=\"e2\" type=\"email\" placeholder=\"\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a\" autocomplete=\"username\"><input id=\"p2\" type=\"password\" placeholder=\"\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631\" autocomplete=\"current-password\"><button class=\"go\" onclick=\"del2()\">\u0627\u062d\u0630\u0641 \u062d\u0633\u0627\u0628\u064a</button><p id=\"m2\" class=\"muted\"></p></div>\n<h2>\u0645\u0627 \u0627\u0644\u0630\u064a \u064a\u064f\u062d\u0630\u0641</h2><p>\u064a\u064f\u062d\u0630\u0641 \u0645\u0644\u0641\u0643 \u0627\u0644\u0634\u062e\u0635\u064a \u0648\u0639\u0646\u0627\u0648\u064a\u0646\u0643 \u0648\u0645\u0648\u0642\u0639\u0643 \u0648\u0635\u0648\u0631\u0643 \u0627\u0644\u0645\u0631\u0641\u0648\u0639\u0629 \u0648\u0631\u0633\u0627\u0626\u0644\u0643 \u0648\u0631\u0645\u0648\u0632 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062a. \u062a\u0628\u0642\u0649 \u0637\u0644\u0628\u0627\u062a\u0643 \u0627\u0644\u0633\u0627\u0628\u0642\u0629 \u0628\u0635\u0648\u0631\u0629 \u0645\u062c\u0647\u0648\u0644\u0629 \u0627\u0644\u0647\u0648\u064a\u0629 \u0641\u0642\u0637 (\u0628\u062f\u0648\u0646 \u0627\u0633\u0645 \u0623\u0648 \u0647\u0627\u062a\u0641 \u0623\u0648 \u0628\u0631\u064a\u062f \u0623\u0648 \u0639\u0646\u0648\u0627\u0646 \u0623\u0648 \u0635\u0648\u0631). \u0642\u062f \u062a\u064f\u062d\u0641\u0638 \u0627\u0644\u0641\u0648\u0627\u062a\u064a\u0631 \u0648\u0633\u062c\u0644\u0627\u062a \u0627\u0644\u062f\u0641\u0639 \u0645\u062c\u0647\u0648\u0644\u0629 \u0627\u0644\u0647\u0648\u064a\u0629 \u0639\u0646\u062f \u0627\u0644\u062d\u0627\u062c\u0629 \u0644\u0623\u063a\u0631\u0627\u0636 \u0645\u062d\u0627\u0633\u0628\u064a\u0629 \u0648\u0642\u0627\u0646\u0648\u0646\u064a\u0629.</p>\n<p>\u0644\u0627 \u062a\u0633\u062a\u0637\u064a\u0639 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644\u061f \u0631\u0627\u0633\u0644\u0646\u0627 \u0639\u0644\u0649 <a href=\"https://wa.me/{{WA}}\">\u0648\u0627\u062a\u0633\u0627\u0628</a> \u0623\u0648 \u0639\u0644\u0649 <a href=\"mailto:{{EMAIL}}\">{{EMAIL}}</a> \u0645\u0646 \u0628\u0631\u064a\u062f \u062d\u0633\u0627\u0628\u0643 \u0648\u0633\u0646\u062d\u0630\u0641\u0647.</p></div><script>async function run(e,p,m,ok){const o=document.getElementById(m);o.textContent='...';try{const a=await fetch('/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:document.getElementById(e).value,password:document.getElementById(p).value})});const j=await a.json();if(!a.ok)throw new Error(j.error||'Error');if(!confirm(ok))return o.textContent='';const d=await fetch('/api/me/delete',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+j.token},body:JSON.stringify({password:document.getElementById(p).value})});const k=await d.json();if(!d.ok)throw new Error(k.error||'Error');o.textContent=ok.startsWith('Delete')?'Your account was deleted.':'\u062a\u0645 \u062d\u0630\u0641 \u062d\u0633\u0627\u0628\u0643.'}catch(x){o.textContent=x.message}}\nfunction del(){run('e','p','m','Delete your account permanently?')}function del2(){run('e2','p2','m2','\u062d\u0630\u0641 \u0627\u0644\u062d\u0633\u0627\u0628 \u0646\u0647\u0627\u0626\u064a\u064b\u0627\u061f')}</script><script>function lg(l){document.getElementById('en').style.display=l=='en'?'block':'none';document.getElementById('ar').style.display=l=='ar'?'block':'none';document.getElementById('be').className=l=='en'?'on':'';document.getElementById('ba').className=l=='ar'?'on':''}lg(/^ar/i.test(navigator.language)?'ar':'en')</script></main></body></html>"};
function legalPage(name, content) { const c = content || {}; const L = { company: c.companyName || LEGAL.company, address: c.companyAddress || LEGAL.address, email: c.supportEmail || LEGAL.email, wa: c.whatsapp || LEGAL.wa }; const h = LEGAL_PAGES[name].replace(/\{\{COMPANY\}\}/g, L.company).replace(/\{\{ADDRESS\}\}/g, L.address).replace(/\{\{EMAIL\}\}/g, L.email).replace(/\{\{WA\}\}/g, L.wa); return new Response(h, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300" } }); }
// public/admin.html
var admin_default = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tazbeeta Admin</title>
<style>
:root{--b:#1f6bf2;--b2:#0f4fcf;--bs:#e8f0fe;--ink:#14213d;--mut:#6c7a92;--line:#e4ebf5;--bg:#eaf3fc;--ok:#16a34a;--warn:#f59e0b;--bad:#e5484d}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}body{margin:0;font-family:system-ui,"Segoe UI",Roboto,"Noto Naskh Arabic",Tahoma,sans-serif;color:var(--ink);background:linear-gradient(160deg,#e6f1fd 0%,#f4f8fd 55%,#eaf3fc 100%);min-height:100vh}
.shell{display:flex;min-height:100vh}
aside#side{width:248px;flex:none;background:rgba(255,255,255,.72);backdrop-filter:blur(8px);border-inline-end:1px solid var(--line);padding:20px 14px;display:flex;flex-direction:column;gap:6px;position:sticky;top:0;height:100vh;overflow-y:auto}
.chip{display:inline-block;background:#eaf1ff;color:#1f6bf2;border-radius:999px;padding:2px 10px;font-size:12px;margin:2px;font-weight:600}.chip.g{background:#e6f7ee;color:#15803d}.pick{display:inline-block;margin:3px 10px 3px 0}[dir=rtl] .pick{margin:3px 0 3px 10px}.maplink{font-size:12px;font-weight:600}
.brand{display:flex;align-items:center;gap:10px;padding:4px 8px 16px}.brand img{object-fit:contain;width:44px;height:44px;border-radius:12px;background:#fff;padding:3px;box-shadow:0 4px 14px rgba(31,107,242,.15)}.brand b{display:block;font-size:17px}.brand small{color:var(--mut);font-size:11px}
nav{display:flex;flex-direction:column;gap:2px}.ng{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--mut);padding:14px 12px 6px}
nav button{box-shadow:none;display:flex;align-items:center;gap:12px;background:none;color:#40506b;border:0;border-radius:14px;padding:11px 12px;font-size:15px;text-align:start;width:100%;cursor:pointer}nav button svg{width:20px;height:20px;flex:none;stroke:currentColor;fill:none;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
nav button:hover{background:#f0f6ff}nav button.on{background:var(--bs);color:var(--b);font-weight:650}
.side-foot{margin-top:auto;padding:14px;border-radius:18px;background:linear-gradient(135deg,#e4efff,#f3f8ff);color:#40506b;font-size:12.5px;line-height:1.5}.side-foot b{display:block;color:var(--ink);font-size:13.5px;margin-bottom:2px}
.mw{flex:1;min-width:0;display:flex;flex-direction:column}
.top{display:flex;align-items:center;gap:10px;padding:18px 28px 0}.top h2{margin:0;font-size:22px;flex:1}
.top button{background:#fff;color:var(--ink);border:1px solid var(--line);border-radius:999px;padding:9px 16px;font-size:14px;box-shadow:0 2px 8px rgba(20,40,80,.04)}#burger{display:none;padding:9px 12px}
main{width:100%;max-width:1180px;margin:0 auto;padding:18px 28px 40px}
.card{background:#fff;border:1px solid rgba(228,235,245,.9);border-radius:22px;padding:22px;margin-bottom:18px;box-shadow:0 8px 30px rgba(31,80,160,.07);overflow-x:auto}
.card h3{margin:0 0 12px;font-size:18px}.card h4{margin:14px 0 8px}
textarea,input,select{font:inherit;padding:11px 14px;border-radius:14px;border:1px solid var(--line);background:#f8fbff;color:var(--ink);max-width:100%}textarea{resize:vertical}
input:focus,textarea:focus,select:focus{outline:2px solid #b9d0fb;border-color:var(--b);background:#fff}
button{font:inherit;padding:10px 20px;border-radius:999px;border:0;background:var(--b);color:#fff;cursor:pointer;transition:.15s;font-weight:600;box-shadow:0 6px 16px rgba(31,107,242,.25)}button:hover{filter:brightness(1.07)}
button.s{background:#fff;color:var(--b);border:1px solid #c9dafc;box-shadow:none;padding:7px 14px;font-size:13.5px;font-weight:600}button.s:hover{background:var(--bs)}
table{width:100%;border-collapse:separate;border-spacing:0}td,th{text-align:start;padding:13px 10px;border-bottom:1px solid var(--line);font-size:14px;vertical-align:middle}th{color:var(--mut);font-weight:650;font-size:12px;text-transform:uppercase;letter-spacing:.05em;white-space:nowrap}tbody tr:hover td,table tr:hover td{background:#f8fbff}tr:last-child td{border-bottom:0}td small{color:var(--mut)}
td .s{margin:2px 2px 2px 0}[dir=rtl] td .s{margin:2px 0 2px 2px}
.stats{margin-bottom:18px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.stat{margin:0;position:relative;color:var(--mut);font-size:13.5px;padding:18px 20px}.stat b{font-size:34px;display:block;color:var(--ink);margin:6px 0 0;line-height:1.1}
.ic{position:absolute;inset-inline-end:16px;top:16px;width:42px;height:42px;padding:10px;border-radius:14px;background:var(--bs);color:var(--b)}.stat:nth-child(2) .ic{background:#fff0e6;color:#e8590c}.stat:nth-child(3) .ic{background:#e9f8ef;color:var(--ok)}.stat:nth-child(4) .ic{background:#fff6dd;color:#c98a00}.stat:nth-child(5) .ic{background:#efe9ff;color:#6d4ce0}.stat:nth-child(6) .ic{background:#e6f7f0;color:#0d9f6e}
.stat span{display:block}.err{color:var(--bad)}.mut,.muted{color:var(--mut);font-size:13px}
.bar{display:flex;height:14px;border-radius:999px;overflow:hidden;background:#eef2f9;margin:10px 0}.bar i{display:block}.dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-inline-end:5px}
.bd{display:inline-block;padding:4px 12px;border-radius:999px;font-size:12.5px;font-weight:650;background:#eef2f9;color:#51607a;white-space:nowrap}
.bd-pending,.bd-in_review,.bd-unpaid{background:#fff3d6;color:#a86a00}.bd-inspection,.bd-quoted{background:#efe9ff;color:#5b3fd0}.bd-approved,.bd-assigned,.bd-open{background:var(--bs);color:var(--b2)}.bd-in_progress{background:#dff3ff;color:#046a9b}.bd-completed,.bd-paid,.bd-resolved{background:#dff6e7;color:#117a3a}.bd-cancelled,.bd-rejected{background:#fde8e9;color:#b4262b}
.hero{display:flex;align-items:center;justify-content:space-between;gap:20px;border-radius:26px;padding:28px 30px;margin-bottom:18px;background:linear-gradient(120deg,#cfe3ff 0%,#e4f0ff 55%,#f3f8ff 100%);border:1px solid #d6e5fb;box-shadow:0 10px 34px rgba(31,107,242,.12);flex-wrap:wrap}
.hero h1{margin:0 0 6px;font-size:30px}.hero p{margin:0 0 16px;color:#40506b;font-size:16px}.hero img{object-fit:contain;width:92px;height:92px;border-radius:24px;background:#fff;padding:8px;box-shadow:0 10px 24px rgba(31,107,242,.2)}
.dash{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:18px;align-items:start}.dash .stats{grid-template-columns:repeat(3,minmax(0,1fr))}
.att .row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 0;border-bottom:1px solid var(--line);font-size:14.5px}.att .row:last-child{border-bottom:0}.att .row b{background:var(--bs);color:var(--b);border-radius:999px;padding:3px 12px;min-width:34px;text-align:center}.att .row b.hot{background:#fff3d6;color:#a86a00}
.money{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-bottom:18px}.money .card{margin:0;padding:18px 20px}@media(max-width:480px){.money .card{padding:12px 16px}.money b{font-size:20px}}.money small{color:var(--mut);display:block}.money b{font-size:24px;display:block;margin-top:4px}
.mo{position:fixed;inset:0;background:rgba(20,33,61,.45);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:16px;z-index:50}
.mo form{background:#fff;border-radius:24px;padding:24px;width:min(460px,100%);box-shadow:0 30px 80px rgba(20,33,61,.35)}.mo h3{margin:0 0 6px}.mo p{margin:0 0 14px;color:var(--mut)}.mo label{display:block;margin:0 0 12px;font-size:13px;color:var(--mut);font-weight:600}.mo input,.mo textarea,.mo select{display:block;width:100%;margin-top:5px;color:var(--ink)}.mo .acts{display:flex;gap:10px;justify-content:flex-end;margin-top:6px}
#toast{position:fixed;inset-inline:0;bottom:22px;display:flex;justify-content:center;pointer-events:none;z-index:60}#toast div{background:#14213d;color:#fff;padding:12px 22px;border-radius:999px;box-shadow:0 12px 30px rgba(20,33,61,.3);font-size:14.5px;max-width:90vw}#toast .e{background:#b4262b}
.login-card{background:#fff;border:1px solid rgba(228,235,245,.9);border-radius:26px;padding:36px 32px 28px;max-width:400px;margin:0 auto;box-shadow:0 24px 60px rgba(31,80,160,.14);text-align:center}
.login-logo{border-radius:22px;box-shadow:0 10px 26px rgba(31,107,242,.22);background:#fff;padding:5px;object-fit:contain}
.login-card h3{margin:16px 0 4px;font-size:21px}
.login-sub{margin:0 0 20px;color:var(--mut);font-size:13.5px}
.fld{display:block;text-align:start;margin-bottom:12px;font-size:12.5px;font-weight:650;color:var(--mut)}
.fld input{display:block;width:100%;margin-top:6px;padding:12px 14px}
.login-card button{width:100%;margin-top:8px;padding:13px}
.login-card .err{min-height:18px;margin:6px 0 2px;font-size:13.5px}
body.lg aside#side,body.lg .top{display:none}body.lg main{padding-top:8vh}
@media(max-width:1100px){.dash{grid-template-columns:1fr}}
@media(max-width:900px){aside#side{position:fixed;inset-block:0;inset-inline-start:0;z-index:40;transform:translateX(-105%);transition:.2s;box-shadow:0 0 60px rgba(20,33,61,.3);background:#fff}[dir=rtl] aside#side{transform:translateX(105%)}body.open aside#side{transform:none}#burger{display:inline-block}.top{padding:14px 14px 0}.top h2{font-size:19px}main{padding:14px 14px 32px}.stats,.dash .stats,.money{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.hero{padding:20px}.hero h1{font-size:24px}.hero img{display:none}.card{padding:16px;border-radius:20px}}
@media(max-width:480px){.stat b{font-size:28px}.stat{padding:14px}.ic{width:34px;height:34px;padding:8px}.money{grid-template-columns:1fr}}
@media(max-width:640px){table.rq,table.rq tbody{display:block}table.rq tr:first-child{display:none}table.rq tr{display:block;border:1px solid var(--line);border-radius:18px;padding:10px 14px;margin-bottom:12px;background:#fbfdff}table.rq td{display:block;border:0;padding:8px 0;font-size:14px;overflow-wrap:anywhere;background:none!important}table.rq td small{display:block;margin-top:6px;color:var(--mut)}table.rq td::before{content:attr(data-l);display:block;color:var(--mut);font-size:12px;margin-bottom:4px}table.rq td>*{max-width:100%}table.rq td:last-child::before{content:none}}
</style></head><body>
<div class="shell"><aside id="side"><div class="brand"><img src="/brand.png?v=2" alt=""><div><b id="bn">Tazbeeta</b><small>Hexa plus</small></div></div><nav id="nav"></nav><div class="side-foot" id="sf"></div></aside><div class="mw"><div class="top"><button id="burger" onclick="document.body.classList.toggle('open')" aria-label="menu">&#9776;</button><h2 id="ptitle"></h2><button id="lang" onclick="setLang(document.documentElement.lang=='ar'?'en':'ar')">\u0627\u0644\u0639\u0631\u0628\u064A\u0629</button><button id="lo" style="display:none" onclick="sessionStorage.removeItem('adm');token=null;login()"></button></div><main id="app"></main></div></div><div id="toast"></div>
<script>
let token=sessionStorage.getItem('adm'),tab='stats',requestQuery='',requestStatus='all';
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
async function api(m,p,b){const r=await fetch('/api'+p,{method:m,headers:{'content-type':'application/json',authorization:'Bearer '+token},body:b?JSON.stringify(b):undefined});const j=await r.json();if(!r.ok)throw new Error(j.error||r.status);return j}
function login(err){document.body.classList.add('lg');document.body.classList.remove('open');$('#app').innerHTML=\`<div class="login-card"><img class="login-logo" src="/brand.png?v=2" width="76" height="76" alt=""><h3>\${L('Tazbeeta Admin','لوحة تظبيطه')}</h3><p class="login-sub">\${L('Hexa plus · home services','هيكسا بلس · خدمات منزلية')}</p><label class="fld"><span>\${L('Email','البريد الإلكتروني')}</span><input id="e" type="email" autocomplete="username" inputmode="email" dir="ltr"></label><label class="fld"><span>\${L('Password','كلمة المرور')}</span><input id="p" type="password" autocomplete="current-password" dir="ltr"></label><p class="err">\${esc(err||'')}</p><button id="go">\${L('Sign in','تسجيل الدخول')}</button></div>\`;
['#e','#p'].forEach(s=>$(s).addEventListener('keydown',e=>{if(e.key=='Enter')$('#go').click()}));$('#go').onclick=async()=>{try{const r=await fetch('/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:$('#e').value,password:$('#p').value})});const j=await r.json();if(!r.ok)throw new Error(j.error||'Sign in failed');token=j.token;if(!j.user||j.user.role!=='admin'){token=null;throw new Error('Not an admin account')}sessionStorage.setItem('adm',token);show()}catch(e){login(em(e.message))}}}
async function show(){try{SV={};((await api('GET','/services')).services||[]).forEach(x=>SV[x.id]=x)}catch(e){}buildNav();
try{await views[tab]()}catch(e){if(/Unauthorized|Admins/.test(e.message))login(e.message);else $('#app').innerHTML='<p class="err">'+esc(em(e.message))+'</p>'}}
const views={
async stats(){const s=await api('GET','/admin/stats');let rq=[];try{rq=(await api('GET','/admin/requests')).requests||[]}catch(e){}
const I={u:'<path d="M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0zM4 21c0-4 3.6-6 8-6s8 2 8 6"/>',t:'<path d="M14.7 6.3a4 4 0 0 0-5 5L3 18l3 3 6.7-6.7a4 4 0 0 0 5-5l-2.5 2.5-2.2-.5-.5-2.2z"/>',r:'<path d="M8 4h8l2 2v14H6V6zM9 11h6M9 15h6"/>',p:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',w:'<path d="M3 12h4l3-8 4 16 3-8h4"/>',ok:'<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>'};
const ic=k=>\`<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">\${I[k]}</svg>\`;
const bR=s.byRole||{},bS=s.byStatus||{};
const cards=[['Customers',bR.customer||0,'u'],['Technicians',bR.technician||0,'t'],['Requests',s.requests||0,'r'],['Pending',bS.pending||0,'p'],['In progress',(bS.in_progress||0)+(bS.assigned||0),'w'],['Completed',bS.completed||0,'ok']];
const total=s.requests||0,seg=[['pending','#f5a524'],['assigned','#0F8B8D'],['in_progress','#0A5A5E'],['completed','#22a745'],['cancelled','#9aa5b1']];
$('#app').innerHTML=\`<div class="stats">\${cards.map(c=>\`<div class="card stat">\${ic(c[2])}<span>\${c[0]}</span><b>\${c[1]}</b></div>\`).join('')}</div>
<div class="card"><h3>Requests by status</h3>\${total?\`<div class="bar">\${seg.filter(x=>bS[x[0]]).map(x=>\`<i style="width:\${bS[x[0]]*100/total}%;background:\${x[1]}" title="\${lblS(x[0])}: \${bS[x[0]]}"></i>\`).join('')}</div><p class="mut">\${seg.filter(x=>bS[x[0]]).map(x=>\`<span class="dot" style="background:\${x[1]}"></span>\${x[0]}: \${bS[x[0]]}\`).join(' &nbsp; ')}</p>\`:'<p class="mut">No requests yet.</p>'}</div>
<div class="card"><h3>Latest requests</h3>\${rq.length?\`<table><tr><th>Service</th><th>Status</th><th>Created</th></tr>\${rq.slice(0,5).map(r=>\`<tr><td>\${esc(sn(r))}</td><td>\${esc(r.status)}</td><td>\${esc((r.createdAt||'').slice(0,10))}</td></tr>\`).join('')}</table>\`:'<p class="mut">No requests yet. New customer requests will appear here.</p>'}</div>\`},
async users(){const result=await api('GET','/admin/users');const users=result.users.filter(u=>u.role==='customer');const rr=(await api('GET','/admin/reset-requests')).requests;$('#app').innerHTML=(rr.length?\`<div class="card"><h3>\${L('Password reset requests','\u0637\u0644\u0628\u0627\u062A \u062A\u063A\u064A\u064A\u0631 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631')} (\${rr.length})</h3><table>\${rr.map(r=>\`<tr><td>\${esc(r.email)}\${r.count>1?\` <small>\xD7\${r.count}</small>\`:''}<br><small>\${esc((r.lastAt||'').replace('T',' ').slice(0,16))}</small></td><td>\${r.userId?\`<button class="s" onclick="resetLink('\${r.userId}')">\${L('Create link','\u0639\u0645\u0644 \u0631\u0627\u0628\u0637')}</button>\`:\`<span class="mut">\${L('No account with this email','\u0645\u0641\u064A\u0634 \u062D\u0633\u0627\u0628 \u0628\u0627\u0644\u0628\u0631\u064A\u062F \u062F\u0647')}</span>\`} <button class="s" onclick="resetDone('\${r.id}')">\${L('Done','\u062A\u0645')}</button></td></tr>\`).join('')}</table></div>\`:'')+\`<div class="card"><table><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th></th></tr>\${users.map(u=>\`<tr><td>\${esc(u.firstName+' '+u.lastName)}</td><td>\${esc(u.email)}<br><small>\${esc((u.addresses||[]).map(a=>a.label+': '+a.line).join(' / '))}</small></td><td>\${u.role}</td><td>\${u.createdAt.slice(0,10)}</td><td>\${u.role=='admin'?'':\`<button class="s" onclick="blk('\${u.id}',\${!u.blocked})">\${u.blocked?'Unblock':'Block'}</button> <button class="s" onclick="resetLink('\${u.id}')">Reset link</button> <button class="s" onclick="delUser('\${u.id}')">Delete</button>\`}</td></tr>\`).join('')}</table></div>\`},
async requests(){const result=await api('GET','/admin/requests');const requests=result.requests.filter(r=>(requestStatus==='all'||r.status===requestStatus)&&JSON.stringify(r).toLowerCase().includes(requestQuery.toLowerCase()));$('#app').innerHTML=\`<div id="linkbox"></div><div class="card"><p><input id="rqquery" placeholder="Search requests" value="\${esc(requestQuery)}"> <select id="rqstatus">\${['all','pending','inspection','quoted','approved','assigned','in_progress','completed','cancelled'].map(s=>\`<option \${s===requestStatus?'selected':''} value="\${s}">\${s}</option>\`).join('')}</select> <button onclick="filterRequests()">Search</button></p><table class="rq"><tr><th>Service</th><th>Description / address</th><th>Status</th><th>Technician</th><th>Created</th><th></th></tr>\${requests.map(r=>\`<tr><td data-l="Service">\${esc(sn(r))}\${r.custom?\`<p><b>Custom service</b>: \${esc(r.customTitle)}</p><small>\${r.classifiedAt?'Classified':'Needs classification'}</small>\`:''}</td><td data-l="Description / address">\${esc(r.description)}<br><small>\${esc(r.contactName||'')} \${esc(r.contactPhone||'')} \${esc(r.contactEmail||'')}</small><br><small>\${esc(r.address)}\${r.location?' (has GPS)':''}</small>\${r.visit?\`<br><b>Preferred visit:</b> <bdi>\${esc(r.visit.date)} \${esc(r.visit.time||'')}</bdi>\`:''}</td><td data-l="Status">\${r.status}\${r.inspection?\`<p>\${esc(r.inspection.note)}</p>\`:''}\${r.quote?\`<p><bdi>\${esc(r.quote.amount)} \${esc(r.quote.currency)}</bdi> \xB7 \${esc(r.quote.scope)}</p>\`:''}</td><td data-l="Technician">\${esc(r.technicianName||'')}</td><td data-l="Created">\${r.createdAt.slice(0,10)}</td><td data-l="">\${r.custom&&['pending','inspection'].includes(r.status)?\`<button class="s" onclick="classifyNeed('\${r.id}')">Classify service</button>\`:''}\${['pending','inspection'].includes(r.status)?\`<button class="s" onclick="recordInspection('\${r.id}')">Inspection</button>\`:''}\${['inspection','quoted'].includes(r.status)&&(!r.custom||r.classifiedAt)?\`<button class="s" onclick="companyQuote('\${r.id}')">Quote</button>\`:''}\${['approved','assigned'].includes(r.status)?\`<button class="s" onclick="suggest('\${r.id}')">Assign</button> \`:''}\${['completed','cancelled'].includes(r.status)?'':\`<button class="s" onclick="cancelReq('\${r.id}')">Cancel</button>\`}</td></tr>\`).join('')}</table></div><div id="sug"></div>\`},
async technicians(){const {users}=await api('GET','/admin/users');const t=users.filter(u=>u.role=='technician');const {services}=await api('GET','/services');$('#app').innerHTML=\`<div id="linkbox"></div><div class="card"><h4>Add technician</h4><input id="fn" placeholder="First name"> <input id="ln" placeholder="Last name"> <input id="em" placeholder="Email"><p>Services: \${services.map(s=>\`<label><input type="checkbox" class="sk" value="\${esc(s.id)}"> \${esc(s.name)}</label>\`).join(' ')}</p><button onclick="addTech()">Create and get setup link</button><p><small>No password is created. You get a one-time link to give the technician, who chooses their own password.</small></p></div><div class="card"><table><tr><th>Name</th><th>Email</th><th>Services</th><th>Available</th><th>Location</th><th></th></tr>\${t.map(u=>\`<tr><td>\${esc(u.firstName+' '+u.lastName)}</td><td>\${esc(u.email)}</td><td>\${esc((u.skills||[]).join(', ')||'none set')}</td><td><button class="s" onclick="avail('\${u.id}',\${!u.available})">\${u.available?'Available':'Unavailable'}</button></td><td>\${u.location?esc(new Date(u.location.at).toLocaleString()):'never shared'}</td><td><button class="s" onclick="editSkills('\${u.id}')">Services</button> <button class="s" onclick="blk('\${u.id}',\${!u.blocked})">\${u.blocked?'Unblock':'Block'}</button> <button class="s" onclick="resetLink('\${u.id}')">Reset link</button></td></tr>\`).join('')}</table></div>\`},
async services(){const {services}=await api('GET','/admin/services');window.serviceRows=services;$('#app').innerHTML=\`<div class="card"><table><tr><th>Name</th><th>Arabic</th><th>Popular</th><th>Starting from (EGP)</th></tr>\${services.map(s=>\`<tr><td>\${esc(s.name)}</td><td>\${esc(s.nameAr)}</td><td>\${s.popular?'yes':''}</td><td>\${s.startingPrice||'-'}</td><td>\${s.active?'Active':'Disabled'} <button class="s" onclick="editSvc('\${s.id}')">Edit</button></td></tr>\`).join('')}</table></div><div class="card"><h4>Add / update service</h4><input id="sid" placeholder="Service id (English)"> <input id="sn" placeholder="Name"> <input id="sa" placeholder="Arabic name"> <input id="sprice" type="number" min="0" placeholder="Starting price EGP"> <label><input type="checkbox" id="sp"> popular</label> <label><input type="checkbox" id="sactive" checked> Active</label> <button onclick="addSvc()">Save</button></div>\`}};
const money=(n,c)=>Number(n||0).toLocaleString(lang=='ar'?'ar-EG':'en-US')+' '+(c=='EGP'||!c?(lang=='ar'?'\u062C.\u0645':'EGP'):c);
const PS={unpaid:'Unpaid',pending:'Pending',paid:'Paid',rejected:'Rejected'};
const who=async()=>{const m={};try{(await api('GET','/admin/users')).users.forEach(u=>m[u.id]=(u.firstName+' '+u.lastName).trim()||u.email)}catch(e){}return m};
views.payments=async()=>{const {payments}=await api('GET','/admin/payments');const U=await who();const rows=payments.map(x=>{const p=x.payment;const pv=p.receipt?\`<button class="s" onclick="viewPhotos('\${x.requestId}')">View receipt</button> \`:'';const act=pv+(p.method=='wallet'&&p.status=='pending'?\`<button class="s" onclick="verifyPay('\${x.requestId}','approve')">Approve</button> <button class="s" onclick="verifyPay('\${x.requestId}','reject')">Reject</button>\`:(p.method=='cash'&&p.status=='unpaid'?\`<button class="s" onclick="cashPay('\${x.requestId}')">Cash received</button>\`:''));return \`<tr><td>#\${esc(x.requestId.slice(0,6))}</td><td>\${esc(U[x.customerId]||'')}</td><td>\${esc(sn(x))}</td><td>\${p.method=='cash'?'Cash':'InstaPay or wallet'}</td><td>\${money(x.total,x.currency)}</td><td>\${p.receipt?'<span title="'+esc(p.receipt)+'">Receipt uploaded</span>':'-'}</td><td><b>\${PS[p.status]||p.status}</b>\${p.note?'<br><small>'+esc(p.note)+'</small>':''}</td><td>\${act}</td></tr>\`}).join('');card('Payments and transfer verification',\`<p class="muted">A receipt only puts a payment under review. It becomes Paid only when you approve it here.</p>\`+(payments.length?\`<table><tr><th>Order</th><th>Customer</th><th>Service</th><th>Method</th><th>Amount</th><th>Receipt</th><th>Status</th><th></th></tr>\${rows}</table>\`:'<p>No payments yet.</p>'))};
views.invoices=async()=>{const {invoices}=await api('GET','/admin/invoices');const U=await who();card('Invoices',invoices.length?\`<table><tr><th>Order</th><th>Customer</th><th>Service</th><th>Total</th><th>Paid</th><th>Remaining</th><th>Payment</th></tr>\${invoices.map(x=>\`<tr><td>#\${esc(x.requestId.slice(0,6))}</td><td>\${esc(U[x.customerId]||'')}</td><td>\${esc(sn(x))}</td><td>\${money(x.total,x.currency)}</td><td>\${money(x.paid,x.currency)}</td><td>\${money(x.remaining,x.currency)}</td><td>\${PS[x.paymentStatus]||x.paymentStatus}</td></tr>\`).join('')}</table>\`:'<p>No invoices yet. An invoice appears when a customer accepts a quote.</p>')};
const CS={open:'Open',in_review:'In review',resolved:'Resolved'};
views.complaints=async()=>{const {complaints}=await api('GET','/admin/complaints');const U=await who();card('Complaints and support',complaints.length?complaints.map(c=>\`<div class="card"><p><b>\${esc(U[c.userId]||'')}</b> \xB7 \${esc(CT(c.type))} \xB7 \${esc(new Date(c.createdAt).toLocaleString())} \xB7 <b>\${CS[c.status]}</b>\${c.requestId?' \xB7 #'+esc(c.requestId.slice(0,6)):''}</p><p>\${esc(c.text)}</p>\${c.reply?'<p><i>'+esc(c.reply)+'</i></p>':''}\${c.status!='resolved'?\`<button class="s" onclick="replyComplaint('\${c.id}','in_review')">Mark in review</button> <button class="s" onclick="replyComplaint('\${c.id}','resolved')">Reply and resolve</button>\`:''}</div>\`).join(''):'<p>No complaints.</p>')};
views.reports=async()=>{const r=await api('GET','/admin/reports');const c=[['Requests',r.requests],['Revenue (paid)',money(r.revenue,'EGP')],['Outstanding',money(r.outstanding,'EGP')],['Transfers awaiting review',r.awaitingReview],['Average rating',r.avgRating??'-'],['Open complaints',r.openComplaints]];const bS=r.byStatus||{};card('Reports and analytics',\`<div class="stats">\${c.map(x=>\`<div class="card stat"><span>\${x[0]}</span><b>\${x[1]}</b></div>\`).join('')}</div><h4>Requests by status</h4><table>\${Object.keys(bS).map(k=>\`<tr><td>\${k}</td><td>\${bS[k]}</td></tr>\`).join('')}</table><h4>Requests by service</h4><table>\${Object.keys(r.perService).map(k=>\`<tr><td>\${esc(sn({serviceId:k}))}</td><td>\${r.perService[k]}</td></tr>\`).join('')}</table>\`)};
async function savePaySettings(){try{await api('PUT','/admin/payment-settings',{payNumber:$('#paynum').value,payName:$('#payname').value,whatsapp:$('#wa').value,commissionPct:$('#comm').value,adminChatReply:$('#acr').checked,companyName:$('#cname').value,companyAddress:$('#caddr').value,supportEmail:$('#cmail').value});toast(lang=='ar'?'\u062A\u0645 \u0627\u0644\u062D\u0641\u0638':'Saved')}catch(e){toast(e.message)}}
async function blk(id,b){await api('POST','/admin/users/'+id+'/block',{blocked:b});show()}
async function delUser(id){if(!confirm(L('Delete this user and all their data (requests, messages, credentials)? This cannot be undone.','حذف هذا المستخدم وكل بياناته (الطلبات والرسائل وبيانات الدخول)؟ لا يمكن التراجع.')))return;try{await api('DELETE','/admin/users/'+id);show()}catch(e){toast(e.message)}}
async function delReq(id){if(!confirm(L('Delete this request permanently? This cannot be undone.','حذف هذا الطلب نهائيًا؟ لا يمكن التراجع.')))return;try{await api('DELETE','/admin/requests/'+id);show()}catch(e){toast(e.message)}}
async function cancelReq(id){await api('POST','/requests/'+id+'/status',{status:'cancelled'});show()}
function showLink(url,label){$('#linkbox').innerHTML=\`<div class="card"><b>\${esc(label)}</b><br>Bearer link: anyone who opens it can set that account's password. Copy it now and send it over a trusted channel. It is not stored here.<br><input readonly style="width:100%" value="\${esc(url)}" onclick="this.select()"></div>\`}
async function resetDone(id){await api('POST','/admin/reset-requests/'+id+'/done');await show()}
async function sendBot(id){try{await api('POST','/admin/users/'+id+'/send-reset');$('#botmsg').textContent=L('Queued. The bot will send it within seconds.','\u0627\u062A\u062D\u0637 \u0641\u064A \u0627\u0644\u0637\u0627\u0628\u0648\u0631. \u0627\u0644\u0628\u0648\u062A \u0647\u064A\u0628\u0639\u062A\u0647\u0627 \u0641\u064A \u062B\u0648\u0627\u0646\u064A.')}catch(e){$('#botmsg').textContent=e.message}}
async function resetLink(id){const r=await api('POST','/admin/users/'+id+'/reset-link');if(!$('#linkbox'))$('#app').insertAdjacentHTML('afterbegin','<div id="linkbox"></div>');showLink(r.link,'Password reset link');if(r.phone){const d=String(r.phone).replace(/[^0-9]/g,'').replace(/^00/,'');const n=d.startsWith('0')?'2'+d:d;const m=L('Hello '+r.name+', here is your Tazbeeta link to set a new password: '+r.link,'\u0623\u0647\u0644\u0627 '+r.name+'\u060C \u062F\u0647 \u0631\u0627\u0628\u0637 \u062A\u0638\u0628\u064A\u0637\u0647 \u0644\u062A\u0639\u064A\u064A\u0646 \u0643\u0644\u0645\u0629 \u0645\u0631\u0648\u0631 \u062C\u062F\u064A\u062F\u0629: '+r.link);$('#linkbox').firstChild.insertAdjacentHTML('beforeend','<br><a class="s" target="_blank" rel="noopener" href="https://wa.me/'+n+'?text='+encodeURIComponent(m)+'">'+L('Send on WhatsApp','\u0627\u0628\u0639\u062A \u0639\u0644\u0649 \u0648\u0627\u062A\u0633\u0627\u0628')+' ('+esc(r.phone)+')</a> <button class="s" onclick="sendBot(\\''+id+'\\')">'+L('Send from company WhatsApp bot','\u0627\u0628\u0639\u062A \u0645\u0646 \u0628\u0648\u062A \u0648\u0627\u062A\u0633\u0627\u0628 \u0627\u0644\u0634\u0631\u0643\u0629')+'</button> <small id="botmsg"></small>')}else $('#linkbox').firstChild.insertAdjacentHTML('beforeend','<br><small>'+L('No phone number saved for this customer.','\u0645\u0641\u064A\u0634 \u0631\u0642\u0645 \u0645\u0648\u0628\u0627\u064A\u0644 \u0645\u062A\u0633\u062C\u0644 \u0644\u0644\u0639\u0645\u064A\u0644.')+'</small>')}
async function addTech(){try{const r=await api('POST','/admin/technicians',{firstName:$('#fn').value,lastName:$('#ln').value,email:$('#em').value,skills:[...document.querySelectorAll('.sk:checked')].map(x=>x.value)});await show();showLink(r.setupLink,'Technician created. Setup link')}catch(e){toast(e.message)}}
async function suggest(id){const r=await api('GET','/admin/requests/'+id+'/suggest');const row=t=>\`<tr><td>\${esc(t.firstName+' '+t.lastName)}</td><td>\${t.distanceKm!=null?t.distanceKm+' km':(t.locationAgeMin==null?'location never shared':'location '+t.locationAgeMin+' min old')}</td><td>\${t.reasons?esc(t.reasons.join(', ')):\`<button class="s" onclick="assign('\${id}','\${t.id}')">Assign</button>\`}</td></tr>\`;$('#sug').innerHTML=\`<div class="card"><h4>Technicians for this request</h4><p>\${esc(r.note)}</p><table>\${r.technicians.map(row).join('')}</table><h4>Manual choice only (stale or no location)</h4><table>\${r.manualOnly.map(t=>row({...t,reasons:null})).join('')}</table><details><summary>Not eligible (\${r.excluded.length})</summary><table>\${r.excluded.map(row).join('')}</table></details></div>\`;$('#sug').scrollIntoView()}
async function classifyNeed(id){try{const {services}=await api('GET','/services');$('#sug').innerHTML=\`<div class="card"><h4>Classify custom need</h4><p>Choose a company service only if it covers the need. Otherwise discuss it with the customer and add a real service through Services first.</p><select id="classSvc">\${services.map(s=>\`<option value="\${esc(s.id)}">\${esc(s.name)}</option>\`).join('')}</select> <button onclick="saveClassification('\${id}')">Confirm classification</button></div>\`;$('#sug').scrollIntoView()}catch(e){toast(e.message)}}
async function saveClassification(id){try{await api('POST','/admin/requests/'+id+'/classify',{serviceId:$('#classSvc').value});await show()}catch(e){toast(e.message)}}
async function assign(r,t){try{await api('POST','/admin/requests/'+r+'/assign',{technicianId:t});show()}catch(e){toast(e.message)}}
async function addSvc(){await api('POST','/admin/services',{id:$('#sid').value,name:$('#sn').value,nameAr:$('#sa').value,popular:$('#sp').checked,active:$('#sactive').checked,startingPrice:$('#sprice').value});show()}

function card(title,body){$('#app').innerHTML=\`<div class="card"><h3>\${esc(title)}</h3>\${body}</div>\`}
views.activity=async()=>{const {activity}=await api('GET','/admin/activity');card('Activity',activity.length?\`<table><tr><th>Created</th><th>Action</th><th>User id</th></tr>\${activity.map(x=>\`<tr><td>\${esc(new Date(x.createdAt).toLocaleString())}</td><td>\${esc(x.method+' '+x.path)}</td><td>\${esc(x.actorId)}</td></tr>\`).join('')}</table>\`:'<p>No activity yet.</p>')};
views.feedback=async()=>{const {feedback}=await api('GET','/admin/feedback');card('Feedback',feedback.length?feedback.map(f=>\`<p><b>\${f.stars}/5</b> \xB7 \${esc(f.userId)} \xB7 \${esc(new Date(f.createdAt).toLocaleString())}</p><p style="white-space:pre-wrap">\${esc(f.note)}</p><button class="s" onclick="review('\${f.id}',\${!f.reviewed})">\${f.reviewed?'Reviewed':'Mark reviewed'}</button><hr>\`).join(''):'<p>No feedback yet.</p>')};
views.content=async()=>{const {content:c}=await api('GET','/content');card('App content',\`<h4>Payment settings</h4><p class="muted">Customers send money here and upload the receipt. There is no bank account.</p><p><input id="paynum" placeholder="InstaPay or wallet number" value="\${esc(c.payNumber||'')}"> <input id="payname" placeholder="Account name shown to customers" value="\${esc(c.payName||'')}"> <button class="s" onclick="savePaySettings()">Save payment settings</button></p><p><input id="cname" placeholder="Company legal name (shown in Privacy Policy and Terms)" style="width:320px" value="\${esc(c.companyName||'')}"> <input id="caddr" placeholder="Company address" style="width:320px" value="\${esc(c.companyAddress||'')}"> <input id="cmail" placeholder="Support email" value="\${esc(c.supportEmail||'')}"></p><p><input id="wa" placeholder="WhatsApp support number with country code" value="\${esc(c.whatsapp||'')}"> <label>Default commission % <input id="comm" type="number" min="0" max="90" style="width:80px" value="\${esc(String(c.commissionPct==null?20:c.commissionPct))}"></label> <label><input type="checkbox" id="acr" \${c.adminChatReply?'checked':''}> Company can reply in a chat after a technician is assigned (default: view only)</label></p><p>Announcement</p><textarea id="announcement" rows="3" maxlength="500" style="width:100%">\${esc(c.announcement)}</textarea><p><label><input type="checkbox" id="cash" \${c.cashEnabled?'checked':''}> Cash preference enabled (no payment collected)</label></p><h4>Terms and privacy (shown at sign-up)</h4><p class="muted">Customers must agree to this when creating an account. Default text is used when empty.</p><p><label>English<textarea id="terms" rows="6" maxlength="8000" style="width:100%">\${esc(c.terms||'')}</textarea></label></p><p><label>Arabic<textarea id="termsAr" dir="rtl" rows="6" maxlength="8000" style="width:100%">\${esc(c.termsAr||'')}</textarea></label></p><h4>Help in English and Arabic</h4><div id="helpItems">\${c.help.map(helpEditor).join('')}</div><button class="s" onclick="document.querySelector('#helpItems').insertAdjacentHTML('beforeend',helpEditor({}))">Add Help item</button><p><button onclick="saveContent()">Save</button></p>\`)};
function helpEditor(h){return \`<fieldset class="helpedit" style="margin-bottom:16px;border:1px solid #e6eaf0;border-radius:12px;padding:16px"><p><label>Question (English)<input data-k="q" style="width:100%" value="\${esc(h.q||'')}"></label></p><p><label>Question (Arabic)<input data-k="qAr" dir="rtl" style="width:100%" value="\${esc(h.qAr||'')}"></label></p><p><label>Answer (English)<textarea data-k="answer" rows="2" style="width:100%">\${esc(h.answer||'')}</textarea></label></p><p><label>Answer (Arabic)<textarea data-k="answerAr" dir="rtl" rows="2" style="width:100%">\${esc(h.answerAr||'')}</textarea></label></p><button class="s" onclick="this.closest('fieldset').remove()">Remove</button></fieldset>\`}

views.settlements=async()=>{const r=await api('GET','/admin/settlements');card('Technician settlements',\`<p class="muted">A job shows here after it is completed and the company has confirmed the money. Pay the technician, then mark it paid.</p><table><tr><th>Technician</th><th>Jobs</th><th>Collected</th><th>Commission</th><th>Owed</th><th>Paid</th></tr>\${r.technicians.map(t=>\`<tr><td>\${esc(t.technicianName)}</td><td>\${t.jobs}</td><td>\${money(t.collected,'EGP')}</td><td>\${money(t.commission,'EGP')}</td><td><b>\${money(t.owed,'EGP')}</b></td><td>\${money(t.paid,'EGP')}</td></tr>\`).join('')}</table>\`+(r.rows.length?\`<table><tr><th>Order</th><th>Technician</th><th>Collected</th><th>Commission</th><th>Technician share</th><th>Status</th></tr>\${r.rows.map(x=>\`<tr><td>#\${esc(x.requestId.slice(0,6))}</td><td>\${esc(x.technicianName)}</td><td>\${money(x.collected,x.currency)}</td><td>\${x.commissionPct}% \xB7 \${money(x.commission,x.currency)}</td><td>\${money(x.technicianShare,x.currency)}</td><td>\${x.settled?'Paid '+esc((x.settledAt||'').slice(0,10)):\`<button class="s" onclick="paySettle('\${x.requestId}')">Mark technician paid</button>\`}</td></tr>\`).join('')}</table>\`:'<p>No jobs ready to settle yet.</p>'))};
async function paySettle(id){if(!confirm('Mark this technician payment as paid?'))return;try{await api('POST','/admin/settlements/'+id+'/pay',{});show()}catch(e){toast(e.message)}}
views.conversations=async()=>{const {conversations}=await api('GET','/conversations');card('Conversations',conversations.length?conversations.map(c=>\`<p><button class="s" onclick="openChat('\${c.request.id}')">\${esc(sn(c.request))} \xB7 \${esc(c.request.address)}</button><br>\${esc(c.last.text)}</p>\`).join(''):'<p>No messages yet.</p>')};
async function openChat(id){const {messages,adminCanReply}=await api('GET','/requests/'+id+'/messages');card('Team conversation',\`\${messages.map(m=>\`<p><small><b>\${esc(m.senderName||'')}</b> (\${esc(m.senderRole||'')}) \xB7 \${esc(new Date(m.createdAt).toLocaleString())}</small><br><span style="white-space:pre-wrap">\${esc(m.text)}</span></p>\`).join('')}\${adminCanReply?\`<textarea id="reply" maxlength="2000" rows="3" style="width:100%"></textarea><p><button onclick="reply('\${id}')">Send as team</button> <button class="s" onclick="show()">Back</button></p>\`:'<p class="muted">View only: the customer and technician talk directly. Turn on company replies in App content if needed.</p><p><button class="s" onclick="show()">Back</button></p>'}\`)}
async function viewPhotos(id){const {photos}=await api('GET','/requests/'+id+'/photos');const K={request:'Customer photos',receipt:'Transfer receipt',before:'Technician before',after:'Technician after'};const by={};photos.forEach(p=>(by[p.kind]=by[p.kind]||[]).push(p));card('Photos',photos.length?Object.keys(by).map(k=>\`<h4>\${esc(K[k]||k)}</h4>\${by[k].map(p=>\`<a href="\${esc(p.data)}" target="_blank"><img src="\${esc(p.data)}" style="max-width:220px;max-height:220px;margin:4px;border-radius:8px;border:1px solid #ddd"></a>\`).join('')}\`).join('')+'<p><button class="s" onclick="show()">Back</button></p>':'<p>No photos on this request.</p><p><button class="s" onclick="show()">Back</button></p>')}
async function reply(id){await api('POST','/requests/'+id+'/messages',{text:$('#reply').value});await openChat(id)}
async function review(id,reviewed){await api('PUT','/admin/feedback/'+id,{reviewed});await show()}
async function saveContent(){try{await api('PUT','/admin/content',{terms:$('#terms').value,termsAr:$('#termsAr').value,announcement:$('#announcement').value,cashEnabled:$('#cash').checked,help:[...document.querySelectorAll('.helpedit')].map(f=>Object.fromEntries([...f.querySelectorAll('[data-k]')].map(e=>[e.dataset.k,e.value])))});await show()}catch(e){toast(e.message)}}
async function avail(id,available){await api('PUT','/admin/technicians/'+id+'/availability',{available});await show()}
async function editSkills(id){const {users}=await api('GET','/admin/users');const u=users.find(u=>u.id===id);const {services}=await api('GET','/services');card('Technician services',\`\${services.map(s=>\`<p><label><input class="skillsedit" type="checkbox" value="\${esc(s.id)}" \${(u.skills||[]).includes(s.id)?'checked':''}>\${esc(sn({serviceId:s.id}))}</label></p>\`).join('')}<button onclick="saveSkills('\${id}')">Save</button>\`)}
async function saveSkills(id){await api('PUT','/admin/users/'+id+'/skills',{skills:[...document.querySelectorAll('.skillsedit:checked')].map(x=>x.value)});await show()}
function filterRequests(){requestQuery=$('#rqquery').value;requestStatus=$('#rqstatus').value;show()}
function editSvc(id){const s=window.serviceRows.find(s=>s.id===id);$('#sid').value=s.id;$('#sn').value=s.name;$('#sa').value=s.nameAr;$('#sp').checked=s.popular;$('#sactive').checked=s.active;$('#sprice').value=s.startingPrice||'';$('#sn').focus()}
// Mutation handlers report failures without claiming that an action succeeded.
for(const n of ['blk','cancelReq','resetLink','resetDone','sendBot','addSvc','reply','review','avail','saveSkills']){const f=window[n];window[n]=async(...args)=>{try{return await f(...args)}catch(e){toast(e.message)}}}
const AR={'Action':'\u0627\u0644\u0625\u062C\u0631\u0627\u0621','User id':'\u0631\u0642\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645','popular':'\u0645\u0645\u064A\u0632\u0629','yes':'\u0646\u0639\u0645','Add / update service':'\u0625\u0636\u0627\u0641\u0629 / \u062A\u0639\u062F\u064A\u0644 \u062E\u062F\u0645\u0629','Service id (English)':'\u0645\u0639\u0631\u0651\u0641 \u0627\u0644\u062E\u062F\u0645\u0629 (\u0628\u0627\u0644\u0625\u0646\u062C\u0644\u064A\u0632\u064A)','Arabic name':'\u0627\u0644\u0627\u0633\u0645 \u0628\u0627\u0644\u0639\u0631\u0628\u064A','Name':'\u0627\u0644\u0627\u0633\u0645','Popular':'\u0645\u0645\u064A\u0632\u0629','Inspection':'\u0645\u0639\u0627\u064A\u0646\u0629','Quote':'\u0639\u0631\u0636 \u0633\u0639\u0631','Inspected':'\u062A\u0645\u062A \u0627\u0644\u0645\u0639\u0627\u064A\u0646\u0629','Classify service':'\u062A\u0635\u0646\u064A\u0641 \u0627\u0644\u062E\u062F\u0645\u0629','Reset link':'\u0631\u0627\u0628\u0637 \u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u062A\u0639\u064A\u064A\u0646','Mark in review':'\u0642\u064A\u062F \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629','Reply and resolve':'\u0631\u062F \u0648\u0625\u063A\u0644\u0627\u0642','Create and get setup link':'\u0625\u0646\u0634\u0627\u0621 \u0648\u0631\u0627\u0628\u0637 \u0627\u0644\u062A\u0641\u0639\u064A\u0644','Save payment settings':'\u062D\u0641\u0638 \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u062F\u0641\u0639','Confirm classification':'\u062A\u0623\u0643\u064A\u062F \u0627\u0644\u062A\u0635\u0646\u064A\u0641','Block':'\u062D\u0638\u0631','Unblock':'\u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u062D\u0638\u0631','Login':'\u062F\u062E\u0648\u0644','Email':'\u0627\u0644\u0625\u064A\u0645\u064A\u0644','Password':'\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631','Cash preference enabled (no payment collected)':'\u0625\u062A\u0627\u062D\u0629 \u062A\u0641\u0636\u064A\u0644 \u0627\u0644\u062F\u0641\u0639 \u0646\u0642\u062F\u064B\u0627 (\u0628\u062F\u0648\u0646 \u062A\u062D\u0635\u064A\u0644)','Help in English and Arabic':'\u0627\u0644\u0645\u0633\u0627\u0639\u062F\u0629 \u0628\u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0648\u0627\u0644\u0625\u0646\u062C\u0644\u064A\u0632\u064A\u0629','Question (English)':'\u0627\u0644\u0633\u0624\u0627\u0644 \u0628\u0627\u0644\u0625\u0646\u062C\u0644\u064A\u0632\u064A\u0629','Question (Arabic)':'\u0627\u0644\u0633\u0624\u0627\u0644 \u0628\u0627\u0644\u0639\u0631\u0628\u064A\u0629','Answer (English)':'\u0627\u0644\u0625\u062C\u0627\u0628\u0629 \u0628\u0627\u0644\u0625\u0646\u062C\u0644\u064A\u0632\u064A\u0629','Answer (Arabic)':'\u0627\u0644\u0625\u062C\u0627\u0628\u0629 \u0628\u0627\u0644\u0639\u0631\u0628\u064A\u0629','Add Help item':'\u0625\u0636\u0627\u0641\u0629 \u0633\u0624\u0627\u0644','Remove':'\u062D\u0630\u0641','Search requests':'\u0627\u0628\u062D\u062B \u0641\u064A \u0627\u0644\u0637\u0644\u0628\u0627\u062A','Search':'\u0628\u062D\u062B','all':'\u0627\u0644\u0643\u0644','Activity':'\u0627\u0644\u0646\u0634\u0627\u0637','Conversations':'\u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0627\u062A','Feedback':'\u0627\u0644\u062A\u0642\u064A\u064A\u0645\u0627\u062A','Content':'\u0645\u062D\u062A\u0648\u0649 \u0627\u0644\u062A\u0637\u0628\u064A\u0642','App content':'\u0645\u062D\u062A\u0648\u0649 \u0627\u0644\u062A\u0637\u0628\u064A\u0642','Announcement':'\u0627\u0644\u0625\u0639\u0644\u0627\u0646','Active':'\u0645\u0641\u0639\u0651\u0644','Disabled':'\u0645\u0639\u0637\u0651\u0644','Edit':'\u062A\u0639\u062F\u064A\u0644','Save':'\u062D\u0641\u0638','Back':'\u0631\u062C\u0648\u0639','Send as team':'\u0625\u0631\u0633\u0627\u0644 \u0628\u0627\u0633\u0645 \u0627\u0644\u0641\u0631\u064A\u0642','Team conversation':'\u0645\u062D\u0627\u062F\u062B\u0629 \u0627\u0644\u0641\u0631\u064A\u0642','Reviewed':'\u062A\u0645\u062A \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629','Mark reviewed':'\u062A\u062D\u062F\u064A\u062F \u0643\u0645\u0631\u0627\u062C\u0639','Available':'\u0645\u062A\u0627\u062D','Unavailable':'\u063A\u064A\u0631 \u0645\u062A\u0627\u062D','Tazbeeta Admin \xB7 Hexa plus':'\u0644\u0648\u062D\u0629 \u0625\u062F\u0627\u0631\u0629 \u062A\u0638\u0628\u064A\u0637\u0647 \xB7 Hexa plus','Admin login':'\u062F\u062E\u0648\u0644 \u0627\u0644\u0625\u062F\u0627\u0631\u0629','Email':'\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A','Password':'\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631','Stats':'\u0627\u0644\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A','Users':'\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u0648\u0646','Technicians':'\u0627\u0644\u0641\u0646\u064A\u0648\u0646','Customers':'\u0627\u0644\u0639\u0645\u0644\u0627\u0621','Pending':'\u0642\u064A\u062F \u0627\u0644\u0627\u0646\u062A\u0638\u0627\u0631','In progress':'\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u0646\u0641\u064A\u0630','Completed':'\u0645\u0643\u062A\u0645\u0644','Requests by status':'\u0627\u0644\u0637\u0644\u0628\u0627\u062A \u062D\u0633\u0628 \u0627\u0644\u062D\u0627\u0644\u0629','Latest requests':'\u0622\u062E\u0631 \u0627\u0644\u0637\u0644\u0628\u0627\u062A','No requests yet.':'\u0645\u0641\u064A\u0634 \u0637\u0644\u0628\u0627\u062A \u0644\u0633\u0647.','No requests yet. New customer requests will appear here.':'\u0645\u0641\u064A\u0634 \u0637\u0644\u0628\u0627\u062A \u0644\u0633\u0647. \u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0627\u0644\u062C\u062F\u064A\u062F\u0629 \u0647\u062A\u0638\u0647\u0631 \u0647\u0646\u0627.','Created':'\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0625\u0646\u0634\u0627\u0621','CREATED':'\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0625\u0646\u0634\u0627\u0621','Requests':'\u0627\u0644\u0637\u0644\u0628\u0627\u062A','Services':'\u0627\u0644\u062E\u062F\u0645\u0627\u062A','Name':'\u0627\u0644\u0627\u0633\u0645','Role':'\u0627\u0644\u062F\u0648\u0631','Joined':'\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0627\u0646\u0636\u0645\u0627\u0645','Service':'\u0627\u0644\u062E\u062F\u0645\u0629','Status':'\u0627\u0644\u062D\u0627\u0644\u0629','Technician':'\u0627\u0644\u0641\u0646\u064A','Arabic':'\u0628\u0627\u0644\u0639\u0631\u0628\u064A','Popular':'\u0634\u0627\u0626\u0639','Logout':'\u062E\u0631\u0648\u062C','Assign':'\u062A\u0639\u064A\u064A\u0646','Cancel':'\u0625\u0644\u063A\u0627\u0621','Block':'\u062D\u0638\u0631','Unblock':'\u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u062D\u0638\u0631','Add':'\u0625\u0636\u0627\u0641\u0629','Reset link':'\u0631\u0627\u0628\u0637 \u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u062A\u0639\u064A\u064A\u0646','Description / address':'\u0627\u0644\u0648\u0635\u0641 / \u0627\u0644\u0639\u0646\u0648\u0627\u0646','Actions':'\u0625\u062C\u0631\u0627\u0621\u0627\u062A','Description / address':'\u0627\u0644\u0648\u0635\u0641 / \u0627\u0644\u0639\u0646\u0648\u0627\u0646'};
Object.assign(AR,{'Payments':'\u0627\u0644\u0645\u062F\u0641\u0648\u0639\u0627\u062A','Invoices':'\u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631','Complaints':'\u0627\u0644\u0634\u0643\u0627\u0648\u0649','Reports':'\u0627\u0644\u062A\u0642\u0627\u0631\u064A\u0631','Payments and transfer verification':'\u0627\u0644\u0645\u062F\u0641\u0648\u0639\u0627\u062A \u0648\u0645\u0631\u0627\u062C\u0639\u0629 \u0627\u0644\u062A\u062D\u0648\u064A\u0644\u0627\u062A','A receipt only puts a payment under review. It becomes Paid only when you approve it here.':'\u0631\u0641\u0639 \u0627\u0644\u0625\u064A\u0635\u0627\u0644 \u064A\u0636\u0639 \u0627\u0644\u062F\u0641\u0639 \u0642\u064A\u062F \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629 \u0641\u0642\u0637. \u0644\u0627 \u064A\u0635\u0628\u062D \u0645\u062F\u0641\u0648\u0639\u064B\u0627 \u0625\u0644\u0627 \u0628\u0639\u062F \u0645\u0648\u0627\u0641\u0642\u062A\u0643 \u0647\u0646\u0627.','No payments yet.':'\u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u062F\u0641\u0648\u0639\u0627\u062A \u0628\u0639\u062F.','Order':'\u0627\u0644\u0637\u0644\u0628','Customer':'\u0627\u0644\u0639\u0645\u064A\u0644','Service':'\u0627\u0644\u062E\u062F\u0645\u0629','Method':'\u0627\u0644\u0637\u0631\u064A\u0642\u0629','Amount':'\u0627\u0644\u0645\u0628\u0644\u063A','Receipt':'\u0627\u0644\u0625\u064A\u0635\u0627\u0644','Status':'\u0627\u0644\u062D\u0627\u0644\u0629','Cash':'\u0646\u0642\u062F\u064B\u0627','InstaPay or wallet':'\u0625\u0646\u0633\u062A\u0627\u0628\u0627\u064A \u0623\u0648 \u0645\u062D\u0641\u0638\u0629','Receipt uploaded':'\u062A\u0645 \u0631\u0641\u0639 \u0627\u0644\u0625\u064A\u0635\u0627\u0644','Approve':'\u0645\u0648\u0627\u0641\u0642\u0629','Reject':'\u0631\u0641\u0636','Cash received':'\u062A\u0645 \u0627\u0633\u062A\u0644\u0627\u0645 \u0627\u0644\u0646\u0642\u062F\u064A\u0629','Unpaid':'\u063A\u064A\u0631 \u0645\u062F\u0641\u0648\u0639','Pending':'\u0642\u064A\u062F \u0627\u0644\u0627\u0646\u062A\u0638\u0627\u0631','Paid':'\u0645\u062F\u0641\u0648\u0639','Rejected':'\u0645\u0631\u0641\u0648\u0636','Total':'\u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A','Remaining':'\u0627\u0644\u0645\u062A\u0628\u0642\u064A','Payment':'\u0627\u0644\u062F\u0641\u0639','No invoices yet. An invoice appears when a customer accepts a quote.':'\u0644\u0627 \u062A\u0648\u062C\u062F \u0641\u0648\u0627\u062A\u064A\u0631 \u0628\u0639\u062F. \u062A\u0638\u0647\u0631 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 \u0639\u0646\u062F\u0645\u0627 \u064A\u0642\u0628\u0644 \u0627\u0644\u0639\u0645\u064A\u0644 \u0639\u0631\u0636 \u0627\u0644\u0633\u0639\u0631.','Complaints and support':'\u0627\u0644\u0634\u0643\u0627\u0648\u0649 \u0648\u0627\u0644\u062F\u0639\u0645','No complaints.':'\u0644\u0627 \u062A\u0648\u062C\u062F \u0634\u0643\u0627\u0648\u0649.','Open':'\u0645\u0641\u062A\u0648\u062D\u0629','In review':'\u0642\u064A\u062F \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629','Resolved':'\u062A\u0645 \u0627\u0644\u062D\u0644','Mark in review':'\u062A\u062D\u062F\u064A\u062F \u0642\u064A\u062F \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629','Reply and resolve':'\u0631\u062F \u0648\u0625\u063A\u0644\u0627\u0642','Reports and analytics':'\u0627\u0644\u062A\u0642\u0627\u0631\u064A\u0631 \u0648\u0627\u0644\u062A\u062D\u0644\u064A\u0644\u0627\u062A','Revenue (paid)':'\u0627\u0644\u0625\u064A\u0631\u0627\u062F\u0627\u062A (\u0627\u0644\u0645\u062F\u0641\u0648\u0639\u0629)','Outstanding':'\u0627\u0644\u0645\u0633\u062A\u062D\u0642','Transfers awaiting review':'\u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0628\u0627\u0646\u062A\u0638\u0627\u0631 \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629','Average rating':'\u0645\u062A\u0648\u0633\u0637 \u0627\u0644\u062A\u0642\u064A\u064A\u0645','Open complaints':'\u0634\u0643\u0627\u0648\u0649 \u0645\u0641\u062A\u0648\u062D\u0629','Requests by status':'\u0627\u0644\u0637\u0644\u0628\u0627\u062A \u062D\u0633\u0628 \u0627\u0644\u062D\u0627\u0644\u0629','Requests by service':'\u0627\u0644\u0637\u0644\u0628\u0627\u062A \u062D\u0633\u0628 \u0627\u0644\u062E\u062F\u0645\u0629','Payment settings':'\u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u062F\u0641\u0639','InstaPay or wallet number':'\u0631\u0642\u0645 \u0625\u0646\u0633\u062A\u0627\u0628\u0627\u064A \u0623\u0648 \u0627\u0644\u0645\u062D\u0641\u0638\u0629','Account name shown to customers':'\u0627\u0633\u0645 \u0627\u0644\u062D\u0633\u0627\u0628 \u0627\u0644\u0630\u064A \u064A\u0638\u0647\u0631 \u0644\u0644\u0639\u0645\u0644\u0627\u0621','Save payment settings':'\u062D\u0641\u0638 \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u062F\u0641\u0639','Customers send money here and upload the receipt. There is no bank account.':'\u064A\u0631\u0633\u0644 \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0627\u0644\u0645\u0628\u0644\u063A \u0647\u0646\u0627 \u062B\u0645 \u064A\u0631\u0641\u0639\u0648\u0646 \u0627\u0644\u0625\u064A\u0635\u0627\u0644. \u0644\u0627 \u064A\u0648\u062C\u062F \u062D\u0633\u0627\u0628 \u0628\u0646\u0643\u064A.'});
let SV={};const sn=r=>{const v=SV[r.serviceId];return v?(lang=='ar'&&v.nameAr?v.nameAr:v.name):(r.serviceName||r.serviceId||'')};
let lang=localStorage.getItem('lang')||'en';
const W={approved:'\u062A\u0645\u062A \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629',pending:'\u0642\u064A\u062F \u0627\u0644\u0627\u0646\u062A\u0638\u0627\u0631',assigned:'\u062A\u0645 \u0627\u0644\u062A\u0639\u064A\u064A\u0646',in_progress:'\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u0646\u0641\u064A\u0630',completed:'\u0645\u0643\u062A\u0645\u0644',cancelled:'\u0645\u0644\u063A\u064A',admin:'\u0645\u062F\u064A\u0631',customer:'\u0639\u0645\u064A\u0644',technician:'\u0641\u0646\u064A'};
function tr(root){if(lang!='ar')return;const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){const k=n.nodeValue.trim();if(W[k])n.nodeValue=n.nodeValue.replace(k,W[k]);else if(/^[a-z_]+(: \\d+| \xB7 [a-z_]+: \\d+)*$/.test(k)&&k.includes(': '))n.nodeValue=k.replace(/[a-z_]+(?=:)/g,m=>W[m]||m);else if(AR[k])n.nodeValue=n.nodeValue.replace(k,AR[k])}root.querySelectorAll('[data-l]').forEach(i=>{const k=i.dataset.l;if(AR[k])i.dataset.l=AR[k]});root.querySelectorAll('[placeholder]').forEach(i=>{if(AR[i.placeholder])i.placeholder=AR[i.placeholder]})}
function setLang(l){lang=l;localStorage.setItem('lang',l);document.documentElement.lang=l;document.documentElement.dir=l=='ar'?'rtl':'ltr';$('#lang').textContent=l=='ar'?'English':'\u0627\u0644\u0639\u0631\u0628\u064A\u0629';token?show():login()}
const obs=new MutationObserver(()=>{obs.disconnect();badge(document.body);tr(document.body);obs.observe(document.body,{childList:true,subtree:true})});obs.observe(document.body,{childList:true,subtree:true});
const L=(en,ar)=>lang=='ar'?ar:en;
const NAVI={settlements:'<path d="M12 3v18M17 7H9.5a2.5 2.5 0 0 0 0 5h5a2.5 2.5 0 0 1 0 5H6"/>',stats:'<path d="M4 13h6V4H4zM14 20h6V9h-6zM4 20h6v-3H4zM14 6h6V4h-6z"/>',requests:'<path d="M8 4h8l3 3v13H5V4zM9 11h6M9 15h6"/>',payments:'<rect x="3" y="6" width="18" height="12" rx="3"/><path d="M3 10h18"/>',invoices:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6"/>',complaints:'<path d="M4 5h16v11H9l-5 4z"/>',technicians:'<path d="M14.7 6.3a4 4 0 0 0-5 5L3 18l3 3 6.7-6.7a4 4 0 0 0 5-5l-2.5 2.5-2.2-.5-.5-2.2z"/>',users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 3-5.5 6.5-5.5s6.5 1.9 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c2 .6 3.5 2.2 3.5 5.2"/>',conversations:'<path d="M4 5h16v10H10l-4 4v-4H4z"/>',feedback:'<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',reports:'<path d="M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-3"/>',activity:'<path d="M3 12h4l3-8 4 16 3-8h4"/>',services:'<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>',content:'<path d="M5 4h14v16H5zM8 9h8M8 13h8M8 17h5"/>'};
const NAVG=[['Work','\u0627\u0644\u0639\u0645\u0644',['stats','requests','payments','invoices','settlements','complaints']],['People','\u0627\u0644\u0646\u0627\u0633',['technicians','users','conversations','feedback']],['Insights','\u0627\u0644\u062A\u062D\u0644\u064A\u0644\u0627\u062A',['reports','activity']],['Setup','\u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A',['services','content']]];
const NAVT={settlements:['Settlements','\u062A\u0633\u0648\u064A\u0627\u062A \u0627\u0644\u0641\u0646\u064A\u064A\u0646'],stats:['Overview','\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629'],requests:['Requests','\u0627\u0644\u0637\u0644\u0628\u0627\u062A'],payments:['Payments','\u0627\u0644\u0645\u062F\u0641\u0648\u0639\u0627\u062A'],invoices:['Invoices','\u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631'],complaints:['Complaints','\u0627\u0644\u0634\u0643\u0627\u0648\u0649'],technicians:['Technicians','\u0627\u0644\u0641\u0646\u064A\u0648\u0646'],users:['Customers','\u0627\u0644\u0639\u0645\u0644\u0627\u0621'],conversations:['Conversations','\u0627\u0644\u0645\u062D\u0627\u062F\u062B\u0627\u062A'],feedback:['Feedback','\u0627\u0644\u062A\u0642\u064A\u064A\u0645\u0627\u062A'],reports:['Reports','\u0627\u0644\u062A\u0642\u0627\u0631\u064A\u0631'],activity:['Activity','\u0627\u0644\u0646\u0634\u0627\u0637'],services:['Services','\u0627\u0644\u062E\u062F\u0645\u0627\u062A'],content:['App content','\u0645\u062D\u062A\u0648\u0649 \u0627\u0644\u062A\u0637\u0628\u064A\u0642']};
// ---- Positions, areas and area-first suggestions (bilingual, no mixed language) ----
NAVG[3][2].splice(1,0,'tags');
NAVI.tags='<path d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"/>';
NAVT.tags=['Positions & areas','\u0627\u0644\u0648\u0638\u0627\u0626\u0641 \u0648\u0627\u0644\u0645\u0646\u0627\u0637\u0642'];
Object.assign(W,{inspection:'\u0645\u0639\u0627\u064A\u0646\u0629',quoted:'\u062A\u0645 \u062A\u0633\u0639\u064A\u0631 \u0627\u0644\u0637\u0644\u0628',unpaid:'\u063A\u064A\u0631 \u0645\u062F\u0641\u0648\u0639',paid:'\u0645\u062F\u0641\u0648\u0639',rejected:'\u0645\u0631\u0641\u0648\u0636',open:'\u0645\u0641\u062A\u0648\u062D\u0629',in_review:'\u0642\u064A\u062F \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629',resolved:'\u062A\u0645 \u0627\u0644\u062D\u0644'});
const STE={in_progress:'In progress',in_review:'In review'};
const lblS=k=>lang=='ar'?(W[k]||k):(STE[k]||k.charAt(0).toUpperCase()+k.slice(1));
let TG=[];
async function loadTags(){try{TG=(await api('GET','/admin/tags')).tags||[]}catch(e){TG=[]}return TG}
const tn=x=>lang=='ar'&&x.nameAr?x.nameAr:x.name;
const areaChip=(r,ar)=>{const a=r.areaId&&ar(r.areaId);const p=a&&a.parentId&&ar(a.parentId);return (a?\` <span class="chip g">\${esc(tn(a))}\${p?'\u060C '+esc(tn(p)):''}</span>\`:'')+(r.placeText?\` <span class="chip">\${esc(r.placeText)}</span>\`:'')};
const villagesOf=mk=>TG.filter(x=>x.type=='village'&&x.active&&(x.parentId==mk||x.markazId==mk));
const areaChecks=sel=>{sel=sel||[];const mks=tagsOf('area');if(!mks.length)return \`<span class="mut">\${L('Add them first in Positions & areas.','\u0636\u064A\u0641\u0647\u0645 \u0627\u0644\u0623\u0648\u0644 \u0645\u0646 \u0627\u0644\u0648\u0638\u0627\u0626\u0641 \u0648\u0627\u0644\u0645\u0646\u0627\u0637\u0642.')}</span>\`;return mks.map(m=>{const vs=villagesOf(m.id);const n=sel.filter(i=>i==m.id||vs.some(v=>v.id==i)).length;return \`<details class="pk2" \${n?'open':''}><summary><b>\${esc(tn(m))}</b>\${n?\` <span class="chip g">\${n}</span>\`:''}</summary><label class="pick"><input type="checkbox" class="ak" value="\${esc(m.id)}" \${sel.includes(m.id)?'checked':''}> \${L('The whole markaz','\u0627\u0644\u0645\u0631\u0643\u0632 \u0643\u0644\u0647')}</label> \${vs.map(v=>\`<label class="pick"><input type="checkbox" class="ak" value="\${esc(v.id)}" \${sel.includes(v.id)?'checked':''}> \${esc(tn(v))}</label>\`).join(' ')}</details>\`}).join('')};

const tagsOf=(type,only)=>TG.filter(x=>x.type==type&&(only||x.active));
const chips=(arr,cls)=>(arr||[]).map(x=>\`<span class="chip \${cls||''}">\${esc(tn(x))}</span>\`).join('')||'<span class="mut">-</span>';
const mapLink=(l,q)=>l?\`<a class="maplink" target="_blank" rel="noopener" href="https://www.openstreetmap.org/?mlat=\${+l.lat}&mlon=\${+l.lon}#map=16/\${+l.lat}/\${+l.lon}">\${L('Open map','افتح الخريطة')}</a>\`:q?\`<a class="maplink" target="_blank" rel="noopener" href="https://www.openstreetmap.org/search?query=\${encodeURIComponent(q)}">\${L('Find address on map','ابحث عن العنوان على الخريطة')}</a>\`:'';
const checks=(type,cls,sel)=>tagsOf(type).map(x=>\`<label class="pick"><input type="checkbox" class="\${cls}" value="\${esc(x.id)}" \${(sel||[]).includes(x.id)?'checked':''}> \${esc(tn(x))}</label>\`).join(' ')||\`<span class="mut">\${L('Add them first in Positions & areas.','\u0636\u064A\u0641\u0647\u0645 \u0627\u0644\u0623\u0648\u0644 \u0645\u0646 \u0627\u0644\u0648\u0638\u0627\u0626\u0641 \u0648\u0627\u0644\u0645\u0646\u0627\u0637\u0642.')}</span>\`;
const WHY={not_available:['Not available','\u063A\u064A\u0631 \u0645\u062A\u0627\u062D'],active_job:['Has an active job','\u0639\u0646\u062F\u0647 \u0634\u063A\u0644 \u062C\u0627\u0631\u064A'],no_services:['No services set','\u0645\u0641\u064A\u0634 \u062E\u062F\u0645\u0627\u062A \u0645\u062A\u062D\u062F\u062F\u0629 \u0644\u0647'],no_service:['Does not cover this service','\u0645\u0634 \u0628\u064A\u063A\u0637\u064A \u0627\u0644\u062E\u062F\u0645\u0629 \u062F\u064A'],no_location:['Location not shared','\u0627\u0644\u0645\u0648\u0642\u0639 \u0645\u0634 \u0645\u062A\u0634\u0627\u0631\u0643'],stale_location:['Location is old','\u0627\u0644\u0645\u0648\u0642\u0639 \u0642\u062F\u064A\u0645']};
const why=k=>L(...(WHY[k]||[k,k]));
views.tags=async()=>{await loadTags();const blk=(type,title,tEn,tAr)=>\`<div class="card"><h3>\${title}</h3><p class="mut">\${type=='position'?L('What each technician works in. You choose from this list when you add a technician.','\u0627\u0644\u0634\u063A\u0644\u0627\u0646\u0629 \u0627\u0644\u0644\u064A \u0628\u064A\u0634\u062A\u063A\u0644 \u0641\u064A\u0647\u0627 \u0643\u0644 \u0641\u0646\u064A. \u0628\u062A\u062E\u062A\u0627\u0631 \u0645\u0646 \u0627\u0644\u0642\u0627\u064A\u0645\u0629 \u062F\u064A \u0644\u0645\u0627 \u062A\u0636\u064A\u0641 \u0641\u0646\u064A.'):L('Areas you work in. Technicians and requests are matched by area.','\u0627\u0644\u0645\u0646\u0627\u0637\u0642 \u0627\u0644\u0644\u064A \u0628\u062A\u0634\u062A\u063A\u0644 \u0641\u064A\u0647\u0627. \u0627\u0644\u0641\u0646\u064A\u064A\u0646 \u0648\u0627\u0644\u0637\u0644\u0628\u0627\u062A \u0628\u062A\u062A\u0637\u0627\u0628\u0642 \u0639\u0644\u0649 \u062D\u0633\u0628 \u0627\u0644\u0645\u0646\u0637\u0642\u0629.')}</p>\${tagsOf(type,true).length?\`<table><tr><th>\${L('Name','\u0627\u0644\u0627\u0633\u0645')}</th><th>\${L('Arabic name','\u0627\u0644\u0627\u0633\u0645 \u0628\u0627\u0644\u0639\u0631\u0628\u064A')}</th><th>\${L('Status','\u0627\u0644\u062D\u0627\u0644\u0629')}</th><th></th></tr>\${tagsOf(type,true).map(x=>\`<tr><td>\${esc(x.name)}</td><td>\${esc(x.nameAr||'')}</td><td>\${x.active?L('Active','\u0645\u0641\u0639\u0651\u0644'):L('Disabled','\u0645\u0639\u0637\u0651\u0644')}</td><td><button class="s" onclick="editTag('\${x.id}')">\${L('Edit','\u062A\u0639\u062F\u064A\u0644')}</button> <button class="s" onclick="toggleTag('\${x.id}',\${!x.active})">\${x.active?L('Disable','\u062A\u0639\u0637\u064A\u0644'):L('Enable','\u062A\u0641\u0639\u064A\u0644')}</button></td></tr>\`).join('')}</table>\`:\`<p class="mut">\${L('Nothing yet.','\u0644\u0633\u0647 \u0645\u0641\u064A\u0634 \u062D\u0627\u062C\u0629.')}</p>\`}<p><button onclick="addTag('\${type}')">\${type=='position'?L('Add position','\u0625\u0636\u0627\u0641\u0629 \u0648\u0638\u064A\u0641\u0629'):L('Add area','\u0625\u0636\u0627\u0641\u0629 \u0645\u0646\u0637\u0642\u0629')}</button></p></div>\`;$('#app').innerHTML=blk('position',L('Positions','\u0627\u0644\u0648\u0638\u0627\u0626\u0641'))+blk('area',L('Areas (markaz)','\u0627\u0644\u0645\u0646\u0627\u0637\u0642 (\u0627\u0644\u0645\u0631\u0627\u0643\u0632)'))+villageBlock()};
async function tagForm(type,old){type=type||old.type;const isV=type=='village';const mks=tagsOf('area');const f=[{k:'a',label:L('Name (Arabic)','\u0627\u0644\u0627\u0633\u0645 \u0628\u0627\u0644\u0639\u0631\u0628\u064A'),val:old?old.nameAr:''},{k:'n',label:isV?L('Name (English, optional)','\u0627\u0644\u0627\u0633\u0645 \u0628\u0627\u0644\u0625\u0646\u062C\u0644\u064A\u0632\u064A (\u0627\u062E\u062A\u064A\u0627\u0631\u064A)'):L('Name (English)','\u0627\u0644\u0627\u0633\u0645 \u0628\u0627\u0644\u0625\u0646\u062C\u0644\u064A\u0632\u064A'),val:old?(old.name==old.nameAr?'':old.name):'',req:!isV}];if(isV&&!old)f.unshift({k:'p',label:L('Markaz, or village (for a hamlet)','\u0627\u0644\u0645\u0631\u0643\u0632\u060C \u0623\u0648 \u0627\u0644\u0642\u0631\u064A\u0629 (\u0644\u0648 \u0646\u062C\u0639)'),type:'select',opts:mks.map(m=>tn(m)).concat(TG.filter(x=>x.type=='village'&&x.active&&!x.level).map(x=>tn(x)+' ('+tn(mks.find(m=>m.id==x.parentId)||{name:'',nameAr:''})+')'))});const v=await ask(old?L('Edit','\u062A\u0639\u062F\u064A\u0644'):(type=='position'?L('Add position','\u0625\u0636\u0627\u0641\u0629 \u0648\u0638\u064A\u0641\u0629'):isV?L('Add village or hamlet','\u0625\u0636\u0627\u0641\u0629 \u0642\u0631\u064A\u0629 \u0623\u0648 \u0646\u062C\u0639'):L('Add area','\u0625\u0636\u0627\u0641\u0629 \u0645\u0646\u0637\u0642\u0629')),f,L('Save','\u062D\u0641\u0638'));if(!v)return;try{const pm=isV&&!old?(mks.find(m=>tn(m)==v.p)||TG.find(x=>x.type=='village'&&x.active&&!x.level&&v.p.startsWith(tn(x)+' ('))):null;await api('POST','/admin/tags',{id:old?old.id:undefined,type,name:v.n,nameAr:v.a,parentId:pm?pm.id:undefined});toast(L('Saved','\u062A\u0645 \u0627\u0644\u062D\u0641\u0638'),false);await views.tags()}catch(e){toast(e.message)}}

let vkMk='',vkQ='';
function villageBlock(){const mks=tagsOf('area');const all=TG.filter(x=>x.type=='village');const q=vkQ.trim().toLowerCase();const rows=all.filter(v=>(!vkMk||(v.markazId||v.parentId)==vkMk)&&(!q||(v.nameAr||'').toLowerCase().includes(q)||(v.name||'').toLowerCase().includes(q)));const mn=id=>{const m=mks.find(x=>x.id==id);return m?tn(m):''};return \`<div class="card" id="vblk"><h3>\${L('Villages and hamlets','\u0627\u0644\u0642\u0631\u0649 \u0648\u0627\u0644\u0646\u062C\u0648\u0639')}</h3><p class="mut">\${L('Under each markaz. The customer can pick one, or type any place that is not here. Matching still works by GPS for places not in the list.','\u062A\u062D\u062A \u0643\u0644 \u0645\u0631\u0643\u0632. \u0627\u0644\u0639\u0645\u064A\u0644 \u064A\u062E\u062A\u0627\u0631 \u0645\u0646\u0647\u0627 \u0623\u0648 \u064A\u0643\u062A\u0628 \u0623\u064A \u0645\u0643\u0627\u0646 \u0645\u0634 \u0645\u0648\u062C\u0648\u062F. \u0648\u0627\u0644\u0645\u0637\u0627\u0628\u0642\u0629 \u0628\u0627\u0644\u0640GPS \u0634\u063A\u0627\u0644\u0629 \u062D\u062A\u0649 \u0644\u0644\u0623\u0645\u0627\u0643\u0646 \u0627\u0644\u0644\u064A \u0645\u0634 \u0641\u064A \u0627\u0644\u0642\u0627\u064A\u0645\u0629.')} (\${all.length})</p><p><select onchange="vkMk=this.value;vkRender()"><option value="">\${L('All markaz','\u0643\u0644 \u0627\u0644\u0645\u0631\u0627\u0643\u0632')}</option>\${mks.map(m=>\`<option value="\${esc(m.id)}" \${vkMk==m.id?'selected':''}>\${esc(tn(m))}</option>\`).join('')}</select> <input id="vkq" placeholder="\${L('Search','\u0628\u062D\u062B')}" value="\${esc(vkQ)}" oninput="vkQ=this.value;vkRender()"> <button onclick="addTag('village')">\${L('Add village or hamlet','\u0625\u0636\u0627\u0641\u0629 \u0642\u0631\u064A\u0629 \u0623\u0648 \u0646\u062C\u0639')}</button></p><div id="vrows">\${vkRows(rows,mn)}</div></div>\`}
function vkRows(rows,mn){const pn=id=>{const v=TG.find(x=>x.id==id);return v?tn(v):''};const shown=rows.slice(0,80);return rows.length?\`<table><tr><th>\${L('Name','\u0627\u0644\u0627\u0633\u0645')}</th><th>\${L('Markaz','\u0627\u0644\u0645\u0631\u0643\u0632')}</th><th>\${L('Status','\u0627\u0644\u062D\u0627\u0644\u0629')}</th><th></th></tr>\${shown.map(x=>\`<tr><td>\${x.level=='hamlet'?'\u21B3 ':''}\${esc(tn(x))}\${x.cityArea?\` <span class="mut">(\${L('city area','\u0645\u0646\u0637\u0642\u0629 \u062F\u0627\u062E\u0644 \u0627\u0644\u0645\u062F\u064A\u0646\u0629')}, \${x.verified?L('source','\u0645\u0635\u062F\u0631')+': '+esc(x.src||''):L('not verified','\u063A\u064A\u0631 \u0645\u0624\u0643\u062F')+(x.src?': '+esc(x.src):'')})</span>\`:''}\${x.level=='hamlet'?\` <span class="mut">(\${L('hamlet of','\u0646\u062C\u0639 \u062A\u0627\u0628\u0639 \u0644\u0640')} \${esc(pn(x.parentId))})</span>\`:''}</td><td>\${esc(mn(x.markazId||x.parentId))}</td><td>\${x.active?L('Active','\u0645\u0641\u0639\u0651\u0644'):L('Disabled','\u0645\u0639\u0637\u0651\u0644')}</td><td><button class="s" onclick="editTag('\${x.id}')">\${L('Edit','\u062A\u0639\u062F\u064A\u0644')}</button> <button class="s" onclick="toggleTag('\${x.id}',\${!x.active})">\${x.active?L('Disable','\u062A\u0639\u0637\u064A\u0644'):L('Enable','\u062A\u0641\u0639\u064A\u0644')}</button></td></tr>\`).join('')}</table>\${rows.length>shown.length?\`<p class="mut">\${L('Showing the first 80. Narrow the search to see the rest.','\u0628\u064A\u0638\u0647\u0631 \u0623\u0648\u0644 80. \u0636\u064A\u0651\u0642 \u0627\u0644\u0628\u062D\u062B \u0639\u0634\u0627\u0646 \u062A\u0634\u0648\u0641 \u0627\u0644\u0628\u0627\u0642\u064A.')} (\${rows.length})</p>\`:''}\`:\`<p class="mut">\${L('Nothing yet.','\u0644\u0633\u0647 \u0645\u0641\u064A\u0634 \u062D\u0627\u062C\u0629.')}</p>\`}
function vkRender(){const mks=tagsOf('area');const mn=id=>{const m=mks.find(x=>x.id==id);return m?tn(m):''};const q=vkQ.trim().toLowerCase();$('#vrows').innerHTML=vkRows(TG.filter(x=>x.type=='village').filter(v=>(!vkMk||(v.markazId||v.parentId)==vkMk)&&(!q||(v.nameAr||'').toLowerCase().includes(q)||(v.name||'').toLowerCase().includes(q))),mn)}
function addTag(type){tagForm(type)}
function editTag(id){tagForm(null,TG.find(x=>x.id==id))}
async function toggleTag(id,on){const x=TG.find(x=>x.id==id);try{await api('POST','/admin/tags',{id,type:x.type,name:x.name,nameAr:x.nameAr,active:on});await views.tags()}catch(e){toast(e.message)}}
views.technicians=async()=>{const {users}=await api('GET','/admin/users');const t=users.filter(u=>u.role=='technician');const {services}=await api('GET','/services');await loadTags();const tg=id=>TG.find(x=>x.id==id);$('#app').innerHTML=\`<div id="linkbox"></div><div class="card"><h4>\${L('Add technician','\u0625\u0636\u0627\u0641\u0629 \u0641\u0646\u064A')}</h4><p><input id="fn" placeholder="\${L('First name','\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0623\u0648\u0644')}"> <input id="ln" placeholder="\${L('Last name','\u0627\u0633\u0645 \u0627\u0644\u0639\u064A\u0644\u0629')}"> <input id="em" placeholder="\${L('Email','\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A')}"></p><p><b>\${L('Position','\u0627\u0644\u0648\u0638\u064A\u0641\u0629')}:</b> \${checks('position','pk',[])}</p><p><b>\${L('Areas','\u0627\u0644\u0645\u0646\u0627\u0637\u0642')}:</b> \${areaChecks([])}</p><p><b>\${L('Services','\u0627\u0644\u062E\u062F\u0645\u0627\u062A')}:</b> \${services.map(s=>\`<label class="pick"><input type="checkbox" class="sk" value="\${esc(s.id)}"> \${esc(sn({serviceId:s.id}))}</label>\`).join(' ')}</p><button onclick="addTech()">\${L('Create and get setup link','\u0625\u0646\u0634\u0627\u0621 \u0648\u0631\u0627\u0628\u0637 \u0627\u0644\u062A\u0641\u0639\u064A\u0644')}</button><p><small>\${L('No password is created. You get a one-time link to give the technician, who chooses their own password.','\u0645\u0641\u064A\u0634 \u0643\u0644\u0645\u0629 \u0645\u0631\u0648\u0631 \u0628\u062A\u062A\u0639\u0645\u0644. \u0628\u062A\u0627\u062E\u062F \u0631\u0627\u0628\u0637 \u0644\u0645\u0631\u0629 \u0648\u0627\u062D\u062F\u0629 \u062A\u062F\u064A\u0647 \u0644\u0644\u0641\u0646\u064A \u0648\u0647\u0648 \u064A\u062E\u062A\u0627\u0631 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0628\u062A\u0627\u0639\u062A\u0647.')}</small></p></div><div class="card"><table><tr><th>\${L('Name','\u0627\u0644\u0627\u0633\u0645')}</th><th>\${L('Email','\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A')}</th><th>\${L('Position','\u0627\u0644\u0648\u0638\u064A\u0641\u0629')}</th><th>\${L('Areas','\u0627\u0644\u0645\u0646\u0627\u0637\u0642')}</th><th>\${L('Services','\u0627\u0644\u062E\u062F\u0645\u0627\u062A')}</th><th>\${L('Available','\u0645\u062A\u0627\u062D')}</th><th>\${L('Location','\u0627\u0644\u0645\u0648\u0642\u0639')}</th><th></th></tr>\${t.map(u=>\`<tr><td data-l="\${L('Name','\u0627\u0644\u0627\u0633\u0645')}">\${esc(u.firstName+' '+u.lastName)}</td><td data-l="\${L('Email','\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A')}"><bdi>\${esc(u.email)}</bdi></td><td data-l="\${L('Position','\u0627\u0644\u0648\u0638\u064A\u0641\u0629')}">\${chips((u.positionIds||[]).map(tg).filter(Boolean))}</td><td data-l="\${L('Areas','\u0627\u0644\u0645\u0646\u0627\u0637\u0642')}">\${chips((u.areaIds||[]).map(tg).filter(Boolean),'g')}</td><td data-l="\${L('Services','\u0627\u0644\u062E\u062F\u0645\u0627\u062A')}">\${esc((u.skills||[]).map(id=>sn({serviceId:id})).join('\u060C ')||L('none set','\u063A\u064A\u0631 \u0645\u062D\u062F\u062F\u0629'))}</td><td data-l="\${L('Available','\u0645\u062A\u0627\u062D')}"><button class="s" onclick="avail('\${u.id}',\${!u.available})">\${u.available?L('Available','\u0645\u062A\u0627\u062D'):L('Unavailable','\u063A\u064A\u0631 \u0645\u062A\u0627\u062D')}</button></td><td data-l="\${L('Location','\u0627\u0644\u0645\u0648\u0642\u0639')}">\${u.location?esc(new Date(u.location.at).toLocaleString(lang=='ar'?'ar-EG':'en-US'))+' '+mapLink(u.location):L('never shared','\u0644\u0645 \u064A\u064F\u0634\u0627\u0631\u0643')}</td><td data-l=""><button class="s" onclick="editTags('\${u.id}')">\${L('Position & areas','\u0627\u0644\u0648\u0638\u064A\u0641\u0629 \u0648\u0627\u0644\u0645\u0646\u0627\u0637\u0642')}</button> <button class="s" onclick="editSkills('\${u.id}')">\${L('Services','\u0627\u0644\u062E\u062F\u0645\u0627\u062A')}</button> <button class="s" onclick="blk('\${u.id}',\${!u.blocked})">\${u.blocked?L('Unblock','\u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u062D\u0638\u0631'):L('Block','\u062D\u0638\u0631')}</button> <button class="s" onclick="resetLink('\${u.id}')">\${L('Reset link','\u0631\u0627\u0628\u0637 \u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u062A\u0639\u064A\u064A\u0646')}</button> <button class="s" onclick="delUser('\${u.id}')">\${L('Delete','حذف')}</button></td></tr>\`).join('')}</table></div>\`};
async function addTech(){try{const r=await api('POST','/admin/technicians',{firstName:$('#fn').value,lastName:$('#ln').value,email:$('#em').value,skills:[...document.querySelectorAll('.sk:checked')].map(x=>x.value),positionIds:[...document.querySelectorAll('.pk:checked')].map(x=>x.value),areaIds:[...document.querySelectorAll('.ak:checked')].map(x=>x.value)});await show();showLink(r.setupLink,L('Technician created. Setup link','\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0641\u0646\u064A. \u0631\u0627\u0628\u0637 \u0627\u0644\u062A\u0641\u0639\u064A\u0644'))}catch(e){toast(e.message)}}
async function editTags(id){const {users}=await api('GET','/admin/users');const u=users.find(u=>u.id===id);await loadTags();card(L('Position and areas','\u0627\u0644\u0648\u0638\u064A\u0641\u0629 \u0648\u0627\u0644\u0645\u0646\u0627\u0637\u0642'),\`<p><b>\${L('Position','\u0627\u0644\u0648\u0638\u064A\u0641\u0629')}:</b> \${checks('position','pk',u.positionIds)}</p><p><b>\${L('Areas','\u0627\u0644\u0645\u0646\u0627\u0637\u0642')}:</b> \${areaChecks(u.areaIds)}</p><button onclick="saveTags('\${id}')">\${L('Save','\u062D\u0641\u0638')}</button>\`)}
async function saveTags(id){try{await api('PUT','/admin/users/'+id+'/tags',{positionIds:[...document.querySelectorAll('.pk:checked')].map(x=>x.value),areaIds:[...document.querySelectorAll('.ak:checked')].map(x=>x.value)});await show()}catch(e){toast(e.message)}}
async function editSkills(id){const {users}=await api('GET','/admin/users');const u=users.find(u=>u.id===id);const {services}=await api('GET','/services');card(L('Technician services','\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0641\u0646\u064A'),\`\${services.map(s=>\`<p><label><input class="skillsedit" type="checkbox" value="\${esc(s.id)}" \${(u.skills||[]).includes(s.id)?'checked':''}>\${esc(sn({serviceId:s.id}))}</label></p>\`).join('')}<button onclick="saveSkills('\${id}')">\${L('Save','\u062D\u0641\u0638')}</button>\`)}
views.requests=async()=>{const result=await api('GET','/admin/requests');await loadTags();const ar=id=>TG.find(x=>x.id==id);const requests=result.requests.filter(r=>(requestStatus==='all'||r.status===requestStatus)&&JSON.stringify(r).toLowerCase().includes(requestQuery.toLowerCase()));const H=(a,b)=>L(a,b);$('#app').innerHTML=\`<div id="linkbox"></div><div class="card"><p><input id="rqquery" placeholder="\${H('Search requests','\u0627\u0628\u062D\u062B \u0641\u064A \u0627\u0644\u0637\u0644\u0628\u0627\u062A')}" value="\${esc(requestQuery)}"> <select id="rqstatus">\${['all','pending','inspection','quoted','approved','assigned','in_progress','completed','cancelled'].map(s=>\`<option \${s===requestStatus?'selected':''} value="\${s}">\${s=='all'?H('All','\u0627\u0644\u0643\u0644'):lblS(s)}</option>\`).join('')}</select> <button onclick="filterRequests()">\${H('Search','\u0628\u062D\u062B')}</button></p><table class="rq"><tr><th>\${H('Service','\u0627\u0644\u062E\u062F\u0645\u0629')}</th><th>\${H('Description / address','\u0627\u0644\u0648\u0635\u0641 / \u0627\u0644\u0639\u0646\u0648\u0627\u0646')}</th><th>\${H('Status','\u0627\u0644\u062D\u0627\u0644\u0629')}</th><th>\${H('Technician','\u0627\u0644\u0641\u0646\u064A')}</th><th>\${H('Created','\u0627\u0644\u062A\u0627\u0631\u064A\u062E')}</th><th></th></tr>\${requests.map(r=>\`<tr><td data-l="\${H('Service','\u0627\u0644\u062E\u062F\u0645\u0629')}">\${esc(sn(r))}\${r.custom?\`<p><b>\${H('Custom service','\u062E\u062F\u0645\u0629 \u0645\u062E\u0635\u0648\u0635\u0629')}</b>: \${esc(r.customTitle)}</p><small>\${r.classifiedAt?H('Classified','\u062A\u0645 \u0627\u0644\u062A\u0635\u0646\u064A\u0641'):H('Needs classification','\u0645\u062D\u062A\u0627\u062C\u0629 \u062A\u0635\u0646\u064A\u0641')}</small>\`:''}</td><td data-l="\${H('Description / address','\u0627\u0644\u0648\u0635\u0641 / \u0627\u0644\u0639\u0646\u0648\u0627\u0646')}">\${esc(r.description)}<br><small>\${esc(r.contactName||'')} <bdi>\${esc(r.contactPhone||'')}</bdi> <bdi>\${esc(r.contactEmail||'')}</bdi></small><br><small>\${esc(r.address)}</small>\${areaChip(r,ar)} \${mapLink(r.location,r.address)}</td><td data-l="\${H('Status','\u0627\u0644\u062D\u0627\u0644\u0629')}">\${r.status}\${r.inspection?\`<p>\${esc(r.inspection.note)}</p>\`:''}\${r.quote?\`<p><bdi>\${esc(r.quote.amount)} \${esc(r.quote.currency)}</bdi> \xB7 \${esc(r.quote.scope)}</p>\`:''}</td><td data-l="\${H('Technician','\u0627\u0644\u0641\u0646\u064A')}">\${esc(r.technicianName||'')}</td><td data-l="\${H('Created','\u0627\u0644\u062A\u0627\u0631\u064A\u062E')}">\${r.createdAt.slice(0,10)}</td><td data-l="">\${r.custom&&['pending','inspection'].includes(r.status)?\`<button class="s" onclick="classifyNeed('\${r.id}')">\${H('Classify service','\u062A\u0635\u0646\u064A\u0641 \u0627\u0644\u062E\u062F\u0645\u0629')}</button>\`:''}\${['pending','inspection'].includes(r.status)?\`<button class="s" onclick="recordInspection('\${r.id}')">\${H('Inspection','\u0645\u0639\u0627\u064A\u0646\u0629')}</button>\`:''}\${['inspection','quoted'].includes(r.status)&&(!r.custom||r.classifiedAt)?\`<button class="s" onclick="companyQuote('\${r.id}')">\${H('Quote','\u0639\u0631\u0636 \u0633\u0639\u0631')}</button>\`:''}\${['approved','assigned'].includes(r.status)?\`<button class="s" onclick="suggest('\${r.id}')">\${H('Assign','\u062A\u0639\u064A\u064A\u0646 \u0641\u0646\u064A')}</button> \`:''}<button class="s" onclick="viewPhotos('\${r.id}')">\${H('Photos','\u0627\u0644\u0635\u0648\u0631')}</button> \${['completed','cancelled'].includes(r.status)?'':\`<button class="s" onclick="cancelReq('\${r.id}')">\${H('Cancel','\u0625\u0644\u063A\u0627\u0621')}</button>\`}\${['completed','cancelled'].includes(r.status)?\`<button class="s" onclick="delReq('\${r.id}')">\${H('Delete','حذف')}</button>\`:''}</td></tr>\`).join('')}</table></div><div id="sug"></div>\`};
async function suggest(id){const r=await api('GET','/admin/requests/'+id+'/suggest');await loadTags();const row=(t,ok)=>\`<tr><td data-l="\${L('Technician','\u0627\u0644\u0641\u0646\u064A')}">\${esc(t.firstName+' '+t.lastName)}\${t.sameArea?\` <span class="chip g">\${L('Same area','\u0646\u0641\u0633 \u0627\u0644\u0645\u0646\u0637\u0642\u0629')}</span>\`:''}</td><td data-l="\${L('Position','\u0627\u0644\u0648\u0638\u064A\u0641\u0629')}">\${chips(t.positions)}</td><td data-l="\${L('Areas','\u0627\u0644\u0645\u0646\u0627\u0637\u0642')}">\${chips(t.areas)}</td><td data-l="\${L('Distance','\u0627\u0644\u0645\u0633\u0627\u0641\u0629')}">\${t.distanceKm!=null?'<bdi>'+t.distanceKm+'</bdi> '+L('km','\u0643\u0645'):'-'}</td><td data-l="">\${t.reasons&&!ok?esc(t.reasons.map(why).join('\u060C ')):\`<button class="s" onclick="assign('\${id}','\${t.id}')">\${L('Assign','\u062A\u0639\u064A\u064A\u0646')}</button>\`}\${t.reasons&&ok?\` <small class="mut">\${esc(t.reasons.map(why).join('\u060C '))}</small>\`:''}</td></tr>\`;const head=\`<tr><th>\${L('Technician','\u0627\u0644\u0641\u0646\u064A')}</th><th>\${L('Position','\u0627\u0644\u0648\u0638\u064A\u0641\u0629')}</th><th>\${L('Areas','\u0627\u0644\u0645\u0646\u0627\u0637\u0642')}</th><th>\${L('Distance','\u0627\u0644\u0645\u0633\u0627\u0641\u0629')}</th><th></th></tr>\`;const curA=r.area,mkId=curA?(curA.type=='village'?(TG.find(x=>x.id==curA.id)||{}).parentId:curA.id):'';const vsel=mkId?villagesOf(mkId):[];const sel=\`<select id="reqArea" onchange="setReqArea('\${id}',this.value)"><option value="">\${L('Not set','\u063A\u064A\u0631 \u0645\u062D\u062F\u062F\u0629')}</option>\${tagsOf('area').map(a=>\`<option value="\${esc(a.id)}" \${mkId==a.id?'selected':''}>\${esc(tn(a))}</option>\`).join('')}</select>\${vsel.length?\` <select id="reqVil" onchange="setReqArea('\${id}',this.value||'\${mkId}')"><option value="">\${L('Village (optional)','\u0627\u0644\u0642\u0631\u064A\u0629 (\u0627\u062E\u062A\u064A\u0627\u0631\u064A)')}</option>\${vsel.map(v=>\`<option value="\${esc(v.id)}" \${curA&&curA.id==v.id?'selected':''}>\${esc(tn(v))}</option>\`).join('')}</select>\`:''}\${r.placeText?\` <span class="chip">\${esc(r.placeText)}</span>\`:''}\`;$('#sug').innerHTML=\`<div class="card"><h4>\${L('Technicians for this request','\u0627\u0644\u0641\u0646\u064A\u064A\u0646 \u0627\u0644\u0645\u0646\u0627\u0633\u0628\u064A\u0646 \u0644\u0644\u0637\u0644\u0628')}</h4><p>\${L('Request area','\u0645\u0646\u0637\u0642\u0629 \u0627\u0644\u0637\u0644\u0628')}: \${sel}\${r.area&&r.area.guessed?\` <small class="mut">\${L('guessed from the address','\u0645\u062A\u062E\u0645\u0646\u0629 \u0645\u0646 \u0627\u0644\u0639\u0646\u0648\u0627\u0646')}</small>\`:''} \${mapLink(r.requestLocation)}</p><p class="mut">\${L('The closest technician by live location comes first; the same area breaks ties. Technicians in the same area with no fresh location are listed after. Only available technicians with no active job are shown here. Nothing is assigned automatically.','\u0627\u0644\u0623\u0642\u0631\u0628 \u0639\u0644\u0649 \u062D\u0633\u0628 \u0627\u0644\u0645\u0648\u0642\u0639 \u0627\u0644\u062D\u064A \u0628\u064A\u0638\u0647\u0631 \u0627\u0644\u0623\u0648\u0644\u060C \u0648\u0646\u0641\u0633 \u0627\u0644\u0645\u0646\u0637\u0642\u0629 \u0628\u062A\u0641\u0635\u0644 \u0628\u064A\u0646 \u0627\u0644\u0645\u062A\u0633\u0627\u0648\u064A\u064A\u0646. \u0641\u0646\u064A\u064A\u0646 \u0646\u0641\u0633 \u0627\u0644\u0645\u0646\u0637\u0642\u0629 \u0627\u0644\u0644\u064A \u0645\u0641\u064A\u0634 \u0645\u0648\u0642\u0639 \u0645\u062D\u062F\u0651\u062B \u0644\u064A\u0647\u0645 \u0628\u064A\u064A\u062C\u0648\u0627 \u0628\u0639\u062F\u0647\u0645. \u0628\u064A\u0638\u0647\u0631 \u0647\u0646\u0627 \u0628\u0633 \u0627\u0644\u0641\u0646\u064A\u064A\u0646 \u0627\u0644\u0645\u062A\u0627\u062D\u064A\u0646 \u0627\u0644\u0644\u064A \u0645\u0634 \u0639\u0646\u062F\u0647\u0645 \u0634\u063A\u0644 \u062C\u0627\u0631\u064A. \u0645\u0641\u064A\u0634 \u062A\u0639\u064A\u064A\u0646 \u062A\u0644\u0642\u0627\u0626\u064A.')}</p>\${r.technicians.length?\`<table>\${head}\${r.technicians.map(t=>row(t)).join('')}</table>\`:\`<p>\${L('No technician matches this area or has a fresh location.','\u0645\u0641\u064A\u0634 \u0641\u0646\u064A \u0645\u062A\u0627\u062D \u0641\u064A \u0627\u0644\u0645\u0646\u0637\u0642\u0629 \u062F\u064A \u0623\u0648 \u0645\u0648\u0642\u0639\u0647 \u0645\u062D\u062F\u0651\u062B.')}</p>\`}\${r.manualOnly.length?\`<h4>\${L('Other available technicians (area or location not matched)','\u0641\u0646\u064A\u064A\u0646 \u0645\u062A\u0627\u062D\u064A\u0646 \u062A\u0627\u0646\u064A\u064A\u0646 (\u0627\u0644\u0645\u0646\u0637\u0642\u0629 \u0623\u0648 \u0627\u0644\u0645\u0648\u0642\u0639 \u0645\u0634 \u0645\u062A\u0637\u0627\u0628\u0642)')}</h4><table>\${head}\${r.manualOnly.map(t=>row(t,true)).join('')}</table>\`:''}<details><summary>\${L('Not eligible','\u063A\u064A\u0631 \u0645\u0624\u0647\u0644\u064A\u0646')} (\${r.excluded.length})</summary><table>\${head}\${r.excluded.map(t=>row(t)).join('')}</table></details></div>\`;$('#sug').scrollIntoView()}
async function setReqArea(id,v){try{await api('PUT','/admin/requests/'+id+'/area',{areaId:v||null});await suggest(id)}catch(e){toast(e.message)}}
for(const n of ['addTech','saveTags','editTags','editSkills','toggleTag']){const f=window[n];window[n]=async(...a)=>{try{return await f(...a)}catch(e){toast(e.message)}}}
const CT=k=>lang=='ar'?({service:'\u062E\u062F\u0645\u0629',payment:'\u062F\u0641\u0639',technician:'\u0641\u0646\u064A',app:'\u0627\u0644\u062A\u0637\u0628\u064A\u0642',other:'\u0623\u062E\u0631\u0649'}[k]||k):k;
const ERR={'A valid service id is required':'\u0644\u0627\u0632\u0645 \u0645\u0639\u0631\u0651\u0641 \u062E\u062F\u0645\u0629 \u0635\u062D\u064A\u062D','Account blocked':'\u0627\u0644\u062D\u0633\u0627\u0628 \u0645\u062D\u0638\u0648\u0631','Address is required':'\u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u0645\u0637\u0644\u0648\u0628','Admins only':'\u0644\u0644\u0645\u062F\u064A\u0631\u064A\u0646 \u0641\u0642\u0637','Bad status':'\u062D\u0627\u0644\u0629 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629','Cannot block yourself':'\u0645\u064A\u0646\u0641\u0639\u0634 \u062A\u062D\u0638\u0631 \u0646\u0641\u0633\u0643','Choose an active company service':'\u0627\u062E\u062A\u0627\u0631 \u062E\u062F\u0645\u0629 \u0645\u0641\u0639\u0651\u0644\u0629 \u0645\u0646 \u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0634\u0631\u0643\u0629','Choose approve or reject':'\u0627\u062E\u062A\u0627\u0631 \u0645\u0648\u0627\u0641\u0642\u0629 \u0623\u0648 \u0631\u0641\u0636','Choose cash or wallet transfer':'\u0627\u062E\u062A\u0627\u0631 \u0643\u0627\u0634 \u0623\u0648 \u062A\u062D\u0648\u064A\u0644 \u0645\u062D\u0641\u0638\u0629','Classify the custom request before assignment':'\u0635\u0646\u0651\u0641 \u0627\u0644\u0637\u0644\u0628 \u0627\u0644\u0645\u062E\u0635\u0648\u0635 \u0642\u0628\u0644 \u0627\u0644\u062A\u0639\u064A\u064A\u0646','Classify the custom request before quoting':'\u0635\u0646\u0651\u0641 \u0627\u0644\u0637\u0644\u0628 \u0627\u0644\u0645\u062E\u0635\u0648\u0635 \u0642\u0628\u0644 \u0627\u0644\u062A\u0633\u0639\u064A\u0631','Customer must accept the quote before assignment':'\u0627\u0644\u0639\u0645\u064A\u0644 \u0644\u0627\u0632\u0645 \u064A\u0648\u0627\u0641\u0642 \u0639\u0644\u0649 \u0639\u0631\u0636 \u0627\u0644\u0633\u0639\u0631 \u0642\u0628\u0644 \u0627\u0644\u062A\u0639\u064A\u064A\u0646','Empty message':'\u0627\u0644\u0631\u0633\u0627\u0644\u0629 \u0641\u0627\u0636\u064A\u0629','Enter a valid email':'\u0627\u0643\u062A\u0628 \u0628\u0631\u064A\u062F \u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0635\u062D\u064A\u062D','Enter a valid phone number':'\u0627\u0643\u062A\u0628 \u0631\u0642\u0645 \u062A\u0644\u064A\u0641\u0648\u0646 \u0635\u062D\u064A\u062D','Inspection cannot be changed at this stage':'\u0645\u064A\u0646\u0641\u0639\u0634 \u062A\u0639\u062F\u0644 \u0627\u0644\u0645\u0639\u0627\u064A\u0646\u0629 \u0641\u064A \u0627\u0644\u0645\u0631\u062D\u0644\u0629 \u062F\u064A','Inspection note is required':'\u0645\u0644\u0627\u062D\u0638\u0629 \u0627\u0644\u0645\u0639\u0627\u064A\u0646\u0629 \u0645\u0637\u0644\u0648\u0628\u0629','Invalid JSON':'\u0628\u064A\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629','Invalid app settings':'\u0625\u0639\u062F\u0627\u062F\u0627\u062A \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629','Invalid availability':'\u062D\u0627\u0644\u0629 \u0627\u0644\u062A\u0648\u0627\u062C\u062F \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629','Invalid location':'\u0645\u0648\u0642\u0639 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D','Name and a valid email are required':'\u0627\u0644\u0627\u0633\u0645 \u0648\u0628\u0631\u064A\u062F \u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0635\u062D\u064A\u062D \u0645\u0637\u0644\u0648\u0628\u064A\u0646','Name is required (max 60 characters)':'\u0627\u0644\u0627\u0633\u0645 \u0645\u0637\u0644\u0648\u0628 (60 \u062D\u0631\u0641 \u0643\u062D\u062F \u0623\u0642\u0635\u0649)','Not allowed':'\u063A\u064A\u0631 \u0645\u0633\u0645\u0648\u062D','Not found':'\u0645\u0634 \u0645\u0648\u062C\u0648\u062F','Only unquoted custom requests can be classified':'\u0627\u0644\u062A\u0635\u0646\u064A\u0641 \u0645\u062A\u0627\u062D \u0644\u0644\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0645\u062E\u0635\u0648\u0635\u0629 \u0627\u0644\u0644\u064A \u0644\u0633\u0647 \u0645\u0627 \u0627\u062A\u0633\u0639\u0631\u062A\u0634','Quote changed. Review the latest quote':'\u0639\u0631\u0636 \u0627\u0644\u0633\u0639\u0631 \u0627\u062A\u063A\u064A\u0631. \u0631\u0627\u062C\u0639 \u0622\u062E\u0631 \u0639\u0631\u0636','Record inspection before quoting':'\u0633\u062C\u0651\u0644 \u0627\u0644\u0645\u0639\u0627\u064A\u0646\u0629 \u0642\u0628\u0644 \u0627\u0644\u062A\u0633\u0639\u064A\u0631','Request not found':'\u0627\u0644\u0637\u0644\u0628 \u0645\u0634 \u0645\u0648\u062C\u0648\u062F','Skills must be a list of service ids':'\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0644\u0627\u0632\u0645 \u062A\u0643\u0648\u0646 \u0642\u0627\u064A\u0645\u0629 \u0645\u0639\u0631\u0651\u0641\u0627\u062A','Technician does not cover this service':'\u0627\u0644\u0641\u0646\u064A \u062F\u0647 \u0645\u0634 \u0628\u064A\u063A\u0637\u064A \u0627\u0644\u062E\u062F\u0645\u0629 \u062F\u064A','Technician has an active job':'\u0627\u0644\u0641\u0646\u064A \u0639\u0646\u062F\u0647 \u0634\u063A\u0644 \u062C\u0627\u0631\u064A','Technician is unavailable':'\u0627\u0644\u0641\u0646\u064A \u063A\u064A\u0631 \u0645\u062A\u0627\u062D','Technicians only':'\u0644\u0644\u0641\u0646\u064A\u064A\u0646 \u0641\u0642\u0637','Tell the customer why the transfer was rejected':'\u0627\u0643\u062A\u0628 \u0644\u0644\u0639\u0645\u064A\u0644 \u0633\u0628\u0628 \u0631\u0641\u0636 \u0627\u0644\u062A\u062D\u0648\u064A\u0644','There is no cash payment waiting':'\u0645\u0641\u064A\u0634 \u062F\u0641\u0639 \u0643\u0627\u0634 \u0645\u0633\u062A\u0646\u064A','There is no transfer waiting for review':'\u0645\u0641\u064A\u0634 \u062A\u062D\u0648\u064A\u0644 \u0645\u0633\u062A\u0646\u064A \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629','This email already has an account':'\u0627\u0644\u0628\u0631\u064A\u062F \u062F\u0647 \u0639\u0644\u064A\u0647 \u062D\u0633\u0627\u0628 \u0628\u0627\u0644\u0641\u0639\u0644','This link is invalid or expired. Ask for a new one.':'\u0627\u0644\u0631\u0627\u0628\u0637 \u062F\u0647 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D \u0623\u0648 \u0645\u0646\u062A\u0647\u064A. \u0627\u0637\u0644\u0628 \u0631\u0627\u0628\u0637 \u062C\u062F\u064A\u062F.','This name already exists':'\u0627\u0644\u0627\u0633\u0645 \u062F\u0647 \u0645\u0648\u062C\u0648\u062F \u0628\u0627\u0644\u0641\u0639\u0644','This payment is already being handled':'\u0627\u0644\u062F\u0641\u0639 \u062F\u0647 \u0628\u064A\u062A\u0639\u0627\u0645\u0644 \u0645\u0639\u0627\u0647 \u0628\u0627\u0644\u0641\u0639\u0644','Too many attempts. Try again in 15 minutes':'\u0645\u062D\u0627\u0648\u0644\u0627\u062A \u0643\u062A\u064A\u0631. \u062C\u0631\u0651\u0628 \u062A\u0627\u0646\u064A \u0628\u0639\u062F 15 \u062F\u0642\u064A\u0642\u0629','Type must be position or area':'\u0627\u0644\u0646\u0648\u0639 \u0644\u0627\u0632\u0645 \u064A\u0643\u0648\u0646 \u0648\u0638\u064A\u0641\u0629 \u0623\u0648 \u0645\u0646\u0637\u0642\u0629','Unauthorized':'\u063A\u064A\u0631 \u0645\u0635\u0631\u0651\u062D','Unknown area':'\u0645\u0646\u0637\u0642\u0629 \u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641\u0629','Unknown position':'\u0648\u0638\u064A\u0641\u0629 \u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641\u0629','Unknown service':'\u062E\u062F\u0645\u0629 \u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641\u0629','Unknown technician':'\u0641\u0646\u064A \u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641','Valid amount, currency and scope are required':'\u0644\u0627\u0632\u0645 \u0645\u0628\u0644\u063A \u0648\u0639\u0645\u0644\u0629 \u0648\u062A\u0641\u0627\u0635\u064A\u0644 \u0635\u062D\u064A\u062D\u0629','Wrong email or password':'\u0627\u0644\u0628\u0631\u064A\u062F \u0623\u0648 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u063A\u0644\u0637','Not an admin account':'\u062F\u0647 \u0645\u0634 \u062D\u0633\u0627\u0628 \u0645\u062F\u064A\u0631','Sign in failed':'\u0641\u0634\u0644 \u0627\u0644\u062F\u062E\u0648\u0644','Write a reply before resolving':'\u0627\u0643\u062A\u0628 \u0631\u062F \u0642\u0628\u0644 \u0627\u0644\u0625\u063A\u0644\u0627\u0642','Request too large':'\u0627\u0644\u0637\u0644\u0628 \u0643\u0628\u064A\u0631 \u0623\u0648\u064A','Invalid Help content':'\u0645\u062D\u062A\u0648\u0649 \u0627\u0644\u0645\u0633\u0627\u0639\u062F\u0629 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D','Enter a valid InstaPay or wallet number':'\u0627\u0643\u062A\u0628 \u0631\u0642\u0645 \u0625\u0646\u0633\u062A\u0627\u0628\u0627\u064A \u0623\u0648 \u0645\u062D\u0641\u0638\u0629 \u0635\u062D\u064A\u062D','Public site URL is not configured':'\u0631\u0627\u0628\u0637 \u0627\u0644\u0645\u0648\u0642\u0639 \u063A\u064A\u0631 \u0645\u064F\u0639\u062F','Name is required (max 60 characters)':'\u0627\u0644\u0627\u0633\u0645 \u0645\u0637\u0644\u0648\u0628 (60 \u062D\u0631\u0641 \u0643\u062D\u062F \u0623\u0642\u0635\u0649)'};
const em=m=>lang=='ar'?(ERR[m]||(/^Invalid /.test(m)?'\u0628\u064A\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629':/^Unknown /.test(m)?'\u0642\u064A\u0645\u0629 \u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641\u0629':/[A-Za-z]{3,}/.test(m)?'\u062D\u0635\u0644 \u062E\u0637\u0623. \u062C\u0631\u0651\u0628 \u062A\u0627\u0646\u064A.':m)):m;
function buildNav(){document.body.classList.remove('lg','open');$('#nav').innerHTML=NAVG.map(g=>\`<div class="ng">\${L(g[0],g[1])}</div>\`+g[2].map(t=>\`<button class="\${t==tab?'on':''}" onclick="tab='\${t}';show()"><svg viewBox="0 0 24 24">\${NAVI[t]}</svg><span>\${L(NAVT[t][0],NAVT[t][1])}</span></button>\`).join('')).join('');$('#ptitle').textContent=L(NAVT[tab][0],NAVT[tab][1]);$('#bn').textContent=L('Tazbeeta','\u062A\u0638\u0628\u064A\u0637\u0647');document.querySelectorAll('[aria-label]').forEach(e=>e.setAttribute('aria-label',L('Menu','\u0627\u0644\u0642\u0627\u0626\u0645\u0629')));$('#lo').style.display='';$('#lo').textContent=L('Logout','\u062E\u0631\u0648\u062C');$('#sf').innerHTML=\`<b>\${L('Tazbeeta admin','\u0644\u0648\u062D\u0629 \u062A\u0638\u0628\u064A\u0637\u0647')}</b>\${L('Payments are confirmed here only. Prices are set per request.','\u0627\u0644\u0645\u062F\u0641\u0648\u0639\u0627\u062A \u0628\u062A\u062A\u0623\u0643\u062F \u0645\u0646 \u0647\u0646\u0627 \u0628\u0633. \u0627\u0644\u0633\u0639\u0631 \u0628\u064A\u062A\u062D\u062F\u062F \u0644\u0643\u0644 \u0637\u0644\u0628.')}\`}
function toast(m,bad){m=em(m);const t=$('#toast');t.innerHTML='';const d=document.createElement('div');d.textContent=m;if(bad!==false&&!/saved|\u062A\u0645/i.test(m))d.className='e';t.appendChild(d);clearTimeout(window._tt);window._tt=setTimeout(()=>t.innerHTML='',3500)}
function ask(title,fields,ok,msg){return new Promise(res=>{const o=document.createElement('div');o.className='mo';const f=document.createElement('form');f.innerHTML=\`<h3>\${esc(title)}</h3>\${msg?\`<p>\${esc(msg)}</p>\`:''}\`+fields.map(x=>\`<label>\${esc(x.label)}\${x.type=='textarea'?\`<textarea name="\${x.k}" rows="3" \${x.req===false?'':'required'}></textarea>\`:x.type=='select'?\`<select name="\${x.k}">\${x.opts.map(v=>\`<option>\${esc(v)}</option>\`).join('')}</select>\`:\`<input name="\${x.k}" type="\${x.type||'text'}" \${x.step?'step="'+x.step+'" min="0"':''} \${x.req===false?'':'required'} \${x.val?'value="'+esc(x.val)+'"':''}>\`}</label>\`).join('')+\`<div class="acts"><button type="button" class="s" id="mc">\${L('Cancel','\u0625\u0644\u063A\u0627\u0621')}</button><button>\${esc(ok||L('Confirm','\u062A\u0623\u0643\u064A\u062F'))}</button></div>\`;o.appendChild(f);document.body.appendChild(o);const fi=f.querySelector('input,textarea,select');fi&&fi.focus();const done=v=>{o.remove();res(v)};f.querySelector('#mc').onclick=()=>done(null);o.onclick=e=>{if(e.target==o)done(null)};f.onsubmit=e=>{e.preventDefault();done(Object.fromEntries(new FormData(f)))}})}
async function verifyPay(id,d){let note='';if(d=='reject'){const v=await ask(L('Reject transfer','\u0631\u0641\u0636 \u0627\u0644\u062A\u062D\u0648\u064A\u0644'),[{k:'n',label:L('Why is the transfer rejected?','\u0633\u0628\u0628 \u0631\u0641\u0636 \u0627\u0644\u062A\u062D\u0648\u064A\u0644'),type:'textarea'}],L('Reject','\u0631\u0641\u0636'));if(!v)return;note=v.n}else if(!(await ask(L('Approve transfer','\u062A\u0623\u0643\u064A\u062F \u0627\u0644\u062A\u062D\u0648\u064A\u0644'),[],L('Approve','\u0645\u0648\u0627\u0641\u0642\u0629'),L('Confirm the transfer was received in your account?','\u062A\u0623\u0643\u064A\u062F \u0627\u0633\u062A\u0644\u0627\u0645 \u0627\u0644\u062A\u062D\u0648\u064A\u0644\u061F'))))return;try{await api('POST','/admin/payments/'+id+'/verify',{decision:d,note});views.payments()}catch(e){toast(e.message)}}
async function cashPay(id){if(!(await ask(L('Cash received','\u0627\u0633\u062A\u0644\u0627\u0645 \u0646\u0642\u062F\u064A\u0629'),[],L('Confirm','\u062A\u0623\u0643\u064A\u062F'),L('Confirm the cash was received?','\u062A\u0623\u0643\u064A\u062F \u0627\u0633\u062A\u0644\u0627\u0645 \u0627\u0644\u0646\u0642\u062F\u064A\u0629\u061F'))))return;try{await api('POST','/admin/payments/'+id+'/cash-received',{});views.payments()}catch(e){toast(e.message)}}
async function replyComplaint(id,st){let reply='';if(st=='resolved'){const v=await ask(L('Reply and resolve','\u0631\u062F \u0648\u0625\u063A\u0644\u0627\u0642'),[{k:'r',label:L('Reply to the customer','\u0627\u0644\u0631\u062F \u0639\u0644\u0649 \u0627\u0644\u0639\u0645\u064A\u0644'),type:'textarea'}],L('Send and resolve','\u0625\u0631\u0633\u0627\u0644 \u0648\u0625\u063A\u0644\u0627\u0642'));if(!v)return;reply=v.r}try{await api('POST','/admin/complaints/'+id,{status:st,reply});views.complaints()}catch(e){toast(e.message)}}
async function recordInspection(id){const v=await ask(L('Record inspection','\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u0645\u0639\u0627\u064A\u0646\u0629'),[{k:'n',label:L('Inspection notes','\u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0627\u0644\u0645\u0639\u0627\u064A\u0646\u0629'),type:'textarea'}],L('Save','\u062D\u0641\u0638'));if(!v)return;try{await api('POST','/admin/requests/'+id+'/inspection',{note:v.n});await views.requests()}catch(e){toast(e.message)}}
async function companyQuote(id){const v=await ask(L('Send quote','\u0625\u0631\u0633\u0627\u0644 \u0639\u0631\u0636 \u0633\u0639\u0631'),[{k:'a',label:L('Amount','\u0627\u0644\u0645\u0628\u0644\u063A'),type:'number',step:'any'},{k:'c',label:L('Currency','\u0627\u0644\u0639\u0645\u0644\u0629'),type:'select',opts:['EGP','USD','EUR','SAR','AED']},{k:'s',label:L('Included work','\u0627\u0644\u0623\u0639\u0645\u0627\u0644 \u0627\u0644\u0645\u0634\u0645\u0648\u0644\u0629'),type:'textarea'}],L('Send quote','\u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0639\u0631\u0636'),L('The customer sees the amount and what is included. You can edit it until they accept.','\u0627\u0644\u0639\u0645\u064A\u0644 \u0647\u064A\u0634\u0648\u0641 \u0627\u0644\u0645\u0628\u0644\u063A \u0648\u0627\u0644\u0645\u0634\u0645\u0648\u0644. \u062A\u0642\u062F\u0631 \u062A\u0639\u062F\u0644\u0647 \u0644\u062D\u062F \u0645\u0627 \u064A\u0648\u0627\u0641\u0642.'));if(!v)return;const amount=Number(v.a);if(!Number.isFinite(amount)||amount<=0)return toast(L('Enter a valid amount','\u0627\u0643\u062A\u0628 \u0645\u0628\u0644\u063A \u0635\u062D\u064A\u062D'));try{await api('POST','/admin/requests/'+id+'/quote',{amount,currency:v.c,scope:v.s});await views.requests()}catch(e){toast(e.message)}}
const BK=/^(pending|inspection|quoted|approved|assigned|in_progress|completed|cancelled|unpaid|paid|rejected|open|in_review|resolved)$/;
function badge(root){root.querySelectorAll('td,.row').forEach(td=>{if(td.dataset.bd)return;let n=td.firstChild;if(n&&n.nodeType==3){const k=n.nodeValue.trim().toLowerCase().replace(/ /g,'_');if(BK.test(k)){const s=document.createElement('span');s.className='bd bd-'+k;s.textContent=lblS(k);td.replaceChild(s,n);td.dataset.bd=1}}else if(n&&n.nodeName=='B'&&td.tagName=='TD'&&td.children.length&&n===td.firstElementChild){const k=n.textContent.trim().toLowerCase().replace(/ /g,'_');if(BK.test(k)){n.className='bd bd-'+k;n.textContent=lblS(k);td.dataset.bd=1}}})}
const _stats=views.stats;views.stats=async()=>{await _stats();let r={};try{r=await api('GET','/admin/reports')}catch(e){}let rq=[];try{rq=(await api('GET','/admin/requests')).requests||[]}catch(e){}const pend=rq.filter(x=>x.status=='pending').length;const left=$('#app').innerHTML;
const hero=\`<div class="hero"><div><h1>\${L('Welcome back','\u0623\u0647\u0644\u0627\u064B \u0628\u064A\u0643')}</h1><p>\${pend?L(pend+' new request'+(pend>1?'s':'')+' waiting for your review.',pend+' \u0637\u0644\u0628 \u062C\u062F\u064A\u062F \u0645\u0633\u062A\u0646\u064A \u0645\u0631\u0627\u062C\u0639\u062A\u0643.'):L('No new requests waiting. All caught up.','\u0645\u0641\u064A\u0634 \u0637\u0644\u0628\u0627\u062A \u062C\u062F\u064A\u062F\u0629 \u0645\u0633\u062A\u0646\u064A\u0629. \u0643\u0644\u0647 \u062A\u0645\u0627\u0645.')}</p><button onclick="tab='requests';show()">\${L('Open requests','\u0627\u0641\u062A\u062D \u0627\u0644\u0637\u0644\u0628\u0627\u062A')}</button></div><img src="/brand.png?v=2" alt=""></div>\`;
const mo=\`<div class="money"><div class="card"><small>\${L('Revenue (paid)','\u0627\u0644\u0625\u064A\u0631\u0627\u062F \u0627\u0644\u0645\u062F\u0641\u0648\u0639')}</small><b>\${money(r.revenue,'EGP')}</b></div><div class="card"><small>\${L('Outstanding','\u0627\u0644\u0645\u062A\u0628\u0642\u064A')}</small><b>\${money(r.outstanding,'EGP')}</b></div><div class="card"><small>\${L('Transfers to review','\u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0644\u0644\u0645\u0631\u0627\u062C\u0639\u0629')}</small><b>\${r.awaitingReview??0}</b></div></div>\`;
const att=\`<div class="card att"><h3>\${L('Needs your attention','\u0645\u062D\u062A\u0627\u062C \u0627\u0646\u062A\u0628\u0627\u0647\u0643')}</h3><div class="row"><span>\${L('New requests','\u0637\u0644\u0628\u0627\u062A \u062C\u062F\u064A\u062F\u0629')}</span><b class="\${pend?'hot':''}" onclick="tab='requests';show()">\${pend}</b></div><div class="row"><span>\${L('Transfers to review','\u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0644\u0644\u0645\u0631\u0627\u062C\u0639\u0629')}</span><b class="\${r.awaitingReview?'hot':''}" onclick="tab='payments';show()">\${r.awaitingReview??0}</b></div><div class="row"><span>\${L('Open complaints','\u0634\u0643\u0627\u0648\u0649 \u0645\u0641\u062A\u0648\u062D\u0629')}</span><b class="\${r.openComplaints?'hot':''}" onclick="tab='complaints';show()">\${r.openComplaints??0}</b></div><div class="row"><span>\${L('Average rating','\u0645\u062A\u0648\u0633\u0637 \u0627\u0644\u062A\u0642\u064A\u064A\u0645')}</span><b>\${r.avgRating??'-'}</b></div></div>\`;
$('#app').innerHTML=hero+mo+\`<div class="dash"><div>\${left}</div><aside>\${att}</aside></div>\`};

setLang(lang);
<\/script></body></html>
`;

// public/reset.html
var reset_default = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Set your password</title>
<style>body{font-family:system-ui,"Segoe UI",Roboto,"Noto Naskh Arabic",Tahoma,sans-serif;background:linear-gradient(160deg,#e6f1fd 0%,#f4f8fd 55%,#eaf3fc 100%);margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box}.c{width:100%;max-width:400px;background:#fff;border:1px solid rgba(228,235,245,.9);border-radius:26px;padding:32px 28px;box-shadow:0 24px 60px rgba(31,80,160,.14);text-align:center;box-sizing:border-box}.c img{border-radius:20px;box-shadow:0 10px 26px rgba(31,107,242,.22);padding:5px;object-fit:contain}.c h3{margin:14px 0 4px;color:#14213d}.c .sub{margin:0;color:#6c7a92;font-size:13.5px}input,button{font:inherit;padding:12px 14px;border-radius:14px;border:1px solid #e4ebf5;background:#f8fbff;width:100%;margin-top:10px;box-sizing:border-box;color:#14213d}input:focus{outline:2px solid #b9d0fb;border-color:#1f6bf2;background:#fff}button{background:#1f6bf2;color:#fff;border:0;font-weight:600;cursor:pointer;box-shadow:0 6px 16px rgba(31,107,242,.25)}button:hover{filter:brightness(1.07)}.e{color:#e5484d;font-size:13.5px}.ok{color:#16a34a;font-size:13.5px}</style></head><body><div class="c"><img src="/brand.png?v=2" width="72" height="72" alt=""><h3>Set your password</h3><p class="sub">Tazbeeta · تظبيطه</p><p>At least 8 characters · ٨ حروف على الأقل.</p><input id="p" type="password" placeholder="New password" autocomplete="new-password"><input id="q" type="password" placeholder="Repeat password" autocomplete="new-password"><p id="m"></p><button id="go">Save password</button></div>
<script>
const tok=new URLSearchParams(location.search).get('token');history.replaceState(null,'',location.pathname);
const m=document.getElementById('m');if(!tok){m.className='e';m.textContent='This link is invalid or expired. Ask for a new one.'}
document.getElementById('go').onclick=async()=>{const p=document.getElementById('p').value;if(p.length<8){m.className='e';m.textContent='At least 8 characters';return}if(p!==document.getElementById('q').value){m.className='e';m.textContent='Passwords do not match';return}
const r=await fetch('/api/auth/reset',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token:tok,password:p})});const j=await r.json().catch(()=>({}));
if(r.ok){m.className='ok';m.textContent='Password saved. You can now sign in.'}else{m.className='e';m.textContent=j.error||'Could not save the password'}}
<\/script></body></html>`;

// public/brand.png
var brand_default = __toBinary("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/fapk+OACIRlvW/FzxpGAUgEIOH16nOm2fHJlas6/kfv3pt+OGFc79ZJSZmW1pZElIicVcUC3stijCUMTaQRESWiXHri5LbJb7xBb587Ow4tS6NSWgFI4uDUJASACkCiUhotS79+6vT4Sf96w7/u7LldhhAGBvsoeCslBgieAcAYSwT2XrRfKf938gsKPrF6zeirVdXZwutVmkhwc19o2e+p9PusS1VV7R5fsmT4TzduyVdaK4EoeG5AdBERcZmLMdbsWVpbhhDGmdLS88+uWVexvaQkF01TAwTL1tF+fc2ZpbUhiDRojb89eCBv942re59/6KGsDqmpOdwXEF2c8TLGmjU7+OefO7dnxvwF7u2FhQOk12vxqj9y7COU0uu1Cq5eHzLtrfmw8cKFfRJR8jTF6OFffsZYs0REpIiUIYTx78OHN31o6fL+16prsoTfryyufkaFRWQIn09drqrKeWzx0j6vHTy40RDCUESKgicKWQRxAsAYa3bqdvr/YdeugmfXvzfeNE2HsCzNJf/oUgBSWJb2m6brS/kbJvx62/Z8exuAk4DI4gSAMdas1A3+/7N5a/5/bdsR3O/XGjQ/82KCBhCoNUnTVM/t3pP37Xff24AAiAB8QiCC+MvAGGtW7May/960Of+X+/blCb9fkdbIx/tiCyGi1lpIv9/667ETE59evmKrqZTJSUDkcALAGGs27Ia/X2/dlv+b/QfyZMBvaa0FB//YRABoaW1Ib4216MLFMU+vWLXb0mQJRMHbAeHHCQBjrFmwg//f9+7b8Nyu3XkyELCUpXiwTxywiAzD5zOXX7o0+qnlK3abWpsA3BMQbpwAMMbinh38V548tf2bBRsmCstUyrI4+McRU2uH9HqtFZcvj/7MypW7yMZJQNhwAsAYi2tKa2UIYRy6UXji02vW9getSVuKy/5xyCIypNdrLb5wacw333l3k0AU9o2N0X5tzREnAIyxuKWJtBBClPp8pU8uXe6qUSpZaK05+Mcvi8iQPp/10smTE/9n85Z8iSh5bHB4cALAGItbBEAIgF9YvebEWb+vkzBNxef845/SWgqvV/1yz768Vw8c2GgIYfDEwNDjBIAxFpfs437/t2NnwarLV0dJv9/i4N88EABqrQVapv5m/oZROy5fPmgIYSituRIQQpwAMMbijj3oZ++160ef27p9tAj4lVKKg38zQogIWoOptfPplasyrlVVXZdCSG4KDB1OABhjcYWICIjAr5T/S2vWyACCC5QC3vdvfjSREJalLvsDOZ9eseqKpbXFTYGhwwkAYyyuaAAtEMVvtm3feri6uqfw+3nfvxlTAFIG/Nam4uIhv9q6bRM3BYYOJwCM2UhrIK1IWxaQUqBV8P8lzWNJY4Qm0hJRHisuPvX7XbvHoM+vNSI/x5o5pUkKn0/9eufuCdsuXT7A/QChwV8cxgAASClAIQCFRGEYgFKCkMH/F4UIJgJcdow2e//3u+++WxGQ0oVaEwFw6b+ZIwAk0qgR5BfWrE2tDAQqERG5H6Bp+E5sltiICJAIUEpdffUKXl17MnBjr0NonyRHqunIGKQhO7crJrdvf+vfj8xeMxGRJtK3P+QQEREARYKtfO2u/2UnTm7Lv3ZjNJf+E4smEIZS1hm/v/OPCjZs+M1DkyfavxPRfm3xihMAlrCItA7GUiGsU69vUAd/M8glq3JddrhFALi2GMyDSZXY/cl8o/9XxgMKCUAUvLk0fOwH270ebvaNaYmQCBARIQD6Lcv335s2tUGtiRARuCiTUJTWUvh86pUjR8c/0a/vwZE5OQOU1koKwUlAI3ACwBIUEaIQAESBPT8tcF58LVebBNU+tIKhHYGAgAhRYnWK5+ILef7KC1tcY383FkgpACHCUQmgYKwjiSg1kd597dqR7ZevFJ8tK0O/UiLV5VL927SWo3NyOnRt1aoTQHAUbnN/ACoiZQhh/OvwkZ0nvL4JPPAnMREAktaoDUN84513Hes/9lFTIkoiIuRTIA3GCQBLOJq0EigkBSrKze3fOO4sy8+trkEFCIigDbvgjrX/aI1UXYlWslo1NrA3u8A55Nu5oC0L0Ajp98cO5IiIbx89tvlPe/al771xvT86HACidpFPBHCIwK11zdRu3bZ+fcSwtIFt2vTWRLq5VgKIiKQQssY0q3+/Y0dnNE1e/ScwDSBkIKAOVlb2/tuevQXPDh+Wq4iU5ISwwZrlA4Oxu1FaWQKFBOXz+Td+9ryzrGBkdQ2aCEoi6Tt+HxAJQSvDWw2W8/yLueapNzeCMAzQKmSjSRWRkkLIMp+v7JPLV2z9zPp3x+0rLuqDlkXC51PS57Okz2dJv98SPp/yBgJJS86eHTP5jbe6/mHnrgKBKBSRao7nozWARgB868ixPef9Zge0LK2J+NmVwAgR0TT1b7bvHFDorSmyLw2K9uuKN/wlYgmBiCgYZKVxurTywr6CHx10V+8YWFkFFmrluN9/j0CotZa+AGja94Mx1rUte0FIg7TV5CTA0mRJRHmypOTsnPkLry+5cHGM8PkUmgFNiKgApKW1Yf+jACQCkAwErIBpOv9r567c5zZtbpaXphARCQBhKhX40+5d7VBZxAN/mCYSaFlUApD+++07DyMAnwhoBE4AWLNHAASIIBHlPw8f2/z42y+ltClZN8KsBiVA17uMj0ioNACSNvT2r3TSFWfPoTCMYE9AI15XbVJiCDQKzl/YO2vBguSDJaW9pNdrKQCp6e7fTwJAS2sDtSbp91u/3rc/7+V9+5vdpSkaQCMirjp9Zs/J6pquaJq8+mcAUJsEBPz6pYOHhp8pKzvPVYCG4y8Sa9Y0kUYABCL48YYNBZ9cv3FcF+tcWo5VovwgJDZw0YCkhd9C5VBl6YEtX9ABb2kRoJQNHRZkH++TiPLVgwc3Pr50Wb8b1d42IuBXFlG9kxJCRGVZUpgB9Y38grH558/vaU5JANae8X9p/35ntF8Liy2EiIJIe4VI/t32nRcQAJvjFlg4cQLAmi1FpASiqPD7Kz6+bPn25w8dygW/qXKgkgCUbOyTQoCW1T5Ubv+prmWbvnzNZwaqAYPHCuv1urRWAlEIRPGjjZsKvpq/cYIZCDhQKd2YznZCRNKEmkh8atWazidKSs4YQhjxvh1gf36HbhSe2HT5ykDw+4k7/1ldSmsJPh+9fezosPPl5Re5CtAwnACwZsnS2pKI8kxp6fl58xddXnHx0mjp81maSPpBIjVxeJxALatrwGrj29G/ZPsP9gMIgfVIACytLSmErA6Y1R9funzb7w8czBUBvwKtoSmlbU0khFK6OBBI//iSZVDi9ZYIgGbxMHzr6LGryuE0pBBxndCw0CMAFETaZziS/rZ33xmeDtgwnACwZuXWvrowNl+8uH/G/AXuvSXFfaTPZ5maDAcqOGamg58MEE18TiBow1sDZk7p4rFX9/4pH4L9AHctvVtaW4YQxtmysguz3l5wYfnFi6Ol328pIhmKxjYFIKVpWieqq7t+esWqs4pIUfDgYFw+ECWirDHNmkXHj3UDM9CkBIk1XyQEgt9Prx86MvBGdfUNichXBtcTf6FYs2EHO4koXz90aNOjS5b0ulZdkyX8wX11DQgetGBPIAt2BrIhGQOgmlgJ0Eob/hptZZ57Pu/6yeWbAKVBtx0PrJuUbLpwcd/0N9927atNSixd/ybE+rCIDBkIWO9evzHsO+++t0Uiyni8NMXevth66fKRSz5/e1SKm//YHWmthdBalyGkvX302FGAW1My2b3xF4o1C3azn0AU/715S/4X3ysY7/ObbmFZ79tXF0DgBwk/LR8DfjBAAkFTtgMQCU1FEkyl3Ae+O7Ls2oEDKKRBFAy6tyclDy9c1O+613szKQnBX/0DLK0N6fdbLx47MfEPO3cVxHNT4NITJ70gJSA3d7F7QQRQFrx+8HC2pbUlAAQ3BN4fJwAs7tnNYjWBQPUzK1Zt+c3+A3kiEFCoNenbfsc1IKRiAN7xdYbvlOVCkghAU5cKAgn9CjCFvE5zyxfaV1ZcOY8opNLKtJOSn27cnP/F9/LHm0o58LakJByUsqQI+NUPNm+ZuOLkye3xlATYCZPXsmrWnzvflUyTy//snhSRRNPSR8rLe265dOkgIqKGJn+1mz3+UrG4Zjf7XSwvvzxnwaJzC8+dGytqatS99tUVILQSPvh95TB4vmI4pAgfWE38KgjQoiYgVWu8ml614QsBX8BXKYV0VJuBqqeXr9z62wMH8kTAvGNSEg6EiESEpDV8bu07fQ9cv3EsXk4GaB1sptx99eqJS96admjx8B92fwJRo8OAfx0+WhPt1xIvOAFgcctuqtt+6fLBaW8vwN1FRf2k32/VZ3VNtZWAb5flwrKanpAqvE1PAlDJap+wsulIj8qt3z5ysLDk5Ny33j6/+Pz5MaFs9qsvTSSE1rrKslKeXLYi+Xptg1Ss74/aDVz55y+UocMB3P3P6kMpJSkQgHfOnO5d5vOV2ZcERft1xTJOAFjcIQDSRNoQwnjryNHNcxcv6X6lqipH+P2qvk11BMF+AIEEny6ZCnsC2ZAi/KCa+JVA0EZVNenWhUtGLVvy1Q7rb1T3M7w19X5doaYApAgE1Hmft8NTy1dcDSjlB7gVZGORfQXyhgsXM0ApCN4EzNi9ESIKpXSxpoyNFy8dAwhOkoz264plnACwuFK32e/nW7bmf/ad9eN8fr+nMfvqGhBcoKBUu+ETRTPgqtUC3GiCbuLJACQtqgMO+k7KBveTrn26ULulEcXnkEKUMhCwthaXDPrymrW7BKKI1ZMBmkgjIl6prLp2uKiwC1kWaH3nS5oYux0CEKKgpcdPcOCvB/5isbhhN/v5LMv7mRWrN/9i7748NE3dlH11BQgpGIAjZiY8UzwdTBIgQTcpCUAAIAQMaEnPp60TE90XoYzcIKOYBFhaG9Lns948e27cr7Zuy4/VpkC7MnGw8MbFGsAWgkjz/j+rL00ktBnAgosXulf4/RU8E+DeOAFgccFu9rtUUXFl3vyFp94+f26c9PstIsKmBggLBKQJH6z2dYGvlz4Ibmx6XBRAYILAJLTglfSV0E2WQQ05QUbxWWRpbQi/T/1s5668BceObYnVJAAAYN/1G9UgJQhEXsmxeiNERMuiQn+gzf4bN84AAOgG3tORSDgBYDHPHqKz88rVQ9PefAu2FxYNkF6vZWltEDSxXl/LAgHpwgcvVA2CX1SMhhbC1+QhQRIIasgBXRxl8GrmCkjCAARANnkCYVMQAaLW+gvvrB+y6+rVw7F6MmD/9eseIALSOmZX/7HeTJmopJQKHA4oOH+hDACACLkCcBecALCYRQCktFYSUS44dmzL3IWLulyu8eYIvy8sQ3R07fHAH5aPg7eq+4bkeKABGiq0G0a7LsGf0tdBgAQQYGiylkbQRAIsC3yW9jy5fEX6pYrKK7FyMoCISCJKv1L+U8WlrUEpiMnyf/BqaRCIIhaTp0iLtehKWiNoBZsuXkoHAJAC+QKpu+AEgMUku9lPCiF/tW17/qfWrBtbEwgko2mGbYgOQbCc4AQNz5Y8BNv8HSAVfWA1MVwboKFSe+CJ5MPw45aboUy7oloF0ABCWqa66vNnP7lsWVmNaVYDRP9kgP3zr1VV37hQVZlDlhVzJwA0kQCfj369Y0f2jitXDrqkdNlXO0f7tUWa/fd2ydiKr5pIkGnBwRs3uhZWVxdiiKqEzREnACzm1Gn2831hzdpNP9u9Jw8tS6NSYR+iowHBiQqqyQGfKJ4OZ61WkIRWCLYDNFRpD3yn5Tb4TIv9UKLdENWTAQBSBgLW3rLyvs+uXnPAvkY1moHMPrN9oby82AfgRq0pVFs8oWJXUE6UV3SdPX9hz7/u3bdBIAoEwFg9WREOltaWS0oXAuC58nIDtI6Zag0hoiDS1UQtjpWUXI7264llnACwmGI3+12rrLr+6ILFx/916vR46fdbpHWTm/3qSwFCMppw2kyDTxbPgBptgKOJJwMAgpHMSwb8b9p6mOo5C6X1TAIEog7HLHyLyJB+v7XkwqUxP9qwoSB4cVD0Stp28nGuvLwShYjZBkBCRDRN7TdN17c3b534qZUrt5R6vaVSCBmrTZWhoom0PYPjTGnZ+Q8vXrrj9SNHx0NNDUVr1sWdCESNTiccvlFYHu3XEss4AWAxw57st/fataMz5y/0bim8Mci+MS/SqwsLBLQSPtjg7wBfKn0InKgAgJq0PEYgUCTAgRpeSl8FfR3FUEnOux4PxGD9m8gwBBkGYhhW55bWhgz4rd/vP5j7jwMHNhoCo34y4Hx5uQIpAYWI2bK6BhCoNQmfVy04e37s1LfeLt1++fJBu6myOW4JWFpbAlEIRPHygQMbH/zXm6lrLl0aGYujmklrBCLYde16zCQlsYgTABZ1BHDzutxlJ05tm71gUfszFeWdhS88zX71FTwZ4IV/VPeDn5SPgxboB93kOwMIfGRAjqyCVzNWQJrwgZ+MD/QECABNQiC4XfjjsWMKfpmXuwHcHpQAIV+hK8uSwjTVNwo2jtpw/sLeaJ0MEEIIAIAL5RUOiIMJroSICkBKv986WVbedc6CRT3/uGt3gUSUCIDNpUGw7qr/dGnpuQ8vXrLz6xs2TSj1e9OEz6diLfgDBD8bUApOlxanN8dkLFQ4AWBRdbPZD1H+385dBR9fuXJ0ld+fIkxThfvGvHq9PhCQJvzwXMVoeKV6EKSE4M4ACQQV5IKhzqvw1/Q1oAFBAwLWPqckgCKHQ7hdLu8LkyZt/vKI4bmfGTJ44qf79Nqgk5KkgSEYVFAHISJpjQGlnE+vXNXxdGnpueB2QGT3tLG24e9KVWUyaB3TRwDrsrQ27C2B72/bkfvMylVbSrzeEokY91sC71/1H9z40Btvpa65dHmE8PkUKkWx8B29E9IaSWu4XuVtWeL1lkb79cQqTgBY1NjNfqZS5lffWb/xh9t35gqtdSw9WOylQxJa8JXSSfCerzOkCl+T7wwwQEMFeWBO0gn4RVoBVGgnCAAwhLC0yyVzWiRfWfzwvFMf6ttnnKmUqYjULx6cNGFKdtudyu02DCFCGlg0gJCmqYpNM+PjS1eYZT5fmRBCROp4IBERIqIm0sU1vhax1FRWH/aWgAz4rYVnz42d+ubb5dsvXzloCGFEu7myMezXbAhhnCopPfehhYt3fn3DxgklXm+68PmUAojoxVYNZVcAirw1mTdqakqi/XpiFScALCrsZr+impqiDy1ZcvDVEycnCJ9XkVIRa/arLw3BgG2ShKeKZ8AJMwOSMRCSJKBKu+FLKbvgKym7oVS5CT0uY1hm5uFVjz2qR7fLGWBpbTmkdASPMhH8dcb0nr1bJJ9ShmGEejtAIUppmdbRqsoen1m58iQF2/IpkjeqBZQKlPp9KRRHFQAbIaKltSH9futUeXmXOQsW9vzz7r0FN08JxMmWgL3qRwB8af+BDQ+99VbLdVeuxPyq/3aoNQUAnBfKy7kCcBecALCIs5v9DhUWnpjx9vyK/CvXh0qfz4rlVYUCBA9acFm1gCeLZ0KpdoETrRCcDCCo0U74RfoG/Wir82pml76blj4yt2PHli3b230RAAACUWhNuqXL1fKfc2Yb6U5niTYMGepOeUsHTwasu3ZjxLfXv7dJIkpFpMKeBNR+7F7L8vosyxUPPQB3U3dL4Htbt+Z+cvmKrcU1sb8l8L5Vf2npuQ8tXLLz/23aPLG0JrjXH8vfzztBIQiFgPPlFd5ov5ZYxQkAixgiutnst+r06R2z5i9oc7K8oqvweaN2XW5DKEBoiX7Y7s+Gz5VMDV4n3OSTAVC7/4/w18w1+n+HZLRMcrlTtFamfS2uTQohFZHqlpbW+ZUZ0y9IRAuFoFAfEVRaS+n3W38/dmziC3v2bohEU6CdYHgtyxdQliOcPysSbp0S8Kkl5y+MmfLmmxWbL13aH6tbAnVX/X/ft3/DQ2++1XLdlcsjhNcbV6v+uhCAABEKq6tj8jhpLOAEgEWEvZcsEeWfdu8p+OjS5SPKfP5WIhCIiWa/+rJAQIbwwvyaXvDdslxIEgGgEJwM8JOEllTlpO1fbFNVef2SENIB8MH9d3sVOaFjh8G/fSBvqzYMKQ1DhfKIIAGgUkqKQEB9Z8PGCWvOnNkZqZMBltYqxob/NZp9SkB4vepMRWXnefMX9v3Drt0xtSVQd9V/sqTk7OOLluz6Zhyv+t+HCAAFFNZ44+b5EmmcALCws5v9CIC++e57G/5z67ZcUAqE1mEb6xtOqvbioP+tGA5/rhwKLUJwMkCQEtWm1On6clb15i9V+U1/NRAB3eEmM/sWvycHDpjwlUEDC5TLZUiBIQ0mVDuGAIngU6vX9jpSWHgyEicDLK0VgZbBh3d8xp3bKQCJpqktpYz/2r4j95MrVm4tqqkpjvaWgP29RAD8W3DVn/bO5cvD422v/64QAYCgqKbGGe2XEqs4AWBhZTf7lXi9JR9auGTP348dnyh8PgVEwbGqcYggWLZvIQLwzbI8WOXtDqkhOR6oRbUXrSxzX++SLd87BCgEBrOAD6zu7b35H02ckDurfc425XIboT4eqIkEKEWVlpn68eXLHUU13mIpRFgvDjKVUvH6e3EvGkCA1iC8XrXk3PkxU998q3LzxYtR2RKwf55ElKdKSs89vmjJrm9t2jyxzOtrFfer/joIAIEIKgIBTgDuotl90VjssJv9jhQWnpr+5ltl669eGR7rzX71RRA8zw8E8EzxNNgfaAsp6G/yxUEI2vDWoJldvnzUtd2/LwCUEuCDq25ERARATaT/Mn36gCGtWh5RTpchQ1xW1gBC+gPqTLW381MrVlwwtTaDrYvhCVgEoGNs/H/I3Bwc5PNZZyoqO89duLjf/+3cFdEtgbqr/hf27Nsw6Y0305vVqv92RGApzXHuLviNYSFXt9lv7ZkzO2fOX5hxoqKyqwwErHho9qsvDQguVFCsPfDJ4hlwXSWDG1WTTwZorRy+GrLaXPpL7rVjCzcASgO0+sDqXiAKAIBkhyP51TmzWmW7nVe1wyEFhPaWIYUopd9vbSosGvL1teu3CQQRrq0Ap5SOUL/+WGMRGWhZ2jJN44c7duZ+bNmybeHeEqi76j9RXHzmsUWLd31ny5aJFT5fanNa9d+Jqa3mldSEECcALKQ0ka69L12+sGfvhg8vXT6s1OdLE4FAXHT6N5QChBQMwP5AG/hUyTRQgCE5GWBpksqvVPKhH4wtubxzDwhpAH0w6Np30ndISc15ecaMIpchvWAYEOqTARaRIX0+65+nT0347bbt+YYQhkUU8mDlltIpDWkBIsTzUcD70UQCiUh4vWrFhUujp7z1dtWmCxf32VsCodxmqbvq/8uevQUPvvlW5vpLV5rvqr8OIgKf1fyeO6HCCQALGaV1sNmPiL6z/r2C72zZMpEshfHa7Fdf9p0BK7zd4JulD0ASBoCaWAUQSOhXgEnkl7T9y10qyy+eBRQS4INNgfbKcVS7nAHPT5q0l4QQQggd6suDlFJS+P3qp9t35C0+fnyrgRiykwFYu/p0GYZLUujvO4hFde8SOFNW3unhRYv7/b52S8BO7Jry59dd9R8vLjnz6MLFu7+7ZWtupc+fKvzNe9VfF3KUuyt+a1hIWFpbUghZ4vWWfHTJ0t0vHDuWK3x+BaTjttmvIazakwF/rBwCv64YBS3Q1+R+AAFaeE2hM7Aozb/5y5ayvNXBkP7BpbF9MuDxvn3GfnfE8HztdkspRGhPBiCiVkqgJv2Fd94duOfatSN2M2KofobbMFwOIVVzOQFQH5bWhqjdEvjRjp25H1+6fPuNmprCpmwJ1D3X/5c9ewse/Pcbbd69cmVYIqz660JE8EjDjPbriFXN/sHMws9u9jtRXHJm9vwFRWsuXxnRXJr9GkIDQEvhh++XT4AFNX0gVfiafjwQlaz2oZVpHe7h2/adA4BCkNbqjicDau+j/9aY0Xkf7tplk3KH/mRAcMa6BTWmlfzxZStaXa6ovCIRm34yoPav45TSmepxVQFiTF8HHGq69lks/X5r+cWLox58/d9++2bGhpwSqHuu/1hx8elHFiza/d0tW3OrAoEWzX2v/84QHDK0iXBzwgkAazQiIjv4v3vu/O6Z8xekHikt6yl9Piua1/hGC9Xu/ztQw+dLp8BOfztIFf4m3xmAoI3qarSSS1aNCRz4fT4KadzxZAAA2sf0fj91ysjR6WkHlMsV8jsDNIAQZkBd8flyPrlsRYnXNGsQEUNxMsAhhCPN6arCBKzbEgBaWhvC61WXqmvaP7Jk6YDfNeCUQN1V/5/37C148F//bvve1asJt+p/HwRwGzJmxy9HW+J9y1hIUO2YTUMI46V9+zc8sWTpwMKamkwRCKhEDP42DQhOUFChnfBk8Qy4aKWCG01QTT3aRlp6vWg5Tv0xzzy7eHPwZID1gQcb1p6hcwrhfGX2rLYd3O6LYTsZYJrWrrKy/l9cvXYfAqDSutF3Btg3AQIAtE5KqgYpQt7IGC8UgERlaRUIyB/v2Jn7saXLt1+vqr5xty2B9636i4pPzZu/cM/3tmzNrQ6YyYm56g9CIgIhoKXbE4j2a4lVnACwBtMAGmuHbHy/YEPB/9u4aaJlWUZzb/arLwUILTAAJ6x0+ETxDPCRBAfqJh0PRCRUSsuAQk17vjdc3dh5AIRhgFZ3PhmgtcpKTm7zrzmzvcmGUUVSYshPBmhtSL/PWnjh4tj/3rQ5v6njgu0KQlaLFj4QIqG2AG6niQQQQfCUwMVRD731pr+gzpaAnSzVXfX/ac+eggfffLNtwdWrQ4XPp1DrxFz110UEWUlJ3ANwF5wAsAZRREoAiEq/v/Ljy5dv/+PhI7kiEFCgE6PZr74sEJCGPnjP1xG+UjIZXGABNvF4oEBC0yIQZLrUtq9k6apLF0FICXcYF2xfHNS/Teuef53y0GFARCFl6E8GaC1lwG/9Zu++vH8dOrTJbkZszJ9lVw/ap6ao5nwEsL5u3iXg86qLFVUdHl60eNBvt+/It08JaCIdHLRVdHLe/AV7/3Pr9txqn7+F8PsTdtVfFyEiaA1tkpOj/VJiFj+wWb1ZmiyJKE+XlJ6bs2DRpRUXLo2WPp+liBL+YXMn9smAl6sHwHPlYyBZ+EE3+eIgLXwBVE5dlBXY8rUy0GawvHmXccGW1taMHt1H/XTc2ALtckkpZMjvDFCWJdGy9FfeeW/Ultrxto0ZFGQfBezcsqUDlAZqLrcCNVFwS0Bpsiz86a7deR9ZumxHkddbLBDFH3btLpjy1tvZBdeuDxFeL6/6b0NEkJWczO/HXXACwO7rVrMfGhsvXNg3c8ECz77i4j7S52tWk/3CQQNCK+GDn1SMg9er+0NKKC4OQi2rvWi5ffsHWOeW7gAUguiDWwEAt44HfnHE8NxP9ui+UbldhiHCcDJAa7CIHE+tXJ19rqz8YmPuDLD7F7qnp6WRsriiVIf9Xki/31p96fLI6f9+o2L2m2/v/a/tO3Kr/P4E7fC/N00kQGvo1DI1JdqvJVbxF4zdU90Go38eOrTpscVL+1yvrskSfn9CN/vVl70sd6MFXyx5CDb6OkGq8DX5ZAAAIGgk8/wyDwAAorjrH2if1f/V5AfHPNCm9e5wXRwklKVuBAJtnly2rNprWjUAt8r69WFXANqlpGa2cjjKSIiQ9y3Es5unBGpq1MmKyi6bbtwYgl6vTtgO/3uwGwBTHI6Kdikp6dF+PbGKEwB2V/ZkP4EofrJpc/6X3isY7zdNFyrFzX4NQIDgAA0+kvBUyXQ4ZaZDEgaadjIACZWpEarOtwbl8wIKcbfZufbFQYYQxt9nzujSIynpjHI4Qn48UAFIGQhYB6uqe/962/YdAlHoBpw+QAAkAMpM8mR0SE29hoYBQmCzvhegMRSAFEpp4fcrDSB41f9BKASBlNA2KbmoTXJyZrRfT6ziBIDdkSJSUghZY5rVTy9fufV/9x/IE4GAQq2JS7MNpwAhGU04b6bCJ4tnQKV2gROadnEQAQBodceTALezR8umezzpr82eRWkOR4mWUoT8eCCRRJ9Pv7B377BrVVXXGzokSBNpiSh7Z6SXgBARvCQ3vmgiwUn43SERoZSQ1SKpwmMYnmi/nljFD3L2AZbWlkSU58vKL856e/75RefPj5F+Pzf7NZEFAloKP2z2t4PPlz4EEqnRJwOQkAwpCDxtSsCRlAxE9/2D7KbAXpkZ3f42dcpZISVpIUQoy+wEgKgUVUuZsuzkqeMAtRdENdCwtm3NRJsGyEIHhSBAhIFt2pRH+7XEMk4A2PvYk/22Xrp8YNrbbzv2Fpf05Wa/0LEvDnqjug/8oHw8JKO/UVUADUTgIDSyRhcBIBIpBfVIzuymwAe7dhn2h0kPbHE5nH6UMqRBFoUgJKDNly45AG5dW1wvtbnIoKysNAgESGktQ310kTV/pDUCAAxp29YR7dcSyzgBYAAQHMJinyv+9+HDm+YtWNjrWnVNW272Cz0FAtKED35RPgr+Wj0EUhp4ZwCBVC6DDL/Zotzo8bFeAAAoZP3LwbV5Qp/MzAyPAB8RhbTZThMJ0grPlZe3AmhYAiBEsJmxX+vMzq1dziKSEnkmAGsIBCCFKIXPp/pmZvD+/z1wAsBAE2kEQIEofrZlS/6z698b77csF1oWN/uFCQFACwzA/yt9ANZ5u9b74iANUjmkkogAcvhzRzGpbXbwiuD7r/6JiBSRMhCNhceOb50xf2HHsoDZErSGkG/tEEG133TZ5f/6ngZAANREOtXlSh2SnX0OHQ4QyI2ArP4QkUBKaJOcfKNbWlrHaL+eWMYJQIJTREogihrTrP7U8pVbfrV3fx6apkatSfPvR9gQIEgk0CTg6ZLpcMRsDSnCD+Y93nICYSU7tRSO5CoY9cftRsfpo4GUArj7EUCbJtKIiBJR/nb7jvxn1qwdUxPwJ6NlUVj6OhAhxen02at/bMDPsJOG8e3b13AfAGsogajRMGBYdvZ5t2G4m3xTZTPGD/gEZjf7XSgvvzRv/oKzC85fGCv9fouIkJv9wk8DggctuKGS4WNFM+GKlQIthRcIECwQYIEABQIsEgQgVHIyGCqp03mR+/pFo8OUUUBKAd6/9G8neQFLBb60bt3Gn+7anYdKaVQqLMFfIGqUkrqmtSoDCB4nbeB/LwAA8jp1bIuBgFZacxWK1RtpjYAI49q38wM0/PcvkXACkKDsZr8dV64cmv7WfLGzqKS/9HktS2uDoKlX17H6smovDjpsZsK0G4/DkpqeYICCVOGFVOGFFPRSquEDlxOlypi8XeT92yPS+/cBbVn1Cf52kne9uvrGY4sXH/nnydMThNerSOuwJXmkNRIRTuzYQQHcuuSnvjB4iot6Z2Z27dmq5RlwOJC3AVh9KQAp/H6V27FjDkDwXoxov6ZYxc1dCaZus9/bR49t+fI76wf7lE4SVkBZgPz7EAXB2wNNOGW1gieK5sJI5xWY4L4MnY1yLRDxBrSgD014eku3Hg+OAwAAUgqEcd/Pyk7y9l+7fuypVas9Z6urB8tAwLLC+L0XiJoMA9MQSmb06NYXoOEPYERERaQcQjgmd+ly+fjho92FUprnT7D7EQBaOxyiV6tWp3ukp3chAEJe0NwVP/ATiCbSAlFIRPmrrdvyf7ZjZx5ZCgRprQA5S44iVbsdQACwPdAONvs7apAgBAr6++SHtnTr0W28puBkxvut/InoZpK37OSp7c++806fqoCZKkxThTP4AwBIAGU5nY6vDBt6MNOTlKuIlMTG/27N6tEj7Y/79pFSStajz5ElOCGEJsMQ07p2ueKQomdTf/+aO04AEoT9RfBZlu9r77yz643TZ/PQsjRojboh57RZ2NjzAFIxoMhpyCTDqP7TlEkHZ/XoNp5IWQhC3q/bv26S9/sduwp+uGVLLmgNQuuwn+hwIJqWx+PIzczY8+ywYWM1kRaN3GYUAIKIaGjbrN49U1PPHq+s6iosi6sA7J6U1lIEAmp2zx5ZABCcK8GJ411xApAA7FLw1crKa59avfbalsLC8TzZLzYZiJbldBvtk9yXX5w+rXRkTs7o4Ocn7/tdVVorKYQ0lTK/+e572149cTJXaK1JqbAneYYQluV2O0ZnZBx4Zfasrg4pHPbJg8b8eYiIltaWU0rn7J49L5zYf7ArbwOwe6ndfhK9W6WeHti6TU8A3v+/H/4yNXN28N977drRGfMXBLZcvz5YernZLxYZQljK7TZGtc48uOrxx3BkTk5/+/O7339r391QWFNT9OiixYdePXEq2OynVFhPdCARSUSl3G7j4U4dty54ZF73Vm53K7sS0ZQ/2/7vH+vTu4MR8Js8FZDdCxIRGAbM6tHzihTBsdfRfk2xjhOAZurm0BchjCUnTmybvXBRh7MVlR2Fz8eT/WIMEpFA1MrlMh7r0nnLokcf7tY+NTXH/vzu99/bnf6Hbtw4MePNtyo3Xrs+RPp9VrjvhxcAmoRA7XTKrw3on//SzBljkhyOpFAEf4BgAqCJdO+MjG7j27c/CC43hvryItY8IABpAOEwzcBjvXt1BGjgCOoExYGgGbq5Dwwgf7djZ8GPt27LJaUisg/MGkYAaC2EIIcDvz14UP53x43NA7h1K969/lsiIg2gDSGM1adP7/j82nU9y0yrlbSssN/dIAGUMgzpkob/17kTdnx84IA8u+QfygevfYTwk4MGBPKvXQvVH8uaGQGgtcstc7PbHuiRnj48VEloc8cJQDNjN/tZWltfX//u1tdOnMxFpTREYB+YNYwEUNowpFsK3+8mTdr94X596x1Eb072A5B/3r2n4HsbNk4kApRahb3T30C0lMNhZLldN/42derliZ06TlBESgCIUB+5spsBp3TtOqiT23XxvNYduBmQ3Y4QEUjDU4MHNWr2RKLiL1EzYpeCC6trih5ZtOjgaydPTZB+vxXOoS+scQyBlna5ZNvk5GuLH374xIf79R1nT+y7XxBVOvjvaSL97ffyN3xv67ZcUPZxzvBWeAyBlnK7jcGZ6UdXPvZYzcROHYfYv3eNbfi7F3smgMcwPF8ZOfIcSAmhvLiIxT+BqMEwsEeL5DOTu3YZQkTU2NMniYYrAM2E3Sx28MaN40+tXO06XVU1RAb8lqV5vz+WIABJIZRyuYzBLVsdfXnW9BadW7UaWN9mP/vfK/Z6Sz6/au3pdVevTBQ+n9JEIpx3N9zqU3Abszp02P6HKZN7t3S7W9b3dTdW3UuErlZVKVCqdrXHOQALQiLShiE+PWTIJacQXcP9O9mc8JsU5+ruA684eWr759a906fKNFOFyZP9Yg0SkRBCK5fLmNepw9Y/Tp06MMnhSG5Is58hhHG0qOjU0ytXwbHKqhHS5wtO9gtjgadus98X+vcr+O/cibkAwWOHYQ3+ADcbWX+5dVv+r/buy0Mu/7M6BKLWQopsQ159om+fwRRMsLnPqZ44QMSxuvvAf9i1q+D7m4JDX6TWiif7xRa72U87nfJrAwfm/2DCuDyAhjf7rTtzdtfn167rUhwIZAi/X1kY3iRPAiglpTSktH4xYfyWZwYPyrVvVwvng7buKZZfbNma//M9e/OE368UEf9es5uQNJHTLT4/bOiJVJeryZMnEw0nAHHKHvpiaW196913t7x87GQuWhYBESj+AsQUu9nPKUTgt3l5Oz42oF+jmv1e3L9/w7cLNo61lDKkUircn7MhhKUMw8h0OIr/On3quUmdO0+82ewXxp4SCh7p0oYQxs+3bM3/xZ59ecLvV7zyZ3XZq/+2Qlx7csCAwQTAe/8NxAlAHLJLwYU1NUWfW736/LvXbkwUPq/SQIKb/WKLIUSwY97puv7ijGnXxnVoP75Bw30QJRHR9wo2FPz54KFcCASCe/Fhb/YTlnK5jD4tUk6+NHO66J2ZMSwSe6t2tUMiSjv4SzNgKa15aiV7HyQicjrF18eMOtHS5ZrIq/+G4wQgztgP4cOFhSeeWrHKOFlVNezWDW/8fIwldhAd3Crt6IszpiZ1TUsb1NBmvwq/v+Jzq9ceXXX5cq69Co5Us9+UnLY7/zJtWvc0jzutvn0KTVG37B8M/rfK/hz8WV322N+eHveZJ/v3H9mUeycSGScAcaLuPvCa02d2fm7tuu5lppkmTdPiyX6x5Wazn9ttzOzQbtufp07tn+J0tmho8D9VUnru6RWr/AcrykdJvz/8zX6ImgBQu93ys717F/xsUu4E+7hhuFdWdX+/f7Z5S/6v9u0Plv215qoW+wAEIC1Q/HDihEKXYXS1j9BG+3XFGw4ccaDuPvBf9uwt+N6GjRM0kZAq/ENfWMMIRE2IqJ1O+aX+/Qp+MnFCvTvm666AC85f2Pvp1WvbF/p9nUUgEJFrfJUQUgihfz5u7MbPDBmcSwAUiYlqdf/e/7N5S/6v9u671fDHsZ/dRgIo7XLJKdnZO2d07z6KS/+Nx8Ejxtm/3Epr9Z8FGza9cPhILlhWRPaBWcPYQdQhhPnLiRO2PTVoYO7N5O0+HfMUvLiUDCGMVw8c3Pit/A2jAlo5hWWpiOz3G4aR7nCU/GXqlNNTuna52ewXieD/vpX/3lsrfw7+7HYIQCQlegCqn3sgrzURUainTyYSTgBimB38S7zeks+vWXt67ZWruZEY+sIaLjge12m0cbkKX5j60MUHOneq93hce5WNiPijjZsKfr//QC6ZARAAkWn2czqNXqktTr8yYwb1zswcEalBKnUb/n5WZ+WviZtZ2Z1JIZRyuoxvDR+6q3t6Gh/7ayKsO2mLxQ77IXy8qPjM02tWW0fKKnpKn4/3+2OQIdBSLrfRt2XqiZemTTN6ZWbUexqZ/QCr9PsrP79m7eEVly6PFl5v2Pe+7T4F7fHIydnZu16YNqVruseTHrHgX7u9IBHlc5s25//a3vMnEnxNNbsTu/Q/LC3t8Jr/+EhvBEAMTovm35dG4mASY+qWRNefPbf7c+vWdSry+TO52S/23OqY9xjT2rfb8acpk3ukeTz17pi3g+3ZsrILTy5fUXOovGK09PuDn3OYm/1ACNBOp3ymV88Nv5z0wHiBKJQOf6c/wPtX/s9t3pz/6/0H8qRpWopIcvBnd4JEBIYBboCa/5s2xSkRpQbQXP5vGg4oMaRus99L+w9s+FbBxrGWsgxu9os9NzvmXW752T69C372wMQJAoWwBzTd77+3k4SNFy7u+/Sq1dnXA4GO0gyE/e4GeyKhlEI/N3ZMweeHDsklouBqXIS/lGoP+ZGI8r83bc7/zb4DecLvUxz82b1IKZVyOo0fjhm1s29mJpf+Q4SDSoyoGzi+X7Cx4I8HDuSCGaBI7AOzhrnZMY+ofz4+2DGviXQwiNaj2Y+IJKJ8/dChTV97N3+kqbVTWFZEOv21wyFbOR1lf37ooRPTu3fLjVSzH8D7V/7/vWlz/m/2H+AhP+y+JIBSLpcxPSdn++eGDr35Oxvt19UccA9ADLBLwZV+f+Wza9cdWX7x0qhI7AOzhrM75tMcRslfpk49PaVrlxH1HY9b90jdTzduzv/t3r15ZJrBVXmYx9waiJZyuYzuyS3OvjRjWmBAVptekbw1jQDIPgr5040b83+7/1Ce8Pt4z5/dkwDQ5DBE+6TkS/kf+2hSuseTRsGtN04AQoArAFFmP4TPlJadf2rFSu+B8tqhL2HeB2YNZ0/269Ui+fRLM2ZQ39b175i3S5bVgUD1F9e+c2Dx+Qt5aJoatEYdxocZEpGUUimXy5iQ1Wbv36dPa98mObl1RIN/nb6Wn27cnP/bA4d45c/uy973d6LwvzRzelmGx9OeS/+hxQlAlNR9KG68cGHfp9euy75e4+0kLcuytObPJYbcbPZzu41Jbdrs/uuM6V0ykjzpDW32O19WfvFTq1eX7youHSP9vrAneUhEKCUpp9P4eM8eG3896YFRTimdkRjra6s75CcY/A/kCZ9PcYLL7kcahlIOh/Hr3Ak7RuTkTIhk0poo+M2MAnvoi0SU/zh4cOM33isYFal9YNYwdcfjPtOr54ZfPJA3Tgoh69vsZz+0tl26dOCZ1Wszr3i9/WUgEPYTHQJAaykFSYk/Gjmi4KsjR9xq9ovQCqpukvvjDZvyf3fwYJ7w+XjID7sve8vqy/36FXx8wIBcDv7hwT0AEVZ3H/jHGzfl/27f/jwKBCKyD8waRgIoJaUEAPjZhAkFzw4fmkvBL8x99yDtJE8AiDePHN381fXvDvEqlSQjMNlPEintdMoWhlH5h8kPHp7bq+doe1Z6pI5N1W34s4O/DAQsSyl+iLN7MhAt5fEYD3fssPWlWTPHROIK6kTFCUAE2ftXVYFA1edXrz20/OLF0faKiPdCY4sEUtrhkikOo+KFqVOOTe/WdWRjmv1+vmVr/s937c4D0wRBpMM9wdFeOXXyeC6+PHNG1ZC2WX0ivXqqO+Tnxxs35f/uQO3Knxv+2H3YfTZjW2fuW/joI32cUjoBAPi8f3hwAhAhdYe+PL18VfW+8rI+0u8PNkLxL3dMscfj9khpceblGdOtfq1b92xos5/PsrxfWbd+z1tnzoxDn0+T1hjWyX4AJIVQyuUyxma23v/3GVOzslNS2kY8+NdZ+f9ow8aC3x88lCsDAUspxb/n7J7s5HVQWqujix55uG2ax5MWicuoEhknABFgP4Q3X7y0/5lVq9pe9weyIjH0hTWM3eynk5JkXlabPX+bPq1TZlJSRkOv8b1SWXn16VWrCrcXFg+Ufn/YmzqRiFAIIrdbfLhbl02/mzx5uMsw3EqTisRwH1vdlf+PNm4q+P2Bg7m88mf1IQGUdrtl79SUU4sfeTglq0WLLA2g+bx/eHECEEb20BeBKP59+PCmr77z7gg/kSsS+8CsYZCIABHA7cZP9uq18VcPPjDGEMKo77EjO/jvvnrt8FOrVqVerPF2kAF/2JM8eygRSgnfGzki/5tjRucBvH8bIhLqrvx/uGFjwf/xyp/Vk4FYeyFVyukFDz/saZeaklPfJlvWNJwAhEndB/Bzm7fk/3r33jwyAxHZB2YNIwA0SSkAEX4yblzBl0YMa1Czn9ZaSyHkouPHt35x3bsDa5SVLEwz/M1+tZP93AJrnp88ed9jfXqPVVorIUTEmv0A3r/yt4O/8HqVBuCVP7snu+zfOzXl1PyH5yW3S0nJjnTlKpFxAhAGdYe+fGXtO/sXnD8/NhL7wKzh7CCa4nRU/OHBSUfm9KztmG9gs99vd+zI/+nW7XmkFAitI9Ts5zTaeTyXX54+vXRETnb/aByVqrvy/0HBhoLnDx3JlQE/r/zZfRmIlnK7jSFpLY/8a86cjLYtWmTxoJ/I4gQgxOyH8MXyisvPrFxZurOkrL/0+3i4TwyyVx9dk5POvTh9mndw27b17pi3H1QBpQJfe2f9jn+dOj0e/X5NSoU9ybM7pUdlZBx8aeb0zJyUlOyoBP86K/9g8D+cK3zBi30i+TpY/DGEsJTbbeS1brPn5dkzurZyu1tx2T/yOAEIIfshvOPylYPPrF6dfqnG2y4SQ19YwyAQSREcjzu+Tea+v06blp2dkpLV0Ga/a1VV159ZsfraluKiQaKmJuwl/7rNfh/q0mXz/02ZPMxlGO5orJqCQ4VAS4Hyvwo2FPzh0OHgnr9l8Xhfdlf2dEpyucQTXbtufn7q5JEOIR3c7R8dnACEQN2hL28fPbblK+++N6jGNJO52S/21A2i/9Gj26bfPDhphEsaroY2++27fv3oUytWJp+r8Xa8eXdDGNnX+KJhwLdHDM//TpSa/QDeX/b/fn5BwR8PH8mNxGkHFt/swVooBHx31Mj8b40elQcQnd9hFsQJQBPV/eX95bZt+f+zfVceKSsi+8CsYewgClLC90eNzP9GAx5AN8foCiGXnji57fNr1g6o0TqyzX5S1vxu0gN7n+jbZ5wm0hhsUojoartu2f/7BRsK/njocC7Ps2D3YwhhKYfDaCmN8t89+MCReb16jonW7zC7hROAJrBXjX7L8n31nXd3vXH69Hhu9otN9nhcj5TVf5j84IFHevcaU9/xuHUThN/v2Fnwoy1bc0lrkFqHPfjbR6RyPJ4rL02bWjyqfbsBltaWRJSRHo1ad+X/n/kFBX+qXflz8Gd3IxA1AAC53WJoetrh5ydPdvVtndk9Wr/D7P04AWikOkNfrn1q1ZrrW4uKBkkfN/vFIkOgpRxOo6Mn6dLfZkwtG5mTU++O+brNft94973tr504OQH9fg1EEO67G+xmv2Hp6YdfnD4ttVOrlh2idSlK3ZW/HfyFz6s08VE/dmcGomVJaaAQ8Ey/vht+mjtxhMcwPNzpHzs4AWgE+yG85+rVI8+sXpNyrrqmgwwEOPjHmLrjcUdlZhx4cfr0zHapKTkNbfa7UV1T+JlVqy8WXL8+NBIrXiQiIYTWbrd8uHOnrc8/NHlgstOZHK0HZ92ZCLzyZ/dTd9XfweO++LOJE67M6t59FADv98caTgAaIDj0hbQUKJecOLntC++s719tmi0isQ/MGqZus9/jnbts/r+pk4e6G7D6sIP/wRs3jj+9co3zVFVll4g1+yEKdDrg64OH5v/XhLF5ANF7cNZd+X/vvYKCPx85wkN+2B3dHKXtcEgAgP/o3WvTDyeM7906KSmTb/SLTZwA1FPdB/D/7tiZ/5Ot2yI29IU1zM0g6nDAt4cPy//O2DF5APVt9gPSEAx4q06d3vH5det6lptWK+H3KxXm1bcEUMowpEsI/28eyNv5sQH9x0ezUeoDK/8jR3N5m4vdDoMnoLQSQqLLBQNSWx7/r/FjKx/q0nk4wK1ttGi/TvZBnADUgx04AkoF/t/6d7f/8+SpCej3aVLc7BdrJIDSwSDq+/3kB3c3pGO+7r/3p917Cv5zw8aJRIQRm+zndBpZTtf1v02fcnVCx46Do9ko9f6Vf37Bn48c5aN+7H3sLTaLyEC3G9KFKPnisKEHPj9k8Ci3w+HRABoBuMs/hnECcB928C/xeks+uWzFhY1FRYOlz8f7nzHIDqLZbtfVV2bMKBrZLmdAQ5v9lCb17fz8zS8eOToRA4HITParHYk6KK3l0RenT/d0S0vrHK1mP4D3H3n8Xn5BwZ/5nD+rwy71K0SJbje4lVXz1KBBO784dGivnJQWbQF41R8vOAG4BwIgIIIyv7/skfmLru0rL+tj+HymSeSI9mtj71e3Y/7lGdNbdWiZ2q6hwb/Y6y353Oq1Z965enW4qKkJXmMbxuB/s9nP45Ez27fb/qepU/qkulyp0Xx41l35f+fd/IIXjh7L5VHW9WN/nvYJkeZWHRSIGolISSnR6YRkoqpHevbc++zQwdm9MzO7AwS/S7zXHz84AbgL+8wzEdHjCxYdyL9xYygH/9hTt2P+0S6dtjz/0EODPQ5HUn2DqP3vHSsqPv3JVavpeHl590hc4ysQtQYQ6HTClwYOKPhJ7sRcgOh2Sde92ZCDf8MgEZGUiA4HACKQaYJUSgEAxHPDpL3aJ0Qkh0OAlJApZdFH+vY5/PSggV07t2zZAaA28NdjpgaLLfzFvgt74MnPt27Lzy8szOPgH3sEgtYohHY45DcGD8r/z3HBjvn6Xipir3SPFxefnrdgUYvrAX9WJO5ukABKCSENIaxfTZyw9alBA3MJgIJ/p+gdkSIikkLI76x/r+CFY8c5+NeTBFDK6ZTpUpb89wO5R3ZcvkorTp/uU6RUJhABBQIgiYLJQBxUBuyVPiGillJop1OSZcGQ9IyjH+nft3Buj+69s5KTcwGCgR8BkMv98YkrAPdwqrT03PjXXm9rKuXQyhIEsf3FTSQ3m/0Mw/vbB/J2f7Rf3wZ1zNsd7jWmWTPptX/dOFlT3TUSwd8QaCnDYWQYjuK/z5h2Pq9zp6HRnopWt9u/bvDnPpf7s8c0tzIcpW8/MvfK8OzsfgAARV5v8epTp48uOHY8aeulS338DocHiIKVASIFRACIwYQgyu+xvcoHqE1QHI5gJUNryHa7rkzp3OX0w716tJjQocMgO0G1Az+f6Y9vnADcw1fXrtv46qnTE/joU2yxm/3aejzXXpw25frY9u0HNTSI2qX/n27cmP/bQ0fyZE1NBIJ/sE+hb0rqiVdmTXf0SE/vEs1mP5u97fDNd97d8OLJkxMNny8QUMoZzdcUD+xjm5lud/Gbc2dfG5ad3c/U2hQAom4F6kJ5+aX3Llw4u+r0Gff2S1e6l2mVBlICKAVkmiAAtEC8OUKctEZAhFAnBljb04RC3Az4Sil5c+tCCCDThHZJnisTOnQ6O717V/lAxw59U12uVPvPsLS2pBCSS/3NAycAd3G1qur62JdfdZZZViuwLIj1sl2isIPokLRWR16aMT2lc6tWDR6PSwCEAFjs9ZYM//tLWGaarUCpsH3GNwekJCXJ6e3abf/z1Id6t3S7W8ZKp7SdALx64MDGb+RvGKOUEmRZfMT1HuwKVJrLWfLW3DlXh+fk9Kv7e2g3U96+L369uubGnmvXzm24eNG7/eLl1kdLijp7AZPQMIJ3iioFpBSA1mAIYQEAkNa3Pod6JAZ2oL/5PwtBpDUqAAlCAEoJYAS/LmRZkCZEaZ/M1hfGdmxf+kDHjmlDs9v28BhGkv3fq9rtC27ua354VXsX686cPVGm9QSwLOIHYfTZzX7K7TZmd+yw7Y8PTe6X4nKlKCLV0BW0vfe//uy5o2UA44TWYRvyYzdQaadTPtu3b8FzecFmv/r2KUSCQBSaSH9i4MAJSQ7Hls+uWz8atAYBpDXxkKvb2cE/3e0ueXvu7GtDs7P73Z6E1t0X10TaTgaykpPaTO/Wtc30bl0BAOBSRcWVYyUlR3ZfvVZ1sLDQfaKoqM216pqMikCgpXK5jGCsty8ch+D/X2u407rNfkwRIoAQ9v8y+GpIA/h8kOpwlLdPaXGjf+s2N3pmpJsjcnJa9s5Ib5eVnDyo7p+ltFaACAJRxEKSysKDE4C7KDh/QaIQhIiax/xGlx1EldMpv9K/X8GPJ0642THflIfT7mvXFApBKASB1qF7wbUkgNJCSENK62fjx2359JDBuVS75R4rwd8mEIWltfV4nz5jEXDLZ9auG02WhUiaE+A6BIDWhkOmu10lb82dffVOwf8D/w2isPfK7coAAIBElO1TU3Pap6bmTO7cGQCCv9NFXm/x2dKyg1eqKquuVlcHLldUwuXKSmdxjc9dY/md1abp8lvaSaTRJJK1P0O7hLQcQlpuhzRbulzeTI/bl5nUwuzQMhU6paa6s1NatOiQmtqmdVJSdwToUfc11n1dt29hsOaLE4C7OFpSkqmVQoGIwLskUWN3zDulEfhV7sTtnxg4INdu9mtsA5Jdkr1YUeEirfF9JdYQQSLSbrdMdzpK/jp1ytkHO3eeaJ+RjtXGKUMIw9LaeqxP77EAsOWza9eN0pYlUHMSABAM/uRwiHSXq2T+3DnXh2S3vW/wv93tHfOaSNtJoZ0otElKat0mKan13f4MS2sroJSfoHalDggIgA5DOhxCOOp1/FVrRQBkf4+4kz8xcQJwFzeqKzNqS20J/+CLFgOD1/i2djmK/jZt2oW8Th0n3Gz2C0ETkqXCc50vAhE6HNS/VdqJF6ZPkX0yM4fFQrNffRhCGKZS5mN9eo9FgC2fXrtuNCcBN1f+ItPlKn4rGPz7huIzvZkM2uV7IgJE0Fpru+h/c9+dCIQQwhDCuNfPtSc5vu/PhGDyIYQQQAS8wmcAnADcVXVAuYEo5J24rH7s8bj9Ulsef2nGVEfPjIyhoQqi9kM2I8ntD8fJThSSHNIwfz95ku6TmdkroFTAKWXcdNU7pHRYWluP9uk9FhC2fHb1ulEKLCEAtKbwJE2xzN7zz3C5St6eO+dGqIL/ndjB/o4B+rYk4QNqK5WI+P7V/O3/buLmcew2Cfdlri+XIc1ov4ZEhEQkEZRyu41p7XN2LH/8kayeGRldG9Psdzf2yqp/69YKEAGFCO0eDxH4lXJ94933dIXfX+GQ0mH/zHhhbwc82rv32BemPrQdhAAKnvsOfbNEDJMASjkcMtPjKZo/b871Idlt+0S7mmPPuvjAP7Wi9bpY/OEE4C4y3Z4yEAKQj0lGjEDUIARop1t+vl/fgn/NmTOildvdqqnNfnf4OQIA4MEundsJv18prSWGMEBrIiEsU+8pL+/37Jo1RxAANZGOtyO3wSSArEf79B774vSp26TDqSi4Z5wQSYA95CfD6Sx5e+6cwlgI/oyFEicAd9E9Pa1QSEmJ8rCLttqOeSGk0L+eMG7Dz/Jyc2vPPFOom+bsY2+9MzK6T+7UaQ+43SgAQvo5awAhvV5rxaUro39QsKFAIkr7PHU8MQQaltbWI717j/nrlAd3ohSUCEmAvfJv7fYULnh47vXBbbM4+LNmhxOAuxjTvl0NASD3AISfIYSlnU6Z7nKVvDV37t5nBg+aqGrHpYZ74tgPJo5v6VAqQFJiqKs9FpEhfT7r+QOHcl/ev3+jXVYP5c+IBPt1P9K795gXp07dbhiOZl0JsFf+rd3uorfmzioa3JZX/qx54gTgLqZ169bBpcmrY/TIVnNhT/brldry1KoPPV76YJfOwyMxG18gCkWk+rVu3fN/ciduI4dDSMMI+QpdKSWFZapvFWwc/d6583viPQl4uHevMX+dOnmnEEITYsgrJ9F2K/h7ChfMm8vBnzVrHNzuoldGete8jh0OossNEiDuSrexDolIQrDZb0pOzs5VTzyW0Sszo1som/3uRyJKS2vrmcGDJn62b+8C5XIZ9vjVULFnu5tKOZ5ZuarzieLiM4YQRvD8dny5mQT06jXmxelTd0jDUIQY8spJtNjBP9PtKnp73uzigVltenPwZ80ZJwD38OWRw12gLD42E2ICUQMiaLdbfqZX74J/z509LM3jSYvGbHx7b/7nkyblTm3bdkc4kgBNJKRSqtSy0p9ctoLKfL4yKYS0J6/FEzsJmNer15i/T52yUzocCoSEeN8OuLnyd7kKFz48r3hQVhYHf9bscQJwF0prNbZ9+0GPd++2WXs80kCMu7JtLBIAWgsh0OGg/xkzuuAXD+blohAY6k7/+rKPVBEQ/W3WjD59UlqcUA6HEeqqjwKQ0rKs49XV3Z5evuK0JtBUK5Q/JxLsYUHzevUc8+LUKbuEFFoHp9jFZRIgALR2OGSbJPeN+Q/PKx7Qpk0vDv4sEXACcBeIiJpI/8+kSX06u10XlGEYzW2/M9IkgCKnU6R7PKX/nj1z9+eGDc21m/2iOR5XIAoioBSnM+X1ObPdmQ5HkTYMGeqAZmltSL/feu9G4bBvvrN+kxRCKiIVj0mAPSxobq+eo1+aPm2nwzDMeGwMlACKHA6R6XIWzZ87t5TL/iyRcAJwF3ZAyvC401+aMb06ScpqMAyeC9BIhkBLezyyV6uWp1c8+kjx1K5dR0Si2a++7KbALq1adXx5xvRLDikD4ZgDYWltSJ/Peun48Yl/2rW7wBDCiMfjgQC3tgPm9uo5+sVpU3cLEV+VAPuoX1aS5/rCRx7mlT9LOJwA3IN9Q9qQtm37/OmhyQcJUQgpNCcB9Xer2c9jTMrO3r38sUdb9Wmd2T0WH7R2U+D4jh0G/zYvdwcZhpCGoUJ9G5TSWopAQP3npi0TV50+vSNeTwYA1CYBRNacnj1Gvzxj2k6HlHFRCbD3/Nu4nIVvz51TxsGfJSJOAO6j7irnB6NH5WuXW0op43LFFmkCUaOUpN1u+VTPnhvemDt7YGZSUkYkO/0byv68Pzag//j/N2RQvnK5DClESD9vAkCtlACt4DNr1/U+cP36sXtXAohIWxaQuvXP3S6FjwIDg8OC5vTsOfrF6VN3S0PG9JyAmyt/t+f6wkceLuXgzxIVJwD1YAeFr40amfdk964bldttcFPgvQkArREFCSF+OnpUwW8nT5poSGlEq9mvIexKwPfHj897uGOHrcrlCfnnTYgotNaVASv1yWUrk29UV9+QiB88GUBKASCiMAxAeesfEAIQEUjHRJC1vyNzevYc/fK0absMQ1qxmATYK/+2bs/1+Q/PKe/fpk1PDv4sUWE8NiBFAwXv2iKltXp0/qJDG29cHyL9fssi4gfHbSSR0k6nbOlwlj//0KSjs3v0GK2IlH3veLRfX33Yd7R7Lcs79+3553YXl/QTfr9SACFNXiSR0h6PHNu69f6Fjz3S2yGlI3i5i/21RCRfcRFc33TcKjtpAgCgOxNF62GtRfqAvsF/R2sAERPJvB1Ml504ue3pVWuGmcpyCK21joHFhh38s5I81+fP5eDPGCcADaCJtEAUxV5vydQ33qo4VVnZWQYCIQ8K8cxAtJTLZXRr0eLci9On+uL5PLX9eV+urLwy9c234FJVdY6wrJAHMwPRUh6P8dGuXTb9cdrU8UorUwrpAACwjr9SACdf6GtYxa1B1qZPisDvIxBthu8X/b8hZOthA4CUApQx8Xtof94rTp7a/smVq4aaSjkEUVSvEr4Z/Hnlz9hNnAA0kD2s5khh4cmpby/IqvL7U1BrSsR70utCIpJSKuVyG+Nat9734oxp2VktkrPi/SFrf967r147PHvhos4+0/SAUhDqzzs4EtltfH/owPz/N2ZsHumA39z1w53OawvGB3wEphLq1oXvAKBJJichmlqYYuTze2T7h0aBVhYIGRPvtf25Lz95cvvTq9cOCZimM1qVAAmgtNMps9yu64sefrgyVptQGYs0TgAawX54rDtzdtcTy5YPRaVIKyUoBo6zRQMSEQpB5HaL/+jebdNvHpw0wmUYrmhM9gsH+/NedPz41qdXrxsjtbKUUjKUF0UhETkkUhl6xFuThmyYV/EXD5RvG1FdRRZpLQXSB34WgbAckgyQ7hqZ96/zMmNAn1iqBJhKmQ4pHctPntr+VJQqAbfK/u7r8+fO5ZU/Y3VwAtBI9kPkb3v2bvjWlq0TZSBgKa1DGhTiwc3JfkLAf40Znf/1USPzAG6Vz6P88kLG/rx/s217/n/v3pMn/X7L0jpkQcQAgmLtgtHOa/RKzjvYyyiESr/UEvQ930MNQnscJJQ757Ix6S0pkrLaxmJPwIqTJ7c/vXrd4IAZcKLWFIlKQDD4O2WWy3V9waPzKvq1bt2Dgz9jt8TEQyIe2Z3inx46ZOJn+vQpUG53yI+LxTpDCIscDpHkdFa/OG3q1q+PGpmntFYEQM0p+APc+rz/3+hReR/p0mVTqO4MQAAQQFCsPfB40glY0eZt7EU3VKXfuG/wBwAQoIU3gMppXW1nbf1iISmfN9g/GBuJvX06YGaPHqNenPbQPkNKSwsR9mFBdvDPTvJcXcjBn7E74gpAE9QOcidExCcWLNy17tr1EaFeGcYqu9mvnct1+ZWZM8qG52T3ay4l/7uxP29FpObNX3B4y43CwcLna3QTqAQCCwRUaQd8M3UHPNdqIyhA8JMECQ37WhJIKzmZDH/GzC2ucf87Nnh8sPaoYAywiCwD0Vh58tT2p1atHuy3LFe4tgPutOff3H83GWuMZrVKizSsBUTwt1kze/ZNbXFCGaG/SCbWGEJYyu02RrXOPLD2w0/I4TnZ/eyxvtF+beFkjyx2COF4ZdbM9p09ngva4ZSN+bwlEPjIACKAP6evhZ+n5YOfJAQaEfwBABCUUeND01WyYmzg4P/lA0pJEBszAgBuDQua0aP7qJdnTN/vdDgC4RgbbO/5Z3s8Vxc/cqvhr7n/bjLWGJwANBECoCbSLV2ulq/Nnu3KdDmKlJQhv0gmFiARCUStXC7jia5dNi959JGeOSkt2iodu5P9Qk0gCqW1ap2UlPnPObN8LaSobGhJ2wANFeSEDOmFBa0Xw2dS9kKldgFBcDugsUhpw1uDCo4/n0eFuw8SCCStYmZglb0dMKN7t5Gvzpi2z2UY/lAmATeH/CQlXVswb25170zu9mfsXjgBCAH7VreurVp1emn69EtOwwjLRTLRJAA0CYHkcIjvDh2S/5fp08a5DMOtibQUibW6sj/vfq1b9/zrtClHUSAgIiHcP3oboKFEe2Cw4wasafMWPOQ5CxXaAxKoyd2jCIRKATgNhMqDfwoIRIGIgurxuiLFTgKmd+s28pUZ0/bfTAKaeNPmreDvubro4bnVfNSPsfvjBCBE7CaxCR07DP5N7sTtwYtkmsedAfaVqR6ns+ZvD03e8q0xo5tts1992Z/39O7dRz43YcIG7XTJezWB1m32ezjpJKxq8zb0MkqgQrvBCOEt04hKWn6lywv3DPtlweoCRUhIBDGZBHTvPvLVmTMOuAzD35TGQHvPPzvJc3XRw/Oqe2dmduPgz9j9JeTDO1zsB9vHBw6Y8LVBA/OVyx2STvFoMoSwtNst26ckX1766CNnHuvTe6yltRVPY33Dxf68Pz9saO4zvXtsuNsdEQIINACUaxd8PXUn/DtzKaSKAFSTI6TB32ZqEK2oRs8/sS/3o8vX7LS0Nu0GxpD/sEay37tp3bqOeGXG9P1up8OnUTS4EnAz+HtcVxc98rCXy/6M1R8nACEmEaUiUj+YOCFvXvv2W5XLbcj4ve/dUi63MbJ15sGVjz2GI3Ky+9sPV4yR7vJos7cDfvHgg+Mmt8nadXsSIEGDnyQoEvB8+jvwm1bvgkWi0c1+9YEAENAoVE3AXHbp0ujPrlq1WyAKTaRj6dSPIYRhKmVO795t5CvTpx10GbK2ElC/JMAO/jlJSVcWPvJITa+MjK6xfNMkY7GGE4AQw+ANaEIT6T9OnzpwaKtWh7Xb3ahO8WhBIpKISrncxmNdO29Z9MjD3Tqkpubww/WDghf3AEpE+ddZ07v1bpF8SjkchgDQBmqoJBekCR+8mbkEnk3ZBZXU9Ga/eyFAcKCGq6oFnDeTHEm+KnPRhUtj/vO9/AI7OQ3LD24kh5SOYCWg24hXZ04/4HYa9aoE3Dzn73ZdXfjwXF/vjIxu3O3PWMNwAhAGCICACEkOR/Krs2ekZbtdV5XhkE1tdIoEu9lPOxzym4MH5v9t+rSxSQ5HUjxc4xstAlFoAJ3mdqf9Y/YsmeF0lkiHFKWWm/o7CmFVm/kwM+kUVOikkDT73YsCBIkmrPF1gRLtAdDKEH6/9afDR3Jf3Lt/g116D+NLaLBb2wHdRrw6Y8ZBl2H4tZR3TQLslX+75OQrix99xNsrI6Mrl/0ZazgeBBRG9vCRXVevHp49f2EXXyDgAa0hVu8MkABKGYZ0G4b3t3m5uz/av994TaSDww4Se7+/PuzPe+P5c3vmrtjQdSLsT32h5SpsI2uwkpxh2e+vywIBKRiAc6olPHD9CShSSeBABUBAQkpNUuL8ubP3TurceVgsBkx7WNDaM2d3PrlyVX9fIOC5/QKhm2V/j+fKwkfm+eyyPyenjDUcVwDCyO4UH56d3e+PDz24HxwOlA6Hqs9xsUgzEC3tcsmc5OSrC+fOOfHR/v3GW1pbdok72q8vHkgEobW2JnTqPHRxn6tH3sxeJTKNgKoKU7NfXRYISBV+uKaS4MmiGXDFSgEnKiBAIEQkIiStxdMrV3U7UVxyxhDCUFrH1HaAPSxoStcuI16dPu2Q2+HwaXnrdIAd/NsnJ11exMGfsSbjBCDM7PLmI717j/nPkSPylcMZc3cG2JP9hmSkH1nx2KPm2A7tB3GzX0MR1c6GlP49zxVMLP3bSB2wtFejEa5mP1sw+Ptgf6ANTC98HLb5cyBFBEDXyds0kUCldLmlWn186TIo9fpKpRBSE8XUtpT9fZnareuI12bOOOR2OL0khHAAmPbKf/68Of6etWV/Dv6MNR5vAUQAEZHdQPf5Vas3vXHm7PhYuDMAiUgIobXbLed26rj1+Ycm909xuVJ4VdVQweBPZlWlteMbRxzF742qqiZC0GHNnggANCCkCB8s9/aEzxRPhWLthhQMgHWX3N4QwlJOp/FAdtbutx5+ZBACYe3AoJhK9G5euX323K5PrFzZx4siuYPbdXHBvLlWj/T0LrG4hcFYvOEEIELqXiQz9835R7YWFw1qykUyTSUAtEYU6HTCVwYPKvjRhPG5AM3vGt+wC36sBKQsf8GnD7qqtw6rrkYTteUI54/VgCCAIEkE4P8qhsN3ynIBgcCNFqj7FPYMREt5PMbTPXts+M3kByfGajC1X9eq06d3/M/OnakvTZni7p6e3jlWXy9j8YYTgAiyg2thTU3hlDfe9J6rrOooTDPiSYAEUEpK6ZQy8Ou83O1PDhwwgZv9GomUApRSnfjHBnniuYnVVRhAspzh/JEKEFwY3EX6dmku/L5qGKRioHbgUP0+vuCMB5fx05EjCr44Yniu3YAXztfdGPZ3xlLKMqQ0OEFlLHT4ixRBdS6Saf3arJm+ZEM2+CKZpjKEsLTLJdt4PIVvz519+MmBAyZws19jEQEIQdoMBE683l6ZoAHCu61jgYAWGIBy7YIPF82B31UOh1boBwSod/AHAFBKSeH3qx9s3jJx5clT2+0GvPC98saxZ2pw8Gcs9PjLFGH25Lj+bdr0fGHKlCO1V7ZTJC4Osld9A9PSjq380GPVuZ06DeFmvyYgIkBEqL54WVed7RzwKQFEYXsfg81+XjhsZsL0G4/B4poekCG8oAEb3GZIiKiVEqQ1fHbtur77r18/ZghhxNqgIIBgEkDBmyj5ecVYCPEXKgrs44Eze3Qf9dz4cRu0yyWlDN/FQTcn+7ndxvT27bcve/zRnO7p6Z15sl9TBZM27S2qMFALguCNfCH/KRAs+6cKL6z1doNphY/DAbMNpAvvXZv96vXnIiJqTVWWlfKJ5auSr1VVXZeIMXcyACB4viLar4Gx5oYTgCixjzs9O3xY7jO9et71IpmmEojByX5Op3y2b5+C1+fMGpnqcqUqrbnTv6lqg5JwJLt07RKcAENaydGAgACQInzw58ph8EjhPChV9+70b9ifD0IEAuq8t6bDU8tXXPdblg8AYur2QMZYeHACEEVSCKm0Vj+f9MDYB7OydimPx3AgmiH78wEUCSEMh8P69YTxG57Ly80FRCAAkkJw8G+yYAKAKV06kKvNdYchCDB0CYACBCcqcKKCb5VOgi+WTgaJBC5UoELYrqEQpfT7rW3FJQO/sm7dbrtXhRuEGWveOAGIIrQnxyDKF2fN6DEsreVhy+NxOBDNpvYEGAIt7XTKzOSkorfnzD7wzOBBExWRAiLgZr9QQQRSCoykZEeXecccHkSi0Iz8Czb7mVClnfDhotnwq4qR0Ar9Der0b9DPIzKk32+9eebcuJ9v2ZIfq/0AjLHQ4WOAMcDubi7xeks+t2bt6XVXro4gnw8MAEsTCU1Ur0QNAUgAaEJE8njEgJTU4y/OnObkwSnhVPv9CVSUe9c9Wub2n+9c4xcKQTW6wmJP9jseyISPF8+AnYFsyGjifn99IABJKZUlpfG3yQ9uebxvn7E8FIqx5osTgBhR94jTn3fvKfjfXXv6FlpmazJNQNMk+6jg7RcJIQDZMUgBSHS5ALSGj/fpvfG53ImDebJfBJDWgELosmMnzPc+nI1mTQtTAyHpBkXsupP93vF2gWdKpsMV1QJaoj/swd8mEDUIAQ4hzGWPP3pyZE5Of/79Yax54gQghhAA2eX5q1VV1189eOjo/GPHOp8qr+iMDkdwsak1kNb29FlAIQCEAEAEh2UF8jp12v/skEEyr1OnoQA82S9iSCtAIa3L7+7UWz43XGvUSmmBWL9TAcFmP4Jk4YeXqgbDV0sngUUCktACK8I7NgJRk5Qiy+O5vv6jH1btUlJy+PeIseaHE4AYQ0SkAbS94goo5d9x5crRLVeulu25fCXpclVVarnPn2ySNlwCrTSPp6pDy5blY9u180/s1LFd34yM7gDBwG/3GET3b5RAyLIADcM8/mqB49hzuTVetIDUfbdd7GY/AzT8oGwC/KJiFCQLEyTosOz314cEUNrlkoPT0o8uf+KxjkkORxKfxWeseeEEIEYRAGkifXvpVRPpGtOssc/wJzscybf/3wmAuGQbJVpZIKQR2PWjDc6r/55YXQ0mkrrrvQC3Jvs54dnSKfBGdR9IEz4gAKAo92rag6NmtWu37bV5c0bbt+9xUslY88AJQIyzKwL2/3ynwG53ayMA8got2oiCezQA/g2f3eOq2jiiugKUJi3rhk07wKcKH5ww0+Gp4hmwxd8uIs1+DRFMAtzGV/r3K/hR7oRcbiZlrPngBCDOUHD8bN3/BU9Jizm11wNb1dXW7h/sc1xaOg6UqUiDVLWDfSRqANCw1tsVPlcyBS5aLaGl8MVU8LcZUlrKcBi/zx2/8cmBAydwEsBY88AJAGNhQUSEgAi4fMvrBcXnFuUOti6oJGFKCxDOW6mwoKYnvFndBywQ4EErpMN9QgmJSEhDC0Pq+XNnH8rt1GkInwxgLP5xAsBYmBAEZ+pX+qB60D/+WV5eU9ouVdeQj4Qo0W6wSECqaNg1vtEiELQWhmjtcRev/NBjFT3S07toAC14mBhjcYu/vIyFCQIKrYlS3Zjy94fGXtWIWEYe8pKDWqAJaaLh1/hGiyYQUlmqKBDIeHLZclXm85Vh8OIDXkAwFqc4AWAsjKQQ0tLaerBLtxHfGDokX3hc0ilAaUBQjbjGN5oUgBR+vzpWWd39s6tWnyQgsk+dRPu1McYajhMAxsJMIkpFpL4/YXzerA4dtlkut2EIEfKbHyMheHGQz1p79dqIb69/d5NElEprvjOAsTjECQBjYVY7jQkJgP489aEBg1q2PKocDkMCxGXgtIgM6fNZfz9+fOKfd+8psK+2jvbrYow1DCcAjEWAQBRERMlOZ/Jrc2alZrmc17VhSPuOh3ijlJLCH1Df37x5wurTp3dyEsBY/OEEgLEIEYhCEakOqantXp0584ZLCh8IAfGYBBAiEhFqpfFTq9b0PlxYeMIQwuDtAMbiBycAjEWQRJSW1taodjkDnp/84B6ShsDgJVBx10iniYRQSlcrlfKxpcvdhTU1RVIIqYniLqFhLBFxAsBYhNnl8sf79Bn77eFD8rXbI6UQcblyVgBSmKY65/V2/OSyZZdNrU2A2omVjLGYxgkAY1FgJwHfGTs27/HOHTcrt9swEONyD10BSBkIWFuKSwd9be072+2tDk4CGIttnACwhEW1ovXz7XL581OnDBudnnZAuVyGrL3YKd5YWhvS57NeP316/G+3b883hDBUnP5dGEsUnACwhEREhLWi9RoQgiMAXYbhfnnWzKxOnqSL2umUos7tj/FEaS2Fz6d+un1n3sKjx7byyQDGYhsnACzhULCJHesGp2hVAuxyedsWLbJenTW9OtnhqCIhEOOwfE4AqLUWqLX+4rvvDdx15cphrgQwFrs4AWAJRRNpBMCAUv7HFiw88OzqtZsAgklBtEba2icDBmVl9f7L5AcPoxAgpNRxmQQgIlgW1FhW8pMrVqVdqay6KhH5ZABjMYgTAJYwNJEWiMJvWb4nl63YX3CjcOi/T58e//V172ywB/VEKwkwhDAsImtWzx6jfjJu3AbtckkpZVyunDWAkKaprvr9OZ9YtqK42jSrAYJJVrRfG2PsFk4AWEKwg7/PsnxPLlt+cM3lKyMNn8+Ufr/18olTE7/+TjAJiOblNgaiYWltfXHEsNynevbYEO8nA4TXq3aVlvT/0uq1B26+t3FY1WCsueIEgDV7dvD3mpb3E8uWH1x75eoI6fNaJpHD0tqQfp/18olTE7+2bt1GiSijWQmwLw765YOTxua1br1HuVxxe2eAQpTS57MWXbw45qcbN+bbf7dovy7GWBAnAKxZu1n2V8r/iWXLD629cm2E9Psti8iw/x37CNsrJ09P+OradRujuR1gXxxkCGG8OGtG5x4tWpxR8XwygEhKv9/67b4Def86eHgTnwxgLHZwAsCarTplf+/Hlyw7sO5qcOVvaW3c/u/aScCrJ09P+Oq6d6KaBAhEobRW6R5P+j9nz4Q0h6OUpBRx2RQIgMqypLAs9dX38kduunBxH58MYCw2cALAmqX37fkvXX5o3dWrH1j5387eDnj1xKkJX45yJUAKIRWR6pmR0fXv06acQUSNUlJcJgGISFqjqZXzk8tXdDhTWnqeTwYwFn2cALBm530r/6XLbgX/O6z8b2cnAa+dOj3hy1GuBNjHAx/s0mXYr/JyN5HTKaRhqLi9OMiyVLFlZXx86XJ/pd9fiQjISQBj0cMJAGtW3hf8ly07/M7Va8Olz1ev4G+ztDYMn8987eSpCV9avTYmkoBnBg+a+Pl+fQuUy2VIxLgsnysAKS3LOlJV1fPTK1YdRUCk2onM0X5tjCUiTgBYs3Gr29+s+diSZYffuXJtuPT77ln2vxtTa4eoqVH/PHNmwpfXRG87ABHR7p7/2QN5uTNycrYrt9swRHweDwxWWPzWmmvXRn7vvfwC++/GSQBjkccJAGsW3l/2X3Fk/bXrtSv/hgd/mwKQhs9nvnb69IQv1ekJiHTZ2j4ZQAD0wozp/fq3TD2mHE5DQnw20tlJwJ8PH8n92969G7gpkLHo4ASAxT07+NeYZs1HFy85sv7ateGG32c2ZuV/O1Nrh/T5rH+eOj3hS6uDSQAARnyqnZ18tHA6Wvxj1sykNi7nDSUd8Xs80LKkCATUtzdsGv/O2bO7+HggY5HHCQCLazeDv2XVfHzZsqPvXb8xTPq8lqm1I1Q/wz4i+M8zdiUAorIdYF8c1KVVq44vTZ921SWFH6SEuD0ZQISkNX5mzbpuR4uKTnElgLHI4gSAxa26Zf+PLVly9N2rN4bd76hfY91MAk6dnvDFNWs3RasnwG4KHNehw6DfPfjALjIMIQ0jLoOmJhJCKV0aCKR9YvlKUez1lvDxQMYihxMAFpfqlP2rP7pk2ZH3rgVX/g3p9m8oOwl4/dSZ8V9YHb0kwL446CP9+o375pAh+crpMgwh4rJ8rgCk8PvVyaqqrs+sWHHO1NqM5ihmxhIJJwAs7tzs9rcs78eWLj/23rVrYVv5386eE/Cv02fGfzGKSYDdPf+98WPzHu3UcYtyueL34iBEKf1+q+BG0dBvrl+/TQohldZxWdVgLJ5wAsDiih38qwOB6o8uWXr0vWvXhklf/Yb8hIqdBLx+5sz4Z1eviUoSgABo37D3/NQpg4e3SjuknPF7cZBFFBzFfOLUhN9v31HATYGMhR8nACxu3Cz7B8zqjy1bfjz/2vWh0uezLIpc8LfZw4L+febs+M+vWr0peDogsnfeIwACAHgcRtKrc2Zm5ridV5Qjjk8GKCWFz69+vG3bxGUnTm7jpkDGwosTABYX6u75f3jx0hP5164PbeyQn1CxhwW9cfbc+C+sWbsJiCDSlQD74qCclJS2r82aWeYRooaEwLg9GQCEpDR8du26AXuvXTvKVwgzFj6cALCY9/6y/7LjGwtvDGnqkJ9QsYcF/ev0mfHPrlmz2a4ERLKTXQohLa2todnZff8y5aEDICUKKXW83hmAROS1VPKTy1elXK2qus4nAxgLD04AWEx738p/ydITBdevDzX8/pAM+QkVe1jQG2fOjf/cqlWb7bgbyaBl75nP7dVz9A9Gj8zXLpeUQsTlyjl4cZCpLnm97Z9avvJGQCk/QGS3VxhLBJwAsJhlB/+qQKDqw0uWnth0o3CI9PlCOuQnVOwjgm+ePT/u86vWbolKJaB2RsDXRo3K+1i3bhuDdwbE7/FAafqt7cUlA76wavVue6uD7wxgLHQ4AWAxqe7K/yNLlp7ceP3GkEgd9WusW0nA2XGfXbV6M2KwSS9SK1dERCmEVETqt1Mmjx6Xmb4vrk8GaDKk32fNP39h7P9s3pLPTYGMhRYnACzm1F35P1Fn5R/Jo36NZScBb509N+7zq9ZssTv1I5YEACACoEMIxyuzZnfomuw+px0OGb9JgDZkIGD9Ys/evDePHNnMxwMZCx1OAFhMuRX8zeqPLF12clMcrPxvd6sScG7c51at2mKXrSOVBNh3BmQmeTL+MWtWIMVwlGspRdweD7QsKZTSX163fvi2S5cPciWAsdDgBIDFDDv4V/r9lR9evCQY/ONk5X+7m5WAcxfGfX7Vmq2RTgLs43P9Wrfu+eL0KSeEEBqFoHg9HgiWBX4i1ydXrWxzvrz8Ip8MYKzpOAFgMaFu2f8/liw/vbmwcHBwyE/8rPxvZw8LeuvcuXGfW7l6K9TG3kgmAZbW1kNdu454bvy4TdrplNKQcbly1gBCWpa67gtkfXzZiuqqQKAKEZFPBjDWeJwAsKiru/L/yJIlpzYW3oj74G+zjwi+ff78uM+uXL2FbBEKXPbFQZ8bNjT3s336FCiX2zBEnN4ZACCFz6cOlpf3/tzqNYcQADWR5iSAscbhBIBF1fvK/kuXnt50o6jZBH+bXQkIJgGrtkX6iKC9HfCzSXkTpmZn71Qud9xfHLTi4uXRPyjYUCAR+eIgxhqJEwAWNe8757946ZktN4oGx1vDX33ZlYD55y+M/fTKVVu01hogMkmAfTIAEfGFGdN69kltcUI5nXF8PFAbMuC3nj94KPflffs38skAxhqHEwAWFXbwr/D7K55YsvT0lqKiQfHa8FdfdmPg/HPnx35u9ZrtAASIiJFIAgSi0Frrli5Xy9dmzXJmOp1FShpSIMZlI52yLCkCAfWtDRtHv3v23G4+GcBYw3ECwCJOaa1uTfhbcnbLjcJBzXXlfztLa0N6vdb8c+fHfmbF6m2atI5UM5s9JKhbWlrnl6ZPu2QItOL5ZACRRlMpx6dWr+5yvLj4DG8HMNYwnACwiFJaKymELPf5yj+0ePHprYXFzX7lfzuLyJA+n7Xg/IWxn121ert9RDASlQD7ZMCEjh0G/27SA9u0YUhpGHEZNDWBkEqpUtNK/8SylbrM5y8TiIKPBzJWP5wAsIjRRFoKISsDgcqPLF1+7mbwT4CV/+0srQ3p91kLzl0Y+6kVK7drTRGrBNh75h8b0H/81wYPylcuV3zfGWBZ1vGqyu5PL19+WgPoWwctGGP3wgkAiwh7z7/c5y//0KIlZ7cWFiZs8LfZPQGLLlwc85lVq7bbK9dIVQIUkfrBhPF5s9u32xbPSYA9Lvi9G4XDvvXO+s32VgcnAYzdGycALOw0wM2Gvw8vWXp+W2HRwEQP/jb7iODC8xfGfmrZih1aa22fbw/nz0VEtMvlf5k+bcCQVi2PxPPJAKW1lD6f9dLxkxP/tGt3ATcFMnZ/nACwsNJEWgCIcp+v/EMLl5zbVlQ0UPo5+NdlHxFcfPHSmE+vXL1DEalIbAfYFxUlORzJ/5g9q1Vbl/OqNgwZj3cGEAAqraUI+NX3Nm3OXXX69A4+HsjYvXECwMKmbtn/iSVLz28vLuaV/13YPQGLLlwY8+mVK3faZ/fDnQTYFwe1T03N+cfMmcVuw6gBKSEuTwYAoFZKCCL6zOq1fQ7eKDxhCGHwyQDG7owTABYWt4K/r/yJxUsubC8sHigDiXHUr7HsnoDF5y6M+ciiJTsq/YHKSDS02ScDRuRk93/+wQf2kZRCGoaKyyQAEUEpqrSslI8vXe4prK4plELwxUGM3QEnACzk7OBf5vOVPbF46YXtxcUDpD+xjvo1Wu0tARcrK1qaWpuIiIAY9h9rl8sf69Nn7HeHD89XTpchZRxfHGSa6rzP2+GTy1dc8SvlB4jcJUyMxQtOAFhI2UN+Kvz+iicWL7kYDP688q8PA9FSLrcxsnXGwZVPfCg73eNOB7i1Vx/2n1+bBHxr7Oi8j3bpskm5XPF7ZwCAlH6/taW4eNDX163fKRAFbwUw9n6cALCQsYf8lHq9pY8vWnx+R3HJgEQb8tNYBqKl3G5jREbaoTfmzW2f6nKlaiIdqeBvs8vl/zv1oZFjMjP2K5fLkHHaTW8PXPrX6dPjf7l1a759M2K0XxdjsYITABYSNyf8+f3lH16y9NKOouIB3PBXP4YQlnK5jREZ6QfffnhehzS3O82upET6tdgJh1MK5yuzZmZ3TvJcUE6njNvjgUpJ4fep/9m5O2/B0WNbDEQ+HshYLU4AWJPdXPn7fKWPL1x0cUdRCZf968lAtJTTaYzKzDj41ry5HVq63S3tiYnRek32yYA2yclt/jFzpreFYVRqIUQ8XhxEiKiVFqiU/uI76wfvvHL1kD0EKdqvjbFo4wSANYkG0FIIWebzlT2xaPHlncWl/fmcf/3YK/+R6RkH35w3p2Mrt7uV3UAZ7ddmnwwYkNWm19+mTjkKQgAiEkLcngwAn1JJn1ixPONSReUVicgnA1jCi/qDhsUve8hPqddX+vjCxZd2lnDwry9JpJTTZYxqnXHgrUfndbRX/rEQ/G12U+D07t1GPjdh3Abtckkp4vTiIAAhLEtd9QWyn1y2rKzGNKsjdfcCY7EqZh42LL4oIiUQRanPV/qhRUsu7yop6c97/vVjIFrakyRHZaYdfHPunE4tXa6YC/42Owl4dtiw3Kd79tyg3PF7Z4ACkNI0rb1lFX2fXbX6oD1yme8MYIkq5h44LPYprZVElKVeX+njixZd2VVS3F8GAhz868Hu9h/dOvPAm/NqV/61dyVE+7XdjUSUSmv1q8mTxk9q02Z33F8c5PdZSy5eHv2TjZvyuR+AJbKYfeiw2KSIlBRClni9JY8vWnRld3FpP+H1Kj7qd3/2Of9R6RkH3pg7u9PNsn+Mfw/RBoAvzprRrVdy8mllOOL74qCA3/rfffvz3jh8ZDOPC2aJKqYfPCy23Fz5+3ylH1q8+Oru0rJ+MhCwFGLUOtbjhb3yH9MmY/+bD8/tHIt7/vciEAUBUCu3u9U/Zs/ENMMoUVLKuDwZAIBaa4GWpb/+Xv7gw4WFJ3hcMEtEcfHwYdFnH/Ur9npLHluw+Mru4tJ+POSnfm6W/TPTD/x7zpzOLd2u1Gid828KgSgsra2eGRldX5wx7ZxDSgtRUDzeGaCJBCpFXqLkr6xZZ5pamwA8Lpgllrh6ALHosIN/iddb8sTipVf3lJb044t96ufmyj8zY//bDz/ctaXb3dJ+P6P92hrDbgp8oHOnob+YOGGLdjqklPF5MkABSOH3q93l5f3+ceDgVoEotNZcBWAJgxMAdk92sCqqqSl+bOGia7uLi/tJv9+yNAf/+7H3/Mdmtt7/xry5XVo4nS2iPeQnFOwk4OnBgyZ+aUD/gmBTYHzeGUCIiKZJ/7t9Z7dq06y2tzqi/boYiwROANhd2Q1/xV5vyRNLll7bW1rWlyf81Y9DCFO53caY1hn735g3u6s92z/eyv53Y3fP/yR3Yu7M9jnblcsdlxcHaSKBlqUvm2a7hceO70FE5IZAliiaxcOIhZ7d8FdUU1P82IKF1/cUl/Tj4F8/BqJluVyOsW0y9705b27XFJcrpTkFf4DgyQCBKDSR/vO0qX0HtWx5TDmdcXsyAEnTG4cPpxIQNafPibF74V909gH2yr+wprroicVLru8rK+/Dwb9+7D3/sZmZ+9+YM6dbcwz+NvvioBSXK+XV2TOTs5yu68owpACIq310BSC1P4A7r17rc7684pKd2ET7dTEWbs3uocSaRhEpiSivVVVdf2TRkqI9JaV9echP/djBf0LrNvvefHhusw7+NvvioE4tW3Z4eea0625D+kBKiLeTAQJIm4bh3H75ygWA4JjraL8mxsKt2T6YWMPZZf8L5eWX5ixYWH2opLS3DAT4qF893Fz5t87c9/rcWd3shr/mHPxt9sVBY9q3H/i7Bx7YTVIKIURcBVAhhAYpYe/Va3HXx8BYYzX7hxOrH7s7/UZ1deG8+YvUycqqrhz868cO/uPbtNn75ry5PRJh5X87+2TAh/v1HfftYUPztdst42lcMGmNoDWcKStPAghWNqL9mhgLN/4lZ0C1p6Eq/P6K/1iy7PrZmupOvOdfP3bwH9e69b5/z53do4XTmZxowd9mnwz4zrixeY917rRFud1x0xQYvDJYQ6G3qgVA7eTDONvGYKyhEu4hxd6PiMi+Ee0zK1Yd31VWxhf71JOBwlJujzE+q83etx6e2yORyv53gogoAIQm0n+YNnXYiFZpB7XLLeMlCQAgqA5YLr4ciCWKhHxQsVvspr//3rhpw5pr10YYXq/Jwf/+git/lzG+Teu9/54zu0eSw5GwK/+6gncGAbikdP1jzqw27T3uy9rhiJ8kgNf8LIEk9MMq0SkiZQhh5J+/sOd3e/flctm/fuwhP+PbtN775rw5PRN95X87gSiU1qpti+Ss12bPrEiSsloLIeLh4iC30whIvtyKJQh+YCUoAiAEwKpAoOpr697JtG9Io9qz3ezO7CE/uVlZe96YO6cnr/zvTAohLa2twVlZff48ZfJBkBIRkTBG19hIRCAEZCe1qAS41RcT7dfFWDjxQytB2UHrd9t37DoXCHSUSlmaiH8f7sEQN8/57319zqxeyQnc8Fcf9smAOT17jv7R6NEF2uWSUoiY3ApAIQiEgM5pLb0AwSOx0X5NjIUbP7gSkCbSAkBcrKi4/Od9+4djIKCVUlz2vAf7Yp/crNZ73nh4Tk8O/vVjJwFfGTUi9xM9u29U7ti8M8A+BjikbRZ/D1jC4IdXArLLm3/Zs/dUjZQt0LKIuNx5V/bKP7dN6z2vz5nTi8v+DSOFkJpI/+rBB0dPyMzcq1wuQ8ZQpz0CkEKUTsvyj8jObgfAcwBYYuBf8gRDACQRZbHXV/Lvw4cHgM9HXPq/O0MEV/55bbP2/Gve3N688m84+84AhxCOl2bN7Ng9Oemsdrli5s4AgaCF00lDs9se75rWqhMB8IVALCHwL3mCsfc2l508ebiUMF1orXn1f2d22T+vTdae1+fM7pXkcCRx8G8c+86AzCRPxmuzZ6lWDkcpSYkxcTKgtiT2oT59yhH4OmCWOPhBlmCkEBIAYOGxEy2QdEx2ZMcCQwhLeTzGA23b7P73w7P7cNm/6ew7A3pnZnb/69Qpp4UQGhEpmhcHCUStpRRZQlx/tHevQURE9neEseaOH2YJRBNpBMBLFRVXdl250lObJmr+HfiA4MrfZTyQ1Xr3a3Pm9HYbDg8H/9CwmwIf6tpl+M8nTtisnU4ppYzaihuJCJwu/OqokcdSXa5UDaCRj8KyBMEPtARiX3G648rV815DJkutFZ/7fz97yM8DWW12vz53bt9kXvmHnJ0EfHrI4Imf79e3QLndRjQuDpIASjtdsm8Lz4mnBg8abZ+OifTrYCxa+Jc9gdiDTXZevRoAxODZZ3aTPeRnUnbW7tfnzunjMQxe+YeJfXHQcw/kTZzatu2OSB8PRCICKcEJ5P/DtGnKJaULEIGH/7BEwg+2BGKXNg8W3mgJWgfPPjMAsI/6eYxJWVm7/zl7dh8PN/yFFQYjLQIQ/G3m9D79W6QcUy5XRJIAJCJpGEo7HPIXuRN2DMnK6qOIFK/+WaLhX/gEQUQkEIXPUr6rlVWtQGvg7v+g4J6/x5ick7Xr9Xlz+nLwj4zglbtAKS5XytuPzE3rnZpyyq4EhKsxEIlICKGV02V8e+iQ/E8OGjTB0tri+f8sEfEDLkFQ7Qz2Mp+3vKTG25KU4goA1Hb7u93G5OysXa/OmtXXzWX/iBKIQhPpti1aZC197NFWuVlZe5THY5AQaAhhhfLuAEMIi6RE7XTK/xo+NP87Y8fk2bdhhupnMBZP+CGXYKpN01tpmilABJDgBQBDCEu5XMbk7La7Xpszuz+f848OOwlonZSUOf+ReQO/O3RIvtvp8Cmn0yAAlACqsfMCkIgkgEIiUi6XkZ6UVPKXBydt/vqokXl22Z/3/Vmi4gddggkobVkABhBBIp8AsI/61Qb/fm7DcHPwjx47CTCEML41elTe+g8/ceHRrl23OB2OgPZ4JEkpkIgMISw7IUAiQiLC4M2WhMFtLi0Qtf3vkZSo3R5JhoGPdemyZd0Tj1c80bfPOHvlz8GfJTKkKA7hYJFjB7ejRUWnxrz2endUihI1AbDL/g+1bbvztTmzB7oM6eLgHxuIiDSAtsvyR4uLT71++MjlVadPdTpTXtEZHC4A0gDBLSwAouA/AMGKlhCAQgBICaA1pACUz+jR/dAnBw5IHZ2TMwAAgMv+jAVxApAg7AB3oqTkzKiXXumSsMEfgxf7PJSdvfPV2TP7exw85CcWaSJddypfjWnW7L1+/eTWS5dL91677jlVWtK61OtLqTLNJEtrhwBQTikDLVzu6nYtkkoGtm1bMjonx5jQoX23ti1aZAEEx2AjIvJnzVgQJwAJwg5yF8rLL418+dV0n1JJtR9+wiQCDiFMy+V2PJTdZuc/5swZwGX/2KeJtL01cPv/rcTrK6nw+6t9SgUkgvAYhivd42mZ5HAk1/33OPAzdmcf+FKx5sne60x1uVukuVwVV32+JLCshGkEDA75cTumtsve+eqsmQNcHPzjgkAUweOCwa0B+zirQBTpHnd6usedfvt/U/fflUJInu3P2J3xwy9BYG21p6Xb1bJ1i+QylDJhJgEaAi3l8RhT2rbl4B+nEBElojSEMOzPjQDIrhDY/xAR1f13ea4/Y3fHD8AEYl900qNVWgkIAdG8hS1S7CE/U3Nydrw2d/ZADv7NBwKgXQ2w/+Gufsbqjx+CCcTu9xianWUmwl0AwW5/jzElJ3vnK7NmDHRytz9jjN3EPQAJxF4djczJyUDT1ErrZrs3ag/5mdqu7Y5/zJ412Cmlk4M/Y4zdwg/DBGJfdjIwK6tHxyTPZTIMbOyEtVhmD/mZ2i57x6uzZg10SOng4M8YY+/HD8QEgoioiJRLSte0bt3PoMMBzS0BMISwlMdjTMvJ2fHanDlDXIbhtjvHo/3aGGMslvBDMUE93rdPJvr9pJRqNtsA9sp/ert221+ZM3OQgWjwyp8xxu6MH4wJRiJKAqCh2W37js7OPoBuN0gAFe3X1VQOIUzlDq78X5k1Y4hLGi4C4JU/Y4zdBT8cE5Am0giAXxo5wk8ESHF+dMoQwSE/MzrkbH91Djf8McZYffADMgFJRKmJ9NSuXYaPap1+gJxOEa9VgGC3v8eY2S5n+8szZw5xCMENf4wxVg/8kExQdnn8x7m5iFprQAQEiKu5APae/8wO7ba/PGfWUKeUTi77M8ZY/fCDMkFJRKmI1KicnAHP9Ou3SXs8UgoRN1UAu9t/Zof221+aOWMIN/wxxljD8MMygQlEoYn0j3MnDuuTlHxSGYYRD1sB9pCfme3abX9l1sxhvPJnjLGG4wdmArMvSklyGMl/nzUdkqWs0kIIARCzswGCZX+3Ma19ux0vzZoxRKKQvPJnjLGG44dmghOIQhGpvpmZPV6Y8tBhFAJi9aIgB6KpPB7jgbatd78ya+ag4Mqfh/wwxlhj8IOTgUSUltbWzB7dRz3/4KTNWkoBQsTMlEAEIEMIy3K7HXlZbfb8c86c3i7JF/swxlhTIMXgSo9Fh6W1ZQhh/OvQ4U1fWv/uGKW1lEopBRC1aYFIREIIrT0e+USXzpv/MHXKKEMIgwCI73pnjLHGQ4Bb18QyZicBq0+f2fmFdeu7lZiBdBkIWEprGemBQRJAKSklGgZ8dcig/B+OH58HEBxkxCt/xhhrPLSvh+UEgNWliJRElMeLis98ef366h1FxQPI5wNJFJFqgEDUQATkdos0KUt++UDuscd69x6riXTtLy2v/BljrAk4AWB3ZScBplLmb3bs3Py7nbtG+4V0g89LAkBrAEEhDMQYPMangQi0wyEBBUzp0G7nc7kTW3dPT+9sv55Q/TzGGEtknACwe6pbaj9SWHTylzt2FC05fmI0OF1Ifh8YiBaRRq1JNHZ7QCBqJCIFINHpBBAC+qSknPzm6FFFD/fqOQbgVjISyr8bY4wlMk4A2H0REWkAbQfgrZcuH3hh777q1adPD/E7nW5QCsg0AZUiIYQGANBaC0CEuhUCBCAgAhSCkIgIETWAQIcDwDAA/H4Y0Tbr0NODBpU/3KvncLvLHyB4VDE6f3vGGGueOAFg9XZ7MD5TWnZ+1enT51adOd3ywPXCLhVKtUQpAYiAtA5uEhAF/wEAQAzOF6idMwBag1TK6pmRcWZyl85XZ3Xvnj4yJ3uA/fN41c8YY+HDCQBrMKW1QkSsuyo/V1Z+cf+NG5d3XLniP1lSmnShvCytyOtNq/T5WwSUckohlMfprMlM8pTltEgu7doyrWJIdlsakZ2d1Sczo5shhGH/WZbWlkSUGOdXFDPGWCzjBIAxxhhLQIi1qzhebTHGGGOJwY753FzFGGOMJSBOABhjjLEExAkAY4wxloA4AWCMMcYSECcAjDHGWAK6mQDwSQDGGGOseasb67kCwBhjjCUgTgAYY4yxBMQJAGOMMZaA3pcAcB8AY4wx1jzdHuO5AsAYY4wlIE4AGGOMsQTECQBjjDGWgD6QAHAfAGOMMda83Cm2cwWAMcYYS0CcADDGGGMJ6I4JAG8DMMYYY83D3WI6VwAYY4yxBMQJAGOMMZaA7poA8DYAY4wxFt/uFcu5AsAYY4wlIE4AGGOMsQR0zwSAtwEYY4yx+HS/GM4VAMYYYywBcQLAGGOMJaD7JgC8DcAYY4zFl/rEbq4AMMYYYwmoXgkAVwEYY4yx+FDfmM0VAMYYYywBcQLAGGOMJaB6JwC8DcAYY4zFtobEaq4AMMYYYwmoQQkAVwEYY4yx2NTQGM0VAMYYYywBNTgB4CoAY4wxFlsaE5u5AsAYY4wloEYlAFwFYIwxxmJDY2MyVwAYY4yxBNToBICrAIwxxlh0NSUWN6kCwEkAY4wxFh1NjcG8BcAYY4wloCYnAFwFYIwxxiIrFLGXKwCMMcZYAgpJAsBVAMYYYywyQhVzuQLAGGOMJaCQJQBcBWCMMcbCK5SxNqQVAE4CGGOMsfAIdYzlLQDGGGMsAYU8AeAqAGOMMRZa4YitYakAcBLAGGOMhUa4YmrYtgA4CWCMMcaaJpyxlHsAGGOMsQQU1gSAqwCMMcZY44Q7hoa9AsBJAGOMMdYwkYidEdkC4CSAMcYYq59IxUzuAWCMMcYSUMQSAK4CMMYYY/cWyVgZ0QoAJwGMMcbYnUU6RkZ8C4CTAMYYY+z9ohEbo9IDwEkAY4wxFhStmBi1JkBOAhhjjCW6aMZCPgXAGGOMJaCoJgBcBWCMMZaooh0Do14BiPYbwBhjjEVaLMS+qCcAALHxRjDGGGORECsxLyYSAIDYeUMYY4yxcImlWBczCQBAbL0xjDHGWCjFWoyLqQQAIPbeIMYYY6ypYjG2xVwCABCbbxRjjDHWGLEa02IyAQCI3TeMMcYYq69YjmUx+8LqIiKK9mtgjDHG6iuWA78tZisAdcXDG8kYY4wBxE/MiosEACB+3lDGGGOJK55iVdwkAADx9cYyxhhLLPEWo+IqAQCIvzeYMcZY8xePsSnuXnBd3BzIGGMsmuIx8NvirgJQVzy/8YwxxuJbvMeguE4AAOL/A2CMMRZ/mkPsifu/QF28JcAYYyycmkPgt8V9BaCu5vTBMMYYiy3NLcY0qwTg/7drBzkQgkAQAPn/q/dEJFnXqAsiM1U/oDl0By0l3gUBMF/Ebgl3oJZPAgD8I2LxV+FeAFqRLw6AsaJ3SOjDtbwGAHBG9OKvUhyyZQgAsCdL8VepDtsyBAAoJV/xV6H/ATiS9cIB2GTugrQHb3kNAMglc/FX6QNoGQIAsSn+jSB2GAIAsSj+bwI5YAgArE3x/yaYk4wBgDUo/XOEdJEhAPBOiv8aYf3BGACYS+nfJ7hOjAGAZyj9PoQ4gDEA0JfS70+ggxkDAPco/bGE+zCDAGCfwn+WsCczCICsFP5cwn8pwwCIQtG/k0tZlIEAvIWCX9MH3L+xnOeiaY8AAAAASUVORK5CYII=");

// src/worker.js
var html = (t) => new Response(t, { headers: { "content-type": "text/html; charset=utf-8", "x-content-type-options": "nosniff", "referrer-policy": "no-referrer", "cache-control": "no-store" } });
var worker_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    globalThis.process = globalThis.process || { env: {} };
    for (const k of ["JWT_SECRET", "ADMIN_EMAIL", "SITE_URL", "PBKDF2_ITER", "MAX_LOCATION_AGE_MIN", "BOT_KEY", "GMAIL_CLIENT_ID", "GMAIL_CLIENT_SECRET", "GMAIL_REFRESH_TOKEN", "GMAIL_SENDER", "GMAIL_FROM", "REQUIRE_VERIFY", "FCM_SERVICE_ACCOUNT"]) if (typeof env[k] === "string") process.env[k] = env[k];
    if (!process.env.SITE_URL) process.env.SITE_URL = url.origin;
    if (url.pathname.startsWith("/api/")) {
      L.bind(env.DB);
      const body = request.method === "GET" || request.method === "OPTIONS" ? void 0 : await request.text();
      if (body && body.length > (url.pathname.endsWith("/photos") || url.pathname.endsWith("/v4") ? 3e5 : 7e4)) return new Response('{"error":"Request too large"}', { status: 413, headers: { "content-type": "application/json" } });
      const headers = {};
      request.headers.forEach((v, k) => {
        headers[k.toLowerCase()] = v;
      });
      const req = { method: request.method, url: url.pathname + url.search, headers, body: body === void 0 ? void 0 : body || "{}" };
      return await new Promise((resolve) => {
        const h = new Headers();
        const res = { statusCode: 200, setHeader: (k, v) => h.set(k, v), end: (t) => resolve(new Response(res.statusCode === 204 ? null : t, { status: res.statusCode, headers: h })) };
        (0, import_handler.handle)(req, res).catch(() => resolve(new Response('{"error":"Server error"}', { status: 500 })));
      });
    }
    if (url.pathname === "/brand.png") return new Response(brand_default, { headers: { "content-type": "image/png", "cache-control": "public, max-age=86400" } });
    if (url.pathname.startsWith("/admin")) return html(admin_default);
    if (url.pathname.startsWith("/reset")) return html(reset_default);
    if (["/privacy", "/terms", "/delete-account"].includes(url.pathname)) { let c = {}; try { L.bind(env.DB); c = await L.get("content", "app") || {}; } catch (e) { } return legalPage(url.pathname.slice(1), c); }
    if (url.pathname === "/") return new Response("Tazbeeta API", { status: 200 });
    return new Response("not found", { status: 404 });
  }
};
export {
  worker_default as default
};
