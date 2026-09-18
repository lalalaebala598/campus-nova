import assert from 'node:assert/strict';
import http from 'node:http';
import { SessionManager } from '../backend/src/session-manager.js';
import { ContractRegistry } from '../backend/src/contract-registry.js';
import { CampusTransport, CampusTransportError } from '../backend/src/transport.js';
import { OperationTrace } from '../backend/src/operation-trace.js';
import { CampusSession } from '../backend/src/campus.js';

// Session isolation and single-flight are local and user-scoped.
const a = new SessionManager({ scopeId: 'user-a' });
const b = new SessionManager({ scopeId: 'user-b' });
a.userid = 101; a.sesskey = 'secret-a'; a.setCookies('MoodleSession=cookie-a');
b.userid = 202; b.sesskey = 'secret-b'; b.setCookies('MoodleSession=cookie-b');
a.cacheSet('courses', ['A']); b.cacheSet('courses', ['B']);
assert.deepEqual(a.cacheGet('courses', 1000), ['A']);
assert.deepEqual(b.cacheGet('courses', 1000), ['B']);
let af = 0, bf = 0;
const pa = Promise.all([a.singleFlight('refresh', async () => { af++; await new Promise(r => setTimeout(r, 20)); return 1; }), a.singleFlight('refresh', async () => { af++; return 2; })]);
const pb = Promise.all([b.singleFlight('refresh', async () => { bf++; await new Promise(r => setTimeout(r, 10)); return 3; }), b.singleFlight('refresh', async () => { bf++; return 4; })]);
const [ra, rb] = await Promise.all([pa, pb]);
assert.equal(af, 1, 'same-session single-flight must collapse duplicate work');
assert.equal(bf, 1, 'different sessions keep independent single-flight');
assert.deepEqual(ra, [1, 1]);
assert.deepEqual(rb, [3, 3]);
console.log('PASS foundation: session isolation + scoped single-flight');

let serverCalls = {};
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://127.0.0.1');
  serverCalls[u.pathname] = (serverCalls[u.pathname] || 0) + 1;
  if (u.pathname === '/retry-503') {
    if (serverCalls[u.pathname] < 3) { res.statusCode = 503; return res.end('busy'); }
    res.setHeader('content-type', 'application/json'); return res.end(JSON.stringify([{ error: false, data: { courses: [{ id: 77 }] } }]));
  }
  if (u.pathname === '/retry-429') {
    if (serverCalls[u.pathname] < 2) { res.statusCode = 429; res.setHeader('retry-after', '0'); return res.end('rate limited'); }
    res.setHeader('content-type', 'application/json'); return res.end(JSON.stringify([{ error: false, data: { ok: true } }]));
  }
  if (u.pathname === '/unsafe-post') {
    res.statusCode = 503; return res.end('do not retry');
  }
  if (u.pathname === '/timeout') {
    await new Promise(r => setTimeout(r, 100));
    return res.end('late');
  }
  if (u.pathname === '/unauthorized') { res.statusCode = 401; return res.end('login'); }
  if (u.pathname === '/forbidden') { res.statusCode = 403; return res.end('forbidden'); }
  if (u.pathname === '/login/index.php' && req.method === 'GET' && u.searchParams.has('testsession')) {
    res.statusCode = 303;
    res.setHeader('location', '/my/');
    return res.end();
  }
  if (u.pathname === '/login/index.php' && req.method === 'GET') {
    res.setHeader('content-type', 'text/html; charset=utf-8');
    return res.end('<html><body><form action="/login/index.php" method="post"><input type="hidden" name="logintoken" value="fixture-login-token"><input name="username"><input name="password" type="password"><button type="submit" name="submit">Вход</button></form></body></html>');
  }
  if (u.pathname === '/login/index.php' && req.method === 'POST') {
    let body = ''; for await (const chunk of req) body += chunk;
    const params = new URLSearchParams(body);
    assert.equal(params.get('submit'), 'Вход');
    assert.equal(params.get('logintoken'), 'fixture-login-token');
    res.setHeader('set-cookie', 'MoodleSessionnewcampusfaru=fixture-browser-session; Path=/; HttpOnly');
    res.statusCode = 303;
    res.setHeader('location', '/login/index.php?testsession=999');
    return res.end();
  }
  if (u.pathname === '/login/token.php') {
    res.setHeader('content-type', 'application/json');
    res.setHeader('set-cookie', 'MoodleSessionnewcampusfaru=fixture-web-session; Path=/; HttpOnly');
    return res.end(JSON.stringify({ token: 'fixture-token' }));
  }
  if (u.pathname === '/webservice/rest/server.php') {
    if (u.searchParams.get('wsfunction') === 'core_webservice_get_site_info') {
      res.setHeader('content-type', 'application/json');
      return res.end(JSON.stringify({ userid: 4242, fullname: 'Fixture User', useremail: null }));
    }
    res.setHeader('content-type', 'application/json');
    return res.end(JSON.stringify({ ok: true }));
  }
  if (u.pathname === '/my/') {
    res.setHeader('content-type', 'text/html; charset=utf-8');
    return res.end('<html><body><div class="header-tools" data-userid="4242"></div><script>var M = {}; M.cfg = {\"sesskey\":\"fixture-sesskey\",\"contextid\":999};</script><button tool-login>Fixture User</button></body></html>');
  }
  if (u.pathname === '/lib/ajax/service.php') {
    let body = ''; for await (const chunk of req) body += chunk;
    const calls = JSON.parse(body);
    const out = calls.map(item => ({ error: false, data: item.methodname === 'core_course_get_enrolled_courses_by_timeline_classification' ? { courses: [{ id: 88 }] } : { ok: true } }));
    res.setHeader('content-type', 'application/json'); return res.end(JSON.stringify(out));
  }
  if (u.pathname === '/mod/quiz/view.php') {
    res.setHeader('content-type', 'text/html; charset=utf-8'); return res.end('<html><head><title>Quiz</title></head><body><form><input name="cmid" value="55"></form></body></html>');
  }
  if (u.pathname.startsWith('/pluginfile.php/')) {
    res.setHeader('content-type', 'application/pdf');
    res.setHeader('content-disposition', 'inline; filename="lecture.pdf"');
    res.end('%PDF-fixture%');
    return;
  }
  res.statusCode = 404; res.end('not found');
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

