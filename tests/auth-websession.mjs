import assert from 'node:assert/strict';
import { CampusSession } from '../backend/src/campus.js';

function response(status, url, { location = null, html = '', cookies = [] } = {}) {
  const headers = new Headers({
    'content-type': 'text/html; charset=utf-8',
    ...(location ? { location } : {}),
  });
  if (cookies.length) headers.set('set-cookie', cookies.join(', '));
  return new Response(html, { status, headers });
}

const loggedInHtml = `<!doctype html><html><head><title>Личный кабинет</title>
<script>M.cfg={"sesskey":"TEST-SESSKEY","contextid":799303};</script></head>
<body><a href="/user/profile.php?id=66164">Волошин Никита Александрович</a>
<a href="/login/logout.php?sesskey=TEST-SESSKEY">Выход</a></body></html>`;

const campus = new CampusSession({ debug: true, scopeId: 'auth-websession-test' });
const originalRequest = campus.request.bind(campus);

campus.request = async (path, options = {}) => {
  const p = new URL(path, 'https://campus.fa.ru').pathname + new URL(path, 'https://campus.fa.ru').search;
  if (p === '/login/index.php' && options.method === 'GET') {
    return response(200, 'https://campus.fa.ru/login/index.php', {
      html: '<form action="/login/index.php"><input type="hidden" name="logintoken" value="x"><input name="username"><input type="password" name="password"><button type="submit" name="submit">Вход</button></form>',
      cookies: ['session-cookie=boot; Path=/']
    });
  }
  if (p === '/login/index.php' && options.method === 'POST') {
    campus.sessionManager.setCookies(['MoodleSessionnewcampusfaru=web-session; Path=/']);
    return response(303, 'https://campus.fa.ru/login/index.php', { location: '/login/index.php?testsession=66164' });
  }
  if (new URL(path, 'https://campus.fa.ru').pathname === '/login/index.php' && new URL(path, 'https://campus.fa.ru').searchParams.get('testsession')) {
    return response(303, 'https://campus.fa.ru/login/index.php?testsession=66164', { location: '/my/' });
  }
  if (p === '/my/') {
    return response(200, 'https://campus.fa.ru/my/', { html: loggedInHtml });
  }
  return originalRequest(path, options);
};

const result = await campus.tryFormLogin('student', 'password');
assert.equal(result.ok, true);
assert.equal(result.mode, 'session');
assert.equal(campus.sesskey, 'TEST-SESSKEY');
assert.equal(campus.jar.get('MoodleSessionnewcampusfaru'), 'web-session');
assert.equal(campus.userid, 66164);

console.log('PASS auth-websession');
