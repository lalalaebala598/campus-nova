import { CampusTransportError } from './transport.js';

function asObject(value) { return value && typeof value === 'object' ? value : {}; }

function normalizeFileUrl(value, baseUrl) {
  if (!value) return null;
  try {
    const u = new URL(String(value), baseUrl);
    return u;
  } catch {
    return null;
  }
}

function pluginRelativePath(urlValue, baseUrl) {
  const u = normalizeFileUrl(urlValue, baseUrl);
  if (!u) return null;
  if (!/^\/pluginfile\.php\//i.test(u.pathname)) return null;
  return u.pathname.replace(/^\/pluginfile\.php\//i, '') + (u.search || '');
}

function fileRefFromActivity(activity, file = null) {
  const candidate = asObject(file || activity?.content?.files?.[0]);
  const fileurl = candidate.fileurl || candidate.url || null;
  return {
    courseId: activity?.ref?.courseId ?? null,
    cmid: activity?.ref?.cmid ?? null,
    instance: activity?.ref?.instance ?? null,
    contextId: activity?.ref?.contextId ?? null,
    type: activity?.ref?.type ?? null,
    filepath: candidate.filepath ?? '/',
    filename: candidate.filename || activity?.identity?.name || 'campus-file',
    filesize: Number(candidate.filesize || 0) || 0,
    mimetype: candidate.mimetype || '',
    fileurl,
  };
}

export class FileService {
  constructor({ session, trace = null } = {}) {
    this.session = session;
    this.trace = trace || session?.trace || null;
  }

  resolveFile(activityOrFile, file = null) {
    if (!activityOrFile) return null;
    if (activityOrFile?.ref && activityOrFile?.content) return fileRefFromActivity(activityOrFile, file);
    return fileRefFromActivity(null, activityOrFile);
  }

  listFiles(activity) {
    return Array.isArray(activity?.content?.files)
      ? activity.content.files.map(item => this.resolveFile(activity, item)).filter(Boolean)
      : [];
  }

  getPluginfilePath(fileRef) {
    const ref = this.resolveFile(fileRef);
    if (!ref?.fileurl) throw new CampusTransportError('У файла отсутствует Campus file URL.', { code: 'FILE_URL_MISSING', phase: 'NORMALIZATION' });
    const relative = pluginRelativePath(ref.fileurl, this.session.baseUrl);
    if (!relative) throw new CampusTransportError('Файл не является поддерживаемым pluginfile.php ресурсом Campus.', { code: 'FILE_ENDPOINT_UNSUPPORTED', phase: 'CONTRACT' });
    return relative;
  }

  async open(fileRef, options = {}) {
    const ref = this.resolveFile(fileRef);
    const filePath = this.getPluginfilePath(ref);
    const result = await this.session.executeOperation('file.download', {
      courseId: ref.courseId,
      cmid: ref.cmid,
      instance: ref.instance,
      contextId: ref.contextId,
      filePath,
      filename: ref.filename,
    }, { filePath }, {
      timeoutMs: options.timeoutMs || 30000,
    });
    return {
      ...result,
      file: ref,
      filePath,
      contentType: result.response.headers.get('content-type') || ref.mimetype || 'application/octet-stream',
      contentLength: Number(result.response.headers.get('content-length') || ref.filesize || 0) || 0,
      filename: (() => { const cd = result.response.headers.get('content-disposition') || ''; const m = cd.match(/filename\*=UTF-8''([^;]+)|filename=\"?([^;\"]+)/i); try { return decodeURIComponent(m?.[1] || m?.[2] || ref.filename); } catch { return m?.[1] || m?.[2] || ref.filename; } })(),
      body: result.response.body || null,
    };
  }

  async download(fileRef, options = {}) {
    const result = await this.open(fileRef, options);
    if (!result.response.ok) {
      throw new CampusTransportError(`Не удалось скачать файл (${result.response.status}).`, {
        code: 'FILE_DOWNLOAD_FAILED', status: result.response.status, phase: 'RESPONSE'
      });
    }
    return result;
  }

  async preview(fileRef, options = {}) {
    const result = await this.open(fileRef, options);
    const type = result.contentType.toLowerCase();
    const previewable = type.startsWith('image/') || type.includes('pdf');
    return { ...result, previewable };
  }

  async upload() {
    throw new CampusTransportError(
      'File upload пока не подтверждён реальным Campus execution contract и не выполняется через Activity Engine.',
      { code: 'UNVERIFIED_OPERATION', phase: 'CONTRACT' }
    );
  }

  assertUploadContract() { return this.upload(); }
}

export function sanitizeFilename(name = 'campus-file') {
  return String(name).replace(/[\r\n"\\/<>:*?|]+/g, '_').slice(0, 180) || 'campus-file';
}