// Realistic Moodle browser login flow: login POST -> testsession redirect -> /my/ -> M.cfg sesskey.
const loginSession = new CampusSession({ baseUrl: `http://127.0.0.1:${port}`, scopeId: 'login-flow-user' });
const loginResult = await loginSession.login('fixture-user', 'fixture-password');
assert.equal(loginResult.session, true, 'form login must yield a web session');
assert.equal(loginSession.sesskey, 'fixture-sesskey');
assert.equal(loginSession.userid, 4242);
assert.equal(loginSession.jar.get('MoodleSessionnewcampusfaru'), 'fixture-browser-session');
assert.ok(loginSession.token === null || typeof loginSession.token === 'string', 'form login may also acquire a secondary REST token capability');
assert.equal(loginSession.safeSessionSnapshot().hasWebSession, true);
console.log('PASS foundation: Moodle form login -> testsession redirect -> web session bootstrap');

const trace = new OperationTrace({ enabled: false });
const contracts = new ContractRegistry();
const session = new SessionManager({ scopeId: 'transport-user' });
session.user = { id: 42, fullname: 'Fixture' }; session.userid = 42; session.sesskey = 'fixture-sess'; session.setCookies('MoodleSession=fixture-cookie');
const transport = new CampusTransport({ baseUrl: `http://127.0.0.1:${port}`, session, contracts, trace });

const retry503 = await transport.request('/retry-503', { method: 'GET', traceOperation: 'fixture.retry.503', traceContext: { userid: 42 }, traceParams: { password: 'supersecret', sesskey: 'hidden', courseId: 77 } });
assert.equal(retry503.status, 200); assert.equal(serverCalls['/retry-503'], 3);
let last = trace.list(1)[0];
assert.equal(last.error, null); assert.equal(last.retry.attempted, 3); assert.equal(last.request.params.password, '[REDACTED]'); assert.equal(last.request.params.sesskey, '[REDACTED]');
assert.equal(last.request.params.courseId, 77);
console.log('PASS foundation: 5xx retry + trace redaction');

const retry429 = await transport.request('/retry-429', { method: 'GET', traceOperation: 'fixture.retry.429', retryPolicy: { maxAttempts: 3, idempotent: true } });
assert.equal(retry429.status, 200); assert.equal(serverCalls['/retry-429'], 2);
console.log('PASS foundation: 429 retry');

await assert.rejects(() => transport.request('/unsafe-post', { method: 'POST', body: 'x', traceOperation: 'fixture.unsafe.post', retryPolicy: { maxAttempts: 3, idempotent: false } }), e => e?.status === 503);
assert.equal(serverCalls['/unsafe-post'], 1, 'non-idempotent POST must not be retried blindly');
console.log('PASS foundation: non-idempotent POST is not retried');

