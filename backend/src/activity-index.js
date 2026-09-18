import { cloneModel } from './activity-model.js';

function normalizeType(type) {
  return String(type || 'unknown').trim().toLowerCase() || 'unknown';
}

function setAdd(map, key, value) {
  let bucket = map.get(key);
  if (!bucket) {
    bucket = new Set();
    map.set(key, bucket);
  }
  bucket.add(value);
}

function setDelete(map, key, value) {
  const bucket = map.get(key);
  if (!bucket) return;
  bucket.delete(value);
  if (!bucket.size) map.delete(key);
}

export class ActivityIndex {
  constructor({ scopeId } = {}) {
    this.scopeId = String(scopeId || 'session');
    this.byIdentity = new Map();
    this.byCourse = new Map();
    this.byType = new Map();
    this.byCapability = new Map();
  }

  setScope(scopeId) {
    this.scopeId = String(scopeId || this.scopeId);
    return this;
  }

  upsert(activity) {
    const key = activity?.identityKey;
    if (!key) throw new Error('Activity cannot be indexed without a stable identity.');
    const previous = this.byIdentity.get(key);
    if (previous) this.#removeReferences(previous);
    const next = cloneModel(activity);
    this.byIdentity.set(key, next);
    setAdd(this.byCourse, Number(next.ref.courseId), key);
    setAdd(this.byType, normalizeType(next.ref.type), key);
    for (const [capability, enabled] of Object.entries(next.capabilities || {})) {
      if (enabled === true) setAdd(this.byCapability, capability, key);
    }
    return cloneModel(next);
  }

  remove(activityOrRef) {
    const key = typeof activityOrRef === 'string'
      ? activityOrRef
      : activityOrRef?.identityKey || activityOrRef?.identity || null;
    if (!key) return false;
    const existing = this.byIdentity.get(key);
    if (!existing) return false;
    this.#removeReferences(existing);
    this.byIdentity.delete(key);
    return true;
  }

  #removeReferences(activity) {
    const key = activity.identityKey;
    setDelete(this.byCourse, Number(activity.ref.courseId), key);
    setDelete(this.byType, normalizeType(activity.ref.type), key);
    for (const [capability, enabled] of Object.entries(activity.capabilities || {})) {
      if (enabled === true) setDelete(this.byCapability, capability, key);
    }
  }

  getActivity(refOrIdentity) {
    const key = typeof refOrIdentity === 'string'
      ? refOrIdentity
      : refOrIdentity?.identityKey || this.identityFromRef(refOrIdentity);
    return key ? cloneModel(this.byIdentity.get(key) || null) : null;
  }

  identityFromRef(ref = {}) {
    const courseId = Number(ref.courseId || 0);
    const cmid = Number(ref.cmid || 0);
    const instance = Number(ref.instance || 0);
    if (!courseId) return null;
    if (cmid) return `course:${courseId}:cmid:${cmid}`;
    if (instance) return `course:${courseId}:instance:${instance}:type:${normalizeType(ref.type)}`;
    if (ref.sectionId != null && ref.position != null) return `course:${courseId}:section:${ref.sectionId}:position:${ref.position}`;
    return null;
  }

  getActivitiesByCourse(courseId) {
    return [...(this.byCourse.get(Number(courseId)) || [])]
      .map(key => this.byIdentity.get(key))
      .filter(Boolean)
      .map(cloneModel);
  }

  getActivitiesByType(type) {
    const keys = this.byType.get(normalizeType(type)) || new Set();
    return [...keys].map(key => this.byIdentity.get(key)).filter(Boolean).map(cloneModel);
  }

  getActivitiesWithCapability(capability) {
    const keys = this.byCapability.get(String(capability)) || new Set();
    return [...keys].map(key => this.byIdentity.get(key)).filter(Boolean).map(cloneModel);
  }

  all() {
    return [...this.byIdentity.values()].map(cloneModel);
  }

  clearCourse(courseId) {
    for (const activity of this.getActivitiesByCourse(courseId)) this.remove(activity.identityKey);
  }

  clear() {
    this.byIdentity.clear();
    this.byCourse.clear();
    this.byType.clear();
    this.byCapability.clear();
  }

  stats() {
    return {
      scopeId: this.scopeId,
      activities: this.byIdentity.size,
      courses: this.byCourse.size,
      types: this.byType.size,
      capabilities: this.byCapability.size,
    };
  }
}
