/* ============================================================
   Manpower Implement — server API (Vercel serverless function)
   One endpoint: POST /api/app  { action, ... }   (GET ?action=state also works)
   Storage: one private JSON document in Vercel Blob, written with
   optimistic locking (ifMatch) so two people saving at once never
   overwrite each other.
   ============================================================ */
import crypto from "node:crypto";

// Login tokens are signed with AUTH_SECRET if it is set, otherwise with a key derived from the
// storage token (which only the server has) — so no extra setup step is needed.
const SECRET = process.env.AUTH_SECRET ||
  (process.env.BLOB_READ_WRITE_TOKEN ? crypto.createHash("sha256").update("mi-auth:" + process.env.BLOB_READ_WRITE_TOKEN).digest("hex") : "") ||
  (process.env.MI_LOCAL_DB ? "local-test-secret" : "");
// File name is derived from the secret too, so it can't be guessed even if the store is public
const DB_PATH = "manpower/db-" + crypto.createHash("sha256").update("mi-db:" + SECRET).digest("hex").slice(0, 24) + ".json";
const TOKEN_DAYS = 30;

/* ---------- storage (Vercel Blob in production, a local file for testing) ---------- */
let blob = null;
async function blobLib(){ return blob || (blob = await import("@vercel/blob")); }
const LOCAL = process.env.MI_LOCAL_DB;   // set only when testing on a computer
let localLock = Promise.resolve();

async function readDB(){
  if(LOCAL){
    const fs = await import("node:fs/promises");
    let t;
    try{ t = await fs.readFile(LOCAL, "utf8"); }catch(e){ if(e.code === "ENOENT") return {db: emptyDB(), etag: null}; throw e; }
    return {db: JSON.parse(t), etag: crypto.createHash("md5").update(t).digest("hex")};   // a damaged file is an error, never "empty"
  }
  const { get } = await blobLib();
  const r = await withAccess(access => get(DB_PATH, {access, useCache: false}));
  if(!r || r.statusCode !== 200) return {db: emptyDB(), etag: null};
  const text = await new Response(r.stream).text();
  return {db: JSON.parse(text), etag: r.blob.etag};      // a damaged file throws: we never save over it with empty data
}
async function writeDB(db, etag){
  const body = JSON.stringify(db);
  if(LOCAL){
    // test mode only: compare-and-swap done under a lock, written atomically (temp file + rename)
    const fs = await import("node:fs/promises");
    const prev = localLock; let release; localLock = new Promise(r => release = r);
    await prev;
    try{
      let cur = null; try{ cur = await fs.readFile(LOCAL, "utf8"); }catch(e){}
      const curTag = cur === null ? null : crypto.createHash("md5").update(cur).digest("hex");
      if(curTag !== etag){ const e = new Error("conflict"); e.conflict = true; throw e; }
      await fs.writeFile(LOCAL + ".tmp", body); await fs.rename(LOCAL + ".tmp", LOCAL); return;
    } finally { release(); }
  }
  const { put, BlobPreconditionFailedError } = await blobLib();
  try{
    await withAccess(access => put(DB_PATH, body, {access, contentType: "application/json", addRandomSuffix: false,
      allowOverwrite: true, cacheControlMaxAge: 60, ...(etag ? {ifMatch: etag} : {})}));
  }catch(e){
    if(e instanceof BlobPreconditionFailedError || /precondition/i.test(e.message || "")){ const c = new Error("conflict"); c.conflict = true; throw c; }
    throw e;
  }
}
/* Works whether the Blob store was created as Private (preferred) or Public */
let access = process.env.BLOB_ACCESS || "private";
async function withAccess(fn){
  try{ return await fn(access); }
  catch(e){
    const msg = String(e && e.message || "");
    if(/access|public|private/i.test(msg) && !/precondition/i.test(msg)){
      access = access === "private" ? "public" : "private";
      return await fn(access);
    }
    throw e;
  }
}
/* read → change → write, retrying if someone else saved in between */
async function transact(fn){
  for(let i = 0; i < 6; i++){
    const {db, etag} = await readDB();
    const out = await fn(db);
    if(out && out.noWrite) return {db, out};
    try{ await writeDB(db, etag); return {db, out}; }
    catch(e){ if(!e.conflict) throw e; await new Promise(r => setTimeout(r, 60 + Math.random()*140)); }
  }
  throw httpErr(503, "The server is busy. Please try again.");
}
function emptyDB(){ return {teams: [], users: [], admin: null, history: {}}; }

