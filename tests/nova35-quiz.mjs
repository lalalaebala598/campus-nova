
import fs from 'node:fs';
import assert from 'node:assert/strict';

const cssPath = 'frontend/quiz-final.css';
const indexPath = 'frontend/index.html';
const packagePath = 'package.json';
const appPath = 'frontend/app.js';

assert(fs.existsSync(cssPath), 'NOVA35: quiz stylesheet exists');

const css = fs.readFileSync(cssPath, 'utf8');
const index = fs.readFileSync(indexPath, 'utf8');
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const app = fs.readFileSync(appPath, 'utf8');

const markers = [
  '.nova-quiz-workspace',
  '.nova-quiz-head',
  '.nova-quiz-layout',
  '.nova-quiz-nav',
  '.nova-quiz-content',
  '.nova-quiz-html .que',
  '.nova-quiz-controls',
  '.nova-quiz-launch-card'
];

for (const marker of markers) {
  assert(css.includes(marker), `NOVA35: missing ${marker}`);
}

assert(
  index.includes('/quiz-final.css?v=nova-35-quiz-20260924-1'),
  'NOVA35: stylesheet linked with cache bust'
);

assert(
  app.includes('function quizAttemptMarkup'),
  'NOVA35: real quiz attempt renderer exists'
);

assert(
  app.includes('data-quiz-control="next"') &&
  app.includes('data-quiz-control="finish"'),
  'NOVA35: real quiz controls preserved'
);

assert(
  pkg.scripts?.test?.includes('node tests/nova35-quiz.mjs'),
  'NOVA35: package test chain includes audit'
);

console.log('NOVA 35 · QUIZ WORKSPACE AUDIT COMPLETE');
