import { htmlMain, textOnly, safeFallback, unverified, activityError } from './common.js';

function parseStartForm(html) {
  const match = String(html || '').match(/<form\b[^>]*(?:action=["'][^"']*startattempt\.php[^"']*["'])[^>]*>[\s\S]*?<\/form>/i);
  if (!match) return null;
  const action = match[0].match(/\baction=["']([^"']+)["']/i)?.[1] || null;
  const cmid = match[0].match(/name=["']cmid["'][^>]*value=["']([^"']+)["']/i)?.[1] || null;
  const hasSesskey = /name=["']sesskey["']/i.test(match[0]);
  return { action, cmid: cmid ? Number(cmid) : null, hasSesskey };
}

export class QuizDriver {
  constructor({ session, trace, formService } = {}) {
    this.session = session;
    this.trace = trace;
    this.formService = formService;
  }

  discover(activity) { return { type: activity?.ref?.type || 'unknown', driver: 'QuizDriver', identityKey: activity?.identityKey || null }; }

  getCapabilities(activity) {
    return { canView: true, canSubmit: null, canUpload: null, canStart: null, canAttempt: null, canDownload: false, canSave: null, canFinish: null };
  }

  getActions(activity) {
    return [
      { name: 'open', available: true, verification: 'VERIFIED' },
      { name: 'start', available: true, verification: 'RUNTIME_DISCOVERED' },
      { name: 'save', available: false, verification: 'UNVERIFIED' },
      { name: 'finish', available: false, verification: 'UNVERIFIED' },
    ];
  }

  async load(activity, options = {}) {
    const result = await this.session.executeOperation('quiz.view', { ...activity.ref, parentTraceId: options.parentTraceId, activityType: activity.ref.type }, { cmid: activity.ref.cmid }, { redirect: 'follow', timeoutMs: options.timeoutMs || 20000 });
    const html = htmlMain(result.parsed);
    if (!html) throw activityError('Не удалось открыть тест.', 'QUIZ_EMPTY', 'PARSER');
    const title = result.parsed?.title || textOnly(html.match(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/i)?.[1] || activity.identity.name);
    const startForm = parseStartForm(html);
    const capabilities = { ...this.getCapabilities(activity), canStart: startForm ? true : null };
    this.trace?.stage(options.parentTraceId, 'DRIVER_PARSED', { parser: 'moodle.html.quiz.v1', title, startForm: Boolean(startForm), startCmid: startForm?.cmid ?? null });
    return {
      kind: 'quiz', title, html, activityRef: activity.ref,
      access: { startForm },
      attempts: [],
      capabilities,
      source: { transport: 'WEB_FORM', operation: 'quiz.view' },
    };
  }

  async executeAction(activity, action, payload = {}, options = {}) {
    if (action === 'open') return this.load(activity, options);
    if (action === 'start') {
      const opened = await this.load(activity, options);
      const html = opened.html || '';
      const form = this.formService?.parseMatching(html, (_tag, chunk) => /startattempt\.php/i.test(chunk));
      if (!form?.action || !/startattempt\.php/i.test(form.action)) throw unverified('quiz.start', 'Реальная startattempt form не была найдена в ответе Campus.');
      /*
       * Moodle may use an unnamed submit button.
       * The form itself is still executable, so a named
       * submitter must not be a hard requirement.
       */
      const preferred =
        form.submitters?.find(
          x => /attempt|start|начать|попыт/i.test(
            `${x.name || ''} ${x.value || ''}`
          )
        ) ||
        form.submitters?.[0] ||
        null;

      const started =
        await this.formService.submit(
          form,
          payload?.values || payload || {},
          {
            submitter: preferred,
            timeoutMs: options.timeoutMs || 30000,
            parentTraceId: options.parentTraceId
          }
        );
      const redirectedPath = started.redirectedPath || null;
      const attemptId = Number((redirectedPath || '').match(/[?&]attempt=(\d+)/i)?.[1] || 0) || null;
      this.trace?.stage(
        options.parentTraceId,
        'RUNTIME_FORM_SUBMITTED',
        {
          action: 'quiz.start',
          submitter: preferred?.name || null,
          attemptId
        }
      );
      return {
        kind: 'quiz-action', action: 'start', activityRef: activity.ref, confirmed: started.response?.ok === true && Boolean(attemptId),
        httpStatus: started.response?.status ?? null,
        attemptId, html: started.parsed?.html || '', redirectedPath,
        source: { transport: 'WEB_FORM', operation: 'quiz.start', verification: 'RUNTIME_DISCOVERED_FORM' },
        capabilities: { ...this.getCapabilities(activity), canStart: true, canAttempt: Boolean(attemptId) },
      };
    }
    if (action === 'save' || action === 'finish' || action === 'questions') throw unverified(`quiz.${action}`, 'В HAR нет подтверждённого execution contract для этой операции.');
    throw activityError(`Действие ${action} недоступно для quiz.`, 'ACTION_UNAVAILABLE', 'RESOLUTION');
  }

  getFallback(activity) { return safeFallback(activity); }
}
