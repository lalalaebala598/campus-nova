const OBSERVED_TYPES = [
  'resource',
  'assign',
  'quiz',
  'forum',
  'glossary',
  'page',
  'folder',
  'url',
  'lanebs',
  'znaniumcombook',
];

function normalizeName(value) {
  return String(value || '').trim().toLowerCase();
}

function freezeMetadata(type, meta = {}) {
  return Object.freeze({
    type,
    label: meta.label || type,
    driver: meta.driver || null,
    capabilities: Object.freeze({
      canView: meta.capabilities?.canView ?? null,
      canSubmit: meta.capabilities?.canSubmit ?? null,
      canUpload: meta.capabilities?.canUpload ?? null,
      canStart: meta.capabilities?.canStart ?? null,
      canAttempt: meta.capabilities?.canAttempt ?? null,
      canDownload: meta.capabilities?.canDownload ?? null,
      canSave: meta.capabilities?.canSave ?? null,
      canFinish: meta.capabilities?.canFinish ?? null,
    }),
    fallback: meta.fallback ?? null,
    observed: Boolean(meta.observed),
  });
}

const DRIVER_BY_TYPE = {
  resource: 'ResourceDriver',
  file: 'FileDriver',
  assign: 'AssignmentDriver',
  quiz: 'QuizDriver',
};
const DEFAULT_METADATA = Object.fromEntries(
  OBSERVED_TYPES.map(type => [type, freezeMetadata(type, { observed: true, driver: DRIVER_BY_TYPE[type] || 'GenericActivityDriver', fallback: DRIVER_BY_TYPE[type] ? null : 'controlled-campus' })])
);
DEFAULT_METADATA.unknown = freezeMetadata('unknown', { observed: false, driver: 'GenericActivityDriver', fallback: 'controlled-campus' });

export class ActivityRegistry {
  constructor(definitions = DEFAULT_METADATA) {
    this.definitions = new Map(Object.entries(definitions).map(([type, meta]) => [normalizeName(type), meta]));
    if (!this.definitions.has('unknown')) this.definitions.set('unknown', DEFAULT_METADATA.unknown);
  }

  register(type, metadata = {}) {
    const key = normalizeName(type) || 'unknown';
    this.definitions.set(key, freezeMetadata(key, metadata));
    return this.definitions.get(key);
  }

  resolve(type) {
    const key = normalizeName(type);
    return this.definitions.get(key) || this.definitions.get('unknown');
  }

  isKnown(type) {
    const key = normalizeName(type);
    return key !== 'unknown' && this.definitions.has(key);
  }

  getCapabilities(type) {
    return { ...this.resolve(type).capabilities };
  }

  all() {
    return [...this.definitions.values()].map(meta => ({
      type: meta.type,
      label: meta.label,
      driver: meta.driver,
      capabilities: { ...meta.capabilities },
      fallback: meta.fallback,
      observed: meta.observed,
    }));
  }

  observedTypes() {
    return this.all().filter(meta => meta.observed).map(meta => meta.type);
  }
}

export { OBSERVED_TYPES };
