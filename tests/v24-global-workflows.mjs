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

const html = fs.readFileSync(new URL('./fixtures/course-33043.html', import.meta.url), 'utf8');
const parsed = parseCourse(html, 33043);
const registry = new ActivityRegistry();
const index = new ActivityIndex({ scopeId: 'v24-global' });
const trace = new OperationTrace({ enabled: true, logger: { debug() {} } });
const graph = new CourseGraph({ scopeId: 'v24-global', registry, index, trace });
graph.mergeCourse(parsed, { source: { transport:'WEB_FORM', endpoint:'/course/view.php?id=33043', operation:'course.view', parser:'fixture' } });

assert.equal(index.getActivitiesByType('assign').length, 25);
assert.equal(index.getActivitiesByType('quiz').length, 5);
const fileFixtureCourse = graph.mergeCourse({ id: 99000, title: 'Global file fixture', sections: [{ id: 1, name: 'Files', activities: [{ id: 99001, cmid: 99001, instance: 99002, modname: 'resource', name: 'Lecture PDF', contents: [{ type:'file', filename:'Lecture.pdf', fileurl:'/pluginfile.php/99002/mod_resource/content/0/Lecture.pdf', mimetype:'application/pdf', filesize:1234 }] }] }] });
assert.ok(index.getActivitiesWithCapability('canDownload').length > 0);
assert.equal(fileFixtureCourse.sections[0].activities[0].capabilities.canDownload, true);
assert.equal(new Set(index.all().map(a => a.identityKey)).size, index.all().length);
for (const activity of index.all()) assert.ok(activity.ref.courseId && activity.ref.cmid, `stable ref for ${activity.identity?.name}`);

const fakeSession = { baseUrl:'https://campus.fa.ru', trace, executeOperation: async () => { throw new Error('live transport not used in this fixture'); } };
const fileService = new FileService({ session: fakeSession, trace });
const formService = new FormService({ session: fakeSession, trace });
const engine = new ActivityEngine({ registry, index, session: fakeSession, trace, fileService, formService });
const sampleAssign = index.getActivitiesByType('assign')[0];
const sampleQuiz = index.getActivitiesByType('quiz')[0];
assert.equal(engine.resolveDriver(sampleAssign).constructor.name, 'AssignmentDriver');
assert.equal(engine.resolveDriver(sampleQuiz).constructor.name, 'QuizDriver');
assert.equal(engine.getActions(sampleAssign.ref).some(a => a.name === 'edit'), true);
assert.equal(engine.getActions(sampleQuiz.ref).some(a => a.name === 'start'), true);
console.log('PASS v24 global workflow foundation: 25 assignments + 5 quizzes resolved from the shared Activity Index without duplicate identities');

const serverSource = fs.readFileSync(new URL('../backend/src/server.js', import.meta.url), 'utf8');
const appSource = fs.readFileSync(new URL('../frontend/app.js', import.meta.url), 'utf8');
assert.match(serverSource, /globalActivities\(s,\{type:'assign'/, 'global tasks must use Activity Index-backed helper');
assert.match(serverSource, /globalActivities\(s,\{type:'quiz'/, 'global tests must use Activity Index-backed helper');
assert.match(serverSource, /globalFiles\(s,\{force\}\)/, 'global files must use Activity Index-backed helper');
assert.match(serverSource, /globalActivities\(s,\{materials:true/, 'materials must use Activity Index-backed helper');
for (const endpoint of ['/api/tasks','/api/tests','/api/files','/api/materials','/api/activity','/api/activity/action']) assert.ok(appSource.includes(endpoint), `frontend must remain wired to ${endpoint}`);
assert.match(appSource, /data-activity=/, 'global activity cards must carry Activity references');
console.log('PASS v24 global UI wiring: Tasks/Tests/Files/Materials remain routed through Activity references and Activity Engine endpoints');
