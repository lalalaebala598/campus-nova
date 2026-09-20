import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseCourse } from '../backend/src/campus.js';
import { ActivityRegistry } from '../backend/src/activity-registry.js';
import { ActivityIndex } from '../backend/src/activity-index.js';
import { CourseGraph } from '../backend/src/course-graph.js';
import { ActivityEngine } from '../backend/src/activity-engine.js';
import { FileService } from '../backend/src/file-service.js';
import { FormService } from '../backend/src/form-service.js';
import { OperationTrace } from '../backend/src/operation-trace.js';

const fixture = fs.readFileSync(new URL('./fixtures/course-33043.html', import.meta.url), 'utf8');
const parsed = parseCourse(fixture, 33043);
const registry = new ActivityRegistry();
const index = new ActivityIndex({ scopeId: 'engine-test' });
const trace = new OperationTrace({ enabled: true, logger: { debug() {} } });
const graph = new CourseGraph({ scopeId: 'engine-test', registry, index, trace });
graph.mergeCourse(parsed, { source: { transport: 'WEB_FORM', endpoint: '/course/view.php?id=33043', operation: 'course.view', parser: 'fixture' } });

function headers(values = {}) { return new Headers(values); }
function htmlResponse(html, url = 'https://campus.fa.ru/mod/quiz/view.php?id=1') {
  return new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } });
}
function fileResponse() {
  return new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { 'content-type': 'application/pdf', 'content-length': '3', 'content-disposition': "attachment; filename*=UTF-8''lecture.pdf" } });
}

const calls = [];
const fakeSession = {
  baseUrl: 'https://campus.fa.ru',
  trace,
  async request(path, options = {}) {
    if (/\/mod\/quiz\/attempt\.php/i.test(String(path))) {
      return new Response('<html><body><main><h1>Quiz attempt</h1></main></body></html>', { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } });
    }
    throw new Error(`unexpected request ${options.method || 'GET'} ${path}`);
  },
  async executeOperation(operation, context, params, options) {
    calls.push({ operation, context, params, options });
    if (operation === 'quiz.view') return { response: htmlResponse('<html><title>Test Quiz</title><a href="/mod/quiz/attempt.php?attempt=901&cmid=777&page=0">Continue attempt</a><form action="/mod/quiz/startattempt.php" method="post"><input type="hidden" name="cmid" value="777"><input type="hidden" name="sesskey" value="SECRET"><button type="submit" name="submitbutton" value="Attempt quiz">Start</button></form></html>'), parsed: { html: '<html><title>Test Quiz</title><a href="/mod/quiz/attempt.php?attempt=901&cmid=777&page=0">Continue attempt</a><form action="/mod/quiz/startattempt.php" method="post"><input type="hidden" name="cmid" value="777"><input type="hidden" name="sesskey" value="SECRET"><button type="submit" name="submitbutton" value="Attempt quiz">Start</button></form></html>', title: 'Test Quiz' }, traceId: 'transport-1', contract: { transport: 'WEB_FORM', operation: 'quiz.view' } };
    if (operation === 'assignment.view') return { response: htmlResponse('<html><title>Assignment</title><div>Add submission</div></html>'), parsed: { html: '<html><title>Assignment</title><div>Add submission</div></html>', title: 'Assignment' }, traceId: 'transport-2', contract: { transport: 'WEB_FORM', operation: 'assignment.view' } };
    if (operation === 'assignment.edit') return { response: htmlResponse('<form id="mform"><input type="hidden" name="sesskey" value="SECRET"><textarea name="onlinetext">hello</textarea><input type="submit" name="submitbutton" value="Save changes"><input type="file" name="files_filemanager"></form>'), parsed: { html: '<form id="mform"><input type="hidden" name="sesskey" value="SECRET"><textarea name="onlinetext">hello</textarea><input type="submit" name="submitbutton" value="Save changes"><input type="file" name="files_filemanager"></form>', title: null }, traceId: 'transport-3', contract: { transport: 'WEB_FORM', operation: 'assignment.edit' } };
    if (operation === 'resource.view') return { response: htmlResponse('<html><title>Lecture</title><main>Lecture body</main></html>'), parsed: { html: '<html><title>Lecture</title><main>Lecture body</main></html>', title: 'Lecture' }, traceId: 'transport-4', contract: { transport: 'WEB_FORM', operation: 'resource.view' } };
    if (operation === 'file.download') return { response: fileResponse(), parsed: null, traceId: 'transport-file', contract: { transport: 'FILE', operation: 'file.download' } };
    if (operation === 'form.submit.runtime') {
      const body = String(options.formBody || '');
      if (/startattempt/.test(String(params.action||''))) {
        return { response: new Response('', { status: 303, headers: { location: '/mod/quiz/attempt.php?attempt=901&cmid=777', 'content-type':'text/html' } }), parsed: null, traceId: 'transport-form-start', contract: { transport: 'WEB_FORM', operation: 'form.submit.runtime' } };
      }
      return { response: new Response('<html><main><div>Submission status: draft</div></main></html>', { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } }), parsed: { html:'<html><main><div>Submission status: draft</div></main></html>', contentType:'text/html' }, traceId: 'transport-form-submit', contract: { transport: 'WEB_FORM', operation: 'form.submit.runtime' } };
    }
    throw new Error(`unexpected operation ${operation}`);
  }
};

