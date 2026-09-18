const CAPABILITY_KEYS = [
  'canView', 'canSubmit', 'canUpload', 'canStart', 'canAttempt', 'canDownload', 'canSave', 'canFinish'
];

function asNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function cleanText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function cleanUrl(value) {
  return String(value ?? '').trim() || null;
}

function normalizeContent(raw, index = 0) {
  return {
    type: cleanText(raw?.type || 'file') || 'file',
    filename: cleanText(raw?.filename || ''),
    filepath: raw?.filepath ?? '',
    filesize: asNumber(raw?.filesize) || 0,
    fileurl: cleanUrl(raw?.fileurl || raw?.url),
    content: typeof raw?.content === 'string' ? raw.content : '',
    sortorder: Number(raw?.sortorder ?? index) || 0,
    mimetype: cleanText(raw?.mimetype || ''),
  };
}

function normalizeDate(raw) {
  return {
    ...raw,
    label: cleanText(raw?.label || ''),
    timestamp: Number(raw?.timestamp || 0) || 0,
  };
}

function explicitCapability(raw, key) {
  const aliases = {
    canView: ['canView', 'canview'],
    canSubmit: ['canSubmit', 'cansubmit'],
    canUpload: ['canUpload', 'canupload'],
    canStart: ['canStart', 'canstart'],
    canAttempt: ['canAttempt', 'canattempt'],
    canDownload: ['canDownload', 'candownload'],
    canSave: ['canSave', 'cansave'],
    canFinish: ['canFinish', 'canfinish'],
  };
  for (const alias of aliases[key] || []) {
    if (typeof raw?.[alias] === 'boolean') return raw[alias];
  }
  return null;
}

function deriveCapability(raw, key, contents) {
  const explicit = explicitCapability(raw, key);
  if (explicit !== null) return explicit;
  if (key === 'canDownload') return contents.some(file => Boolean(file.fileurl));
  return null;
}

export function activityIdentity(ref) {
  const courseId = asNumber(ref?.courseId);
  const cmid = asNumber(ref?.cmid);
  const instance = asNumber(ref?.instance);
  if (!courseId) return null;
  if (cmid) return `course:${courseId}:cmid:${cmid}`;
  if (instance) return `course:${courseId}:instance:${instance}:type:${String(ref?.type || 'activity').toLowerCase()}`;
  return ref?.sectionId != null && ref?.position != null
    ? `course:${courseId}:section:${ref.sectionId}:position:${ref.position}`
    : null;
}

export function normalizeActivity(raw = {}, context = {}) {
  const courseId = asNumber(context.courseId ?? raw.courseId);
  const courseName = cleanText(context.courseName ?? raw.courseName ?? '');
  const sectionId = asNumber(context.sectionId ?? raw.sectionId) ?? 0;
  const sectionName = cleanText(context.sectionName ?? raw.sectionName ?? '');
  const position = Number(context.position ?? raw.position ?? 0) || 0;
  const cmid = asNumber(raw.cmid ?? raw.id ?? raw.coursemodule);
  const instance = asNumber(raw.instance ?? raw.instanceid);
  const type = cleanText(raw.modname || raw.type || raw.module || 'unknown').toLowerCase() || 'unknown';
  const contents = Array.isArray(raw.contents) ? raw.contents.map(normalizeContent) : [];
  const capabilitySource = raw.capabilities && typeof raw.capabilities === 'object' ? raw.capabilities : raw;
  const capabilities = Object.fromEntries(CAPABILITY_KEYS.map(key => [
    key,
    deriveCapability(capabilitySource, key, contents),
  ]));

  const ref = {
    courseId,
    cmid,
    instance,
    contextId: asNumber(raw.contextId ?? raw.contextid),
    sectionId,
    type,
  };
  const identityKey = activityIdentity({ ...ref, position });

  return {
    ref,
    identityKey,
    identityStrength: cmid ? 'strong' : instance ? 'medium' : identityKey ? 'weak' : 'none',
    identityPosition: position,
    identitySectionId: sectionId,
    identityType: type,
    relations: {
      course: { id: courseId, name: courseName || null },
      section: { id: sectionId || null, name: sectionName || null, position },
    },
    identity: {
      name: cleanText(raw.name || raw.displayname || `Активность ${position + 1}`),
      url: cleanUrl(raw.url || raw.viewurl),
      icon: cleanUrl(raw.iconurl || raw.modicon),
      visibility: raw.visibility ?? (typeof raw.visible === 'boolean' ? raw.visible : null),
      uservisible: typeof raw.uservisible === 'boolean' ? raw.uservisible : null,
    },
    content: {
      description: cleanText(raw.description || raw.intro || ''),
      descriptionformat: Number(raw.descriptionformat ?? raw.introformat ?? 1),
      files: contents,
      links: Array.isArray(raw.links) ? raw.links : [],
      dates: Array.isArray(raw.dates) ? raw.dates.map(normalizeDate) : [],
    },
    capabilities,
    actions: raw.actions && typeof raw.actions === 'object' ? { ...raw.actions } : {},
    pluginData: raw.customdata ?? raw.pluginData ?? null,
    state: {
      completion: raw.completion ?? null,
      completionexpected: raw.completionexpected ?? null,
      completionstatus: cleanText(raw.completionstatus || ''),
      availability: raw.availability ?? null,
      availabilityinfo: cleanText(raw.availabilityinfo || ''),
      indent: Number(raw.indent || 0) || 0,
      afterlink: cleanText(raw.afterlink || ''),
      onclick: cleanText(raw.onclick || ''),
    },
    source: {
      transport: context.source?.transport ?? raw.source?.transport ?? null,
      endpoint: context.source?.endpoint ?? raw.source?.endpoint ?? null,
      operation: context.source?.operation ?? raw.source?.operation ?? null,
      parser: context.source?.parser ?? raw.source?.parser ?? null,
      raw: context.includeRaw === false ? null : raw,
    },
  };
}

