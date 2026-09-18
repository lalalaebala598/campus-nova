import { redact, redactUrl } from './session-manager.js';

const SAFE_HEADERS = new Set([
  'content-type', 'content-length', 'content-disposition', 'location',
  'retry-after', 'etag', 'last-modified', 'cache-control',
  'x-frame-options', 'content-security-policy', 'allow', 'server'
]);

function headerSubset(headers) {
  const out = {};
  if (!headers) return out;
  const entries = headers instanceof Headers ? [...headers.entries()] : Object.entries(headers);
  for (const [key, value] of entries) {
    const k = String(key).toLowerCase();
    if (SAFE_HEADERS.has(k)) out[k] = /location/i.test(k) ? redactUrl(String(value)) : redact(String(value), k);
  }
  return out;
}

export function summarizeResponseBody(text, contentType = '') {
  if (text == null) return { kind: 'none' };
  const value = String(text);
  if (/json/i.test(contentType)) {
    try {
      const parsed = JSON.parse(value);
      return summarizeValue(parsed);
    } catch {
      return { kind: 'json', parseable: false, length: value.length, sample: value.slice(0, 300) };
    }
  }
  if (/html|xhtml/i.test(contentType)) {
    return {
      kind: 'html', length: value.length,
      title: value.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]+>/g, '').trim() || null,
      forms: (value.match(/<form\b/gi) || []).length,
      links: (value.match(/<a\b/gi) || []).length,
      inputs: (value.match(/<input\b/gi) || []).length,
    };
  }
  return { kind: 'text', length: value.length, sample: value.slice(0, 300) };
}

function summarizeValue(value, depth = 0, key = '') {
  if (depth > 3) return '[depth-limit]';
  if (value === null) return null;
  if (Array.isArray(value)) return { kind: 'array', length: value.length, sample: value.slice(0, 2).map(v => summarizeValue(v, depth + 1, key)) };
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    return { kind: 'object', keys: keys.slice(0, 80), keyCount: keys.length, fields: Object.fromEntries(keys.slice(0, 15).map(k => [k, SENSITIVE_OR_REDACTED(k) ? '[REDACTED]' : summarizeValue(value[k], depth + 1, k)])) };
  }
  return { kind: typeof value, value: typeof value === 'string' && value.length > 200 ? `${value.slice(0, 200)}…` : value };
}


function SENSITIVE_OR_REDACTED(key) {
  return /^(?:authorization|cookie|set-cookie|x-auth-token|token|wstoken|sesskey|password|passwd|secret|client_secret|access_token|refresh_token|html|raw|body|form|formdata)$/i.test(String(key));
}

export class OperationTrace {
  constructor({ enabled = false, maxEntries = 300, logger = console } = {}) {
    this.enabled = Boolean(enabled);
    this.maxEntries = maxEntries;
    this.logger = logger;
    this.entries = [];
  }

  start({ operation, context = {}, transport = null, endpoint = null, method = null, request = null } = {}) {
    const entry = {
      traceId: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      startedAt: new Date().toISOString(),
      operation,
      context: redact(context),
      transport,
      endpoint: endpoint ? redactUrl(endpoint) : null,
      method,
      request: redact(request),
      status: null,
      response: null,
      parser: null,
      normalized: null,
      phase: 'REQUEST',
      retry: { attempted: 0, used: false },
      sessionRecovery: false,
      error: null,
    };
    this.entries.unshift(entry);
    if (this.entries.length > this.maxEntries) this.entries.length = this.maxEntries;
    this._log('start', entry);
    return entry.traceId;
  }

  update(traceId, patch = {}) {
    const entry = this.get(traceId);
    if (!entry) return;
    if (patch.context) entry.context = redact(patch.context);
    if (patch.endpoint) entry.endpoint = redactUrl(patch.endpoint);
    if (patch.request) entry.request = redact(patch.request);
    if (patch.response?.headers) patch.response.headers = headerSubset(patch.response.headers);
    Object.assign(entry, patch);
    this._log('update', entry);
  }

  response(traceId, response, { bodySummary = null, setCookieNames = [] } = {}) {
    this.update(traceId, {
      phase: 'RESPONSE',
      status: response?.status ?? null,
      response: {
        setCookieNames: Array.isArray(setCookieNames) ? setCookieNames : [],
        ok: Boolean(response?.ok),
        status: response?.status ?? null,
        statusText: response?.statusText || null,
        redirected: Boolean(response?.redirected),
        url: response?.url ? redactUrl(response.url) : null,
        headers: headerSubset(response?.headers),
        body: bodySummary,
      }
    });
  }

  parser(traceId, { status = 'PASS', parser = null, error = null } = {}) {
    this.update(traceId, { phase: 'PARSER', parser: { status, name: parser, error: error ? String(error) : null } });
  }

  stage(traceId, phase, detail = null) {
    const entry = this.get(traceId);
    if (!entry) return;
    if (!Array.isArray(entry.stages)) entry.stages = [];
    entry.stages.push({ phase: String(phase || 'STEP'), detail: redact(detail), at: new Date().toISOString() });
    entry.phase = String(phase || entry.phase);
    this._log('stage', entry);
  }

  normalized(traceId, { status = 'PASS', value = null, error = null } = {}) {
    this.update(traceId, {
      phase: 'NORMALIZATION',
      normalized: { status, summary: summarizeValue(value), error: error ? String(error) : null }
    });
  }

  finish(traceId, result = null) {
    const entry = this.get(traceId);
    if (!entry) return result;
    entry.phase = 'DONE';
    entry.finishedAt = new Date().toISOString();
    entry.durationMs = Math.max(0, new Date(entry.finishedAt) - new Date(entry.startedAt));
    if (result !== undefined) entry.result = summarizeValue(result);
    this._log('finish', entry);
    return result;
  }

  fail(traceId, error, { phase = 'ERROR', retry = null, sessionRecovery = false } = {}) {
    this.update(traceId, {
      phase,
      error: { name: error?.name || 'Error', code: error?.code || null, status: error?.status ?? null, message: redact(String(error?.message || error)) },
      retry: retry || undefined,
      sessionRecovery: Boolean(sessionRecovery),
      finishedAt: new Date().toISOString(),
    });
    this._log('fail', this.get(traceId));
  }

  get(traceId) { return this.entries.find(x => x.traceId === traceId) || null; }
  list(limit = 100) { return this.entries.slice(0, Math.max(1, Math.min(Number(limit) || 100, this.maxEntries))); }
  clear() { this.entries.length = 0; }

  _log(event, entry) {
    if (!this.enabled) return;
    try { this.logger.debug(`[CampusTrace:${event}]`, JSON.stringify(entry)); } catch {}
  }
}
