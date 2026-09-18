import assert from 'node:assert/strict';
import http from 'node:http';
import {CampusSession} from '../backend/src/campus.js';

const loginHtml = `<!doctype html><html><head><title>Вход</title></head><body><form action="/login/index.php" method="post"><input type="hidden" name="logintoken" value="fixture"><input name="username"><input name="password" type="password"></form></body></html>`;
const myHtml = `<!doctype html><html><head><title>Личный кабинет</title><script>var M={cfg:{"sesskey":"fixture-sess","contextid":123}}</script></head><body><button class="tool-login" title="Fixture Student">Fixture Student</button><div data-userid="42"></div></body></html>`;
const courseHtml = `<!doctype html><html><head><title>Курс: Fixture</title></head><body><li id="section-1" class="section main clearfix"><h3 class="sectionname">Раздел</h3><ul><li class="activity quiz modtype_quiz" id="module-7"><a href="/mod/quiz/view.php?id=7"><span class="instancename">Тест</span></a></li><li class="activity resource modtype_resource" id="module-8"><a href="/mod/resource/view.php?id=8"><span class="instancename">Лекция</span></a></li></ul></li></body></html>`;

const server = http.createServer(async (req,res)=>{
  const u = new URL(req.url,'http://127.0.0.1');
  res.setHeader('content-type','text/html; charset=utf-8');
  if (u.pathname==='/login/index.php' && req.method==='GET') return res.end(loginHtml);
  if (u.pathname==='/login/index.php' && req.method==='POST') { res.statusCode=303; res.setHeader('set-cookie','MoodleSession=fixture; Path=/'); res.setHeader('location','/my/'); return res.end(); }
  if (u.pathname==='/my/') return res.end(myHtml);
  if (u.pathname==='/course/view.php') return res.end(courseHtml);
  if (u.pathname==='/webservice/rest/server.php') { res.setHeader('content-type','application/json'); return res.end(JSON.stringify([{error:false,data:{courses:[]}}])); }
  if (u.pathname==='/lib/ajax/service.php') {
    let body=''; for await (const c of req) body+=c;
    const items=JSON.parse(body); const out=items.map(it=>{
      if(it.methodname==='core_course_get_enrolled_courses_by_timeline_classification') return {error:false,data:{courses:[{id:11,fullname:'Fixture',fullnamedisplay:'Fixture',progress:50,hasprogress:true}]}};
      if(it.methodname==='core_calendar_get_calendar_monthly_view') return {error:false,data:{weeks:[]}};
      if(it.methodname==='core_message_get_conversation_counts') return {error:false,data:{favourites:0,types:{1:0,2:0,3:0}}};
      if(it.methodname==='core_message_get_unread_conversation_counts') return {error:false,data:{favourites:0,types:{1:0,2:0,3:0}}};
      if(it.methodname==='core_message_get_conversations') return {error:false,data:{conversations:[]}};
      if(it.methodname==='core_message_get_user_contacts') return {error:false,data:[]};
      if(it.methodname==='core_message_get_contact_requests') return {error:false,data:[]};
      return {error:true,exception:{message:'Unexpected fixture method'}};
    });
    res.setHeader('content-type','application/json'); return res.end(JSON.stringify(out));
  }
  if (u.pathname.includes('/pluginfile.php/')) { res.setHeader('content-type','application/pdf'); res.setHeader('content-disposition','inline; filename="lecture.pdf"'); res.setHeader('content-length','12'); return res.end('%PDF-fixture%'); }
  res.statusCode=404; return res.end('not found');
});

await new Promise(r=>server.listen(0,'127.0.0.1',r));
const {port}=server.address();
const s=new CampusSession({baseUrl:`http://127.0.0.1:${port}`});
const login=await s.login('student','password');
assert.equal(login.session,true);
assert.equal(s.sesskey,'fixture-sess');
assert.equal(s.userid,42);
const courses=await s.courses();
assert.equal(courses[0].id,11);
const messages=await s.messages();
assert.equal(messages.conversations.length,0);
const course=await s.course(11);
assert.equal(course.sections[0].activities[0].type,'quiz');

