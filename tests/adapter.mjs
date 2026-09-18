import assert from 'node:assert/strict';
import { CampusAdapter } from '../backend/src/campus-adapter.js';
import { OperationRouter } from '../backend/src/operation-router.js';
import { ContractRegistry } from '../backend/src/contract-registry.js';
import { SessionManager } from '../backend/src/session-manager.js';
import { CampusTransport } from '../backend/src/transport.js';
import { OperationTrace } from '../backend/src/operation-trace.js';

const trace = new OperationTrace({ enabled: false });
const session = new SessionManager({ scopeId: 'adapter-test-user' });
const contracts = new ContractRegistry();
const fakeTransport = {
  trace,
  calls: [],
  async execute(operation, context, params, options) {
    this.calls.push({ operation, context, params, options });
    return { operation, transport: contracts.resolve(operation).transport };
  },
};
const router = new OperationRouter({ contracts, transport: fakeTransport, trace });
const adapter = new CampusAdapter({
  campus: {
    sessionManager: session,
    transport: fakeTransport,
    contracts,
    trace,
    courses: async () => [{ id: 11, fullname: 'Adapter course' }],
    calendar: async args => ({ args }),
    messages: async () => [{ id: 1 }],
    conversation: async id => ({ id }),
    course: async id => ({ id, sections: [] }),
    gradesOverview: async () => [{ course: 'Adapter course', grade: '5' }],
    gradesByCourse: async id => [{ courseId: id }],
    profilePage: async () => ({ id: 11 }),
    contentPage: async path => ({ path }),
    executeActivity: async (ref, action) => ({ ref, action }),
    getCourseGraph: () => ({ graph: true }),
    getActivityIndex: () => ({ index: true }),
    getActivityRegistry: () => ({ registry: true }),
    getActivityEngine: () => ({ engine: true }),
    getFileService: () => ({ files: true }),
    getFormService: () => ({ forms: true }),
    invalidate: reason => reason,
    refreshWebSession: async () => true,
  },
});

const desc = adapter.describe('courses.list');
assert.equal(desc.transport, 'AJAX');
assert.equal(desc.method, 'POST');
assert.equal(desc.endpoint, '/lib/ajax/service.php');
assert.equal(desc.verified, true);

const r = await adapter.execute('courses.list', { userId: 11 }, {});
assert.equal(r.transport, 'AJAX');
assert.equal(fakeTransport.calls.length, 1);
console.log('PASS adapter: contract-driven routing');

assert.deepEqual(await adapter.listCourses(), [{ id: 11, fullname: 'Adapter course' }]);
assert.deepEqual(await adapter.loadCalendar({ year: 2026, month: 9 }), { args: { year: 2026, month: 9 } });
assert.deepEqual(await adapter.listMessages(), [{ id: 1 }]);
assert.deepEqual(await adapter.getConversation(9), { id: 9 });
assert.deepEqual(await adapter.loadCourse(11), { id: 11, sections: [] });
assert.deepEqual(await adapter.loadGrades(), [{ course: 'Adapter course', grade: '5' }]);
assert.deepEqual(await adapter.loadGrades(11), [{ courseId: 11 }]);
assert.deepEqual(await adapter.loadProfile(), { id: 11 });
assert.deepEqual(await adapter.loadPage('/my/'), { path: '/my/' });
assert.deepEqual(await adapter.executeActivity({ courseId: 11, cmid: 22 }, 'open'), { ref: { courseId: 11, cmid: 22 }, action: 'open' });
assert.equal(adapter.scopeId, 'adapter-test-user');
assert.deepEqual(adapter.sessionSnapshot().userId, null);
console.log('PASS adapter: domain operations + session scope isolation');

await assert.rejects(() => adapter.loadCourse('bad'), e => e?.code === 'INVALID_COURSE_ID');
console.log('PASS adapter: courseId validation');