const fileService = new FileService({ session: fakeSession, trace });
const formService = new FormService({ session: fakeSession, trace });
const engine = new ActivityEngine({ registry, index, session: fakeSession, trace, fileService, formService });
for (const type of ['resource', 'assign', 'quiz', 'forum', 'glossary', 'page', 'folder', 'url', 'lanebs', 'znaniumcombook']) {
  const candidate = type === 'file' ? null : index.getActivitiesByType(type)[0];
  if (candidate) {
    const driver = engine.resolveDriver(candidate);
    assert.equal(typeof driver.discover, 'function', `${type} driver must implement discover()`);
    assert.ok(driver.discover(candidate).driver);
  }
}

assert.equal(engine.getActions(index.getActivity({ courseId: 33043, cmid: index.getActivitiesByType('quiz')[0].ref.cmid }).ref)[0].name, 'open');
const quiz = index.getActivitiesByType('quiz')[0];
const openedQuiz = await engine.open(quiz.ref);
assert.equal(openedQuiz.kind, 'quiz');
assert.equal(openedQuiz.access.startForm.hasSesskey, true);
assert.equal(openedQuiz.capabilities.canStart, true);
assert.equal(openedQuiz.capabilities.canAttempt, true);
assert.equal(openedQuiz.access.continueAttempt.attemptId, 901);
assert.equal(openedQuiz.attempts[0].status, 'inprogress');
assert.ok(
  openedQuiz.access.continueAttempt.path.includes(
    'attempt=901'
  )
);
assert.ok(calls.some(c => c.operation === 'quiz.view'));

const assign = index.getActivitiesByType('assign')[0];
const assignment = await engine.open(assign.ref);
assert.equal(assignment.kind, 'assignment');
assert.equal(assignment.submission.status, 'not-submitted');
const edit = await engine.execute(assign.ref, 'edit');
assert.equal(edit.form.hasSesskey, true);
assert.equal(edit.form.hasFileManager, true);
assert.equal(edit.form.submitters[0].name, 'submitbutton');
const builtPayload = formService.buildPayload(edit.form, { onlinetext: 'updated answer' });
assert.equal(builtPayload.get('onlinetext'), 'updated answer');
assert.equal(builtPayload.get('submitbutton'), 'Save changes');
assert.equal(builtPayload.get('sesskey'), 'SECRET');
const saved = await engine.execute(assign.ref, 'save', { values: { onlinetext: 'updated answer' } });
assert.equal(saved.confirmed, true);
assert.equal(saved.submission.status, 'draft');
const submitted = await engine.execute(assign.ref, 'submit', { values: { onlinetext: 'updated answer' } });
assert.equal(submitted.confirmed, false);
assert.equal(submitted.submission.status, 'draft');

