import assert from 'node:assert/strict';
import {CampusSession, parseCourse} from '../backend/src/campus.js';
import fs from 'node:fs';
import http from 'node:http';

const messagesSession = new CampusSession();
messagesSession.token = 'fixture-token';
let capturedUrl = '';
messagesSession.request = async (path, options) => {
  capturedUrl = String(path);
  return new Response(JSON.stringify([{error:false,data:{ok:true}}]), {status:200, headers:{'content-type':'application/json'}});
};
await messagesSession.rest('core_message_get_conversations', {userid:'66164', type:null, limitnum:51, favourites:true, mergeself:true});
assert(!capturedUrl.includes('type=null'), 'REST should omit null optional parameters');
assert(capturedUrl.includes('userid=66164'), 'REST should preserve scalar arguments');

const exactSession = new CampusSession();
const exactBodies = [];
exactSession.sesskey = 'fixture-sess';
exactSession.request = async (path, options) => { const b=JSON.parse(options.body); exactBodies.push(...b); return new Response(JSON.stringify(b.map(x => ({error:false,data: x.methodname==='core_message_get_conversations' ? {conversations:[]} : []}))), {status:200, headers:{'content-type':'application/json'}}); };
exactSession.userid = 66164;
await exactSession.messages();
const convCall = exactBodies.find(x => x.methodname === 'core_message_get_conversations' && x.args?.type === null);
assert.equal(convCall.args.limitnum, 51);
assert.equal(convCall.args.favourites, true);
assert.equal(convCall.args.mergeself, true);

const pdfSession = new CampusSession();
pdfSession.page = async () => ({status:200, contentType:'application/pdf', headers:{'content-disposition':'inline; filename="lecture.pdf"'}, text:''});
const pdfPage = await pdfSession.contentPage('/pluginfile.php/123/mod_resource/content/1/lecture.pdf');
assert.equal(pdfPage.kind, 'file');
assert.equal(pdfPage.filename, 'lecture.pdf');

const resourceHtml = `<!doctype html><html><head><title>Лекция 1</title></head><body><a href="https://campus.fa.ru/pluginfile.php/123/mod_resource/content/1/lecture.pdf">lecture.pdf</a></body></html>`;
const resourceSession = new CampusSession();
resourceSession.page = async () => ({status:200, contentType:'text/html', headers:{}, text:resourceHtml});
const resourcePage = await resourceSession.contentPage('/mod/resource/view.php?id=1');
assert.equal(resourcePage.kind, 'resource');
assert.match(resourcePage.downloadPath, /pluginfile\.php/);

const courseHtml = `<!doctype html><html><head><title>Курс: Демо</title></head><body><li id="section-1" class="section main clearfix"><h3 class="sectionname">Тема</h3><li class="activity quiz modtype_quiz" id="module-1"><a href="https://campus.fa.ru/mod/quiz/view.php?id=2"><span class="instancename">Тест</span></a></li></li></body></html>`;
const parsed = parseCourse(courseHtml, 10);
assert.equal(parsed.sections.length, 1);
assert.equal(parsed.sections[0].activities[0].type, 'quiz');
const modernCourseHtml = `<!doctype html><html><head><title>Курс: Modern</title></head><body><li data-for="section" data-id="44" data-number="1"><div class="section-item"><h3 class="sectionname">Тема 1</h3><li data-for="cmitem" data-id="88" class="activity activity-wrapper quiz modtype_quiz" id="module-88"><a href="/mod/quiz/view.php?id=88"><span class="instancename">Контрольный тест</span></a></li></div></li></body></html>`;
const modernParsed = parseCourse(modernCourseHtml, 44);
assert.equal(modernParsed.sections.length, 1, 'modern Moodle section markup must parse');
assert.equal(modernParsed.sections[0].activities[0].id, 88, 'modern Moodle activity id must parse');
const emptyCourseSession = new CampusSession();
emptyCourseSession.page = async () => ({status:200, contentType:'text/html', headers:{}, text:'<html><head><title>Курс: Пустой курс</title></head><body><h1>Пустой курс</h1></body></html>'});
const emptyCourse = await emptyCourseSession.course(9001);
assert.equal(emptyCourse.title,'Пустой курс','a valid course page with no activities must still open');
console.log('PASS v7 quality: REST null handling');
console.log('PASS v7 quality: PDF detection');
console.log('PASS v7 quality: resource download detection');
console.log('PASS v7 quality: course parser');

const nestedSession = new CampusSession();
nestedSession.token = 'fixture-token';
let nestedUrl = '';
nestedSession.request = async (path) => { nestedUrl = String(path); return new Response(JSON.stringify([{error:false,data:{ok:true}}]), {status:200, headers:{'content-type':'application/json'}}); };
await nestedSession.sendConversationMessage(42, 'Привет, Nova');
assert(nestedUrl.includes('conversationid=42'), 'message REST must preserve conversation id');
assert(nestedUrl.includes('messages%5B0%5D%5Btext%5D=') || nestedUrl.includes('messages%5B0%5D%5Btext%5D'), 'message REST must encode nested text');
assert(nestedUrl.includes('messages%5B0%5D%5Btextformat%5D=1') || nestedUrl.includes('messages%5B0%5D%5Btextformat%5D=1'), 'message REST must encode nested textformat');
console.log('PASS v10 quality: nested REST message params');

