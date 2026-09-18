import { redact, redactUrl } from './session-manager.js';
import { summarizeResponseBody } from './operation-trace.js';

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const DEFAULT_RETRY = { maxAttempts: 3, retryOn: ['network', 'timeout', 429, 500, 502, 503, 504], idempotent: true };

export class CampusTransportError extends Error {
  constructor(message, { code = 'CAMPUS_ERROR', status = null, retryable = false, phase = 'REQUEST', cause = null, operation = null } = {}) {
    super(message, { cause });
    this.name = 'CampusTransportError';
    this.code = code;
    this.status = status;
    this.retryable = retryable;
    this.phase = phase;
    this.operation = operation;
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function retryDelay(headers, attempt) {
  const value = Number(headers?.get?.('retry-after'));
  if (Number.isFinite(value) && value >= 0) return Math.min(value * 1000, 8000);
  return Math.min(350 * (2 ** attempt) + Math.round(Math.random() * 120), 5000);
}
function isLoginHtml(text = '') { return /name=["']password["']/i.test(text) && /вход|login/i.test(textOnly(text).slice(0, 4000)); }
function responseSetCookieNames(headers) {
  let values = [];
  try { if (typeof headers?.getSetCookie === 'function') values = headers.getSetCookie(); } catch {}
  if (!Array.isArray(values) || !values.length) {
    try {
      const raw = headers?.get?.('set-cookie');
      if (raw) values = [raw];
    } catch {}
  }
  return [...new Set((Array.isArray(values) ? values : [values]).flatMap(v => String(v || '').split(/,(?=\s*[^;=]+=)/)).map(v => v.split(';', 1)[0].split('=', 1)[0].trim()).filter(Boolean))];
}
function textOnly(s = '') { return String(s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); }
function isSafeRetryMethod(method, options) {
  if (options.retryable === true || options.idempotent === true) return true;
  return method === 'GET' || method === 'HEAD';
}

function interpolate(template, values = {}) {
  return String(template).replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key) => {
    if (!(key in values)) { const err = new Error(`Missing dynamic contract parameter: ${key}`); err.code = 'CONTRACT_PARAMETER_MISSING'; throw err; }
    const value = String(values[key]);
    return key === 'filePath' ? encodeURI(value.replace(/^\/+/, '')) : encodeURIComponent(value);
  });
}

export class CampusTransport {
  constructor({ baseUrl, session, contracts, trace, userAgent = 'Mozilla/5.0 CampusNova/11.1.0-final' }) {
    this.baseUrl = String(baseUrl || '').replace(/\/$/, '');
    this.session = session;
    this.contracts = contracts;
    this.trace = trace;
    this.userAgent = userAgent;
  }

  async request(pathOrUrl, options = {}) {
    this.session.touch();
    const target = new URL(pathOrUrl, this.baseUrl).toString();
    const baseHeaders = new Headers(options.headers || {});
    baseHeaders.set('accept-language', 'ru-RU,ru;q=0.9,en;q=0.6');
    if (!baseHeaders.has('user-agent')) baseHeaders.set('user-agent', this.userAgent);
    const { timeoutMs = 20000, signal: externalSignal, traceOperation = 'http.request', traceContext = {}, retryPolicy = DEFAULT_RETRY, traceId: existingTraceId = null, deferTraceFinish = false, ...fetchOptions } = options;
    const method = String(fetchOptions.method || 'GET').toUpperCase();
    const canRetry = isSafeRetryMethod(method, fetchOptions);
    const maxAttempts = canRetry ? Math.max(1, Number(retryPolicy?.maxAttempts || 1)) : 1;
    const traceId = existingTraceId || this.trace?.start({
      operation: traceOperation,
      context: traceContext,
      transport: options.transport || 'HTTP',
      endpoint: target,
      method,
      request: { params: redact(options.traceParams || {}), body: options.traceBodyShape || undefined },
    });
    const sessionSignal = this.session.sessionController.signal;
    let lastError = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (traceId && attempt > 0) this.trace.update(traceId, { retry: { attempted: attempt + 1, used: true } });
      const headers = new Headers(baseHeaders);
      const cookie = this.session.cookieHeader();
      if (cookie) headers.set('cookie', cookie);
      const timeoutSignal = AbortSignal.timeout(timeoutMs);
      const signals = [sessionSignal, timeoutSignal];
      if (externalSignal) signals.push(externalSignal);
      const signal = typeof AbortSignal.any === 'function' ? AbortSignal.any(signals) : sessionSignal;
      try {
        const response = await fetch(target, { ...fetchOptions, headers, signal, redirect: fetchOptions.redirect ?? 'manual' });
        const setCookies = typeof response.headers.getSetCookie === 'function' ? response.headers.getSetCookie() : response.headers.get('set-cookie');
        if (setCookies) this.session.setCookies(setCookies);
        const contentType = response.headers.get('content-type') || '';

        if (traceId) {
          let bodySummary = null;
          if (!/image\/|audio\/|video\/|application\/pdf|application\/zip|octet-stream/i.test(contentType)) {
            try {
              const clone = response.clone();
              const text = await clone.text();
              bodySummary = summarizeResponseBody(text.slice(0, 100000), contentType);
            } catch {}
          } else {
            bodySummary = { kind: 'binary', contentType, contentLength: response.headers.get('content-length') || null };
          }
          this.trace.response(traceId, response, { bodySummary, setCookieNames: responseSetCookieNames(response.headers) });
        }

        if (response.status === 401) {
          const e = new CampusTransportError('Campus требует авторизацию.', { code: 'AUTH_EXPIRED', status: 401, phase: 'RESPONSE', operation: traceOperation });
          this.trace?.fail(traceId, e, { phase: 'AUTH' });
          throw e;
        }
        if (response.status === 403) {
          const e = new CampusTransportError('Campus отказал в доступе к этому ресурсу.', { code: 'PERMISSION_DENIED', status: 403, phase: 'RESPONSE', operation: traceOperation });
          this.trace?.fail(traceId, e, { phase: 'RESPONSE' });
          throw e;
        }
        if (RETRYABLE_STATUS.has(response.status) && response.status !== 401 && response.status !== 403 && attempt < maxAttempts - 1 && canRetry) {
          await sleep(retryDelay(response.headers, attempt));
          continue;
        }
        if (RETRYABLE_STATUS.has(response.status) && !response.ok) {
          const e = new CampusTransportError(`Campus временно недоступен (${response.status}).`, { code: 'RETRYABLE_HTTP', status: response.status, retryable: true, phase: 'RESPONSE', operation: traceOperation });
          this.trace?.fail(traceId, e, { phase: 'RESPONSE', retry: { attempted: attempt + 1, used: canRetry } });
          throw e;
        }
        if (traceId && !deferTraceFinish) this.trace.finish(traceId, { status: response.status, ok: response.ok });
        return deferTraceFinish ? { response, traceId } : response;
      } catch (error) {
        lastError = error;
        if (error?.code === 'AUTH_EXPIRED' || error?.code === 'PERMISSION_DENIED') throw error;
        if (sessionSignal.aborted) {
          const e = new CampusTransportError('Запрос отменён из-за смены Campus-сессии.', { code: 'SESSION_ABORTED', phase: 'REQUEST', cause: error, operation: traceOperation });
          this.trace?.fail(traceId, e, { phase: 'SESSION' });
          throw e;
        }
        if (externalSignal?.aborted) {
          const e = new CampusTransportError('Запрос к Campus отменён.', { code: 'REQUEST_ABORTED', phase: 'REQUEST', cause: error, operation: traceOperation });
          this.trace?.fail(traceId, e, { phase: 'REQUEST' });
          throw e;
        }
        const timeout = error?.name === 'TimeoutError' || (error?.name === 'AbortError' && !externalSignal?.aborted);
        const network = error?.name === 'TypeError' || /fetch|socket|network|ECONNRESET|ETIMEDOUT/i.test(String(error?.message || ''));
        if ((timeout || network) && attempt < maxAttempts - 1 && canRetry) {
          await sleep(retryDelay(null, attempt));
          continue;
        }
        const code = timeout ? 'TIMEOUT' : network ? 'NETWORK_ERROR' : error?.code || 'CAMPUS_ERROR';
        const message = timeout ? 'Campus не ответил вовремя. Повторите попытку.' : network ? 'Не удалось соединиться с Campus.' : error?.message || 'Ошибка запроса к Campus.';
        const e = error instanceof CampusTransportError ? error : new CampusTransportError(message, { code, phase: 'REQUEST', cause: error, operation: traceOperation });
        this.trace?.fail(traceId, e, { phase: 'REQUEST', retry: { attempted: attempt + 1, used: canRetry && maxAttempts > 1 } });
        throw e;
      }
    }
    const e = new CampusTransportError(lastError?.message || 'Campus временно недоступен.', { code: 'CAMPUS_ERROR', phase: 'REQUEST', cause: lastError, operation: traceOperation });
    this.trace?.fail(traceId, e, { phase: 'REQUEST', retry: { attempted: maxAttempts, used: canRetry } });
    throw e;
  }

  async execute(operationName, context = {}, params = {}, options = {}) {
    let contract;
    try {
      contract = this.contracts.resolve(operationName);
    } catch (error) {
      const traceId = this.trace?.start({ operation: operationName, context, transport: null, endpoint: null, method: null, request: { parameters: params } });
      const e = new CampusTransportError(error.message, { code: 'UNKNOWN_CONTRACT', phase: 'CONTRACT', operation: operationName, cause: error });
      this.trace?.fail(traceId, e, { phase: 'CONTRACT' });
      throw e;
    }
    const traceId = this.trace?.start({ operation: operationName, context, transport: contract.transport, endpoint: contract.endpoint, method: contract.method, request: { parameters: params, static: contract.staticParameters } });
    if (!contract.verified && !(contract.runtime && options.runtime === true)) {
      const e = new CampusTransportError(`Contract ${operationName} не подтверждён реальным HAR и не может быть выполнен через registry.`, { code: 'UNVERIFIED_CONTRACT', phase: 'CONTRACT', operation: operationName });
      this.trace?.fail(traceId, e, { phase: 'CONTRACT' });
      throw e;
    }
    try {
      if (contract.requires.session && !this.session.isAuthenticated()) {
        const e = new CampusTransportError('Campus-сессия не готова.', { code: 'SESSION_REQUIRED', phase: 'CONTRACT', operation: operationName });
        this.trace?.fail(traceId, e, { phase: 'CONTRACT' }); throw e;
      }
      if (contract.requires.sesskey && !this.session.sesskey) {
        const e = new CampusTransportError('Требуется актуальный sesskey Campus.', { code: 'SESSKEY_REQUIRED', phase: 'CONTRACT', operation: operationName });
        this.trace?.fail(traceId, e, { phase: 'CONTRACT' }); throw e;
      }
      const merged = { ...contract.staticParameters, ...params };
      const dynamicValues = { ...context, ...params, cmid: params.cmid ?? context.cmid, filePath: params.filePath ?? context.filePath };
      const endpoint = interpolate(contract.endpoint, dynamicValues);
      const headers = { ...(options.headers || {}) };
      let body;
      let path = endpoint;
      if (contract.transport === 'AJAX') {
        const query = new URLSearchParams({ sesskey: this.session.sesskey || '', info: contract.operation });
        path += `?${query.toString()}`;
        body = JSON.stringify([{ index: 0, methodname: contract.operation, args: merged }]);
        headers['content-type'] = 'application/json';
        headers['x-requested-with'] = 'XMLHttpRequest';
        headers.referer = `${this.baseUrl}/my/`;
        headers.origin = this.baseUrl;
      } else if (contract.transport === 'WEB_FORM') {
        headers.accept = headers.accept || 'text/html,application/xhtml+xml';
        headers.referer = options.referer || `${this.baseUrl}/my/`;
        headers.origin = this.baseUrl;
        if (contract.runtime && options.runtime === true) {
          const method = String(contract.method || 'POST').toUpperCase();
          if (method === 'GET') {
            const query = new URLSearchParams();
            for (const [k, v] of Object.entries(params || {})) if (!['action'].includes(k) && v !== undefined && v !== null) query.set(k, String(v));
            if (query.toString()) path += `?${query.toString()}`;
          } else {
            body = options.formBody || new URLSearchParams(Object.entries(params || {}).filter(([k]) => k !== 'action').map(([k,v]) => [k, String(v ?? '')])).toString();
            headers['content-type'] = options.formContentType || 'application/x-www-form-urlencoded';
          }
        }
      } else if (contract.transport === 'FILE') {
        headers.referer = headers.referer || `${this.baseUrl}/my/`;
        headers.origin = this.baseUrl;
      }
      const transportResult = await this.request(path, {
        method: contract.method,
        headers,
        body,
        redirect: 'manual',
        timeoutMs: options.timeoutMs || 20000,
        retryable: contract.retryPolicy?.idempotent === true,
        idempotent: contract.retryPolicy?.idempotent === true,
        retryPolicy: contract.retryPolicy,
        traceOperation: operationName,
        traceContext: context,
        traceId,
        deferTraceFinish: true,
        redirect: options.redirect || 'manual',
        traceParams: merged,
        traceBodyShape: body ? { kind: 'body', contentType: headers['content-type'], fields: contract.transport === 'AJAX' ? [contract.operation, ...Object.keys(merged)] : contract.runtime ? Object.keys(params || {}).filter(k => k !== 'action') : undefined } : undefined,
        transport: contract.transport,
      });
      const response = transportResult.response;
      const contentType = response.headers.get('content-type') || '';
      let parsed = null;
      if (contract.transport !== 'FILE' && !options.skipParse) {
        const text = await response.clone().text();
        try {
          parsed = this.parseContractResponse(contract, text, contentType);
          this.trace?.parser(traceId, { parser: contract.parser, status: 'PASS' });
          this.trace?.normalized(traceId, { status: 'PASS', value: parsed });
        } catch (error) {
          this.trace?.parser(traceId, { parser: contract.parser, status: 'FAIL', error: error.message });
          this.trace?.fail(traceId, error, { phase: 'PARSER' });
          throw error;
        }
      } else {
        this.trace?.parser(traceId, { parser: contract.parser, status: 'SKIPPED' });
      }
      this.trace?.finish(traceId, { status: response.status, parsed: parsed !== null });
      return { response, parsed, traceId, contract };
    } catch (e) {
      if (!this.trace?.get(traceId)?.error) this.trace?.fail(traceId, e, { phase: e?.phase || 'ERROR' });
      throw e;
    }
  }

  parseContractResponse(contract, text, contentType) {
    if (/JSON/i.test(contentType) || contract.transport === 'AJAX') {
      const data = JSON.parse(text);
      if (Array.isArray(data)) {
        for (const item of data) {
          if (!item?.error) continue;
          const code = item.exception?.errorcode || item.errorcode || '';
          const message = item.exception?.message || item.message || 'Campus AJAX error';
          if (/invalidsesskey|requirelogin|session/i.test(String(code)) || /must be logged in|login|сесси/i.test(String(message))) {
            this.session.invalidateWebSession();
            throw new CampusTransportError(message, { code: 'AUTH_EXPIRED', status: 401, phase: 'PARSER' });
          }
          throw new CampusTransportError(message, { code: 'CAMPUS_ERROR', status: null, phase: 'PARSER' });
        }
        return data[0]?.data ?? data;
      }
      return data;
    }
    if (/HTML|XHTML/i.test(contentType) || contract.transport === 'WEB_FORM') {
      if (isLoginHtml(text)) {
        this.session.invalidateWebSession();
        throw new CampusTransportError('Campus вернул страницу входа вместо авторизованного ответа.', { code: 'AUTH_EXPIRED', status: 401, phase: 'PARSER' });
      }
      return { html: text, contentType, title: text.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]+>/g, '').trim() || null };
    }
    return text;
  }
}