/* ---------- helpers ---------- */
function httpErr(status, msg){ const e = new Error(msg); e.status = status; return e; }
const uid = () => crypto.randomBytes(6).toString("base64url");
// India time (UTC+5:30) decides what "today" is
function todayKey(){ return new Date(Date.now() + 330*60000).toISOString().slice(0,10); }
const clean = (v, max=60) => String(v ?? "").trim().slice(0, max);
const num = v => { const n = Math.floor(Number(v)); return Number.isFinite(n) && n > 0 ? Math.min(n, 100000) : 0; };

function hashPw(pw, salt = crypto.randomBytes(16).toString("hex")){
  const hash = crypto.scryptSync(String(pw), salt, 32).toString("hex");
  return {salt, hash};
}
function checkPw(rec, pw){
  if(!rec || !rec.salt || !rec.hash) return false;
  const h = crypto.scryptSync(String(pw), rec.salt, 32);
  const want = Buffer.from(rec.hash, "hex");
  return want.length === h.length && crypto.timingSafeEqual(h, want);
}
// token = base64(id.expiry.version).signature ; version changes when the password changes
function sign(id, ver){
  const payload = Buffer.from(`${id}.${Date.now() + TOKEN_DAYS*864e5}.${ver}`).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}
function verify(token){
  if(!token || typeof token !== "string") return null;
  const [payload, sig] = token.split(".");
  if(!payload || !sig) return null;
  const good = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  if(sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return null;
  const [id, exp, ver] = Buffer.from(payload, "base64url").toString().split(".");
  if(Number(exp) < Date.now()) return null;
  return {id, ver};
}
function whoIs(db, token){
  const t = verify(token); if(!t) return null;
  if(t.id === "admin") return db.admin && db.admin.pw.salt.slice(0,8) === t.ver ? {role: "admin"} : null;
  const u = db.users.find(x => x.id === t.id);
  return u && u.pw.salt.slice(0,8) === t.ver ? {role: "user", user: u} : null;
}

/* ---------- what a login may see ---------- */
function scopeOk(scope, teamId, deptId, contractorId){
  if(!scope) return true;                                   // admin
  if(teamId !== scope.teamId) return false;
  if(scope.type === "team") return true;
  if(deptId !== undefined && deptId !== scope.deptId) return false;
  if(scope.type === "dept") return true;
  return contractorId === undefined || contractorId === scope.contractorId;
}
function findContractor(db, id){
  for(const t of db.teams) for(const d of t.departments){ const c = d.contractors.find(x => x.id === id); if(c) return {t, d, c}; }
  return null;
}
function scopeLabel(db, s){
  const t = db.teams.find(x => x.id === s.teamId); if(!t) return null;
  if(s.type === "team") return {kind: "Team", path: t.name};
  const d = t.departments.find(x => x.id === s.deptId); if(!d) return null;
  if(s.type === "dept") return {kind: "Department", path: `${t.name} › ${d.name}`};
  const c = d.contractors.find(x => x.id === s.contractorId); if(!c) return null;
  return {kind: "Contractor", path: `${t.name} › ${d.name} › ${c.name}`};
}
/* The data sent to the browser: only the assigned part, never password hashes */
function viewFor(db, me){
  const scope = me.role === "admin" ? null : me.user.scope;
  const teams = db.teams.filter(t => scopeOk(scope, t.id)).map(t => ({...t,
    departments: t.departments.filter(d => scopeOk(scope, t.id, d.id)).map(d => ({...d,
      contractors: d.contractors.filter(c => scopeOk(scope, t.id, d.id, c.id))}))}));
  const history = {};
  for(const [k, rec] of Object.entries(db.history || {})){
    const rows = rec.rows.filter(r => scopeOk(scope, r[0], r[1], r[2]));
    if(!rows.length) continue;
    const names = {};                         // only the names this login is allowed to see
    rows.forEach(r => { for(const id of r.slice(0,3)) if(rec.names && id in rec.names) names[id] = rec.names[id]; });
    history[k] = {savedAt: rec.savedAt, names, rows};
  }
  const out = {teams, history, today: todayKey(), hasAdmin: !!db.admin};
  if(me.role === "admin"){
    out.me = {role: "admin", username: db.admin ? db.admin.username : ""};
    out.users = db.users.map(u => ({id: u.id, username: u.username, scope: u.scope}));
  } else {
    const sl = scopeLabel(db, me.user.scope);
    out.me = {role: "user", username: me.user.username, scope: me.user.scope, label: sl};
  }
  return out;
}

/* ---------- daily Store record (today, India time) ---------- */
function snapshotToday(db){
  const k = todayKey(), names = {}, rows = [];
  db.teams.forEach(t => { names[t.id] = t.name;
    t.departments.forEach(d => { names[d.id] = d.name;
      d.contractors.forEach(c => { names[c.id] = c.name; const f = c.presentDate === k;
        rows.push([t.id, d.id, c.id, c.required, f ? c.present : 0, f ? 1 : 0]); }); }); });
  db.history = db.history || {};
  if(!rows.some(r => r[5])){ delete db.history[k]; return; }
  db.history[k] = {savedAt: Date.now(), names, rows};
}

/* ---------- changes ---------- */
function move(list, id, to){
  const from = list.findIndex(x => x.id === id); if(from < 0) return;
  to = Math.min(Math.max(Math.floor(Number(to)) || 0, 0), list.length - 1);
  const [x] = list.splice(from, 1); list.splice(to, 0, x);
}
function usernameTaken(db, name, exceptId){
  const n = name.toLowerCase();
  if(db.admin && db.admin.username.toLowerCase() === n && exceptId !== "admin") return true;
  return db.users.some(u => u.id !== exceptId && u.username.toLowerCase() === n);
}
function checkUserInput(db, b, exceptId, pwRequired){
  const username = clean(b.username, 40);
  if(!username || /\s/.test(username)) throw httpErr(400, "Enter a User ID without spaces.");
  if(usernameTaken(db, username, exceptId)) throw httpErr(400, "This User ID is already taken.");
  const pw = String(b.password || "");
  if((pwRequired || pw) && pw.length < 4) throw httpErr(400, "Password must be at least 4 characters.");
  return {username, pw};
}
function checkScope(db, s){
  if(!s || !["team","dept","contractor"].includes(s.type)) throw httpErr(400, "Choose an access level.");
  const scope = {type: s.type, teamId: String(s.teamId || "")};
  if(s.type !== "team") scope.deptId = String(s.deptId || "");
  if(s.type === "contractor") scope.contractorId = String(s.contractorId || "");
  if(!scopeLabel(db, scope)) throw httpErr(400, "Choose a valid team / department / contractor.");
  return scope;
}

function applyOp(db, me, op){
  const admin = me.role === "admin";
  const scope = admin ? null : me.user.scope;
  const T = id => { const t = db.teams.find(x => x.id === id); if(!t) throw httpErr(404, "Team not found."); return t; };
  const D = id => { for(const t of db.teams){ const d = t.departments.find(x => x.id === id); if(d) return {t, d}; } throw httpErr(404, "Department not found."); };
  const needAdmin = () => { if(!admin) throw httpErr(403, "Only the admin can do this."); };
  const k = todayKey();
  switch(op.type){
    /* numbers: admin, or a user whose access covers this contractor */
    case "setRequired": case "setPresent": {
      const f = findContractor(db, op.id); if(!f) throw httpErr(404, "Contractor not found.");
      if(!scopeOk(scope, f.t.id, f.d.id, f.c.id)) throw httpErr(403, "Not assigned to you.");
      if(op.type === "setRequired") f.c.required = num(op.value);
      else if(op.value === null || op.value === ""){ f.c.present = 0; f.c.presentDate = null; }
      else { f.c.present = num(op.value); f.c.presentDate = k; }
      f.d.updatedAt = Date.now(); snapshotToday(db); return;
    }
    /* everything else: admin only */
    case "addTeam": needAdmin(); db.teams.push({id: uid(), name: clean(op.name) || "Team", departments: []}); return;
    case "renameTeam": needAdmin(); T(op.id).name = clean(op.name) || T(op.id).name; snapshotToday(db); return;
    case "delTeam": needAdmin(); db.teams = db.teams.filter(t => t.id !== op.id); snapshotToday(db); return;
    case "moveTeam": needAdmin(); move(db.teams, op.id, op.to); return;
    case "addDept": needAdmin(); T(op.teamId).departments.push({id: uid(), name: clean(op.name) || "Department", contractors: []}); return;
    case "renameDept": { needAdmin(); const {d} = D(op.id); d.name = clean(op.name) || d.name; snapshotToday(db); return; }
    case "delDept": { needAdmin(); const {t} = D(op.id); t.departments = t.departments.filter(d => d.id !== op.id); snapshotToday(db); return; }
    case "moveDept": { needAdmin(); const {t} = D(op.id); move(t.departments, op.id, op.to); return; }
    case "addContractor": { needAdmin(); const {d} = D(op.deptId);
      const filled = !(op.present === null || op.present === "" || op.present === undefined);
      d.contractors.push({id: uid(), name: clean(op.name) || "Contractor", required: num(op.required), present: filled ? num(op.present) : 0, presentDate: filled ? k : null});
      d.updatedAt = Date.now(); snapshotToday(db); return; }
    case "editContractor": { needAdmin(); const f = findContractor(db, op.id); if(!f) throw httpErr(404, "Contractor not found.");
      f.c.name = clean(op.name) || f.c.name; f.c.required = num(op.required);
      if(op.present === null || op.present === ""){ f.c.present = 0; f.c.presentDate = null; } else { f.c.present = num(op.present); f.c.presentDate = k; }
      f.d.updatedAt = Date.now(); snapshotToday(db); return; }
    case "delContractor": { needAdmin(); const f = findContractor(db, op.id); if(!f) return;
      f.d.contractors = f.d.contractors.filter(c => c.id !== op.id); f.d.updatedAt = Date.now(); snapshotToday(db); return; }
    case "moveContractor": { needAdmin(); const f = findContractor(db, op.id); if(f) move(f.d.contractors, op.id, op.to); return; }
    case "delDay": needAdmin(); if(db.history) delete db.history[String(op.key)]; return;
    case "addUser": { needAdmin(); const {username, pw} = checkUserInput(db, op, null, true);
      db.users.push({id: uid(), username, pw: hashPw(pw), scope: checkScope(db, op.scope)}); return; }
    case "editUser": { needAdmin(); const u = db.users.find(x => x.id === op.id); if(!u) throw httpErr(404, "User not found.");
      const {username, pw} = checkUserInput(db, op, u.id, false);
      u.username = username; u.scope = checkScope(db, op.scope); if(pw) u.pw = hashPw(pw); return; }
    case "delUser": needAdmin(); db.users = db.users.filter(u => u.id !== op.id); return;
    case "changeAdmin": { needAdmin(); const {username, pw} = checkUserInput(db, op, "admin", false);
      db.admin.username = username; if(pw) db.admin.pw = hashPw(pw); return; }
    /* one-time upload of data that was saved in a browser before the app went online */
    case "importLocal": { needAdmin();
      if(db.teams.length) throw httpErr(409, "The online app already has teams, so nothing was imported.");
      const src = op.data || {};
      if(!Array.isArray(src.teams)) throw httpErr(400, "Nothing to import.");
      db.teams = src.teams.map(t => ({id: clean(t.id, 40) || uid(), name: clean(t.name) || "Team",
        departments: (t.departments || []).map(d => ({id: clean(d.id, 40) || uid(), name: clean(d.name) || "Department", updatedAt: Number(d.updatedAt) || undefined,
          contractors: (d.contractors || []).map(c => ({id: clean(c.id, 40) || uid(), name: clean(c.name) || "Contractor",
            required: num(c.required), present: num(c.present), presentDate: typeof c.presentDate === "string" ? c.presentDate.slice(0,10) : null}))}))}));
      const h = {}; for(const [key, rec] of Object.entries(src.history || {})){
        if(!/^\d{4}-\d{2}-\d{2}$/.test(key) || !rec || !Array.isArray(rec.rows)) continue;
        h[key] = {savedAt: Number(rec.savedAt) || Date.now(), names: rec.names || {}, rows: rec.rows.filter(Array.isArray).map(r => r.slice(0,6))};
      }
      db.history = h; snapshotToday(db); return; }
    default: throw httpErr(400, "Unknown action.");
  }
}

/* ---------- HTTP ---------- */
async function readBody(req){
  if(req.body && typeof req.body === "object") return req.body;
  if(typeof req.body === "string"){ try{ return JSON.parse(req.body); }catch(e){ return {}; } }
  const chunks = []; for await (const c of req) chunks.push(c);
  try{ return JSON.parse(Buffer.concat(chunks).toString() || "{}"); }catch(e){ return {}; }
}
function send(res, status, obj){
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(obj));
}
const loginTries = new Map();   // simple slow-down for repeated wrong passwords (per server instance)