const appSourceForQuality = fs.readFileSync(new URL('../frontend/app.js', import.meta.url), 'utf8');
assert(!/<(?:PageHead|Panel|CalendarWidget)\b/.test(appSourceForQuality), 'frontend must not leak unresolved custom HTML tags');
assert(!appSourceForQuality.includes('Кубанский филиал'), 'legacy branch label must not remain in frontend');
console.log('PASS v10 quality: no unresolved custom tags / legacy branch label');
assert(appSourceForQuality.includes("$('#theme-top')?.addEventListener('click',themeToggle)"), 'top theme control must be bound');
assert(appSourceForQuality.includes("$$('[data-day]')"), 'calendar day buttons must be interactive');
assert(appSourceForQuality.includes('history[method]'), 'router must use History API');
assert(appSourceForQuality.includes('location.hash'), 'router must retain legacy hash deep-link compatibility');
assert(appSourceForQuality.includes("params.get('demo')==='1'"), 'demo mode must remain explicit');
assert(appSourceForQuality.includes("/api/download?"), 'file downloads must use Nova download endpoint');
assert(appSourceForQuality.includes('FormData(form)'), 'campus forms must preserve file uploads');
assert(appSourceForQuality.includes('Новых сообщений нет.'), 'messages empty state must use the requested neutral text');
console.log('PASS v10 quality: theme/calendar/history/download/form bindings');

const gradeSession = new CampusSession();
gradeSession.token = 'fixture-token';
gradeSession.userid = 42;
gradeSession.page = async () => ({status:200, contentType:'text/html', headers:{}, text:'<html><body><h1>Оценки</h1><p>Нет таблицы в web view</p></body></html>'});
gradeSession.rest = async (method) => { assert.equal(method, 'gradereport_overview_get_course_grades'); return { grades:[{courseid:11,coursename:'Алгебра',gradeformatted:'5'}] }; };
const gradeFallback = await gradeSession.gradesOverview();
assert.equal(gradeFallback.length,1,'grade overview must have a REST fallback when HTML table is unavailable');
assert.equal(gradeFallback[0].course,'Алгебра');
assert.equal(gradeFallback[0].grade,'5');
console.log('PASS v10.2 quality: grades REST fallback');


// V2.1 hardening: auth/session recovery primitives, per-request isolation and root theme sync.
assert(appSourceForQuality.includes('document.documentElement'), 'theme must sync to the document root');
assert(appSourceForQuality.includes('state.requests'), 'frontend requests must be isolated per service');
assert(appSourceForQuality.includes('routeEpoch'), 'frontend must reject stale route responses');
assert(appSourceForQuality.includes('25000'), 'frontend API calls must have a client timeout');
const backendSource = fs.readFileSync(new URL('../backend/src/campus.js', import.meta.url), 'utf8');
assert(backendSource.includes('_singleFlight'), 'Campus session must deduplicate concurrent requests');
assert(backendSource.includes('RETRYABLE_STATUS'), 'Campus transport must define retryable statuses');
assert(backendSource.includes('AUTH_EXPIRED'), 'Campus transport must classify expired sessions');
assert(backendSource.includes('sessionController'), 'Campus session reset must abort stale in-flight requests');
const serverSource = fs.readFileSync(new URL('../backend/src/server.js', import.meta.url), 'utf8');
assert(serverSource.includes('invalidateNovaSession'), 'server must invalidate Nova session on Campus auth expiry');
assert(serverSource.includes("segment === '..'"), 'path validation must reject traversal segments without rejecting legitimate filenames');
console.log('PASS v2.1 quality: retries, single-flight, auth recovery, route isolation');


const flightSession = new CampusSession();
flightSession.sesskey='fixture';
let flightCalls=0;
flightSession.ajax = async () => { flightCalls++; await new Promise(r=>setTimeout(r,25)); return [{error:false,data:{courses:[{id:1}]}}]; };
const [f1,f2]=await Promise.all([flightSession.courses(),flightSession.courses()]);
assert.equal(flightCalls,1,'concurrent course loads must share one promise');
assert.deepEqual(f1,f2);
console.log('PASS v2.1 quality: Campus course single-flight');

const recoverySession = new CampusSession();
recoverySession.sesskey='expired'; recoverySession.token='valid-token'; recoverySession.userid=7;
recoverySession.request = async () => new Response(JSON.stringify([{error:true,exception:{errorcode:'invalidsesskey',message:'Invalid sesskey'}}]),{status:200,headers:{'content-type':'application/json'}});
await assert.rejects(() => recoverySession.ajax([{index:0,methodname:'core_calendar_get_calendar_monthly_view',args:{year:2026,month:9,courseid:1,day:17}}]), e => e?.code==='AUTH_EXPIRED');
assert.equal(recoverySession.sesskey,null,'expired web session should be cleared');
assert.equal(recoverySession.token,'valid-token','valid REST token should survive web-session recovery');
console.log('PASS v2.1 quality: web-session recovery preserves token without blind REST fallback');

const forbiddenServer=http.createServer((req,res)=>{res.statusCode=403;res.end('forbidden')});
await new Promise(r=>forbiddenServer.listen(0,'127.0.0.1',r));
const forbiddenPort=forbiddenServer.address().port;
const forbidden403Session = new CampusSession({baseUrl:`http://127.0.0.1:${forbiddenPort}`});
await assert.rejects(() => forbidden403Session.get('/private'), e => e?.code==='PERMISSION_DENIED' && e?.status===403);
await new Promise(r=>forbiddenServer.close(r));
console.log('PASS v10.2 quality: 403 is permission error, not auth expiry');
