import { htmlMain, textOnly, safeFallback, unverified, activityError } from './common.js';

function parseStartForm(html) {
  const match = String(html || '').match(/<form\b[^>]*(?:action=["'][^"']*startattempt\.php[^"']*["'])[^>]*>[\s\S]*?<\/form>/i);
  if (!match) return null;
  const action = match[0].match(/\baction=["']([^"']+)["']/i)?.[1] || null;
  const cmid = match[0].match(/name=["']cmid["'][^>]*value=["']([^"']+)["']/i)?.[1] || null;
  const hasSesskey = /name=["']sesskey["']/i.test(match[0]);
  return { action, cmid: cmid ? Number(cmid) : null, hasSesskey };
}


function parseContinueAttempt(html) {
  const source =
    String(html || '');

  const candidates = [];
  const seenAttempts =
    new Set();

  const cleanLabel = value =>
    String(value || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/\s+/g, ' ')
      .trim();

  const scoreCandidate = (path, label) => {
    const haystack =
      `${path || ''} ${label || ''}`.toLowerCase();

    let score = 0;

    /*
     * Явные признаки незавершённой попытки.
     */
    if(
      /continue|resume|продолж|текущ|незаверш|выполня/i.test(
        haystack
      )
    ){
      score += 120;
    }

    /*
     * Сам attempt.php уже сильнее обычной ссылки.
     */
    if(
      /\/attempt\.php(?:\?|$)/i.test(
        String(path || '')
      )
    ){
      score += 10;
    }

    /*
     * Review/finished/completed не должны ошибочно
     * становиться "Продолжить тест".
     */
    if(
      /review\.php|finished|completed|завершен|завершён|завершено|окончен|просмотр/i.test(
        haystack
      )
    ){
      score -= 160;
    }

    return score;
  };

  const addCandidate = (
    path,
    attemptId,
    label = ''
  ) => {
    const id =
      Number(attemptId || 0) || null;

    if(
      !id ||
      !path ||
      seenAttempts.has(id)
    ){
      return;
    }

    const cleanPath =
      String(path)
        .replace(/&amp;/gi, '&')
        .trim();

    const clean =
      cleanLabel(label);

    candidates.push({
      path:cleanPath,
      attemptId:id,
      label:clean,
      score:
        scoreCandidate(
          cleanPath,
          clean
        )
    });

    seenAttempts.add(id);
  };

  /*
   * Обычные ссылки Campus/Moodle.
   */
  for(
    const match of source.matchAll(
      /(?:href|data-href|data-url)=["']([^"']*(?:\/mod\/quiz\/)?(?:attempt|review)\.php\?[^"']*)["']/gi
    )
  ){
    const href =
      match[1] || '';

    const attemptId =
      Number(
        href.match(
          /[?&]attempt=(\d+)/i
        )?.[1] || 0
      ) || null;

    if(!attemptId){
      continue;
    }

    const holder =
      source.slice(
        Math.max(
          0,
          match.index - 900
        ),
        Math.min(
          source.length,
          match.index + 900
        )
      );

    addCandidate(
      href,
      attemptId,
      cleanLabel(holder)
    );
  }

  /*
   * Некоторые темы используют onclick вместо href.
   */
  for(
    const match of source.matchAll(
      /onclick=["']([^"']*(?:attempt|review)\.php[^"']*)["']/gi
    )
  ){
    const code =
      match[1] || '';

    const path =
      code.match(
        /((?:\/mod\/quiz\/)?(?:attempt|review)\.php\?[^"'\\s]+)/i
      )?.[1] || '';

    const attemptId =
      Number(
        code.match(
          /[?&]attempt=(\d+)/i
        )?.[1] || 0
      ) || null;

    if(!attemptId || !path){
      continue;
    }

    addCandidate(
      path,
      attemptId,
      code
    );
  }

  /*
   * Некоторые варианты Campus делают Continue через form.
   */
  for(
    const formMatch of source.matchAll(
      /<form\b([^>]*)>([\s\S]*?)<\/form>/gi
    )
  ){
    const attrs =
      formMatch[1] || '';

    const chunk =
      formMatch[2] || '';

    const action =
      attrs.match(
        /\baction=["']([^"']*(?:\/mod\/quiz\/)?attempt\.php(?:\?[^"']*)?)["']/i
      )?.[1] || '';

    if(!action){
      continue;
    }

    const attemptId =
      Number(
        action.match(
          /[?&]attempt=(\d+)/i
        )?.[1] ||
        chunk.match(
          /<input\b[^>]*\bname=["']attempt["'][^>]*\bvalue=["'](\d+)["']/i
        )?.[1] ||
        0
      ) || null;

    if(!attemptId){
      continue;
    }

    let path =
      action;

    try{
      const url =
        new URL(
          action,
          'https://campus.fa.ru'
        );

      if(
        !url.searchParams.has(
          'attempt'
        )
      ){
        url.searchParams.set(
          'attempt',
          String(attemptId)
        );
      }

      const cmid =
        chunk.match(
          /<input\b[^>]*\bname=["']cmid["'][^>]*\bvalue=["']([^"']+)["']/i
        )?.[1];

      const page =
        chunk.match(
          /<input\b[^>]*\bname=["']page["'][^>]*\bvalue=["'](\d+)["']/i
        )?.[1];

      if(
        cmid &&
        !url.searchParams.has('cmid')
      ){
        url.searchParams.set(
          'cmid',
          cmid
        );
      }

      if(
        page &&
        !url.searchParams.has('page')
      ){
        url.searchParams.set(
          'page',
          page
        );
      }

      path =
        url.pathname +
        url.search;

    }catch{
      if(
        !/[?&]attempt=/i.test(
          path
        )
      ){
        path +=
          `${path.includes('?') ? '&' : '?'}attempt=${encodeURIComponent(attemptId)}`;
      }
    }

    addCandidate(
      path,
      attemptId,
      cleanLabel(chunk)
    );
  }

  /*
   * Последняя защита: ищем сам URL попытки даже если он
   * спрятан внутри нестандартной разметки.
   */
  for(
    const match of source.matchAll(
      /((?:\/mod\/quiz\/)?(?:attempt|review)\.php\?[^"'<>\s]*attempt=\d+[^"'<>\s]*)/gi
    )
  ){
    const path =
      match[1] || '';

    const attemptId =
      Number(
        path.match(
          /[?&]attempt=(\d+)/i
        )?.[1] || 0
      ) || null;

    if(!attemptId){
      continue;
    }

    const holder =
      source.slice(
        Math.max(
          0,
          match.index - 500
        ),
        Math.min(
          source.length,
          match.index + 500
        )
      );

    addCandidate(
      path,
      attemptId,
      cleanLabel(holder)
    );
  }

  if(!candidates.length){
    return null;
  }

  candidates.sort(
    (a,b)=>
      b.score - a.score ||
      a.attemptId - b.attemptId
  );

  /*
   * Если остались только review/finished ссылки,
   * незавершённой попытки нет.
   */
  return (
    candidates.find(
      item => item.score >= 0
    ) ||
    null
  );
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
    const continueAttempt = parseContinueAttempt(html);

    const capabilities = {
      ...this.getCapabilities(activity),
      canStart: startForm ? true : null,
      canAttempt: Boolean(continueAttempt)
    };

    this.trace?.stage(
      options.parentTraceId,
      'DRIVER_PARSED',
      {
        parser: 'moodle.html.quiz.v1',
        title,
        startForm: Boolean(startForm),
        startCmid: startForm?.cmid ?? null,
        continueAttempt: Boolean(continueAttempt),
        attemptId: continueAttempt?.attemptId ?? null
      }
    );

    return {
      kind: 'quiz',
      title,
      html,
      activityRef: activity.ref,
      access: {
        startForm,
        continueAttempt
      },
      attempts: continueAttempt
        ? [{
            id: continueAttempt.attemptId,
            status: 'inprogress',
            path: continueAttempt.path
          }]
        : [],
      capabilities,
      source: {
        transport: 'WEB_FORM',
        operation: 'quiz.view'
      },
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
