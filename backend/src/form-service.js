import { CampusTransportError } from './transport.js';
import { redact } from './session-manager.js';

function attr(tag, name) {
  return String(tag || '').match(new RegExp(`\\b${name}=["']([^"']*)`, 'i'))?.[1] || '';
}

function parseOptions(html) {
  const out = [];
  for (const tag of String(html || '').matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/gi)) {
    const attrs = tag[1];
    out.push({ value: attr(attrs, 'value'), label: String(tag[2]).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(), selected: /\bselected(?:\s*=|\b)/i.test(attrs) });
  }
  return out;
}

function parseControls(html) {
  const controls = [];
  for (const tag of String(html || '').match(/<(?:input|textarea|select|button)\b[\s\S]*?(?:>|<\/textarea>|<\/select>|<\/button>)/gi) || []) {
    const name = attr(tag, 'name');
    if (!name) continue;
    const type = String(attr(tag, 'type') || (tag.startsWith('<textarea') ? 'textarea' : tag.startsWith('<select') ? 'select' : 'text')).toLowerCase();
    const selectOptions = type === 'select' ? parseOptions(tag) : undefined;
    const selectedOption = selectOptions?.find(option => option.selected)?.value;
    const textareaValue = type === 'textarea' ? String(tag.match(/<textarea\b[^>]*>([\s\S]*?)<\/textarea>/i)?.[1] || '') : '';
    const selected = /\bselected(?:\s*=|\b)/i.test(tag);
    const controlValue = textareaValue || (type === 'checkbox' || type === 'radio' ? (/\bchecked(?:\s*=|\b)/i.test(tag) ? (attr(tag, 'value') || '1') : undefined) : selectedOption || attr(tag, 'value'));
    controls.push({
      tag: tag.match(/^<(\w+)/)?.[1] || 'input',
      type,
      name,
      value: controlValue,
      required: /\brequired(?:\s*=|\b)/i.test(tag),
      disabled: /\bdisabled(?:\s*=|\b)/i.test(tag),
      checked: /\bchecked(?:\s*=|\b)/i.test(tag),
      options: selectOptions,
      submitter: type === 'submit' || /^<button/i.test(tag),
    });
  }
  return controls;
}

function parseFormTag(html) {
  const tag = String(html || '').match(/<form\b([^>]*)>/i)?.[0] || '';
  return {
    action: attr(tag, 'action') || '/',
    method: (attr(tag, 'method') || 'GET').toUpperCase(),
    enctype: attr(tag, 'enctype') || 'application/x-www-form-urlencoded',
    id: attr(tag, 'id') || null,
    name: attr(tag, 'name') || null,
  };
}

function formChunk(html, selector = null) {
  const source = String(html || '');
  if (!selector) return source.match(/<form\b[^>]*>[\s\S]*?<\/form>/i)?.[0] || source;
  const escaped = String(selector).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return source.match(new RegExp(`<form\\b[^>]*(?:id=["']${escaped}["']|name=["']${escaped}["'])[^>]*>[\\s\\S]*?<\\/form>`, 'i'))?.[0] || source;
}

function formChunkMatching(html, predicate) {
  const source = String(html || '');
  for (const tagMatch of source.matchAll(/<form\b[^>]*>/gi)) {
    const start = tagMatch.index + tagMatch[0].length;
    const end = source.indexOf('</form>', start);
    if (end < 0) continue;
    const tag = tagMatch[0];
    const chunk = source.slice(tagMatch.index, end + 7);
    if (predicate(tag, chunk)) return chunk;
  }
  return formChunk(source);
}


export class FormService {
  constructor({ session, trace = null } = {}) {
    this.session = session;
    this.trace = trace || session?.trace || null;
  }

  parse(html, options = {}) {
    const chunk = formChunk(html, options.formId || null);
    const form = parseFormTag(chunk);
    const controls = parseControls(chunk);
    const hidden = {};
    const submitters = [];
    for (const control of controls) {
      if (control.type === 'hidden') hidden[control.name] = control.value;
      if (control.submitter && !control.disabled) submitters.push({ name: control.name, value: control.value, type: control.type });
    }
    return {
      ...form,
      controls,
      hidden,
      submitters,
      hasSesskey: controls.some(c => c.name.toLowerCase() === 'sesskey'),
      hasFileManager: controls.some(c => /filemanager|draft/i.test(c.name)),
      safeHidden: redact(hidden),
    };
  }