const resource = index.getActivitiesByType('resource')[0];
const resourceResult = await engine.open(resource.ref);
assert.equal(resourceResult.kind, 'resource');
assert.equal(resourceResult.title, 'Lecture');
assert.equal(
  resourceResult.files.length,
  1,
  'resource must expose only files found on its own page'
);
assert.equal(
  resourceResult.files[0].filename,
  'lecture.pdf',
  'resource file must come from the opened resource page'
);

const fileGraph = new CourseGraph({ scopeId: 'file', registry: new ActivityRegistry(), index: new ActivityIndex({ scopeId: 'file' }), trace });
fileGraph.mergeCourse({ id: 9100, title: 'File course', sections: [{ id: 1, name: 'Files', activities: [{ id: 9101, cmid: 9101, instance: 9102, modname: 'file', name: 'Lecture PDF', contents: [{ type: 'file', filename: 'Лекция 1.pdf', fileurl: 'https://campus.fa.ru/pluginfile.php/123/mod_resource/content/1/%D0%9B%D0%B5%D0%BA%D1%86%D0%B8%D1%8F%201.pdf', mimetype: 'application/pdf' }] }] }] });
const fileEngine = new ActivityEngine({ registry: fileGraph.registry, index: fileGraph.index, session: fakeSession, trace, fileService, formService });
const fileActivity = fileGraph.getActivity({ courseId: 9100, cmid: 9101 });
const files = fileService.listFiles(fileActivity);
assert.equal(files.length, 1);
assert.equal(decodeURIComponent(fileService.getPluginfilePath(files[0])).includes('Лекция'), true);
const downloaded = await fileEngine.execute(fileActivity.ref, 'download');
assert.equal(downloaded.response.status, 200);

const startedQuiz = await engine.execute(quiz.ref, 'start');
assert.equal(startedQuiz.confirmed, true);
assert.equal(startedQuiz.attemptId, 901);
const unknownGraph = new CourseGraph({ scopeId: 'unknown', registry: new ActivityRegistry(), index: new ActivityIndex({ scopeId: 'unknown' }), trace });
unknownGraph.mergeCourse({ id: 90001, title: 'Unknown', sections: [{ id: 1, name: 'Custom', activities: [{ id: 90011, cmid: 90011, instance: 90012, modname: 'customplugin', name: 'Custom', url: '/mod/custom/view.php?id=90011' }] }] });
const unknown = unknownGraph.getActivity({ courseId: 90001, cmid: 90011 });
const unknownEngine = new ActivityEngine({ registry: unknownGraph.registry, index: unknownGraph.index, session: fakeSession, trace, fileService, formService });
await assert.rejects(() => unknownEngine.execute(unknown.ref, 'open'), err => err.code === 'FALLBACK_REQUIRED');
assert.equal(unknownEngine.fallback(unknown.ref).mode, 'controlled-campus');

const engineEntries = trace.list().filter(e => /^activity\./.test(e.operation));
assert.ok(engineEntries.length >= 3);
assert.ok(engineEntries.some(e => e.phase === 'DONE' || e.error));
assert.ok(engineEntries.some(e => e.operation === 'activity.open' && e.stages?.some(stage => stage.phase === 'ACTIVITY_RESOLVED')));
const serialized = JSON.stringify(trace.list());
assert.equal(serialized.includes('SECRET'), false, 'trace must redact sesskey');
assert.equal(serialized.includes('MoodleSession'), false, 'trace must not expose session cookie names');
assert.equal(serialized.includes('cookie='), false, 'trace must not expose cookie values');

console.log('PASS activity engine: verified resource/assignment/quiz opens + unverified state changes are blocked + unknown fallback');
