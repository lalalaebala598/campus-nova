import { OperationRouter } from './operation-router.js';
import { CampusTransportError } from './transport.js';

/**
 * Domain-facing adapter for the original Campus.
 *
 * This is intentionally a strangler facade: existing CampusSession APIs remain
 * intact while new code can depend on a stable domain adapter instead of
 * knowing about Moodle endpoints, transport details, or session primitives.
 */
export class CampusAdapter {
  constructor({ campus } = {}) {
    if (!campus) throw new Error('CampusAdapter requires a CampusSession.');
    this.campus = campus;
    this.session = campus.sessionManager;
    this.transport = campus.transport;
    this.contracts = campus.contracts;
    this.trace = campus.trace;
    this.router = new OperationRouter({ contracts: this.contracts, transport: this.transport, trace: this.trace });
  }

  get scopeId() { return this.session.scopeId; }

  sessionSnapshot() {
    return this.session.safeSnapshot();
  }

  describe(operation) {
    return this.router.describe(operation);
  }

  async execute(operation, context = {}, params = {}, options = {}) {
    return this.router.execute(operation, context, params, options);
  }

  /** Compatibility/domain operations used by the server today. */
  async listCourses(options = {}) {
    return this.campus.courses(options);
  }

  async loadCalendar(params = {}, options = {}) {
    return this.campus.calendar({ ...params, ...options.params });
  }

  async listMessages(options = {}) {
    return this.campus.messages(options);
  }

  async getConversation(id, options = {}) {
    return this.campus.conversation(id, options);
  }

  async loadCourse(courseId, options = {}) {
    const id = Number(courseId);
    if (!Number.isInteger(id) || id <= 0) {
      throw new CampusTransportError('Некорректный courseId.', { code: 'INVALID_COURSE_ID', phase: 'RESOLUTION' });
    }
    return this.campus.course(id, options);
  }

  async loadGrades(courseId = null, options = {}) {
    return courseId == null
      ? this.campus.gradesOverview(options)
      : this.campus.gradesByCourse(courseId, options);
  }

  async loadProfile(options = {}) {
    return this.campus.profilePage(options);
  }

  async loadPage(path, options = {}) {
    return this.campus.contentPage(path, options);
  }

  async executeActivity(ref, action, payload = {}, options = {}) {
    return this.campus.executeActivity(ref, action, payload, options);
  }

  getCourseGraph() { return this.campus.getCourseGraph(); }
  getActivityIndex() { return this.campus.getActivityIndex(); }
  getActivityRegistry() { return this.campus.getActivityRegistry(); }
  getActivityEngine() { return this.campus.getActivityEngine(); }
  getFileService() { return this.campus.getFileService(); }
  getFormService() { return this.campus.getFormService(); }

  invalidate(reason) { return this.campus.invalidate(reason); }
  async refreshWebSession() { return this.campus.refreshWebSession(); }
}
