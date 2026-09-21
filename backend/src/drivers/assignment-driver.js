import { htmlMain, textOnly, safeFallback, firstFile, unverified, activityError } from './common.js';

function detectSubmission(html) {
  const text = textOnly(html).toLowerCase();
  if (/submitted|отправлено|сдано|status.*submitted/.test(text)) return 'submitted';
  if (/draft|черновик/.test(text)) return 'draft';
  if (/add submission|добавить ответ|добавить представление/.test(text)) return 'not-submitted';
  return 'unknown';
}


function assignmentWorkflowStatus(html = '') {
  const value =
    textOnly(html)
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

  /*
   * IMPORTANT:
   * "Not submitted" contains the word "submitted".
   * Check negative states BEFORE positive states.
   */
  if (
    /не отправлено|ничего не отправлено|nothing submitted|not submitted|no attempt|add submission|добавить ответ/.test(value)
  ) {
    return 'not-submitted';
  }

  if (
    /\bчерновик\b|\bdraft\b/.test(value)
  ) {
    return 'draft';
  }

  if (
    /отправлено на оценивание|submitted for grading|submitted successfully|status\s*[:\-]?\s*submitted\b|\bsubmitted\b/.test(value)
  ) {
    return 'submitted';
  }

  return 'unknown';
}

