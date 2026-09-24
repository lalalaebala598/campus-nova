import fs from 'node:fs';
import assert from 'node:assert/strict';

const app = fs.readFileSync('frontend/app.js', 'utf8');
const css = fs.readFileSync('frontend/quiz-final.css', 'utf8');
const index = fs.readFileSync('frontend/index.html', 'utf8');

function pass(label) {
  console.log(`PASS nova35.2: ${label}`);
}

assert.match(
  app,
  /state\.quizNavigationCache\?\.get\?\.\(key\)/
);
pass('quiz meta reads persistent navigation cache');

assert.match(
  app,
  /previousPath/
);
assert.match(
  app,
  /nextPath/
);
pass('quiz meta resolves previous/next navigation paths');

assert.match(
  app,
  /function nova352QuizNeighbourPath/
);
pass('cached neighbour fallback exists');

assert.match(
  app,
  /function nova352BindAnswerCards/
);
pass('whole answer card click binding exists');

assert.match(
  app,
  /nova352SyncAnswerCards/
);
pass('answer selected state sync exists');

assert.match(
  app,
  /data-quiz-control="next"/
);
assert.match(
  app,
  /data-quiz-control="previous"/
);
pass('previous/next controls remain wired');

assert.match(
  css,
  /\.nova352-answer-selected/
);
pass('selected answer styling exists');

assert.match(
  css,
  /\.nova-quiz-nav-button/
);
pass('quiz navigation styling exists');

assert.match(
  index,
  /nova35-2=20260924-1/
);
pass('cache bust exists');

console.log('==============================================');
console.log(' NOVA 35.2 · QUIZ INTERACTIONS AUDIT COMPLETE');
console.log('==============================================');