await assert.rejects(() => transport.request('/timeout', { method: 'GET', timeoutMs: 20, retryPolicy: { maxAttempts: 1, idempotent: true }, traceOperation: 'fixture.timeout' }), e => e?.code === 'TIMEOUT');
console.log('PASS foundation: timeout classification');

session.user = { id: 42, fullname: 'Fixture' };
await assert.rejects(() => transport.request('/unauthorized', { method: 'GET', traceOperation: 'fixture.401' }), e => e?.code === 'AUTH_EXPIRED' && e?.status === 401);
assert(session.user, '401 must not erase session by itself');
await assert.rejects(() => transport.request('/forbidden', { method: 'GET', traceOperation: 'fixture.403' }), e => e?.code === 'PERMISSION_DENIED' && e?.status === 403);
assert(session.user, '403 must not erase session');
console.log('PASS foundation: 401/403 classified without automatic logout');

const op = await transport.execute('courses.list', { userId: 42 }, {});
assert.equal(op.response.status, 200); assert.equal(op.parsed.courses[0].id, 88); assert(op.traceId);
const opTrace = trace.get(op.traceId);
assert.equal(opTrace.operation, 'courses.list'); assert.equal(opTrace.transport, 'AJAX'); assert.equal(opTrace.method, 'POST');
assert.equal(opTrace.parser.status, 'PASS'); assert.equal(opTrace.normalized.status, 'PASS');
console.log('PASS foundation: contract resolution + AJAX transport selection + parser trace');

const htmlOp = await transport.execute('quiz.view', { cmid: 55 }, { cmid: 55 });
assert.equal(htmlOp.response.status, 200); assert.equal(htmlOp.parsed.title, 'Quiz');
assert.equal(htmlOp.contract.verified, true);
console.log('PASS foundation: verified HTML contract resolution');

const fileOp = await transport.execute('file.download', { filePath: '999/mod_resource/content/1/lecture.pdf' }, { filePath: '999/mod_resource/content/1/lecture.pdf' }, { skipParse: true });
assert.equal(fileOp.response.status, 200); assert.equal(fileOp.response.headers.get('content-type'), 'application/pdf');
console.log('PASS foundation: verified file contract resolution');

await assert.rejects(() => transport.execute('localization.getString', {}, {}), e => e?.code === 'UNVERIFIED_CONTRACT');
console.log('PASS foundation: unverified contracts are blocked');

// Compatibility facade still exposes the legacy API while using SessionManager internally.
const compat = new CampusSession({ baseUrl: `http://127.0.0.1:${port}` });
compat.userid = 42; compat.sesskey = 'fixture-sess'; compat.user = { id: 42, fullname: 'Fixture' }; compat.jar.set('MoodleSession', 'fixture-cookie');
const compatQuiz = await compat.executeOperation('quiz.view', { cmid: 55 }, { cmid: 55 });
assert.equal(compatQuiz.parsed.title, 'Quiz');
assert.equal(compat.safeSessionSnapshot().userId, 42);
console.log('PASS foundation: CampusSession compatibility facade');

const tokenBootstrap = new CampusSession({ baseUrl: `http://127.0.0.1:${port}` });
const tokenLogin = await tokenBootstrap.tryTokenLogin('fixture', 'fixture-password');
assert.equal(tokenLogin.mode, 'token+session');
assert.equal(tokenBootstrap.sesskey, 'fixture-sesskey');
assert.equal(tokenBootstrap.contextid, 999);
assert.equal(tokenBootstrap.userid, 4242);
assert.equal(tokenBootstrap.safeSessionSnapshot().hasWebSession, true);
assert.equal(tokenBootstrap.safeSessionSnapshot().expiresAt, null);
console.log('PASS foundation: token login bootstraps Moodle web session');

const customCookieSession = new SessionManager({ scopeId: 'custom-cookie' });
customCookieSession.setCookies('MoodleSessionnewcampusfaru=fixture-web-session');
customCookieSession.setCookies('foo=bar');
customCookieSession.sesskey = 'fixture-sesskey';
customCookieSession.invalidateWebSession();
assert.equal(customCookieSession.jar.has('MoodleSessionnewcampusfaru'), false);
assert.equal(customCookieSession.jar.has('foo'), true);
console.log('PASS foundation: custom MoodleSession cookie invalidation');

await new Promise(r => server.close(r));
