import { CampusTransportError } from '../transport.js';

export function activityError(message, code = 'ACTIVITY_ERROR', phase = 'ACTIVITY') {
  return new CampusTransportError(message, { code, phase });
}

export function htmlMain(parsed) {
  return parsed?.html || '';
}

export function textOnly(value = '') {
  return String(value).replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/\s+/g, ' ').trim();
}

export function firstFile(activity) {
  return Array.isArray(activity?.content?.files) ? activity.content.files.find(f => f.fileurl || f.url) || null : null;
}

export function safeFallback(activity) {
  const url = activity?.identity?.url || null;
  return url ? { mode: 'controlled-campus', url } : { mode: 'none', url: null };
}

export function unverified(action, detail = '') {
  return new CampusTransportError(
    `Операция ${action} пока не подтверждена реальным Campus contract и не выполняется.${detail ? ` ${detail}` : ''}`,
    { code: 'UNVERIFIED_OPERATION', phase: 'CONTRACT' }
  );
}
