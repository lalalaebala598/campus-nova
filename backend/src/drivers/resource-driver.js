import { htmlMain, textOnly, firstFile, safeFallback, activityError } from './common.js';

export class ResourceDriver {
  constructor({ session, trace, fileService } = {}) {
    this.session = session;
    this.trace = trace;
    this.fileService = fileService;
  }

  discover(activity) { return { type: activity?.ref?.type || 'unknown', driver: 'ResourceDriver', identityKey: activity?.identityKey || null }; }

  getCapabilities(activity) {
    return {
      canView: true,
      canDownload: Boolean(firstFile(activity)),
      canSubmit: null,
      canUpload: null,
      canStart: null,
      canAttempt: null,
      canSave: null,
      canFinish: null,
    };
  }

  getActions(activity) {
    const actions = [{ name: 'open', available: true, verification: 'VERIFIED' }];
    if (firstFile(activity)) {
      actions.push({ name: 'preview', available: true, verification: 'VERIFIED' });
      actions.push({ name: 'download', available: true, verification: 'VERIFIED' });
    }
    return actions;
  }

  async load(activity, options = {}) {
    const result = await this.session.executeOperation('resource.view', { ...activity.ref, parentTraceId: options.parentTraceId, activityType: activity.ref.type }, { cmid: activity.ref.cmid }, { redirect: 'follow', timeoutMs: options.timeoutMs || 20000 });
    const html = htmlMain(result.parsed);
    if (!html) throw activityError('Не удалось открыть ресурс.', 'RESOURCE_EMPTY', 'PARSER');
    const title = result.parsed?.title || textOnly(html.match(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/i)?.[1] || activity.identity.name);
    this.trace?.stage(options.parentTraceId, 'DRIVER_PARSED', { parser: 'moodle.html.resource.v1', title, htmlLength: html.length });
    this.trace?.normalized(options.parentTraceId, { status: 'PASS', value: { title, hasContent: Boolean(textOnly(html)), hasFiles: Boolean(firstFile(activity)) } });
    return {
      kind: 'resource',
      title,
      html,
      activityRef: activity.ref,
      files: this.fileService?.listFiles(activity) || [],
      source: { transport: 'WEB_FORM', operation: 'resource.view' },
      capabilities: this.getCapabilities(activity),
    };
  }

  async executeAction(activity, action, payload, options = {}) {
    if (action === 'open') return this.load(activity, options);
    const file = firstFile(activity);
    if ((action === 'preview' || action === 'download') && file && this.fileService) {
      const ref = this.fileService.resolveFile(activity, file);
      return action === 'preview' ? this.fileService.preview(ref, options) : this.fileService.download(ref, options);
    }
    throw activityError(`Действие ${action} недоступно для resource.`, 'ACTION_UNAVAILABLE', 'RESOLUTION');
  }

  getFallback(activity) { return safeFallback(activity); }
}