export function normalizeSection(raw = {}, context = {}) {
  const courseId = asNumber(context.courseId ?? raw.courseId);
  const sectionId = asNumber(raw.id ?? raw.sectionid ?? raw.section) ?? Number(context.position ?? 0);
  const position = Number(context.position ?? raw.position ?? raw.section ?? 0) || 0;
  const modules = Array.isArray(raw.activities) ? raw.activities : (Array.isArray(raw.modules) ? raw.modules : []);
  const source = context.source || raw.source || {};
  const sectionName = cleanText(raw.name || raw.title || raw.displayname || `Раздел ${position + 1}`);
  const activities = modules.map((item, index) => normalizeActivity(item, {
    courseId,
    courseName: context.courseName ?? '',
    sectionId,
    sectionName,
    position: index,
    source,
    includeRaw: context.includeRaw !== false,
  }));

  return {
    ref: { courseId, sectionId },
    identity: {
      name: sectionName,
      summary: cleanText(raw.summary || raw.description || ''),
      position,
    },
    activities,
    source: {
      transport: source.transport ?? null,
      endpoint: source.endpoint ?? null,
      operation: source.operation ?? null,
      parser: source.parser ?? null,
      raw: context.includeRaw === false ? null : raw,
    },
  };
}

export function normalizeCourse(raw = {}, context = {}) {
  const courseId = asNumber(context.courseId ?? raw.id ?? raw.courseId);
  const rawSections = Array.isArray(raw.sections) ? raw.sections : [];
  const source = context.source || raw.source || {};
  return {
    ref: { courseId },
    identity: {
      name: cleanText(raw.title || raw.fullnamedisplay || raw.fullname || raw.displayname || `Курс ${courseId ?? ''}`),
      shortName: cleanText(raw.shortname || raw.shortName || ''),
      summary: cleanText(raw.description || raw.summary || ''),
      url: cleanUrl(raw.url || raw.viewurl),
    },
    sections: rawSections.map((section, index) => normalizeSection(section, {
      courseId,
      courseName: cleanText(raw.title || raw.fullnamedisplay || raw.fullname || raw.displayname || `Курс ${courseId ?? ''}`),
      position: index,
      source,
      includeRaw: context.includeRaw !== false,
    })),
    metadata: {
      courseimage: raw.courseimage ?? null,
      teachers: Array.isArray(raw.teachers) ? raw.teachers : [],
      progress: raw.progress ?? null,
      hasprogress: raw.hasprogress ?? null,
      visible: typeof raw.visible === 'boolean' ? raw.visible : null,
    },
    source: {
      transport: source.transport ?? null,
      endpoint: source.endpoint ?? null,
      operation: source.operation ?? null,
      parser: source.parser ?? null,
      raw: context.includeRaw === false ? null : raw,
    },
  };
}

export function cloneModel(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}