export default async function handler(req, res){
  // allow the copy opened from a computer (localhost) to talk to the online app
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if(req.method === "OPTIONS"){ res.statusCode = 204; return res.end(); }
  try{
    if(!SECRET) throw httpErr(500, "Storage is not connected yet. In Vercel: Storage → create a Blob store → connect it to this project → Redeploy.");
    const b = req.method === "GET" ? {action: (req.query && req.query.action) || "state"} : await readBody(req);
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");

    if(b.action === "status"){
      const {db} = await readDB();
      return send(res, 200, {hasAdmin: !!db.admin, today: todayKey()});
    }
    if(b.action === "setup"){                       // first admin, only while none exists
      const {db, out} = await transact(db => {
        if(db.admin) throw httpErr(409, "Admin already exists. Please log in.");
        const {username, pw} = checkUserInput(db, b, "admin", true);
        db.admin = {username, pw: hashPw(pw)};
      });
      return send(res, 200, {token: sign("admin", db.admin.pw.salt.slice(0,8)), state: viewFor(db, {role: "admin"})});
    }
    if(b.action === "login"){
      const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0];
      const tries = loginTries.get(ip) || 0;
      if(tries > 4) await new Promise(r => setTimeout(r, Math.min(tries, 10) * 400));
      const {db} = await readDB();
      const u = clean(b.username, 40).toLowerCase(), p = String(b.password || "");
      if(db.admin && db.admin.username.toLowerCase() === u && checkPw(db.admin.pw, p)){
        loginTries.delete(ip);
        return send(res, 200, {token: sign("admin", db.admin.pw.salt.slice(0,8)), state: viewFor(db, {role: "admin"})});
      }
      const user = db.users.find(x => x.username.toLowerCase() === u);
      if(user && checkPw(user.pw, p)){
        loginTries.delete(ip);
        if(!scopeLabel(db, user.scope)) throw httpErr(403, "This user's team/department/contractor no longer exists. Ask the admin.");
        return send(res, 200, {token: sign(user.id, user.pw.salt.slice(0,8)), state: viewFor(db, {role: "user", user})});
      }
      loginTries.set(ip, tries + 1);
      throw httpErr(401, "Wrong User ID or password.");
    }

    // everything below needs a valid login
    if(b.action === "state"){
      const {db} = await readDB();
      const me = whoIs(db, token); if(!me) throw httpErr(401, "Please log in again.");
      return send(res, 200, {state: viewFor(db, me)});
    }
    if(b.action === "op"){
      const {db, out} = await transact(db => {
        const me = whoIs(db, token); if(!me) throw httpErr(401, "Please log in again.");
        applyOp(db, me, b.op || {});
        return {me};
      });
      // re-check the login against the saved data (e.g. admin changed their own password → new token)
      const me = whoIs(db, token);
      const fresh = !me && out.me.role === "admin" ? {token: sign("admin", db.admin.pw.salt.slice(0,8))} : {};
      return send(res, 200, {state: viewFor(db, me || out.me), ...fresh});
    }
    throw httpErr(400, "Unknown request.");
  }catch(e){
    send(res, e.status || 500, {error: e.status ? e.message : "Server error. Please try again."});
    if(!e.status) console.error(e);
  }
}
