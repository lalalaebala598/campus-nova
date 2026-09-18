import { htmlMain, textOnly, safeFallback, firstFile, unverified, activityError } from './common.js';

function detectSubmission(html) {
  const text = textOnly(html).toLowerCase();
  if (/submitted|отправлено|сдано|status.*submitted/.test(text)) return 'submitted';
  if (/draft|черновик/.test(text)) return 'draft';
  if (/add submission|добавить ответ|добавить представление/.test(text)) return 'not-submitted';
  return 'unknown';
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
    const result = await this.session.executeOperation('assignment.view', { ...activity.ref, parentTraceId: options.parentTraceId, activityType: activity.ref.type }, { cmid: activity.ref.cmid }, { redirect: 'follow', timeoutMs: options.timeoutMs || 20000 });
    const html = htmlMain(result.parsed);
    if (!html) throw activityError('Не удалось загрузить задание.', 'ASSIGNMENT_EMPTY', 'PARSER');
    const title = result.parsed?.title || textOnly(html.match(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/i)?.[1] || activity.identity.name);
    const status = detectSubmission(html);
    const addSubmission = /editsubmission|Добавить ответ|Add submission/i.test(html);
    this.trace?.stage(options.parentTraceId, 'DRIVER_PARSED', { parser: 'moodle.html.assignment.v1', title, submissionStatus: status });
    return {
      kind: 'assignment', title, html, activityRef: activity.ref,
      submission: { status, addSubmission },
      capabilities: { ...this.getCapabilities(activity), canSubmit: addSubmission ? true : null },
      source: { transport: 'WEB_FORM', operation: 'assignment.view' },
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
        ? edited.form.submitters?.find(x => /submit|отправ|сдать|send/i.test(`${x.name} ${x.value}`))
        : edited.form.submitters?.find(x => /save|сохран|чернов/i.test(`${x.name} ${x.value}`)) || edited.form.submitters?.[0];
      if (!preferred) throw unverified(`assignment.${action}`, 'Реальная форма не содержит подтверждаемой submit-кнопки для этого действия.');
      const values = payload?.values || payload || {};
      const submitted = await this.formService.submit(edited.form, values, { submitter: preferred, timeoutMs: options.timeoutMs || 30000, parentTraceId: options.parentTraceId });
      const html = submitted.parsed?.html || '';
      const status = detectSubmission(html);
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