// Same-campus POST redirect (e.g. quiz start) must resolve to the resulting HTML page.
let actionSession = new CampusSession({baseUrl:`http://127.0.0.1:${port}`});
actionSession.jar.set('MoodleSession','fixture');
const originalRequest = actionSession.request.bind(actionSession);
const actionServer = http.createServer(async (req,res)=>{
  const u = new URL(req.url,'http://127.0.0.1');
  if (u.pathname === '/mod/quiz/startattempt.php' && req.method==='POST') { res.statusCode=303; res.setHeader('location','/mod/quiz/attempt.php?attempt=55'); return res.end(); }
  if (u.pathname === '/mod/quiz/attempt.php') { res.setHeader('content-type','text/html; charset=utf-8'); return res.end('<!doctype html><html><head><title>Тест</title></head><body><div role=\"main\"><h2>Вопрос 1</h2><form method=\"post\" action=\"/mod/quiz/processattempt.php\"><input name=\"answer\"><button type=\"submit\">Завершить попытку</button></form></div></body></html>'); }
  res.statusCode=404;res.end();
});
await new Promise(r=>actionServer.listen(0,'127.0.0.1',r));
const aport=actionServer.address().port;
const action=new CampusSession({baseUrl:`http://127.0.0.1:${aport}`});
const ap=await action.requestPage('/mod/quiz/startattempt.php');
assert.equal(ap.path,'/mod/quiz/startattempt.php');
const ar=await action.request('/mod/quiz/startattempt.php',{method:'POST',body:'sesskey=x'});
assert.equal(ar.status,303);
const follow=await action.requestPage(ar.headers.get('location'));
assert.match(await follow.response.text(),/Вопрос 1/);
await new Promise(r=>actionServer.close(r));
console.log('PASS integration: same-campus redirect following');
await new Promise(r=>server.close(r));
console.log('PASS integration: form login + session cookies');
console.log('PASS integration: courses AJAX');
console.log('PASS integration: messages AJAX');
console.log('PASS integration: course HTML fallback');


// V2.1 transport hardening fixtures.
const retryHttp = http.createServer((req,res)=>{
  retryHttp.calls = (retryHttp.calls||0) + 1;
  if (retryHttp.calls < 3) { res.statusCode=503; return res.end('busy'); }
  res.setHeader('content-type','application/json'); return res.end(JSON.stringify([{error:false,data:{courses:[]}}]));
});
await new Promise(r=>retryHttp.listen(0,'127.0.0.1',r));
const rport=retryHttp.address().port;
const retrySession=new CampusSession({baseUrl:`http://127.0.0.1:${rport}`});
retrySession.token='fixture-token';
const retryResult=await retrySession.rest('core_course_get_enrolled_courses_by_timeline_classification',{});
assert.equal(Array.isArray(retryResult),true);
assert.equal(retryHttp.calls,3,'GET transport must retry transient 5xx');
await new Promise(r=>retryHttp.close(r));
console.log('PASS integration: transient 5xx retry');

const emptySession=new CampusSession();
emptySession.sesskey='fixture-sess';
emptySession.request=async()=>new Response(JSON.stringify([{error:false,data:{courses:[]}}]),{status:200,headers:{'content-type':'application/json'}});
emptySession.requestPage=async()=>({response:new Response('<html><body><a href="/course/view.php?id=999">Fallback course</a></body></html>',{status:200,headers:{'content-type':'text/html'}}),path:'/my/'});
assert.deepEqual(await emptySession.courses(),[],'successful empty course responses must remain authoritative and not be replaced by HTML fallback');
console.log('PASS integration: successful [] remains empty');

// A full session reset must abort the old network request so it cannot finish after login and poison the new session.
const slowHttp = http.createServer((req,res)=>setTimeout(()=>res.end('late'),2000));
await new Promise(r=>slowHttp.listen(0,'127.0.0.1',r));
const sport=slowHttp.address().port;
const abortSession=new CampusSession({baseUrl:`http://127.0.0.1:${sport}`});
const pending=abortSession.get('/slow').then(()=>null).catch(e=>e);
await new Promise(r=>setTimeout(r,30));
abortSession.invalidate('reset');
const abortError=await pending;
assert.equal(abortError?.code,'SESSION_ABORTED');
await new Promise(r=>slowHttp.close(r));
console.log('PASS integration: session reset aborts stale in-flight requests');
