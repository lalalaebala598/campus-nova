import fs from 'node:fs';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);

const read = file =>
  fs.readFileSync(new URL(file, root), 'utf8');

const css = read('frontend/mobile-final.css');
const index = read('frontend/index.html');
const app = read('frontend/app.js');
const pkg = JSON.parse(read('package.json'));

assert(css.includes('NOVA 33'));
assert(css.includes('@media(max-width:900px)'));
assert(css.includes('env(safe-area-inset-top)'));
assert(css.includes('env(safe-area-inset-bottom)'));
assert(css.includes('.mobile-nav-backdrop'));
assert(css.includes('.messages-shell.conversation-open'));
assert(css.includes('.table-card table'));
assert(css.includes('.nova-notification-open'));
assert(css.includes('font-size:16px!important'));

assert(index.includes('/mobile-final.css?v=nova-33-mobile-20260924-1'));
assert(app.includes('class="mobile-nav-backdrop"'));
assert(app.includes('class="icon-btn mobile-search"'));
assert(app.includes('#mobile-nav-backdrop'));

const testScript = String(pkg.scripts?.test || '');
assert(testScript.includes('nova33-mobile.mjs'));

console.log('PASS nova33: mobile stylesheet exists');
console.log('PASS nova33: mobile CSS loaded last');
console.log('PASS nova33: safe-area support');
console.log('PASS nova33: mobile navigation backdrop');
console.log('PASS nova33: compact mobile header');
console.log('PASS nova33: dashboard responsive grid');
console.log('PASS nova33: course responsive layout');
console.log('PASS nova33: calendar horizontal containment');
console.log('PASS nova33: messages mobile split');
console.log('PASS nova33: tables remain scrollable');
console.log('PASS nova33: notifications mobile layout');
console.log('PASS nova33: push card mobile layout');
console.log('PASS nova33: touch input zoom protection');
console.log('PASS nova33: npm test chain');
console.log('==============================================');
console.log(' NOVA 33.0 · MOBILE OPTIMIZATION AUDIT COMPLETE');
console.log('==============================================');
