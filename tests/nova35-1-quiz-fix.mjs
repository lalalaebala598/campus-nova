
import fs from 'node:fs';
import assert from 'node:assert/strict';

const app = fs.readFileSync('frontend/app.js','utf8');
const css = fs.readFileSync('frontend/quiz-final.css','utf8');
const index = fs.readFileSync('frontend/index.html','utf8');
const pkg = JSON.parse(fs.readFileSync('package.json','utf8'));

assert(
  app.includes('function nova351FetchQuizPage'),
  'NOVA35.1: direct quiz page fallback exists'
);

assert(
  app.includes('/api/campus/raw?path='),
  'NOVA35.1: authenticated raw Campus fallback exists'
);

assert(
  app.includes('function bindNova351QuizDelegation'),
  'NOVA35.1: delegated quiz click handler exists'
);

assert(
  app.includes('event.stopImmediatePropagation()'),
  'NOVA35.1: old direct quiz listeners are intercepted'
);

assert(
  app.includes('async function nova351LoadNovaQuizPage(\n  path,\n  trigger = null\n)'),
  'NOVA35.1: replacement loader exists'
);

assert(
  app.includes('async function nova351SubmitQuizControl'),
  'NOVA35.1: bottom quiz control wrapper exists'
);

assert(
  app.includes('Открываем…') &&
  app.includes('Следующий…') &&
  app.includes('Завершаем…'),
  'NOVA35.1: action loading labels exist'
);

assert(
  css.includes('.nova-quiz-nav-button.is-loading') &&
  css.includes('@keyframes nova351QuizSpin'),
  'NOVA35.1: loading styles exist'
);

assert(
  index.includes('/app.js?v=nova-26-final-20260923-1&nova31=20260924-1&nova35-1=20260924-1'),
  'NOVA35.1: app.js cache bust updated'
);

assert(
  index.includes('/quiz-final.css?v=nova-35-quiz-20260924-1&nova35-1=20260924-1'),
  'NOVA35.1: quiz CSS cache bust updated'
);

assert(
  pkg.scripts?.test?.includes('node tests/nova35-1-quiz-fix.mjs'),
  'NOVA35.1: audit is in npm test chain'
);

console.log('NOVA 35.1 · QUIZ FUNCTIONALITY AUDIT COMPLETE');
