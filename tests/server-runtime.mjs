import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http';

const upstream = http.createServer(async (req,res)=>{
  const u=new URL(req.url,'http://127.0.0.1');
  if(u.pathname==='/login/index.php' && req.method==='GET'){
    res.setHeader('content-type','text/html; charset=utf-8');
    return res.end('<!doctype html><html><head><title>Вход</title></head><body><form action="/login/index.php" method="post"><input type="hidden" name="logintoken" value="fixture"><input name="username"><input name="password" type="password"></form></body></html>');
  }
  if(u.pathname==='/login/index.php' && req.method==='POST'){
    res.statusCode=303;res.setHeader('set-cookie','MoodleSession=livefixture; Path=/');res.setHeader('location','/my/');return res.end();
  }
  if(u.pathname==='/login/token.php' && req.method==='POST'){
    res.setHeader('content-type','application/json');return res.end(JSON.stringify({error:'token service disabled for fixture'}));
  }
  if(u.pathname==='/my/'){
    res.setHeader('content-type','text/html; charset=utf-8');
    return res.end('<!doctype html><html><head><title>Личный кабинет</title><script>var M={cfg:{"sesskey":"fixture-sess","contextid":123}}</script></head><body><button class="tool-login">Fixture Student</button><div data-userid="42"></div><a href="/course/view.php?id=123">Основы</a></body></html>');
  }
  if(u.pathname==='/mod/resource/view.php' && req.method==='GET'){
    res.statusCode=302; res.setHeader('location','/pluginfile.php/course/mod/resource/content/1/redirected%20lecture.pdf'); return res.end();
  }
  if(u.pathname.startsWith('/pluginfile.php/')){
    if(req.headers.cookie!=='MoodleSession=livefixture'){
      res.setHeader('content-type','text/html; charset=utf-8');return res.end('<form><input name="username"><input name="password" type="password">Вход на сайт</form>');
    }
    res.setHeader('content-type','application/pdf');
    if (u.pathname.includes('redirected%20lecture.pdf')) res.setHeader('content-disposition',"attachment; filename*=UTF-8''redirected%20lecture.pdf");
    else res.setHeader('content-disposition',"attachment; filename*=UTF-8''%D0%9B%D0%B5%D0%BA%D1%86%D0%B8%D1%8F%20%231.pdf");
    return res.end('%PDF-fixture-real%');
  }
  res.statusCode=404;res.end('not found');
});
await new Promise(r=>upstream.listen(0,'127.0.0.1',r));
const uport=upstream.address().port;

const root = new URL('../', import.meta.url).pathname;
let port = 0;
const probe = http.createServer((req,res)=>res.end('ok'));
await new Promise(r=>probe.listen(0,'127.0.0.1',r));
port = probe.address().port;
await new Promise(r=>probe.close(r));
const child = spawn(process.execPath, ['backend/src/server.js'], { cwd: root, env: {...process.env, PORT:String(port), HOST:'127.0.0.1', CAMPUS_ORIGIN:`http://127.0.0.1:${uport}`, DEBUG_CAMPUS:'true'}, stdio:['ignore','pipe','pipe'] });
await new Promise((resolve,reject)=>{ let out=''; let err=''; const timer=setTimeout(()=>reject(new Error(`server timeout\nstdout: ${out}\nstderr: ${err}`)),5000); child.stdout.on('data',d=>{out+=d.toString(); if(out.includes('running on')){clearTimeout(timer);resolve();}}); child.stderr.on('data',d=>{err+=d.toString();}); child.on('error',reject); child.on('exit',code=>{ if(code!==null && !out.includes('running on')) { clearTimeout(timer); reject(new Error(`server exited ${code}\nstdout: ${out}\nstderr: ${err}`)); }}); });

for (const route of ['/','/dashboard','/courses','/assignments','/grades','/schedule','/calendar','/messages','/files','/materials','/tests','/profile','/course/33043']) {
  const r=await fetch(`http://127.0.0.1:${port}${route}`); const t=await r.text(); assert.equal(r.status,200,route); assert.match(t,/Campus Nova/); assert.match(r.headers.get('content-type')||'',/text\/html/);
}
for (const asset of ['/styles.css','/app.js','/campus-hero.jpg']) { const r=await fetch(`http://127.0.0.1:${port}${asset}`); assert.equal(r.status,200,asset); }
const unauthorized=await fetch(`http://127.0.0.1:${port}/api/courses`); assert.equal(unauthorized.status,401);
const api=await fetch(`http://127.0.0.1:${port}/api/health`); assert.equal(api.status,200); const h=await api.json(); assert.equal(h.ok,true); assert.equal(h.version,'13.0.0-final');

