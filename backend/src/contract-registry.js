const AJAX_ENDPOINT = '/lib/ajax/service.php';
const FILE_ENDPOINT = '/pluginfile.php/{filePath}';

function contract(def) {
  return Object.freeze({
    retryPolicy: { maxAttempts: 1, retryOn: [], idempotent: false },
    fallback: null,
    dynamicParameters: [],
    staticParameters: {},
    requires: { session: false, sesskey: false, token: false },
    response: { type: 'unknown', shape: 'unknown' },
    parser: 'none',
    verified: false,
    ...def,
  });
}

export const CONTRACTS = [
  contract({
    name: 'courses.list', source: 'HAR', verified: true, transport: 'AJAX', endpoint: AJAX_ENDPOINT, method: 'POST',
    operation: 'core_course_get_enrolled_courses_by_timeline_classification',
    staticParameters: { offset: 0, limit: 0, classification: 'allincludinghidden', sort: 'ul.timeaccess desc', customfieldname: 'groups_name', customfieldvalue: '' },
    dynamicParameters: [], requires: { session: true, sesskey: true, token: false },
    response: { type: 'JSON', shape: 'AJAX batch -> data.courses[]' }, parser: 'moodle.ajax.batch.courses.v1',
    retryPolicy: { maxAttempts: 3, retryOn: ['network', 'timeout', 429, 500, 502, 503, 504], idempotent: true }
  }),
  contract({
    name: 'calendar.month', source: 'HAR', verified: true, transport: 'AJAX', endpoint: AJAX_ENDPOINT, method: 'POST',
    operation: 'core_calendar_get_calendar_monthly_view',
    staticParameters: { categoryid: 0, includenavigation: true, mini: true },
    dynamicParameters: ['year', 'month', 'courseid', 'day'], requires: { session: true, sesskey: true, token: false },
    response: { type: 'JSON', shape: 'AJAX batch -> data calendar object' }, parser: 'moodle.ajax.batch.calendar.v1',
    retryPolicy: { maxAttempts: 3, retryOn: ['network', 'timeout', 429, 500, 502, 503, 504], idempotent: true }
  }),
  contract({
    name: 'messages.counts', source: 'HAR', verified: true, transport: 'AJAX', endpoint: AJAX_ENDPOINT, method: 'POST',
    operation: 'core_message_get_conversation_counts', dynamicParameters: ['userid'], requires: { session: true, sesskey: true, token: false },
    response: { type: 'JSON', shape: 'AJAX batch -> data counts' }, parser: 'moodle.ajax.batch.data.v1',
    retryPolicy: { maxAttempts: 3, retryOn: ['network', 'timeout', 429, 500, 502, 503, 504], idempotent: true }
  }),
  contract({
    name: 'messages.unreadCounts', source: 'HAR', verified: true, transport: 'AJAX', endpoint: AJAX_ENDPOINT, method: 'POST',
    operation: 'core_message_get_unread_conversation_counts', dynamicParameters: ['userid'], requires: { session: true, sesskey: true, token: false },
    response: { type: 'JSON', shape: 'AJAX batch -> data unread counts' }, parser: 'moodle.ajax.batch.data.v1',
    retryPolicy: { maxAttempts: 3, retryOn: ['network', 'timeout', 429, 500, 502, 503, 504], idempotent: true }
  }),
  contract({
    name: 'messages.list', source: 'HAR', verified: true, transport: 'AJAX', endpoint: AJAX_ENDPOINT, method: 'POST',
    operation: 'core_message_get_conversations', staticParameters: { type: null, limitnum: 51, limitfrom: 0, favourites: true, mergeself: true }, dynamicParameters: ['userid'],
    requires: { session: true, sesskey: true, token: false }, response: { type: 'JSON', shape: 'AJAX batch -> data.conversations[]' }, parser: 'moodle.ajax.batch.messages.v1',
    retryPolicy: { maxAttempts: 3, retryOn: ['network', 'timeout', 429, 500, 502, 503, 504], idempotent: true }
  }),
  contract({
    name: 'messages.contacts', source: 'HAR', verified: true, transport: 'AJAX', endpoint: AJAX_ENDPOINT, method: 'POST',
    operation: 'core_message_get_user_contacts', staticParameters: { limitnum: 101, limitfrom: 0 }, dynamicParameters: ['userid'],
    requires: { session: true, sesskey: true, token: false }, response: { type: 'JSON', shape: 'AJAX batch -> data[]' }, parser: 'moodle.ajax.batch.data.v1',
    retryPolicy: { maxAttempts: 3, retryOn: ['network', 'timeout', 429, 500, 502, 503, 504], idempotent: true }
  }),
  contract({
    name: 'messages.contactRequests', source: 'HAR', verified: true, transport: 'AJAX', endpoint: AJAX_ENDPOINT, method: 'POST',
    operation: 'core_message_get_contact_requests', dynamicParameters: ['userid'], requires: { session: true, sesskey: true, token: false },
    response: { type: 'JSON', shape: 'AJAX batch -> data[]' }, parser: 'moodle.ajax.batch.data.v1',
    retryPolicy: { maxAttempts: 3, retryOn: ['network', 'timeout', 429, 500, 502, 503, 504], idempotent: true }
  }),
  contract({
    name: 'user.dates', source: 'HAR', verified: true, transport: 'AJAX', endpoint: AJAX_ENDPOINT, method: 'POST',
    operation: 'core_get_user_dates', dynamicParameters: ['contextid', 'timestamps'], requires: { session: true, sesskey: true, token: false },
    response: { type: 'JSON', shape: 'AJAX batch -> data[]' }, parser: 'moodle.ajax.batch.data.v1',
    retryPolicy: { maxAttempts: 3, retryOn: ['network', 'timeout', 429, 500, 502, 503, 504], idempotent: true }
  }),
  contract({
    name: 'localization.getString', source: 'HAR_TEXT_ONLY', verified: false, transport: 'AJAX_CANDIDATE', endpoint: AJAX_ENDPOINT, method: 'POST',
    operation: 'core_get_string', dynamicParameters: ['args'], requires: { session: true, sesskey: true, token: false },
    response: { type: 'JSON', shape: 'not present as a request specimen in supplied HAR' }, parser: 'unverified',
  }),
  contract({
    name: 'template.load', source: 'HAR_TEXT_ONLY', verified: false, transport: 'AJAX_CANDIDATE', endpoint: AJAX_ENDPOINT, method: 'POST',
    operation: 'core_output_load_template_with_dependencies', dynamicParameters: ['args'], requires: { session: true, sesskey: true, token: false },
    response: { type: 'JSON', shape: 'not present as a request specimen in supplied HAR' }, parser: 'unverified',
  }),
  contract({
    name: 'resource.view', source: 'HAR', verified: true, transport: 'WEB_FORM', endpoint: '/mod/resource/view.php?id={cmid}', method: 'GET',
    dynamicParameters: ['cmid'], requires: { session: true, sesskey: false, token: false }, response: { type: 'HTML', shape: 'Moodle resource page' }, parser: 'moodle.html.resource.v1',
  }),
  contract({
    name: 'assignment.view', source: 'HAR', verified: true, transport: 'WEB_FORM', endpoint: '/mod/assign/view.php?id={cmid}', method: 'GET',
    dynamicParameters: ['cmid'], requires: { session: true, sesskey: false, token: false }, response: { type: 'HTML', shape: 'Moodle assignment page' }, parser: 'moodle.html.assignment.v1',
  }),
  contract({
    name: 'assignment.edit', source: 'HAR', verified: true, transport: 'WEB_FORM', endpoint: '/mod/assign/view.php?id={cmid}&action=editsubmission', method: 'GET',
    dynamicParameters: ['cmid'], requires: { session: true, sesskey: false, token: false }, response: { type: 'HTML', shape: 'Moodle assignment submission form' }, parser: 'moodle.html.assignment.form.v1',
  }),
  contract({
    name: 'quiz.view', source: 'HAR', verified: true, transport: 'WEB_FORM', endpoint: '/mod/quiz/view.php?id={cmid}', method: 'GET',
    dynamicParameters: ['cmid'], requires: { session: true, sesskey: false, token: false }, response: { type: 'HTML', shape: 'Moodle quiz view page' }, parser: 'moodle.html.quiz.v1',
  }),

  contract({
    name: 'form.submit.runtime', source: 'RUNTIME_FORM', verified: false, runtime: true, transport: 'WEB_FORM', endpoint: '{action}', method: 'POST',
    dynamicParameters: ['action'], requires: { session: true, sesskey: false, token: false },
    response: { type: 'HTML', shape: 'runtime-discovered Moodle form response' }, parser: 'moodle.html.runtime-form.v1',
    retryPolicy: { maxAttempts: 1, retryOn: [], idempotent: false },
  }),
  contract({
    name: 'file.download', source: 'HAR', verified: true, transport: 'FILE', endpoint: FILE_ENDPOINT, method: 'GET',
    dynamicParameters: ['filePath'], requires: { session: true, sesskey: false, token: false }, response: { type: 'BINARY', shape: 'pluginfile response' }, parser: 'moodle.file.binary.v1',
  }),
];

export class ContractRegistry {
  constructor(contracts = CONTRACTS) {
    this.contracts = new Map(contracts.map(c => [c.name, c]));
    this.byMoodleOperation = new Map(contracts.filter(c => c.operation).map(c => [c.operation, c]));
  }
  resolve(name) {
    const c = this.contracts.get(name);
    if (!c) {
      const err = new Error(`Unknown Campus contract: ${name}`); err.code = 'UNKNOWN_CONTRACT'; throw err;
    }
    return c;
  }
  resolveMoodleOperation(methodname) {
    return this.byMoodleOperation.get(methodname) || null;
  }
  has(name) { return this.contracts.has(name); }
  verified() { return [...this.contracts.values()].filter(c => c.verified); }
  all() { return [...this.contracts.values()]; }
  describe() {
    return this.all().map(({ name, source, verified, transport, endpoint, method, staticParameters, dynamicParameters, requires, response, parser, fallback, retryPolicy }) => ({ name, source, verified, transport, endpoint, method, staticParameters, dynamicParameters, requires, response, parser, fallback, retryPolicy }));
  }
}
