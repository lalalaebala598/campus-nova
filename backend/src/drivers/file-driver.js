import { safeFallback, activityError } from './common.js';

export class FileDriver {
  constructor({ session, trace, fileService } = {}) {
    this.session = session;
    this.trace = trace;
    this.fileService = fileService;
  }

  discover(activity) { return { type: activity?.ref?.type || 'unknown', driver: 'FileDriver', identityKey: activity?.identityKey || null }; }

  getCapabilities(activity) {
    return {
      canView: true,
      canDownload: Boolean(activity?.content?.files?.length),
      canSubmit: null,
      canUpload: null,
      canStart: null,
      canAttempt: null,
      canSave: null,
      canFinish: null,
    };
  }

  getActions(activity) {
    return [
      { name: 'open', available: Boolean(activity?.content?.files?.length), verification: 'VERIFIED' },
      { name: 'preview', available: Boolean(activity?.content?.files?.length), verification: 'VERIFIED' },
      { name: 'download', available: Boolean(activity?.content?.files?.length), verification: 'VERIFIED' },
    ];
  }

  async executeAction(activity, action, payload, options = {}) {
    const file = this.fileService?.listFiles(activity)?.[0];
    if (!file) throw activityError('У file activity не найден реальный файл Campus.', 'FILE_MISSING', 'NORMALIZATION');
    if (action === 'open') return { kind: 'file', file, capabilities: this.getCapabilities(activity), source: { transport: 'FILE', operation: 'file.download' } };
    if (action === 'preview') return this.fileService.preview(file, options);
    if (action === 'download') return this.fileService.download(file, options);
    throw activityError(`Действие ${action} недоступно для file.`, 'ACTION_UNAVAILABLE', 'RESOLUTION');
  }

  getFallback(activity) { return safeFallback(activity); }
}
