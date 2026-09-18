import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { fileURLToPath } from 'node:url';
import { CampusSession, CAMPUS_ORIGIN, makeSessionId } from './campus.js';

const ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), '../..'));
const FRONTEND = path.join(ROOT, 'frontend');
const DATA = path.join(ROOT, 'data');
const snapshot = JSON.parse(fs.readFileSync(path.join(DATA, 'campus.snapshot.json'), 'utf8'));
const sessions = new Map();
const attempts = new Map();
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const TTL = 1000 * 60 * 60 * 8;
const APP_VERSION = '13.0.0-final';
const DEBUG_CAMPUS = process.env.DEBUG_CAMPUS === 'true';

function normalizeCampusUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return CAMPUS_ORIGIN;
  let u;
  try { u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`); }
  catch { throw Object.assign(new Error('Укажите корректную ссылку на Campus.'), { statusCode: 400 }); }
  if (!['http:', 'https:'].includes(u.protocol)) throw Object.assign(new Error('Campus URL должен начинаться с http:// или https://.'), { statusCode: 400 });
  if (u.username || u.password) throw Object.assign(new Error('Campus URL не должен содержать логин или пароль.'), { statusCode: 400 });
  if (u.search || u.hash) u.search = '', u.hash = '';
  return u.toString().replace(/\/$/, '');
}
function campusUrlOf(session) { return String(session?.campus?.baseUrl || CAMPUS_ORIGIN).replace(/\/$/, ''); }

function json(res, status, body, headers = {}) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers });
  res.end(JSON.stringify(body));
}
function html(res, status, body) {
  res.writeHead(status, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
  res.end(body);
}
async function rawBody(req, limit = 20 * 1024 * 1024) {
  const chunks = []; let n = 0;
  for await (const c of req) { n += c.length; if (n > limit) throw new Error('Слишком большой запрос.'); chunks.push(c); }
  return Buffer.concat(chunks);
}
async function bodyJson(req) { const b = await rawBody(req); return JSON.parse(b.toString('utf8') || '{}'); }
function parseCookies(req) { const out = {}; for (const p of (req.headers.cookie || '').split(';')) { const i = p.indexOf('='); if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); } return out; }
function getSession(req) { const id = parseCookies(req).nova_sid; return id ? sessions.get(id) : null; }
function setSid(res, id) { const secure = process.env.NODE_ENV === 'production'; res.setHeader('set-cookie', `nova_sid=${encodeURIComponent(id)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${TTL / 1000}${secure ? '; Secure' : ''}`); }
function clearSid(res) { res.setHeader('set-cookie', 'nova_sid=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'); }
function requireSession(req, res) { const s = getSession(req); if (!s) { json(res, 401, { ok: false, error: 'Сначала подключите Campus.' }); return null; } s.cache ||= {}; s.inflight ||= new Map(); s.lastSeen = Date.now(); return s; }
function sessionFlight(s, key, fn) {
  s.inflight ||= new Map();
  const current = s.inflight.get(key);
  if (current) return current;
  const p = Promise.resolve().then(fn).finally(() => { if (s.inflight.get(key) === p) s.inflight.delete(key); });
  s.inflight.set(key, p);
  return p;
}
function invalidateNovaSession(req, res, s) {
  const sid = parseCookies(req).nova_sid;
  if (sid) sessions.delete(sid);
  clearSid(res);
  try { s?.campus?.invalidate(); } catch {}
}
function isAuthError(e) { return e?.code === 'AUTH_EXPIRED' || /сессия campus истекла|campus-сессия|invalidtoken|requirelogin|invalidsesskey/i.test(String(e?.message || '')); }
function safePath(p, baseUrl = CAMPUS_ORIGIN) {
  const raw = String(p || '/');
  if (!raw.startsWith('/') || raw.includes('\0') || raw.includes('\\')) throw Object.assign(new Error('Недопустимый путь.'), { statusCode: 400 });
  const rawPath = raw.split(/[?#]/,1)[0];
  let decodedPath;
  try { decodedPath = decodeURIComponent(rawPath); } catch { throw Object.assign(new Error('Недопустимый путь.'), { statusCode: 400 }); }
  if (decodedPath.includes('\0') || decodedPath.includes('\\') || decodedPath.split('/').some(segment => segment === '..')) throw Object.assign(new Error('Недопустимый путь.'), { statusCode: 400 });
  const u = new URL(raw, baseUrl);
  if (u.origin !== new URL(baseUrl).origin) throw Object.assign(new Error('Недопустимый путь.'), { statusCode: 400 });
  return u.pathname + u.search + u.hash;
}
function rateLimit(ip) { const now = Date.now(); const v = attempts.get(ip) || { t: now, n: 0 }; if (now - v.t > 60000) { v.t = now; v.n = 0; } v.n++; attempts.set(ip, v); return v.n <= 12; }
function sanitizeRedirect(location, baseUrl = CAMPUS_ORIGIN) {
  try { const u = new URL(location, baseUrl); if (u.origin === new URL(baseUrl).origin) return u.pathname + u.search + u.hash; return location; }
  catch { return location; }
}
function rewriteResourceHeaders(upstream, baseUrl = CAMPUS_ORIGIN) {
  const ct = upstream.headers.get('content-type') || 'application/octet-stream';
  const headers = { 'cache-control': 'no-store', 'x-campus-nova-proxy': '1', 'content-type': ct };
  const loc = upstream.headers.get('location'); if (loc) headers.location = '/campus' + sanitizeRedirect(loc, baseUrl);
  return headers;
}
function isLikelyDownloadLocation(location, contentType = '') {
  return /\.(?:pdf|docx?|xlsx?|pptx?|zip|rar|7z)(?:$|[?#])/i.test(location || '') || /application\/(?:pdf|zip|x-7z-compressed|x-rar-compressed|octet-stream)/i.test(contentType || '');
}
function isHtml(contentType) { return /text\/html|application\/xhtml\+xml/i.test(contentType || ''); }
function isBinary(contentType) { return /application\/(?:pdf|zip|x-7z-compressed|x-rar-compressed|msword|vnd\.|octet-stream)|application\/x-download|audio\/|video\//i.test(contentType || ''); }

async function proxyCampus(req, res, pathName, q, s) {
  const baseUrl = campusUrlOf(s);
  const targetPath = safePath(pathName.replace(/^\/campus/, '') || '/', baseUrl);
  const query = q.toString(); const target = targetPath + (query ? `?${query}` : '');
  const body = ['GET', 'HEAD'].includes(req.method) ? undefined : await rawBody(req);
  const headers = {};
  for (const key of ['content-type', 'accept', 'range']) if (req.headers[key]) headers[key] = req.headers[key];
  headers.referer = baseUrl + target; headers.origin = baseUrl;
  const upstream = await s.campus.proxy(target, { method: req.method, headers, body, redirect: 'manual' });
  res.writeHead(upstream.status, rewriteResourceHeaders(upstream, baseUrl));
  if (req.method === 'HEAD') return res.end();
  res.end(Buffer.from(await upstream.arrayBuffer()));
}

async function mapLimit(items, concurrency, fn) {
  const out = new Array(items.length); let cursor = 0;
  async function worker() { while (true) { const i = cursor++; if (i >= items.length) return; try { out[i] = await fn(items[i], i); } catch { out[i] = null; } } }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, items.length || 1)) }, () => worker()));
  return out;
}
function isFresh(v, ttl = 15000) { return v && Date.now() - v.t < ttl; }
function flattenCalendar(calendar) {
  const events = [];
  for (const week of calendar?.weeks || []) for (const day of week.days || []) for (const event of day.events || []) events.push({ ...event, timestart: event.timestart ?? day.timestamp });
  return events;
}

async function ensureActivityGraph(s, { force = false } = {}) {
  const cacheKey = 'activity-graph';
  return sessionFlight(s, cacheKey, async () => {
    if (!force) {
      const cached = s.cache?.[cacheKey];
      if (cached && Date.now() - cached.t < 60000 && s.campus.getCourseGraph().allCourses().length) return cached.v;
    }
    const courses = await sessionFlight(s, 'courses', () => s.campus.getAdapter().listCourses());
    if (!Array.isArray(courses) || !courses.length) {
      s.cache[cacheKey] = { t: Date.now(), v: { loaded: 0, failed: 0, total: 0 } };
      return s.cache[cacheKey].v;
    }
    let failed = 0;
    await mapLimit(courses, 5, async (c) => {
      try { await s.campus.course(c.id, { force }); return true; }
      catch { failed += 1; return false; }
    });
    const v = { loaded: s.campus.getCourseGraph().allCourses().length, failed, total: courses.length };
    s.cache[cacheKey] = { t: Date.now(), v };
    return v;
  });
}

function invalidateActivityGraph(s) {
  delete s.cache['activity-graph'];
  try {
    const cache = s.campus.cache;
    if (cache?.keys && cache?.delete) {
      for (const key of [...cache.keys()]) {
        if (key === 'courses' || String(key).startsWith('course:')) cache.delete(key);
      }
    }
    s.campus.getCourseGraph().clear();
  } catch {}
}

function publicActivity(activity) {
  if (!activity) return null;
  const out = JSON.parse(JSON.stringify(activity));
  if (out.source) out.source.raw = null;
  return out;
}

function publicCourse(course) {
  if (!course) return null;
  const out = JSON.parse(JSON.stringify(course));
  if (out.source) out.source.raw = null;
  for (const section of out.sections || []) for (const a of section.activities || []) if (a.source) a.source.raw = null;
  return out;
}

function publicForm(form) {
  if (!form) return null;
  return {
    action: form.action, method: form.method, enctype: form.enctype, id: form.id, name: form.name,
    controls: (form.controls || []).map(c => ({ tag: c.tag, type: c.type, name: c.name, value: /hidden|password/i.test(c.type) ? undefined : c.value, required: c.required, disabled: c.disabled, checked: c.checked, options: c.options, submitter: c.submitter })),
    submitters: form.submitters || [], hasSesskey: Boolean(form.hasSesskey), hasFileManager: Boolean(form.hasFileManager),
  };
}

function publicActivityResult(result) {
  if (!result) return null;
  const out = { ...result };
  delete out.response; delete out.body; delete out.raw;
  if (out.activity) out.activity = publicActivity(out.activity);
  if (out.form) out.form = publicForm(out.form);
  if (typeof out.html === 'string') {
    out.html = sSanitize(out.html, out.redirectedPath || out.activityRef?.url || '/');
  }
  if (out.file && out.file.fileurl) out.file = { ...out.file };
  return out;
}

function sSanitize(htmlValue, basePath) {
  return String(htmlValue || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<input\b[^>]*\bname=["'][^"']*(?:sesskey|token|password|passwd|cookie|authorization|secret|access_token|refresh_token)[^"']*["'][^>]*>/gi, '')
    .replace(/\s+on\w+=\"[^\"]*\"/gi, '')
    .replace(/\s+on\w+='[^']*'/gi, '');
}

function activityRefFromQuery(q, body = {}) {
  const src = { ...Object.fromEntries(q.entries()), ...body };
  const courseId = Number(src.courseId || 0); const cmid = Number(src.cmid || 0); const instance = Number(src.instance || 0);
  return { courseId, cmid: cmid || null, instance: instance || null, contextId: src.contextId ? Number(src.contextId) : null, type: String(src.type || '').toLowerCase() || null };
}

async function globalActivities(s, { type = null, types = null, capability = null, materials = false, force = false } = {}) {
  await ensureActivityGraph(s, { force });
  let items = s.campus.getActivityIndex().all();
  if (type) items = s.campus.getActivityIndex().getActivitiesByType(type);
  if (Array.isArray(types) && types.length) {
    const allowed = new Set(types.map(v => String(v).toLowerCase()));
    items = items.filter(a => allowed.has(String(a.ref.type).toLowerCase()));
  }
  if (capability) items = s.campus.getActivityIndex().getActivitiesWithCapability(capability);
  if (materials) {
    const allowed = new Set(['resource','page','folder','lesson','book','lanebs','znaniumcombook','file']);
    items = items.filter(a => allowed.has(String(a.ref.type).toLowerCase()));
  }
  return items.map(publicActivity);
}

function globalFiles(s, { force = false } = {}) {
  const activities = s.campus.getActivityIndex().getActivitiesWithCapability('canDownload');
  const out = [];
  for (const activity of activities) {
    for (const file of (activity.content?.files || [])) {
      if (!file?.fileurl) continue;
      out.push({ activity: publicActivity(activity), file: {
        filename: file.filename || activity.identity?.name || 'Файл',
        filepath: file.filepath || '/',
        filesize: Number(file.filesize || 0) || 0,
        mimetype: file.mimetype || '',
        fileurl: file.fileurl,
      }});
    }
  }
  return out;
}

async function dashboardData(s) {
  const now = new Date();
  const jobs = {
    courses: () => sessionFlight(s, 'courses', () => s.campus.getAdapter().listCourses()),
    calendar: () => sessionFlight(s, `calendar:${now.getFullYear()}:${now.getMonth()+1}:${now.getDate()}`, () => s.campus.calendar({ year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() })),
    grades: () => sessionFlight(s, 'grades-overview', () => s.campus.getAdapter().loadGrades()),
  };
  const entries = await Promise.all(Object.entries(jobs).map(async ([key, fn]) => {
    try { return [key, { ok: true, value: await fn() }]; }
    catch (e) { if (isAuthError(e)) throw e; return [key, { ok: false, error: e?.message || 'Не удалось загрузить блок.' }]; }
  }));
  const blocks = Object.fromEntries(entries);
  const courses = blocks.courses.ok ? blocks.courses.value : null;
  let tasks = null;
  if (Array.isArray(courses)) {
    try {
      const limited = courses.slice(0, 8);
      const courseData = (await mapLimit(limited, 4, c => s.campus.course(c.id))).filter(Boolean);
      tasks = [];
      for (const c of courseData) for (const sec of c.sections || []) for (const a of sec.activities || []) if (['assign', 'quiz'].includes(a.type)) {
        const due = (a.dates || []).find(x => /срок|due|deadline/i.test(x.label || ''));
        tasks.push({ id: a.id, courseId: c.id, course: c.title, name: a.name, type: a.type, url: a.url, due: due?.timestamp || null });
      }
      const events = flattenCalendar(blocks.calendar.ok ? blocks.calendar.value : null);
      for (const e of events) for (const t of tasks) if (!t.due && t.courseId === Number(e.course?.id) && (e.modulename === t.type || t.type === 'assign')) { t.due = e.timestart; break; }
      tasks.sort((a,b) => Number(a.due || 9e18) - Number(b.due || 9e18));
      blocks.tasks = { ok: true, value: tasks };
    } catch (e) { blocks.tasks = { ok: false, error: e?.message || 'Не удалось загрузить задания.' }; }
  } else {
    blocks.tasks = { ok: false, error: 'Задания зависят от списка курсов.' };
  }
  return {
    courses: blocks.courses.ok ? blocks.courses.value : [],
    calendar: blocks.calendar.ok ? blocks.calendar.value : {},
    grades: blocks.grades.ok ? blocks.grades.value : [],
    tasks: blocks.tasks.ok ? blocks.tasks.value : [],
    errors: Object.fromEntries(Object.entries(blocks).filter(([,v]) => !v.ok).map(([k,v]) => [k, v.error]))
  };
}

async function api(req, res, route, q) {
  let activeSession = null;
  try {
    if (route === '/api/health' && req.method === 'GET') return json(res, 200, { ok: true, version: APP_VERSION, defaultCampus: CAMPUS_ORIGIN });
    if (route === '/api/demo/snapshot' && req.method === 'GET') return json(res, 200, snapshot);
    if (route === '/api/auth/status' && req.method === 'GET') {
      const s = getSession(req);
      const snapshot = s?.campus?.safeSessionSnapshot?.() || null;
      return json(res, 200, { ok: true, connected: Boolean(s), user: s?.campus.user || null, campusUrl: s ? campusUrlOf(s) : null, mode: snapshot?.hasToken ? (snapshot?.hasWebSession ? 'token+session' : 'token') : snapshot?.hasWebSession ? 'session' : s ? 'connected' : 'none', webSession: snapshot ? { hasWebSession: snapshot.hasWebSession, hasSesskey: snapshot.hasSesskey, cookieNames: snapshot.cookieNames } : null });
    }
    if (route === '/api/auth/login' && req.method === 'POST') {
      if (!rateLimit(req.socket.remoteAddress || 'local')) return json(res, 429, { ok: false, error: 'Слишком много попыток входа. Подождите минуту.' });
      const b = await bodyJson(req); const username = String(b.username || '').trim(); const password = String(b.password || '');
      let campusUrl; try { campusUrl = normalizeCampusUrl(b.campusUrl); } catch (e) { return json(res, e.statusCode || 400, { ok: false, error: e.message }); }
      if (!username || !password) return json(res, 400, { ok: false, error: 'Введите логин и пароль Campus.' });
      const campus = new CampusSession({ baseUrl: campusUrl, debug: DEBUG_CAMPUS }); const result = await campus.login(username, password);
      const sid = makeSessionId(); campus.setSessionScope(sid); sessions.set(sid, { campus, cache: {}, inflight: new Map(), createdAt: Date.now(), lastSeen: Date.now() }); setSid(res, sid);
      return json(res, 200, { ok: true, user: result.user, campusUrl, mode: result.mode || (result.token ? 'token' : 'session'), warning: campus.cache.get('authWarning') || campus.cache.get('tokenCapabilityWarning') || null });
    }
    if (route === '/api/auth/logout' && req.method === 'POST') { const sid = parseCookies(req).nova_sid; if (sid) sessions.delete(sid); clearSid(res); return json(res, 200, { ok: true }); }

    if (route === '/api/debug/contracts' && req.method === 'GET') {
      if (!DEBUG_CAMPUS) return json(res, 404, { ok: false, error: 'Debug mode disabled.' });
      const s = requireSession(req, res); if (!s) return;
      return json(res, 200, { ok: true, contracts: s.campus.contracts.describe(), session: s.campus.safeSessionSnapshot() });
    }
    if (route === '/api/debug/traces' && req.method === 'GET') {
      if (!DEBUG_CAMPUS) return json(res, 404, { ok: false, error: 'Debug mode disabled.' });
      const s = requireSession(req, res); if (!s) return;
      const limit = Math.min(Number(q.get('limit') || 100), 300);
      return json(res, 200, { ok: true, traces: s.campus.trace.list(limit), session: s.campus.safeSessionSnapshot() });
    }
    if (route === '/api/debug/traces/clear' && req.method === 'POST') {
      if (!DEBUG_CAMPUS) return json(res, 404, { ok: false, error: 'Debug mode disabled.' });
      const s = requireSession(req, res); if (!s) return;
      s.campus.trace.clear(); return json(res, 200, { ok: true });
    }

    const s = requireSession(req, res); if (!s) return;
    activeSession = s;
    if (route === '/api/dashboard' && req.method === 'GET') { const cached=s.cache.dashboard; if(cached && Date.now()-cached.t<12000) return json(res,200,{ok:true,...cached.v}); const data=await sessionFlight(s,'dashboard',()=>dashboardData(s.campus)); s.cache.dashboard={t:Date.now(),v:{data}}; return json(res,200,{ok:true,data}); }
    if (route === '/api/courses' && req.method === 'GET') return json(res, 200, { ok: true, courses: await sessionFlight(s,'courses',()=>s.campus.getAdapter().listCourses()) });
    if (route === '/api/calendar' && req.method === 'GET') { const key=`calendar:${q.get('year')||''}:${q.get('month')||''}:${q.get('day')||''}`; return json(res,200,{ok:true,calendar:await sessionFlight(s,key,()=>s.campus.getAdapter().loadCalendar({ year:q.get('year'),month:q.get('month'),day:q.get('day') }))}); }
    if (route === '/api/messages' && req.method === 'GET') return json(res, 200, { ok: true, messages: await sessionFlight(s,'messages',()=>s.campus.getAdapter().listMessages()) });
    if (route === '/api/messages/conversation' && req.method === 'GET') { const id=q.get('id'); if(!id)return json(res,400,{ok:false,error:'Не указан диалог.'}); return json(res,200,{ok:true,conversation:await sessionFlight(s,`conversation:${id}`,()=>s.campus.getAdapter().getConversation(id))}); }
    if (route === '/api/messages/send' && req.method === 'POST') { const b = await bodyJson(req); const id = Number(b.conversationId); const text = String(b.text || ''); if (!id || !text.trim()) return json(res, 400, { ok:false, error:'Введите сообщение.' }); const sent = await s.campus.sendConversationMessage(id, text); await s.campus.markConversationRead(id); return json(res, 200, { ok:true, sent }); }
    if (route === '/api/messages/mark-read' && req.method === 'POST') { const b = await bodyJson(req); const id = Number(b.conversationId); if (!id) return json(res,400,{ok:false,error:'Не указан диалог.'}); await s.campus.markConversationRead(id); return json(res,200,{ok:true}); }
    if (route === '/api/profile' && req.method === 'GET') return json(res,200,{ok:true,profile:await sessionFlight(s,'profile',()=>s.campus.getAdapter().loadProfile())||s.campus.user});
    if (route === '/api/course' && req.method === 'GET') { const id=q.get('id'); if(!id)return json(res,400,{ok:false,error:'Не указан курс.'}); const force=q.get('refresh')==='1'; const verify=q.get('verify')==='1'; return json(res,200,{ok:true,course:await sessionFlight(s,`course:${id}:${verify?'verified':'normal'}`,()=>s.campus.getAdapter().loadCourse(id,{force,verify}))}); }
    if (route === '/api/page' && req.method === 'GET') { const p = safePath(q.get('path') || '/my/', campusUrlOf(s)); return json(res, 200, { ok: true, page: await s.campus.contentPage(p) }); }
    if (route === '/api/grades' && req.method === 'GET') { const id=q.get('courseId'); return id ? json(res,200,{ok:true,items:await sessionFlight(s,`grades:${id}`,()=>s.campus.getAdapter().loadGrades(id))}) : json(res,200,{ok:true,courses:await sessionFlight(s,'grades-overview',()=>s.campus.getAdapter().loadGrades())}); }
    if (route === '/api/tasks' && req.method === 'GET') {
      return json(res,200,{ok:true,tasks:await globalActivities(s,{type:'assign',force:q.get('refresh')==='1'})});
    }
    if (route === '/api/files' && req.method === 'GET') {
      const force = q.get('refresh') === '1';
      await ensureActivityGraph(s, { force });
      return json(res,200,{ok:true,files:globalFiles(s,{force})});
    }
    if (route === '/api/tests' && req.method === 'GET') {
      return json(res,200,{ok:true,tests:await globalActivities(s,{type:'quiz',force:q.get('refresh')==='1'})});
    }
    if (route === '/api/materials' && req.method === 'GET') return json(res,200,{ok:true,materials:await globalActivities(s,{materials:true,force:q.get('refresh')==='1'})});
    if (route === '/api/activity' && req.method === 'GET') {
      await ensureActivityGraph(s);
      const ref = activityRefFromQuery(q);
      if (!ref.courseId || (!ref.cmid && !ref.instance)) return json(res,400,{ok:false,error:'Не указан activity reference.'});
      const action = String(q.get('action') || 'open');
      try {
        const result = await s.campus.getAdapter().executeActivity(ref, action, {}, { timeoutMs: Number(q.get('timeoutMs') || 30000) });
        return json(res,200,{ok:true,activity:publicActivity(result.activity),result:publicActivityResult(result)});
      } catch (e) {
        if (e?.code === 'FALLBACK_REQUIRED') {
          const activity = s.campus.getActivityIndex().getActivity(ref);
          return json(res,200,{ok:true,fallback:s.campus.getActivityEngine().fallback(ref),activity:publicActivity(activity),errorCode:e.code,message:e.message});
        }
        throw e;
      }
    }
    if (route === '/api/activity/action' && req.method === 'POST') {
      const b = await bodyJson(req); const ref = activityRefFromQuery(new URLSearchParams(), b?.ref || {}); const action = String(b?.action || 'open');
      if (!ref.courseId || (!ref.cmid && !ref.instance)) return json(res,400,{ok:false,error:'Не указан activity reference.'});
      await ensureActivityGraph(s);
      try {
        const result = await s.campus.getAdapter().executeActivity(ref, action, b?.payload || {}, { timeoutMs: Number(b?.timeoutMs || 30000) });
        if (['upload','save','submit','finish','start'].includes(action)) invalidateActivityGraph(s);
        return json(res,200,{ok:true,activity:publicActivity(result.activity),result:publicActivityResult(result)});
      } catch (e) {
        if (e?.code === 'UNVERIFIED_OPERATION' || e?.code === 'UNVERIFIED_CONTRACT') return json(res,409,{ok:false,error:e.message,code:e.code,phase:e.phase||'CONTRACT'});
        if (e?.code === 'FALLBACK_REQUIRED') {
          return json(res,409,{ok:false,error:e.message,code:e.code,fallback:s.campus.getActivityEngine().fallback(ref)});
        }
        throw e;
      }
    }
    if (route === '/api/activity/meta' && req.method === 'GET') {
      await ensureActivityGraph(s); const ref = activityRefFromQuery(q); const data = await s.campus.getActivityEngine().discover(ref);
      return json(res,200,{ok:true,activity:publicActivity(data.activity),driver:data.driver,capabilities:data.capabilities,actions:data.actions,fallback:data.fallback});
    }
    if (route === '/api/campus/action' && req.method === 'POST') {
      const p = safePath(q.get('path') || '/', campusUrlOf(s)); const body = await rawBody(req); const ct = req.headers['content-type'] || 'application/octet-stream';
      const upstream = await s.campus.proxy(p, { method:'POST', headers:{'content-type':ct,referer:campusUrlOf(s)+p,origin:campusUrlOf(s)}, body, redirect:'manual' });
      const location = upstream.headers.get('location'); const outCt = upstream.headers.get('content-type') || ''; if(upstream.status===401){ invalidateNovaSession(req,res,s); return json(res,401,{ok:false,error:'Сессия Campus истекла. Подключите Campus заново.'}); }
      if(upstream.status===403) return json(res,403,{ok:false,error:'Campus отказал в доступе к этому действию.'});
      if (location) {
        let target; try { const u=new URL(location,campusUrlOf(s)); if(u.origin!==new URL(campusUrlOf(s)).origin) throw new Error('Внешнее перенаправление не поддерживается.'); target=u.pathname+u.search+u.hash; } catch(e){ return json(res,400,{ok:false,error:e.message}); }
        if (isLikelyDownloadLocation(target,outCt)) return json(res,200,{ok:true,status:upstream.status,redirectedPath:target,downloadPath:target,success:true});
        try { const parsed=await s.campus.contentPage(target); return json(res,200,{ok:true,status:upstream.status,redirectedPath:target,page:parsed,success:upstream.status<400}); } catch(e){ return json(res,502,{ok:false,error:e.message,redirectedPath:target}); }
      }
      if (isHtml(outCt)) { const parsed=await s.campus.contentPage(p); return json(res,200,{ok:true,status:upstream.status,redirectedPath:p,page:parsed,success:upstream.status<400}); }
      const buf=Buffer.from(await upstream.arrayBuffer()); return json(res,200,{ok:upstream.status<400,status:upstream.status,redirectedPath:p,bodyBase64:buf.toString('base64'),contentType:outCt});
    }
    if (route === '/api/download' && req.method === 'GET') {
      const p = safePath(q.get('path') || '/', campusUrlOf(s));
      const { response: upstream, path: finalPath } = await s.campus.requestPage(p, 8);
      const ct = upstream.headers.get('content-type') || 'application/octet-stream';
      if (!upstream.ok) {
        const text = await upstream.text().catch(() => '');
        if (upstream.status === 401 || /login|вход на сайт|password/i.test(text)) {
          invalidateNovaSession(req, res, s);
          return json(res, 401, { ok: false, error: 'Сессия Campus истекла. Подключите Campus заново.' });
        }
        return json(res, upstream.status, { ok: false, error: `Campus вернул ${upstream.status}.` });
      }
      const cd = upstream.headers.get('content-disposition') || '';
      let filename = 'campus-file';
      const m = cd.match(/filename\*=UTF-8''([^;]+)|filename="?([^;"]+)/i);
      if (m) { try { filename = decodeURIComponent(m[1] || m[2] || filename); } catch {} }
      if (!m) { try { filename = decodeURIComponent(new URL(finalPath || p, campusUrlOf(s)).pathname.split('/').pop() || filename); } catch {} }
      if (isHtml(ct)) {
        const probe = (await upstream.clone().text()).slice(0, 12000);
        if (/name=["']password["']|Вход на сайт|login/i.test(probe)) {
          invalidateNovaSession(req, res, s);
          return json(res, 401, { ok: false, error: 'Сессия Campus истекла. Подключите Campus заново.' });
        }
      }
      filename = filename.replace(/[\r\n"\\/<>:*?|]+/g, '_').slice(0, 180) || 'campus-file';
      res.setHeader('cache-control', 'no-store');
      res.setHeader('x-content-type-options', 'nosniff');
      res.setHeader('content-type', ct);
      res.setHeader('content-disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
      for (const key of ['content-length', 'accept-ranges', 'etag']) { const value = upstream.headers.get(key); if (value) res.setHeader(key, value); }
      if (upstream.body) { const { Readable } = await import('node:stream'); return Readable.fromWeb(upstream.body).pipe(res); }
      return res.end();
    }
    if (route === '/api/campus/raw' && req.method === 'GET') { const p=safePath(q.get('path')||'/', campusUrlOf(s)); const upstream=await s.campus.proxy(p,{method:'GET',headers:{referer:campusUrlOf(s)+p,origin:campusUrlOf(s)},redirect:'follow'}); res.writeHead(upstream.status,rewriteResourceHeaders(upstream, campusUrlOf(s))); res.end(Buffer.from(await upstream.arrayBuffer())); return; }
    if (route.startsWith('/campus')) return proxyCampus(req,res,route,q,s);
    return json(res,404,{ok:false,error:'API route not found'});
  } catch(e) { console.error(e.stack||e); if(activeSession && isAuthError(e)){
    if(activeSession.campus?.token) return json(res,503,{ok:false,error:'Веб-сессия Campus истекла. Nova сохранила подключение, но этот раздел требует повторной web-сессии.'});
    invalidateNovaSession(req,res,activeSession); return json(res,401,{ok:false,error:'Сессия Campus истекла. Подключите Campus заново.'});
  } return json(res,e.statusCode||502,{ok:false,error:e?.message||'Ошибка соединения с Campus.'}); }
}

const MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon','.woff':'font/woff','.woff2':'font/woff2'};
function staticFile(res,p){ const rel=p==='/'?'/index.html':p; const file=path.normalize(path.join(FRONTEND,rel)); const rootPrefix=FRONTEND.endsWith(path.sep)?FRONTEND:FRONTEND+path.sep; if(file!==FRONTEND&&!file.startsWith(rootPrefix))return false; if(!fs.existsSync(file)||fs.statSync(file).isDirectory())return false; res.writeHead(200,{'content-type':MIME[path.extname(file).toLowerCase()]||'application/octet-stream','cache-control':'no-cache'}); fs.createReadStream(file).pipe(res); return true; }

const server=http.createServer(async(req,res)=>{
  try{
    const parsed=url.parse(req.url||'/',true); const route=parsed.pathname||'/'; const q=new URLSearchParams(parsed.query);
    if(route.startsWith('/api/')||route==='/campus'||route.startsWith('/campus/')) return api(req,res,route,q);
    if(req.method==='GET'&&staticFile(res,route)) return;
    if(req.method==='GET'){ const index=path.join(FRONTEND,'index.html'); const body=fs.readFileSync(index,'utf8'); return html(res,200,body); }
    return html(res,405,'<h1>Method Not Allowed</h1>');
  }catch(e){ console.error(e); json(res,500,{ok:false,error:e.message||'Server error'}); }
});
setInterval(()=>{const cut=Date.now()-TTL; for(const[id,s]of sessions) if(s.lastSeen<cut) sessions.delete(id);},60000).unref();
server.listen(PORT,HOST,()=>console.log(`Campus Nova ${APP_VERSION} running on http://${HOST}:${PORT}`));
