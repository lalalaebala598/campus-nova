import assert from 'node:assert/strict';
import http from 'node:http';
import { CampusTransport } from '../backend/src/transport.js';
import { SessionManager } from '../backend/src/session-manager.js';

const server = http.createServer((req,res)=>{
  if (req.url === '/login') {res.setHeader('set-cookie',['MoodleSessionnewcampusfaru=abc123; Path=/','session-cookie=boot; Path=/']); res.writeHead(303,{Location:'/test'}); return res.end();}
  if (req.url === '/test') { assert.match(req.headers.cookie||'', /MoodleSessionnewcampusfaru=abc123/); res.setHeader('content-type','text/html'); return res.end('<script>M.cfg={"sesskey":"X"}</script>'); }
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const port=server.address().port;
const session=new SessionManager({scopeId:'cookie-test'});
const transport=new CampusTransport({baseUrl:`http://127.0.0.1:${port}`,session,contracts:{},trace:null});
const r1=await transport.request('/login',{method:'GET',redirect:'manual'});
assert.equal(r1.status,303);
assert.equal(session.jar.get('MoodleSessionnewcampusfaru'),'abc123');
const r2=await transport.request('/test',{method:'GET',redirect:'manual'});
assert.equal(r2.status,200);
assert.match(session.cookieHeader(),/MoodleSessionnewcampusfaru=abc123/);
server.close();
console.log('PASS cookie-jar-live');