function assignmentWorkflowField(
  html = '',
  labels = []
) {
  const source = String(html || '');

  for (const label of labels) {
    const escaped =
      String(label).replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&'
      );

    /*
     * Moodle commonly renders assignment metadata
     * inside table rows. Keep extraction local to the
     * row so the next block (for example a submitted file)
     * cannot be swallowed into the field value.
     */
    const rowMatch =
      source.match(
        new RegExp(
          '<tr\\b[^>]*>[\\s\\S]*?' +
          escaped +
          '[\\s\\S]*?<\\/tr>',
          'i'
        )
      );

    if (rowMatch) {
      const rowText =
        textOnly(rowMatch[0])
          .replace(/\s+/g, ' ')
          .trim();

      const value =
        rowText
          .replace(
            new RegExp(
              '^.*?' +
              escaped +
              '\\s*:?\\s*',
              'i'
            ),
            ''
          )
          .trim();

      if (value) {
        return value;
      }
    }

    /*
     * Fallback for div/p/li based markup. Again, limit the
     * extraction to one semantic HTML block.
     */
    const blockMatch =
      source.match(
        new RegExp(
          '<(?:div|p|li|dd)\\b[^>]*>[\\s\\S]*?' +
          escaped +
          '[\\s\\S]*?<\\/(?:div|p|li|dd)>',
          'i'
        )
      );

    if (blockMatch) {
      const blockText =
        textOnly(blockMatch[0])
          .replace(/\s+/g, ' ')
          .trim();

      const value =
        blockText
          .replace(
            new RegExp(
              '^.*?' +
              escaped +
              '\\s*:?\\s*',
              'i'
            ),
            ''
          )
          .trim();

      if (value) {
        return value;
      }
    }

    /*
     * Final fallback for flattened/non-semantic markup.
     */
    const value =
      textOnly(source)
        .replace(/\s+/g, ' ')
        .trim();

    const match =
      value.match(
        new RegExp(
          escaped +
          '\\s*:?\\s*(.+?)(?=\\s+(?:Состояние ответа|Состояние оценивания|Срок сдачи|Оставшееся время|Последнее изменение|Submission status|Grading status|Due date|Time remaining|Last modified|Файлы|Files)\\b|$)',
          'i'
        )
      );

    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return '';
}
function assignmentWorkflowFile(
  href = '',
  label = ''
) {
  const fileurl =
    String(href || '')
      .replace(/&amp;/gi, '&')
      .trim();

  if (!fileurl) {
    return null;
  }

  let filename =
    textOnly(label)
      .replace(/\s+/g, ' ')
      .trim();

  if (!filename) {
    try {
      filename =
        decodeURIComponent(
          fileurl
            .split('/')
            .pop()
            ?.split('?')[0] || ''
        );
    } catch {
      filename =
        fileurl
          .split('/')
          .pop()
          ?.split('?')[0] || '';
    }
  }

  if (
    /\.(?:ico|png|jpe?g|gif|svg|webp|bmp|avif|css|js|woff2?|woff|ttf|otf)(?:$|[?#])/i.test(filename)
  ) {
    return null;
  }

  const isFile =
    /(?:pluginfile|webservice\/pluginfile|tokenpluginfile|draftfile)\.php/i.test(fileurl) ||
    /\.(?:pdf|docx?|xlsx?|pptx?|zip|rar|7z)(?:$|[?#])/i.test(filename) ||
    /\.(?:pdf|docx?|xlsx?|pptx?|zip|rar|7z)(?:$|[?#])/i.test(fileurl);

  if (!isFile) {
    return null;
  }

  return {
    type: 'file',
    filename: filename || 'Файл',
    filepath: '/',
    filesize: 0,
    fileurl,
    content: '',
    sortorder: 0,
    mimetype: ''
  };
}

function assignmentWorkflowSubmissionFiles(html = '') {
  const source = String(html || '');

  const statusIndex =
    source.search(
      /Состояние ответа|Состояние оценивания|Submission status|Grading status/i
    );

  if (statusIndex < 0) {
    return [];
  }

  let region =
    source.slice(statusIndex);

  /*
   * Keep only the student's submission area.
   * Feedback/grader attachments must not be reported
   * as files submitted by the student.
   */
  const feedbackIndex = region.search(
    /(?:Feedback|Grader feedback|Teacher feedback|Комментарии преподавателя|Отзыв преподавателя|Комментарий преподавателя|Обратная связь)/i
  );

  if (feedbackIndex >= 0) {
    region = region.slice(0, feedbackIndex);
  }

  const files = [];
  const seen = new Set();

  for (
    const match of region.matchAll(
      /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
    )
  ) {
    const file =
      assignmentWorkflowFile(
        match[1],
        match[2]
      );

    if (
      !file ||
      seen.has(file.fileurl)
    ) {
      continue;
    }

    file.sortorder =
      files.length;

    files.push(file);
    seen.add(file.fileurl);
  }

  return files;
}


function assignmentWorkflowSubmissionText(html = '') {
  const source = String(html || '');

  const match =
    source.match(
      /<(?:div|section)[^>]*class=["'][^"']*(?:assignsubmission_onlinetext|online-text|submission-text)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|section)>/i
    );

  if (!match) {
    return '';
  }

  return textOnly(match[1])
    .replace(/\s+/g, ' ')
    .trim();
}

function readNumericOption(html, keys = []) {
  const source = String(html || '');

  for (const key of keys) {
    const patterns = [
      new RegExp(`[\"']${key}[\"']\\s*[:=]\\s*[\"']?(\\d+)`, 'i'),
      new RegExp(`\\b${key}\\b\\s*=\\s*[\"']?(\\d+)`, 'i'),
      new RegExp(`data-${key.replace(/_/g, '-')}=[\"'](\\d+)[\"']`, 'i'),
    ];

    for (const pattern of patterns) {
      const match = source.match(pattern);
      if (match) return Number(match[1]);
    }
  }

  return 0;
}

function parseFileManagerConfig(html, form, activity) {
  const controls = form?.controls || [];

  const manager = controls.find(control =>
    /filemanager/i.test(control.name || '') &&
    Number(control.value || 0) > 0
  );

  if (!manager) return null;

  const itemid = Number(manager.value || 0);

  const ctx_id =
    readNumericOption(html, [
      'ctx_id',
      'contextid',
      'context_id',
      'contextId'
    ]) ||
    Number(activity?.ref?.contextId || 0);

  const repo_id =
    readNumericOption(html, [
      'repo_id',
      'repositoryid',
      'repository_id'
    ]) || 4;

  const maxbytes =
    readNumericOption(html, [
      'maxbytes'
    ]) || -1;

  const areamaxbytes =
    readNumericOption(html, [
      'areamaxbytes'
    ]) || -1;

  const maxfiles =
    readNumericOption(html, [
      'maxfiles'
    ]) || -1;

  return {
    fieldName: manager.name,
    itemid,
    ctx_id,
    repo_id,
    maxbytes,
    areamaxbytes,
    maxfiles,
    savepath: '/',
    env: 'filemanager',
    client_id: `nova_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
  };
}


export class AssignmentDriver {
  constructor({ session, trace, formService, fileService } = {}) {
    this.session = session;
    this.trace = trace;
    this.formService = formService;
    this.fileService = fileService;
  }

  discover(activity) { return { type: activity?.ref?.type || 'unknown', driver: 'AssignmentDriver', identityKey: activity?.identityKey || null }; }

  getCapabilities(activity) {
    return {
      canView: true,
      canSubmit: null,
      canUpload: null,
      canStart: null,
      canAttempt: null,
      canDownload: Boolean(firstFile(activity)),
      canSave: null,
      canFinish: null,
    };
  }

  getActions() {
    return [
      { name: 'open', available: true, verification: 'VERIFIED' },
      { name: 'edit', available: true, verification: 'VERIFIED' },
      { name: 'save', available: true, verification: 'RUNTIME_DISCOVERED' },
      { name: 'upload', available: false, verification: 'UNVERIFIED' },
      { name: 'submit', available: true, verification: 'RUNTIME_DISCOVERED' },
    ];
  }

  async load(activity, options = {}) {
    const result =
      await this.session.executeOperation(
        'assignment.view',
        {
          ...activity.ref,
          parentTraceId: options.parentTraceId,
          activityType: activity.ref.type
        },
        {
          cmid: activity.ref.cmid
        },
        {
          redirect: 'follow',
          timeoutMs: options.timeoutMs || 20000
        }
      );

    const html =
      htmlMain(result.parsed);

    if (!html) {
      throw activityError(
        'Не удалось загрузить задание.',
        'ASSIGNMENT_EMPTY',
        'PARSER'
      );
    }

    const title =
      result.parsed?.title ||
      textOnly(
        html.match(
          /<h[12][^>]*>([\s\S]*?)<\/h[12]>/i
        )?.[1] ||
        activity.identity.name
      );

    /*
     * The actual practical assignment text and its attachments
     * come from the page we have just opened.
     *
     * We do NOT use activity.content.description/files here,
     * because those values belong to the course graph.
     */

    const statusIndex =
      html.search(
        /Состояние ответа|Состояние оценивания|Submission status|Grading status/i
      );

    let descriptionHtml =
      statusIndex > 0
        ? html.slice(
            0,
            statusIndex
          )
        : html;

    const files = [];
    const seen = new Set();

    /*
     * Only real anchor links can become assignment files.
     *
     * img/src is deliberately ignored, so logos and favicons
     * cannot become attachments.
     */
    for (
      const match of String(
        descriptionHtml
      ).matchAll(
        /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
      )
    ) {
      const fileurl =
        String(
          match[1] || ''
        )
          .replace(
            /&amp;/gi,
            '&'
          )
          .trim();

      if (
        !fileurl ||
        seen.has(fileurl)
      ) {
        continue;
      }

      const anchorName =
        textOnly(
          match[2] || ''
        )
          .replace(
            /\s+/g,
            ' '
          )
          .trim();

      const urlName =
        fileurl
          .split('/')
          .pop()
          ?.split('?')[0] ||
        '';

      const filename =
        anchorName ||
        urlName ||
        'Файл задания';

      /*
       * Website assets are never assignment materials.
       */
      const isAsset =
        /\.(?:ico|png|jpe?g|gif|svg|webp|bmp|avif|css|js|woff2?|woff|ttf|otf)(?:$|[?#])/i.test(
          filename
        ) ||
        /\.(?:ico|png|jpe?g|gif|svg|webp|bmp|avif|css|js|woff2?|woff|ttf|otf)(?:$|[?#])/i.test(
          fileurl
        );

      if (isAsset) {
        continue;
      }

      /*
       * Accept Moodle/Campus protected files and normal
       * educational document extensions.
       */
      const isFile =
        /(?:pluginfile|webservice\/pluginfile|tokenpluginfile|draftfile)\.php/i.test(
          fileurl
        ) ||
        /\.(?:pdf|docx?|xlsx?|pptx?|zip|rar|7z)(?:$|[?#])/i.test(
          filename
        ) ||
        /\.(?:pdf|docx?|xlsx?|pptx?|zip|rar|7z)(?:$|[?#])/i.test(
          fileurl
        );

      if (!isFile) {
        continue;
      }

      files.push({
        type: 'file',
        filename,
        filepath: '/',
        filesize: 0,
        fileurl,
        content: '',
        sortorder: files.length,
        mimetype: ''
      });

      seen.add(
        fileurl
      );
    }

    /*
     * Remove raw attachment links from displayed description.
     * Nova draws its own download buttons.
     */
    descriptionHtml =
      descriptionHtml.replace(
        /<a\b[^>]*href=["'][^"']*(?:pluginfile|webservice\/pluginfile|tokenpluginfile|draftfile)\.php[^"']*["'][^>]*>[\s\S]*?<\/a>/gi,
        ''
      );

    /*
     * Remove page chrome that might remain inside <main>.
     */
    descriptionHtml =
      descriptionHtml
        .replace(
          /<nav\b[^>]*>[\s\S]*?<\/nav>/gi,
          ''
        )
        .replace(
          /<header\b[^>]*>[\s\S]*?<\/header>/gi,
          ''
        )
        .replace(
          /<footer\b[^>]*>[\s\S]*?<\/footer>/gi,
          ''
        )
        .replace(
          /<script\b[^>]*>[\s\S]*?<\/script>/gi,
          ''
        )
        .replace(
          /<style\b[^>]*>[\s\S]*?<\/style>/gi,
          ''
        )
        .trim();

    const description =
      textOnly(
        descriptionHtml
      )
        .replace(
          /\s+/g,
          ' '
        )
        .trim();

    const status =
      assignmentWorkflowStatus(
        html
      );

    const addSubmission =
      /editsubmission|Добавить ответ|Add submission/i.test(
        html
      );

    const deadline =
      assignmentWorkflowField(
        html,
        [
          'Срок сдачи',
          'Due date',
          'Deadline',
          'Окончание',
          'Дата окончания'
        ]
      );

    const remainingTime =
      assignmentWorkflowField(
        html,
        [
          'Оставшееся время',
          'Time remaining',
          'Remaining time'
        ]
      );

    const lastModified =
      assignmentWorkflowField(
        html,
        [
          'Последнее изменение',
          'Last modified'
        ]
      );

    const submissionFiles =
      assignmentWorkflowSubmissionFiles(
        html,
        files
      );

    const submissionText =
      assignmentWorkflowSubmissionText(
        html
      );

    const canEdit =
      /Изменить ответ|Edit submission|editsubmission/i.test(
        html
      );

    this.trace?.stage(
      options.parentTraceId,
      'DRIVER_PARSED',
      {
        parser:
          'moodle.html.assignment.final',

        title,

        submissionStatus:
          status,

        descriptionLength:
          description.length,

        pageFiles:
          files.length
      }
    );

    return {
      kind: 'assignment',

      title,

      html,

      /*
       * These fields are consumed by the Nova practical UI.
       */
      description,

      descriptionHtml,

      /*
       * Only files from this assignment page.
       */
      files,

      activityRef:
        activity.ref,

      deadline: {
        text: deadline || '',
        remaining: remainingTime || ''
      },
      submission: {
        status,
        addSubmission,
        canEdit,
        lastModified: lastModified || '',
        text: submissionText || '',
        files: submissionFiles
      },

      capabilities: {
        ...this.getCapabilities(
          activity
        ),

        canDownload:
          files.length > 0,

        canSubmit:
          addSubmission
            ? true
            : null
      },

      source: {
        transport:
          'WEB_FORM',

        operation:
          'assignment.view'
      }
    };
  }
  async edit(activity, options = {}) {
    const result = await this.session.executeOperation('assignment.edit', { ...activity.ref, parentTraceId: options.parentTraceId, activityType: activity.ref.type }, { cmid: activity.ref.cmid }, { redirect: 'follow', timeoutMs: options.timeoutMs || 20000 });
    const html = htmlMain(result.parsed);
    if (!html) throw activityError('Не удалось загрузить форму задания.', 'ASSIGNMENT_FORM_EMPTY', 'PARSER');
    const form = this.formService?.parse(html);
    const fileManager = parseFileManagerConfig(html, form, activity);

    form.fileManager = fileManager;

    this.trace?.stage(options.parentTraceId, 'FORM_PARSED', {
      parser: 'moodle.html.assignment.form.v1',
      hasSesskey: form?.hasSesskey,
      hasFileManager: form?.hasFileManager,
      fileManagerItemId: fileManager?.itemid || null,
      fileManagerField: fileManager?.fieldName || null,
      submitters: form?.submitters?.length || 0
    });

    return {
      kind: 'assignment-form',
      html,
      activityRef: activity.ref,
      form,
      fileManager,
      source: {
        transport: 'WEB_FORM',
        operation: 'assignment.edit'
      },
      capabilities: {
        ...this.getCapabilities(activity),
        canUpload: Boolean(fileManager?.itemid)
      },
    };
  }

  async executeAction(activity, action, payload = {}, options = {}) {
    if (action === 'open') return this.load(activity, options);
    if (action === 'edit') return this.edit(activity, options);

    if (action === 'upload') {
      const file = payload?.file;

      if (!file || typeof file.arrayBuffer !== 'function') {
        throw activityError(
          'Файл для загрузки не найден.',
          'UPLOAD_FILE_MISSING',
          'NORMALIZATION'
        );
      }

      const edited = await this.edit(activity, options);
      const fileManager = edited.form?.fileManager;

      if (!fileManager?.itemid || !fileManager?.fieldName) {
        throw activityError(
          'Campus не передал параметры filemanager для задания.',
          'UPLOAD_CONFIG_MISSING',
          'NORMALIZATION'
        );
      }

      const uploaded = await this.fileService.uploadDraftFile(
        file,
        fileManager,
        {
          timeoutMs: options.timeoutMs || 60000,
          parentTraceId: options.parentTraceId
        }
      );

      this.trace?.stage(
        options.parentTraceId,
        'FILE_UPLOADED_TO_DRAFT',
        {
          filename: uploaded.filename,
          itemid: uploaded.itemid,
          fieldName: fileManager.fieldName
        }
      );

      return {
        kind: 'assignment-upload',
        action: 'upload',
        activityRef: activity.ref,
        confirmed: true,
        file: uploaded,
        fileManager,
        source: {
          transport: 'FILE',
          operation: 'assignment.upload',
          verification: 'RUNTIME_FILEMANAGER'
        },
        capabilities: {
          ...this.getCapabilities(activity),
          canUpload: true
        },
      };
    }
    if (action === 'save' || action === 'submit') {
      const edited = await this.edit(activity, options);
      const preferred = action === 'submit'
        ? edited.form.submitters?.find(
            x => /submit|отправ|сдать|send/i.test(
              `${x.name} ${x.value}`
            )
          )
        : edited.form.submitters?.find(
            x => /save|сохран|чернов|draft/i.test(
              `${x.name} ${x.value}`
            )
          );
      if (!preferred) throw unverified(`assignment.${action}`, 'Реальная форма не содержит подтверждаемой submit-кнопки для этого действия.');
      const values = payload?.values || payload || {};
      const submitted = await this.formService.submit(edited.form, values, { submitter: preferred, timeoutMs: options.timeoutMs || 30000, parentTraceId: options.parentTraceId });
      const html = submitted.parsed?.html || '';
      const status = assignmentWorkflowStatus(html);
      this.trace?.stage(options.parentTraceId, 'RUNTIME_FORM_SUBMITTED', { action, submitter: preferred.name, submitterValue: preferred.value, detectedSubmissionStatus: status });
      const httpStatus = submitted.response?.status ?? null;
      const confirmed = action === 'submit'
        ? submitted.response?.ok === true && status === 'submitted'
        : submitted.response?.ok === true && !/submission error|ошибк[аи] отправ|exception/i.test(textOnly(html).toLowerCase());
      return {
        kind: 'assignment-action', action, activityRef: activity.ref,
        confirmed,
        httpStatus,
        submission: { status },
        html,
        redirectedPath: submitted.redirectedPath || null,
        source: { transport: 'WEB_FORM', operation: `assignment.${action}`, verification: 'RUNTIME_DISCOVERED_FORM' },
        capabilities: this.getCapabilities(activity),
      };
    }
    throw activityError(`Действие ${action} недоступно для assignment.`, 'ACTION_UNAVAILABLE', 'RESOLUTION');
  }

  getFallback(activity) { return safeFallback(activity); }
}
