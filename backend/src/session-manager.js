import crypto from 'node:crypto';

const SENSITIVE_KEY = /^(?:authorization|cookie|set-cookie|x-auth-token|token|wstoken|sesskey|password|passwd|secret|client_secret|access_token|refresh_token)$/i;

export function redact(value, key = '', seen = new WeakSet()) {
  if (SENSITIVE_KEY.test(String(key))) return '[REDACTED]';
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    if (/^https?:\/\//i.test(value)) return redactUrl(value);
    return value.length > 500 ? `${value.slice(0, 500)}… [${value.length} chars]` : value;
  }
  if (typeof value !== 'object') return value;
  if (seen.has(value)) return '[Circular]';
  seen.add(value);
  if (Array.isArray(value)) return value.map(v => redact(v, '', seen));
  const out = {};
  for (const [k, v] of Object.entries(value)) out[k] = redact(v, k, seen);
  return out;
}

export function redactUrl(input) {
  try {
    const u = new URL(input);
    for (const key of [...u.searchParams.keys()]) {
      if (SENSITIVE_KEY.test(key)) u.searchParams.set(key, '[REDACTED]');
    }
    return `${u.pathname}${u.search}${u.hash}`;
  } catch {
    return String(input).replace(/(sesskey|wstoken|token|password|authorization|cookie)=[^&\s]+/gi, '$1=[REDACTED]');
  }
}

function cookiePairs(values = []) {
  const list = Array.isArray(values) ? values : [values];
  return list.flatMap(v => String(v || '').split(/,(?=\s*[^;=]+=)/)).map(v => v.split(';', 1)[0]).filter(Boolean);
}

export class SessionManager {
  constructor({ scopeId = crypto.randomBytes(12).toString('hex') } = {}) {
    this.scopeId = scopeId;
    this.jar = new Map();
    this.sesskey = null;
    this.userid = null;
    this.contextid = null;
    this.token = null;
    this.user = null;
    this.createdAt = Date.now();
    this.lastSeen = Date.now();
    this.expiresAt = null;
    this.cache = new Map();
    this.inflight = new Map();
    this.sessionController = new AbortController();
    this.recoveryPromise = null;
    this.recoveryHandler = null;
    this.webCookieNames = new Set();
  }

  touch() { this.lastSeen = Date.now(); }

  setRecoveryHandler(handler) {
    this.recoveryHandler = typeof handler === 'function' ? handler : null;
  }

  async refreshWebSession() {
    if (!this.recoveryHandler) return false;
    if (this.recoveryPromise) return this.recoveryPromise;
    this.recoveryPromise = Promise.resolve().then(() => this.recoveryHandler()).finally(() => { this.recoveryPromise = null; });
    return this.recoveryPromise;
  }

  singleFlight(key, fn) {
    const scoped = `${this.scopeId}:${String(key)}`;
    const existing = this.inflight.get(scoped);
    if (existing) return existing;
    const promise = Promise.resolve().then(fn).finally(() => {
      if (this.inflight.get(scoped) === promise) this.inflight.delete(scoped);
    });
    this.inflight.set(scoped, promise);
    return promise;
  }

  cacheGet(key, ttl = 15000) {
    const x = this.cache.get(String(key));
    return x && x.t != null && Date.now() - x.t < ttl ? x.v : null;
  }

  cacheSet(key, value) { this.cache.set(String(key), { t: Date.now(), v: value }); return value; }
  cacheDelete(key) { this.cache.delete(String(key)); }
  cacheClear() { this.cache.clear(); }

  setCookies(values) {
    for (const item of cookiePairs(values)) {
      const i = item.indexOf('=');
      if (i < 0) continue;
      const k = item.slice(0, i).trim();
      const v = item.slice(i + 1).trim();
      if (!v) this.jar.delete(k); else this.jar.set(k, v);
    }
  }

  replaceCookies(jar) {
    this.jar = jar instanceof Map ? jar : new Map();
  }

  cookieHeader() { return [...this.jar.entries()].map(([k, v]) => `${k}=${v}`).join('; '); }

  bindWebContext({ sesskey = null, contextid = null, userid = null, user = null, cookieNames = null } = {}) {
    if (sesskey !== undefined) this.sesskey = sesskey;
    if (contextid !== undefined) this.contextid = contextid;
    if (userid !== undefined) this.userid = userid;
    if (user !== undefined) this.user = user;
    if (Array.isArray(cookieNames)) {
      for (const name of cookieNames) if (name && this.jar.has(name)) this.webCookieNames.add(String(name));
    }
    if (!this.webCookieNames.size) {
      for (const name of this.jar.keys()) if (/^(?:MoodleSession|session-cookie)/i.test(String(name))) this.webCookieNames.add(String(name));
    }
    this.expiresAt = null;
    this.touch();
  }

  bindToken(token) { this.token = token || null; this.touch(); }

  invalidateWebSession() {
    const tracked = new Set([...this.webCookieNames]);
    for (const key of [...this.jar.keys()]) {
      if (/^MoodleSession/i.test(String(key)) || tracked.has(String(key))) this.jar.delete(key);
    }
    this.webCookieNames.clear();
    this.sesskey = null;
    this.contextid = null;
  }

  invalidate(reason = 'Сессия Campus истекла. Подключите Campus заново.') {
    try { this.sessionController.abort(); } catch {}
    this.sessionController = new AbortController();
    this.invalidateWebSession();
    this.token = null;
    this.userid = null;
    this.user = null;
    this.expiresAt = Date.now();
    this.cache.clear();
    this.inflight.clear();
    this.cache.set('lastAuthError', reason);
  }

  markExpired(expiresAt = Date.now()) { this.expiresAt = expiresAt; }

  isWebSessionReady() {
    const liveTracked = [...this.webCookieNames].some(k => this.jar.has(k));
    const conventional = [...this.jar.keys()].some(k => /^MoodleSession/i.test(String(k)));
    return Boolean(this.sesskey && (liveTracked || conventional));
  }
  isAuthenticated() { return Boolean(this.user || this.sesskey || this.token); }

  safeSnapshot() {
    return {
      userId: this.userid ?? null,
      hasWebSession: this.isWebSessionReady(),
      hasSesskey: Boolean(this.sesskey),
      hasToken: Boolean(this.token),
      cookieNames: [...this.jar.keys()],
      webCookieNames: [...this.webCookieNames],
      contextId: this.contextid ?? null,
      createdAt: this.createdAt,
      lastSeen: this.lastSeen,
      expiresAt: this.expiresAt,
    };
  }

  redact(value) { return redact(value); }
}

export const SECRET_KEYS = SENSITIVE_KEY;
