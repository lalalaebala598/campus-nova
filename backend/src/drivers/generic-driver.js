import { safeFallback, activityError } from './common.js';

export class GenericActivityDriver {
  constructor({ session, trace } = {}) {
    this.session = session;
    this.trace = trace;
  }

  discover(activity) { return { type: activity?.ref?.type || 'unknown', driver: 'GenericActivityDriver', identityKey: activity?.identityKey || null }; }

  getCapabilities() {
    return { canView: null, canSubmit: null, canUpload: null, canStart: null, canAttempt: null, canDownload: null, canSave: null, canFinish: null };
  }

  getActions(activity) {
    return [{ name: 'open', available: false, verification: 'FALLBACK_ONLY' }];
  }

  async executeAction(activity, action, payload, options = {}) {
    if (action !== 'open') throw activityError(`Для неизвестного типа ${activity.ref.type} действие ${action} недоступно без отдельного contract.`, 'UNVERIFIED_OPERATION', 'CONTRACT');
    const fallback = this.getFallback(activity);
    if (fallback.mode === 'none') throw activityError(`Для неизвестного типа ${activity.ref.type} нет подтверждённого действия или fallback URL.`, 'UNVERIFIED_OPERATION', 'CONTRACT');
    throw new (await import('../transport.js')).CampusTransportError(
      `Тип ${activity.ref.type} пока поддерживается только через controlled Campus fallback.`,
      { code: 'FALLBACK_REQUIRED', phase: 'FALLBACK' }
    );
  }

  getFallback(activity) { return safeFallback(activity); }
}