const login=await fetch(`http://127.0.0.1:${port}/api/auth/login`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({campusUrl:`http://127.0.0.1:${uport}`,username:'student',password:'password'})});
assert.equal(login.status,200); const loginData=await login.json(); assert.equal(loginData.ok,true); assert.equal(loginData.campusUrl,`http://127.0.0.1:${uport}`);
const sid=login.headers.get('set-cookie'); assert.match(sid,/nova_sid=/);
const headers={cookie:sid.split(';',1)[0]};
const debugContracts=await fetch(`http://127.0.0.1:${port}/api/debug/contracts`,{headers});
assert.equal(debugContracts.status,200,'debug contracts endpoint must be available when DEBUG_CAMPUS=true');
const debugContractData=await debugContracts.json(); assert.ok(debugContractData.ok); assert.ok(debugContractData.contracts.some(c=>c.name==='courses.list'&&c.verified));
const debugTraces=await fetch(`http://127.0.0.1:${port}/api/debug/traces?limit=20`,{headers});
assert.equal(debugTraces.status,200,'debug trace endpoint must be available when DEBUG_CAMPUS=true');
const debugTraceText=await debugTraces.text(); assert.doesNotMatch(debugTraceText,/password|wstoken=|sesskey=[A-Za-z0-9]/i,'debug traces must not expose credentials or raw sesskey values');
console.log('PASS foundation runtime: debug contracts + redacted operation traces');
const dashboard=await fetch(`http://127.0.0.1:${port}/api/dashboard`,{headers});
assert.equal(dashboard.status,200,'dashboard must return partial success even when a secondary Campus block fails');
const dashboardData=await dashboard.json(); assert.equal(dashboardData.ok,true); assert.ok(Array.isArray(dashboardData.data?.courses)); assert.ok(dashboardData.data?.errors && typeof dashboardData.data.errors==='object');
console.log('PASS v10.2 server runtime: dashboard has independent block failure handling');
const download=await fetch(`http://127.0.0.1:${port}/api/download?path=${encodeURIComponent('/pluginfile.php/course/mod/resource/content/1/%D0%9B%D0%B5%D0%BA%D1%86%D0%B8%D1%8F%20%231.pdf')}`,{headers});
const dotFilename=await fetch(`http://127.0.0.1:${port}/api/download?path=${encodeURIComponent('/pluginfile.php/course/mod/resource/content/1/lecture..pdf')}`,{headers}); assert.equal(dotFilename.status,200); assert.equal(await dotFilename.text(),'%PDF-fixture-real%');
assert.equal(download.status,200); assert.equal(await download.text(),'%PDF-fixture-real%'); assert.match(download.headers.get('content-type')||'',/application\/pdf/); assert.match(download.headers.get('content-disposition')||'',/filename\*=UTF-8''/);
const redirected = await fetch(`http://127.0.0.1:${port}/api/download?path=${encodeURIComponent('/mod/resource/view.php')}`,{headers});
assert.equal(redirected.status,200); assert.equal(await redirected.text(),'%PDF-fixture-real%'); assert.match(redirected.headers.get('content-disposition')||'',/redirected%20lecture/i);
console.log('PASS v10 server runtime: download streams real binary with encoded filename');
console.log('PASS v10 server runtime: download follows same-campus redirect and derives final filename');

// Expired Campus session must clear the server-side Nova session and return 401.
upstream.removeAllListeners('request');
upstream.on('request',(req,res)=>{res.setHeader('content-type','text/html; charset=utf-8');res.end('<form><input name="username"><input name="password" type="password">Вход на сайт</form>');});
const traversal=await fetch(`http://127.0.0.1:${port}/api/download?path=${encodeURIComponent('/pluginfile.php/a/%2E%2E/secret.pdf')}`,{headers}); assert.equal(traversal.status,400);

const expired=await fetch(`http://127.0.0.1:${port}/api/download?path=${encodeURIComponent('/pluginfile.php/course/mod/resource/content/1/lecture.pdf')}`,{headers});
assert.equal(expired.status,401);
const statusAfter=await fetch(`http://127.0.0.1:${port}/api/auth/status`,{headers}); const sd=await statusAfter.json(); assert.equal(sd.connected,false);
console.log('PASS v10 server runtime: expired Campus session invalidates Nova session');

child.kill('SIGTERM');
await new Promise(r=>upstream.close(r));
console.log('PASS v10 server runtime: clean SPA routes + health');
