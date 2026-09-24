import fs from 'node:fs';
import assert from 'node:assert/strict';

const app=fs.readFileSync('frontend/app.js','utf8');
const index=fs.readFileSync('frontend/index.html','utf8');
const manifest=JSON.parse(fs.readFileSync('frontend/manifest.webmanifest','utf8'));
const sw=fs.readFileSync('frontend/sw.js','utf8');
const server=fs.readFileSync('backend/src/server.js','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const logo=fs.readFileSync('frontend/nova-logo.svg','utf8');
const favicon=fs.readFileSync('frontend/favicon.svg','utf8');
const css=fs.readFileSync('frontend/styles.css','utf8');

function pass(label,ok){
  if(!ok) throw new Error(`FAIL nova32: ${label}`);
  console.log(`PASS nova32: ${label}`);
}

pass('canonical logo exists',logo.includes('<title id="title">Campus Nova</title>'));
pass('favicon is canonical logo',logo===favicon);
pass('header uses canonical logo',app.includes('/nova-logo.svg?v=nova32-brand-20260924-1'));
pass('header wordmark is Nova',app.includes('<b>Campus <em>Nova</em></b>'));
pass('login uses canonical logo',app.includes('class="nova-auth-logo"'));
pass('favicon links',index.includes('/nova-logo.svg?v=nova32-brand-20260924-1'));
pass('apple touch icon',index.includes('/apple-touch-icon.png?v=nova32-brand-20260924-1'));
pass('manifest link',index.includes('/manifest.webmanifest?v=nova32-brand-20260924-1'));
pass('mobile app title',index.includes('mobile-web-app-title'));
pass('manifest standalone',manifest.display==='standalone');
pass('manifest identity',manifest.id==='/');
pass('manifest 192 maskable',manifest.icons.some(i=>i.src==='/icon-192.png'&&i.sizes==='192x192'&&i.purpose==='any maskable'));
pass('manifest 512 maskable',manifest.icons.some(i=>i.src==='/icon-512.png'&&i.sizes==='512x512'&&i.purpose==='any maskable'));
pass('service worker exists',sw.includes("self.addEventListener('push'"));
pass('push displays notification',sw.includes('showNotification('));
pass('notification click routing',sw.includes("self.clients.openWindow(target)"));
pass('push client bootstrap',app.includes('async function novaPushBootstrap()'));
pass('push client enable',app.includes('async function novaPushEnable()'));
pass('push subscription endpoint',app.includes("api('/api/push/subscribe'"));
pass('push install state',app.includes("kind:'install'"));
pass('server push config',server.includes("route === '/api/push/config'"));
pass('server push subscribe',server.includes("route === '/api/push/subscribe'"));
pass('server notifications route',server.includes("route === '/api/notifications'"));
pass('server push test',server.includes("route === '/api/push/test'"));
pass('server web-push',server.includes('webpush.setVapidDetails'));
pass('server push watcher',server.includes('PUSH_POLL_MS'));
pass('server new material detection',server.includes('type:\'material\''));
pass('package web-push dependency',Boolean(pkg.dependencies?.['web-push']));
pass('npm audit wired',pkg.scripts?.test?.includes('tests/nova32-brand-push.mjs'));
pass('push UI',app.includes('class="nova-push-card'));
pass('notification material label',app.includes("material:'МАТЕРИАЛ'"));
pass('notification lecture label',app.includes("return 'ЛЕКЦИЯ';"));
pass('push UI CSS',css.includes('/* NOVA 32 · BRAND + PUSH */'));

console.log('');
console.log('==============================================');
console.log(' NOVA 32 · BRAND + WEB PUSH AUDIT COMPLETE');
console.log('==============================================');
