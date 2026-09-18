import assert from 'node:assert/strict';
import { CampusSession } from '../backend/src/campus.js';

const campus = new CampusSession({ debug: false, scopeId: 'live-chain-shape-test' });
const response = (status, { location = null, html = '', setCookies = [] } = {}) => {
  const h = new Headers({'content-type':'text/html; charset=utf-8'});
  if (location) h.set('location', location);
  if (setCookies.length) h.set('set-cookie', setCookies.join(', '));
  return new Response(html,{status,headers:h});
};
const logged = '<title>Личный кабинет</title><script>M.cfg={"sesskey":"S-123","contextid":799303};</script><a href="/login/logout.php?sesskey=S-123">Выход</a>';
campus.request = async (path, options={}) => {
  const u = new URL(path, 'https://campus.fa.ru');
  if (u.pathname === '/login/index.php' && options.method === 'GET' && !u.searchParams.has('testsession')) { campus.sessionManager.setCookies(['session-cookie=boot; Path=/']); return response(200,{html:'<form action="/login/index.php"><input type="hidden" name="logintoken" value="x"><input name="username"><input type="password" name="password"><button type="submit" name="submit">Вход</button></form>'}); }
  if (u.pathname === '/login/index.php' && options.method === 'POST') { campus.sessionManager.setCookies(['MoodleSessionnewcampusfaru=abc; Path=/']); return response(303,{location:'/login/index.php?testsession=42'}); }
  if (u.pathname === '/login/index.php' && u.searchParams.get('testsession') === '42') return response(303,{location:'/my/'});
  if (u.pathname === '/my/') return response(200,{html:logged});
  throw new Error(`Unexpected request ${u.pathname}${u.search}`);
};
const result = await campus.tryFormLogin('student','password');
assert.equal(result.mode,'session');
assert.equal(campus.sesskey,'S-123');
assert.equal(campus.jar.get('MoodleSessionnewcampusfaru'),'abc');
console.log('PASS auth-websession-livechain');