  async load(operation, context = {}, params = {}) {
    const result = await this.session.executeOperation(operation, context, params);
    const html = result.parsed?.html || '';
    const form = this.parse(html);
    return { ...result, form };
  }

  buildPayload(form, values = {}, { submitter = null } = {}) {
    if (!form?.controls) throw new CampusTransportError('Moodle form не загружена.', { code: 'FORM_NOT_LOADED', phase: 'NORMALIZATION' });
    const body = new URLSearchParams();
    const append = (name, value) => {
      if (!name || value === undefined || value === null) return;
      if (Array.isArray(value)) return value.forEach(v => append(name, v));
      body.append(name, String(value));
    };
    for (const control of form.controls) {
      if (control.disabled || !control.name || control.type === 'file' || control.type === 'button') continue;
      if (control.type === 'submit' || control.submitter) continue;
      if ((control.type === 'checkbox' || control.type === 'radio') && !control.checked && !Object.prototype.hasOwnProperty.call(values, control.name)) continue;
      const value = Object.prototype.hasOwnProperty.call(values, control.name) ? values[control.name] : control.value;
      append(control.name, value);
    }
    for (const [name, value] of Object.entries(values || {})) {
      if (body.has(name) || value === undefined || value === null || /password|cookie|authorization|token/i.test(name)) continue;
      if (/^__/.test(name)) continue;
      append(name, value);
    }
    const chosen = submitter || form.submitters?.find(x => /save|submit|отправ|сохран/i.test(`${x.name} ${x.value}`)) || form.submitters?.[0];
    if (chosen?.name) append(chosen.name, chosen.value ?? '');
    return body;
  }

  parseMatching(html, predicate) {
    const chunk = formChunkMatching(html, predicate);
    return this.parse(chunk);
  }

  async submit(form, values = {}, { submitter = null, timeoutMs = 30000, parentTraceId = null } = {}) {
    if (!form?.action || !form?.method) throw new CampusTransportError('Moodle form не содержит action/method.', { code: 'FORM_NOT_LOADED', phase: 'NORMALIZATION' });
    const action = new URL(form.action, this.session.baseUrl).pathname + new URL(form.action, this.session.baseUrl).search;
    const method = String(form.method || 'POST').toUpperCase();
    const payload = this.buildPayload(form, values, { submitter });
    const params = Object.fromEntries(payload.entries());
    if (method !== 'POST') {
      return this.session.executeOperation('form.submit.runtime', { action, parentTraceId }, { action, ...params }, { runtime: true, timeoutMs });
    }
    const result = await this.session.executeOperation('form.submit.runtime', { action, parentTraceId }, { action, ...params }, {
      runtime: true, timeoutMs, formBody: payload.toString(), formContentType: 'application/x-www-form-urlencoded', referer: `${this.session.baseUrl}${action}`, redirect: 'manual',
    });
    let final = result;
    const location = result.response.headers.get('location');
    if (location) {
      const next = new URL(location, this.session.baseUrl);
      if (next.origin !== this.session.baseUrl) throw new CampusTransportError('Campus вернул внешний redirect формы, который запрещён.', { code: 'FORM_REDIRECT_EXTERNAL', phase: 'RESPONSE' });
      const follow = await this.session.request(next.pathname + next.search, { method: 'GET', redirect: 'manual', timeoutMs, traceOperation: 'form.submit.followup', traceContext: { parentTraceId, action } , transport: 'WEB_FORM' });
      const text = await follow.text();
      return { ...final, response: follow, parsed: { html: text, contentType: follow.headers.get('content-type') || 'text/html' }, redirectedPath: next.pathname + next.search };
    }
    if (result.response && !result.parsed && /html/i.test(result.response.headers.get('content-type') || '')) {
      const html = await result.response.clone().text();
      return { ...result, parsed: { html, contentType: result.response.headers.get('content-type') || 'text/html' } };
    }
    return final;
  }

  submitUnverified() {
    throw new CampusTransportError(
      'Moodle state-changing form operation пока не подтверждена реальным Campus contract и заблокирована до discovery.',
      { code: 'UNVERIFIED_OPERATION', phase: 'CONTRACT' }
    );
  }
}
