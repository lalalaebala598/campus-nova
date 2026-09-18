import { ActivityIndex } from './activity-index.js';
import { ActivityRegistry } from './activity-registry.js';
import { cloneModel, normalizeCourse, activityIdentity } from './activity-model.js';

export class CourseGraph {
  constructor({ scopeId, registry = new ActivityRegistry(), index = new ActivityIndex({ scopeId }), trace = null } = {}) {
    this.scopeId = String(scopeId || 'session');
    this.registry = registry;
    this.index = index;
    this.trace = trace;
    this.courses = new Map();
  }

  setScope(scopeId) {
    this.scopeId = String(scopeId || this.scopeId);
    this.index.setScope(this.scopeId);
    return this;
  }

  normalize(course, options = {}) {
    return normalizeCourse(course, {
      ...options,
      includeRaw: options.includeRaw !== false,
    });
  }

  mergeCourse(course, options = {}) {
    const courseIdHint = course?.id ?? course?.ref?.courseId ?? null;
    const traceId = options.traceId || (this.trace ? this.trace.start({
      operation: 'course.graph.merge',
      context: { courseId: courseIdHint, scopeId: this.scopeId },
      transport: 'INTERNAL',
      endpoint: null,
      method: null,
      request: { sections: Array.isArray(course?.sections) ? course.sections.length : 0 },
    }) : null);
    const traceOwned = !options.traceId && Boolean(this.trace && traceId);
    try {
      this.trace?.stage(traceId, 'GRAPH_NORMALIZE', { courseId: courseIdHint, sections: Array.isArray(course?.sections) ? course.sections.length : 0 });
      const normalized = this.normalize(course, options);
      const courseId = Number(normalized.ref.courseId || 0);
      if (!courseId) throw new Error('Course Graph cannot ingest a course without courseId.');

      const previous = this.courses.get(courseId);
      const next = cloneModel(normalized);
      this.trace?.stage(traceId, 'GRAPH_MERGE_START', { courseId, previous: Boolean(previous), incomingSections: next.sections.length });

      const incomingKeys = new Set();
      for (const section of next.sections) {
        const retained = [];
        for (const activity of section.activities || []) {
          const registryMeta = this.registry.resolve(activity.ref.type);
          if (!this.registry.isKnown(activity.ref.type)) {
            activity.ref.type = activity.ref.type || 'unknown';
            activity.pluginData = {
              ...(activity.pluginData && typeof activity.pluginData === 'object' ? activity.pluginData : {}),
              registryType: 'unknown',
            };
          }
          const key = activity.identityKey || activityIdentity({
            ...activity.ref,
            sectionId: section.ref.sectionId,
            position: activity.identityPosition,
          });
          if (!key) {
            retained.push(activity);
            continue;
          }
          activity.identityKey = key;
          activity.registry = {
            type: registryMeta.type,
            known: registryMeta.observed,
            driver: registryMeta.driver,
            fallback: registryMeta.fallback,
          };
          if (incomingKeys.has(key)) {
            const existing = retained.find(item => item.identityKey === key);
            if (existing) {
              if (!existing.identity.name && activity.identity.name) existing.identity.name = activity.identity.name;
              if (!existing.identity.url && activity.identity.url) existing.identity.url = activity.identity.url;
              if (!existing.content.description && activity.content.description) existing.content.description = activity.content.description;
              if ((!existing.content.files || !existing.content.files.length) && activity.content.files?.length) existing.content.files = activity.content.files;
              existing.pluginData = existing.pluginData ?? activity.pluginData;
            }
            this.trace?.stage(traceId, 'INDEX_DEDUP', { courseId, identityKey: key, type: activity.ref.type });
            continue;
          }
          this.index.upsert(activity);
          this.trace?.stage(traceId, 'INDEX_UPDATE', { courseId, identityKey: activity.identityKey, type: activity.ref.type });
          incomingKeys.add(key);
          retained.push(activity);
        }
        section.activities = retained;
      }

      if (previous) {
        for (const oldSection of previous.sections || []) {
          for (const oldActivity of oldSection.activities || []) {
            if (oldActivity.identityKey && !incomingKeys.has(oldActivity.identityKey)) {
              this.index.remove(oldActivity.identityKey);
              this.trace?.stage(traceId, 'INDEX_REMOVE', { courseId, identityKey: oldActivity.identityKey });
            }
          }
        }
      }

      this.courses.set(courseId, next);
      const activityCount = next.sections.reduce((n, sec) => n + (sec.activities || []).length, 0);
      this.trace?.stage(traceId, 'GRAPH_MERGE_DONE', { courseId, sections: next.sections.length, activities: activityCount });
      if (traceOwned) this.trace?.finish(traceId, { courseId, sections: next.sections.length, activities: activityCount });
      return cloneModel(next);
    } catch (error) {
      if (traceOwned) this.trace?.fail(traceId, error, { phase: 'GRAPH' });
      throw error;
    }
  }

  removeCourse(courseId) {
    const id = Number(courseId);
    const previous = this.courses.get(id);
    if (!previous) return false;
    for (const section of previous.sections || []) {
      for (const activity of section.activities || []) this.index.remove(activity.identityKey);
    }
    this.courses.delete(id);
    return true;
  }

  getCourse(courseId) {
    return cloneModel(this.courses.get(Number(courseId)) || null);
  }

  getActivity(refOrIdentity) {
    return this.index.getActivity(refOrIdentity);
  }

  getActivitiesByCourse(courseId) {
    return this.index.getActivitiesByCourse(courseId);
  }

  getActivitiesByType(type) {
    return this.index.getActivitiesByType(type);
  }

  getActivitiesWithCapability(capability) {
    return this.index.getActivitiesWithCapability(capability);
  }

  allCourses() {
    return [...this.courses.values()].map(cloneModel);
  }

  allActivities() {
    return this.index.all();
  }

  snapshot() {
    return {
      scopeId: this.scopeId,
      courses: this.allCourses(),
      index: this.index.stats(),
      registry: this.registry.all(),
    };
  }

  clear() {
    this.courses.clear();
    this.index.clear();
  }
}
