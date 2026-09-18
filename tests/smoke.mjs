import assert from 'node:assert/strict';
import {CampusSession, parseCourse} from '../backend/src/campus.js';

const courseHtml = `<!doctype html><html><head><title>Курс: Демо курс</title></head><body>
<ul>
<li id="section-1" class="section main clearfix"><div class="content"><h3 class="sectionname">Организационный раздел</h3><ul class="section img-text"><li class="activity assign modtype_assign" id="module-100"><div><div class="activityinstance"><a href="https://campus.fa.ru/mod/assign/view.php?id=100"><span class="instancename">Задание 1</span></a></div></div></li></ul></div></li>
<li id="section-2" class="section main clearfix"><div class="content"><h3 class="sectionname">Тема 1</h3><ul class="section img-text"><li class="activity quiz modtype_quiz" id="module-101"><div><div class="activityinstance"><a href="https://campus.fa.ru/mod/quiz/view.php?id=101"><span class="instancename">Тест</span></a></div></div></li></ul></div></li>
</ul></body></html>`;
const course = parseCourse(courseHtml, 33045);
assert.equal(course.id, 33045);
assert.match(course.title, /Демо курс/);
assert.equal(course.sections.length, 2);
assert.ok(course.sections.some(s => s.activities.some(a => a.name === 'Задание 1')));

const session = new CampusSession();
session.userid = 66164;
session.ajax = async requests => requests.map(r => {
  const n = r.methodname;
  if (n === 'core_message_get_conversation_counts') return {error:false,data:{favourites:1,types:{1:2,2:0,3:0}}};
  if (n === 'core_message_get_unread_conversation_counts') return {error:false,data:{favourites:0,types:{1:0,2:0,3:0}}};
  if (n === 'core_message_get_conversations' && r.args.type === null) return {error:false,data:{conversations:[{id:10,name:'Избранное',type:3,messages:[{id:1,text:'Привет',timecreated:10}],members:[{id:66164,fullname:'Студент'}]}]}};
  if (n === 'core_message_get_conversations' && r.args.type === 2) return {error:false,data:{conversations:[]}};
  if (n === 'core_message_get_conversations' && r.args.type === 1) return {error:false,data:{conversations:[{id:11,name:'Преподаватель',type:1,messages:[{id:2,text:'Здравствуйте',timecreated:20}],members:[{id:13055,fullname:'Преподаватель'}]}]}};
  if (n === 'core_message_get_user_contacts') return {error:false,data:[]};
  if (n === 'core_message_get_contact_requests') return {error:false,data:[]};
  throw new Error(`Unexpected mock method: ${n}`);
});
const messages = await session.messages();
assert.equal(messages.conversations.length, 2);
assert.equal(messages.conversations[0].id, 11);

const courseSession = new CampusSession();
courseSession.page = async () => ({status:200,contentType:'text/html',location:null,text:courseHtml});
const parsedCourse = await courseSession.course(33045);
assert.ok(parsedCourse.sections.some(s => s.activities.some(a => a.name === 'Задание 1')));

const tokenSession = new CampusSession();
tokenSession.token = 'fixture';
tokenSession.courses = async () => [{id:33045, fullname:'Fixture course', fullnamedisplay:'Fixture course', summary:'', courseimage:null}];
tokenSession.rest = async (method, args) => {
  assert.equal(method, 'core_course_get_contents');
  assert.equal(args.courseid, 33045);
  return [{id:1,name:'Section 1',summary:'',modules:[{id:1226627,modname:'assign',name:'Задание 1',url:'https://campus.fa.ru/mod/assign/view.php?id=1226627'}]}];
};
const restCourse = await tokenSession.course(33045);
assert.equal(restCourse.sections[0].activities[0].name, 'Задание 1');

console.log('PASS course parser');
console.log('PASS messages adapter');
console.log('PASS course REST fallback path');
console.log('PASS smoke tests');
