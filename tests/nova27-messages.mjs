import fs from 'node:fs';
import assert from 'node:assert/strict';

const APP = fs.readFileSync('frontend/app.js', 'utf8');
const CSS = fs.readFileSync('frontend/dashboard-final.css', 'utf8');
const PKG = JSON.parse(fs.readFileSync('package.json', 'utf8'));

function pass(name){
  console.log('PASS nova27:', name);
}


assert.match(
  APP,
  /function nova27MessageSenderId\(message\)/,
  'message sender id resolver missing'
);
pass('sender id resolver');

assert.match(
  APP,
  /message\?\.useridfrom/,
  'Moodle useridfrom support missing'
);
pass('Moodle useridfrom support');

assert.match(
  APP,
  /function nova27MessageSenderName\(message/,
  'message sender name resolver missing'
);
pass('sender name resolver');

assert.match(
  APP,
  /data-message-author/,
  'per-message author identity missing'
);
pass('per-message author identity');

assert.ok(
  APP.includes('NOVA 27.0 · MESSAGE THREAD UX'),
  'NOVA 27 marker missing in app.js'
);
pass('message UX marker');

assert.match(
  APP,
  /function nova27LatestMessage\(conversation\)/,
  'latest message helper missing'
);
pass('latest message helper');

assert.match(
  APP,
  /data-conversation="\$\{esc\(c\.id\)\}"/,
  'conversation binding missing'
);
pass('conversation selection');

assert.match(
  APP,
  /data-message-back/,
  'mobile back missing'
);
pass('mobile back');

assert.match(
  APP,
  /id="conversation-body"/,
  'conversation body missing'
);
pass('conversation body');

assert.match(
  APP,
  /id="message-form"/,
  'message form missing'
);
pass('message form');

assert.match(
  APP,
  /\/api\/messages\/conversation\?id=/,
  'conversation endpoint missing'
);
pass('conversation GET');

assert.match(
  APP,
  /\/api\/messages\/send/,
  'send endpoint missing'
);
pass('message POST');

assert.match(
  APP,
  /\/api\/messages\/mark-read/,
  'mark-read endpoint missing'
);
pass('mark-read POST');

assert.match(
  APP,
  /loadData\('messages',true\)/,
  'post-send refresh missing'
);
pass('refresh after send');

assert.match(
  APP,
  /event\.key === 'Enter'/,
  'Enter behavior missing'
);
pass('Enter send');

assert.match(
  APP,
  /event\.shiftKey/,
  'Shift+Enter behavior missing'
);
pass('Shift+Enter');

assert.ok(
  CSS.includes('NOVA 27.0 · MESSAGE THREAD UX'),
  'NOVA 27 CSS marker missing'
);
pass('message CSS');

assert.ok(
  CSS.includes('.nova27-bubble'),
  'bubble CSS missing'
);
pass('bubble CSS');

assert.ok(
  CSS.includes('@media (max-width:820px)'),
  'responsive CSS missing'
);
pass('responsive CSS');

assert.ok(
  PKG.scripts?.test?.includes('node tests/nova27-messages.mjs'),
  'nova27 test is not in npm test'
);
pass('npm test integration');

console.log('==============================================');
console.log(' NOVA 27.0 · MESSAGE THREAD UX AUDIT COMPLETE');
console.log('==============================================');
