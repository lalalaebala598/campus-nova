import fs from 'node:fs';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const read = file => fs.readFileSync(new URL(file, root), 'utf8');

const css = read('frontend/activity-final.css');
const js = read('frontend/activity-final.js');
const index = read('frontend/index.html');
const pkg = JSON.parse(read('package.json'));

assert(css.includes('NOVA 34'));
assert(css.includes('.nova34-grid'));
assert(css.includes('.nova34-condition'));
assert(css.includes('.nova34-overview'));
assert(css.includes('.nova34-submit'));
assert(css.includes('.nova34-source-files'));
assert(css.includes('@media(max-width:680px)'));
assert(css.includes('@media(max-width:420px)'));

assert(js.includes('enhanceActivity'));
assert(js.includes('nova34Ready'));
assert(js.includes('.nova-practice-source'));
assert(js.includes('.nova-bottom-cta'));
assert(js.includes('MutationObserver'));

assert(index.includes('/activity-final.css?v=nova-34-activity-20260924-1'));
assert(index.includes('/activity-final.js?v=nova-34-activity-20260924-1'));

const testScript = String(pkg.scripts?.test || '');
assert(testScript.includes('nova34-activity.mjs'));

console.log('PASS nova34: activity stylesheet exists');
console.log('PASS nova34: activity enhancer exists');
console.log('PASS nova34: semantic activity layout');
console.log('PASS nova34: assignment overview card');
console.log('PASS nova34: assignment condition section');
console.log('PASS nova34: assignment file cards');
console.log('PASS nova34: submission card');
console.log('PASS nova34: mobile activity layout');
console.log('PASS nova34: package test chain');
console.log('==============================================');
console.log(' NOVA 34 · ACTIVITY WORKSPACE AUDIT COMPLETE');
console.log('==============================================');
