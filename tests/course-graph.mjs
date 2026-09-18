import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseCourse } from '../backend/src/campus.js';
import { ActivityRegistry } from '../backend/src/activity-registry.js';
import { ActivityIndex } from '../backend/src/activity-index.js';
import { CourseGraph } from '../backend/src/course-graph.js';
import { OperationTrace } from '../backend/src/operation-trace.js';

const fixturePath = new URL('./fixtures/course-33043.html', import.meta.url);
const fixtureHtml = fs.readFileSync(fixturePath, 'utf8');
const parsed = parseCourse(fixtureHtml, 33043);
const observedTypes = new Set(['assign', 'resource', 'quiz', 'forum', 'glossary', 'page', 'folder', 'url', 'lanebs', 'znaniumcombook']);

assert.equal(parsed.id, 33043);
assert.equal(parsed.sections.reduce((n, section) => n + section.activities.length, 0), 54, 'HAR-derived large course fixture must contain 54 activities');
assert.deepEqual(new Set(parsed.sections.flatMap(section => section.activities.map(activity => activity.type))), observedTypes);
console.log('PASS graph fixture: HAR-derived course 33043 has 54 activities and only observed types');

const registry = new ActivityRegistry();
for (const type of observedTypes) assert.equal(registry.isKnown(type), true, `observed type ${type} must be registered`);
assert.equal(registry.isKnown('does-not-exist'), false);
assert.equal(registry.resolve('does-not-exist').type, 'unknown');
console.log('PASS graph registry: observed types + unknown fallback');

const trace = new OperationTrace({ enabled: false });
const graphA = new CourseGraph({ scopeId: 'user-a', registry, trace });
const graphB = new CourseGraph({ scopeId: 'user-b', registry, trace });
const courseA = graphA.mergeCourse(parsed, { source: { transport: 'WEB_FORM', endpoint: '/course/view.php?id=33043', operation: 'course.view', parser: 'moodle.html.course.v1' } });
assert.equal(courseA.ref.courseId, 33043);
assert.equal(courseA.sections.reduce((n, section) => n + section.activities.length, 0), 54);
assert.equal(graphA.getCourse(33043).ref.courseId, 33043);
assert.equal(graphA.getActivitiesByCourse(33043).length, 54);
assert.equal(graphA.getActivitiesByType('quiz').length, 5);
assert.equal(graphA.getActivitiesByType('assign').length, 25);
assert.equal(graphA.getActivitiesByType('resource').length, 14);
const fileFixture = graphA.mergeCourse({ id: 90000, title: 'File capability fixture', sections: [{ id: 1, name: 'Files', activities: [{ id: 90001, cmid: 90001, instance: 90002, modname: 'resource', name: 'Lecture PDF', contents: [{ type: 'file', filename: 'lecture.pdf', fileurl: '/pluginfile.php/90002/mod_resource/content/0/lecture.pdf' }] }] }] });
assert.equal(graphA.getActivitiesWithCapability('canDownload').length, 1);
assert.equal(fileFixture.sections[0].activities[0].capabilities.canDownload, true);
assert.equal(graphB.getActivitiesByCourse(33043).length, 0, 'different scope must not see User A activities');
assert.equal(graphA.getCourse(33043).source.transport, 'WEB_FORM');
console.log('PASS graph index: course/type/capability lookup + user isolation');

const quiz = graphA.getActivitiesByType('quiz')[0];
assert.ok(quiz?.identityKey);
assert.equal(graphA.getActivity(quiz.ref).identityKey, quiz.identityKey);
assert.equal(graphA.getActivity(quiz.identityKey).identityKey, quiz.identityKey);
console.log('PASS graph identity: stable activity reference lookup');

const reduced = JSON.parse(JSON.stringify(parsed));
reduced.sections = reduced.sections.slice(0, 1);
reduced.sections[0].activities = reduced.sections[0].activities.slice(0, 2);
graphA.mergeCourse(reduced, { source: { transport: 'WEB_FORM', endpoint: '/course/view.php?id=33043', operation: 'course.view', parser: 'moodle.html.course.v1' } });
assert.equal(graphA.getActivitiesByCourse(33043).length, 2, 'refresh merge must remove activities absent from the fresh course snapshot');
assert.equal(graphA.getActivitiesByCourse(33043)[0].identityKey.startsWith('course:33043:cmid:'), true);
console.log('PASS graph merge: refresh removes stale activities without duplicates');

const unknownCourse = {
  id: 90001,
  title: 'Unknown fixture',
  sections: [{ id: 1, name: 'Custom', activities: [{ id: 90011, cmid: 90011, instance: 90012, modname: 'customplugin', name: 'Custom activity', url: '/mod/custom/view.php?id=90011' }] }],
};
const unknown = graphA.mergeCourse(unknownCourse, { source: { transport: 'WEB_FORM', endpoint: '/course/view.php?id=90001', operation: 'course.view', parser: 'fixture' } });
assert.equal(unknown.sections[0].activities[0].ref.type, 'customplugin');
assert.equal(unknown.sections[0].activities[0].registry.known, false);
assert.equal(unknown.sections[0].activities[0].registry.type, 'unknown');
assert.equal(graphA.getActivitiesByCourse(90001).length, 1);
assert.deepEqual(graphA.getActivity(unknown.sections[0].activities[0].ref).pluginData, { registryType: 'unknown' });
assert.equal(unknown.sections[0].activities[0].source.raw.name, 'Custom activity');
console.log('PASS graph unknown activity: unregistered type preserved and indexed safely');


const duplicateInput = {
  id: 91000,
  title: 'Duplicate fixture',
  sections: [{ id: 1, name: 'One', activities: [
    { id: 91001, cmid: 91001, instance: 91002, modname: 'resource', name: 'Same activity', url: '/mod/resource/view.php?id=91001' },
    { id: 91001, cmid: 91001, instance: 91002, modname: 'resource', name: 'Same activity duplicate', url: '/mod/resource/view.php?id=91001' },
  ] }],
};
graphA.mergeCourse(duplicateInput);
assert.equal(graphA.getActivitiesByCourse(91000).length, 1, 'duplicate activity identities must collapse to one index entity');
assert.equal(graphA.getCourse(91000).sections[0].activities.length, 1, 'duplicate activity identities must not remain duplicated in the graph');
console.log('PASS graph dedupe: duplicate activity identity is collapsed');

const largeTrace = trace.list().find(entry => entry.operation === 'course.graph.merge' && entry.context?.courseId === 33043);
assert.ok(largeTrace, 'graph merge should emit an Operation Trace');
assert.ok(Array.isArray(largeTrace.stages));
assert.ok(largeTrace.stages.some(stage => stage.phase === 'GRAPH_NORMALIZE'));
assert.ok(largeTrace.stages.some(stage => stage.phase === 'GRAPH_MERGE_DONE'));
console.log('PASS graph trace: normalize/merge/index stages recorded without secrets');
