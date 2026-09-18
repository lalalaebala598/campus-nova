import assert from 'node:assert/strict';
import { CampusSession } from '../backend/src/campus.js';

const campus = new CampusSession({ debug: false, baseUrl: 'http://hybrid.test' });
campus.token = 'fixture-token';
campus.userid = 42;
campus.user = { id: 42, fullname: 'Student' };
let calls = [];
campus.rest = async (method, args) => {
  calls.push(['rest', method, args]);
  if (method === 'core_course_get_enrolled_courses_by_timeline_classification') return { courses: [{ id: 33043, fullname: 'Real course', fullnamedisplay: 'Real course' }] };
  if (method === 'core_course_get_contents') return [{ id: 1, name: 'Section', modules: [{ id: 101, name: 'Resource', modname: 'resource', url: '/mod/resource/view.php?id=101' }] }];
  if (method === 'core_calendar_get_calendar_monthly_view') return { weeks: [{ days: [{ timestamp: 1, events: [{ id: 1, name: 'Event', timestart: 1 }] }] }] };
  if (method === 'core_message_get_conversation_counts') return {};
  if (method === 'core_message_get_unread_conversation_counts') return {};
  if (method === 'core_message_get_conversations') return { conversations: [{ id: 9, name: 'Chat', messages: [] }] };
  if (method === 'core_message_get_user_contacts') return [];
  if (method === 'core_message_get_contact_requests') return [];
  throw new Error(`unexpected ${method}`);
};

const courses = await campus.courses();
assert.equal(courses.length, 1);
const course = await campus.course(33043);
assert.equal(course.id, 33043);
assert.equal(course.sections[0].activities[0].name, 'Resource');
const calendar = await campus.calendar({ year: 2026, month: 9, day: 18 });
assert.equal(calendar.weeks[0].days[0].events[0].name, 'Event');
const messages = await campus.messages();
assert.equal(messages.conversations[0].id, 9);
assert.ok(calls.some(x => x[1] === 'core_course_get_enrolled_courses_by_timeline_classification'));
assert.ok(calls.some(x => x[1] === 'core_course_get_contents'));
assert.ok(calls.some(x => x[1] === 'core_calendar_get_calendar_monthly_view'));
assert.ok(calls.some(x => x[1] === 'core_message_get_conversations'));
console.log('PASS live-data hybrid: token-capable read paths for courses/course/calendar/messages');
