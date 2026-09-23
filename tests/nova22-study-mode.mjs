import fs from 'node:fs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const APP = fs.readFileSync(
  'frontend/app.js',
  'utf8'
);

const CSS = fs.readFileSync(
  'frontend/dashboard-final.css',
  'utf8'
);

const INDEX = fs.readFileSync(
  'frontend/index.html',
  'utf8'
);

const PACKAGE = JSON.parse(
  fs.readFileSync(
    'package.json',
    'utf8'
  )
);

function pass(name){
  console.log(`PASS nova22: ${name}`);
}

function check(name, condition){
  assert.equal(
    Boolean(condition),
    true,
    `Nova 22 audit failed: ${name}`
  );

  pass(name);
}

function has(source, value){
  return source.includes(value);
}

console.log('');
console.log('==============================================');
console.log(' NOVA 22.0 · STUDY MODE AUDIT');
console.log('==============================================');
console.log('');

check(
  'study data state',
  has(APP,'study: null')
);

check(
  'study status',
  has(APP,"study:'idle'")
);

check(
  'study navigation',
  has(
    APP,
    "['study','book','Учебный режим']"
  )
);

check(
  'study route label',
  has(
    APP,
    "study:'Учебный режим'"
  )
);

check(
  'study route loader',
  has(
    APP,
    "if(r==='study')"
  )
);

check(
  'study render route',
  has(
    APP,
    "case 'study'"
  )
);

check(
  'study state storage',
  has(
    APP,
    'nova-study-session-v1'
  )
);

for(
  const name of [
    'novaStudyReadSession',
    'novaStudyWriteSession',
    'novaStudyElapsed',
    'novaStudyCandidates',
    'novaStudyStart',
    'novaStudyPause',
    'novaStudyCompleteCurrent',
    'novaStudyNext',
    'novaStudyEnsureTimer',
    'bindStudyMode',
    'studyPage',
    'loadStudyData'
  ]
){
  check(
    `function ${name}`,
    has(
      APP,
      `function ${name}`
    ) ||
    has(
      APP,
      `async function ${name}`
    )
  );
}

for(
  const binding of [
    '[data-study-select]',
    '[data-study-start]',
    '[data-study-open]',
    '[data-study-complete]',
    '[data-study-next]',
    '[data-study-pause]'
  ]
){
  check(
    `binding ${binding}`,
    has(APP,binding)
  );
}

check(
  'Activity Engine integration',
  has(
    APP,
    'openActivity('
  ) &&
  has(
    APP,
    'candidate.ref'
  )
);

for(
  const selector of [
    '.nova-study-page',
    '.nova-study-hero',
    '.nova-study-timer-card',
    '.nova-study-focus-card',
    '.nova-study-session-card',
    '.nova-study-queue',
    '.nova-study-queue-item'
  ]
){
  check(
    `css ${selector}`,
    has(CSS,selector)
  );
}

check(
  'app cache bust',
  has(
    INDEX,
    'app.js?v=nova-26-20260923-1'
  )
);

check(
  'css cache bust',
  has(
    INDEX,
    'dashboard-final.css?v=nova-26-20260923-1'
  )
);

check(
  'nova22 audit in npm test',
  has(
    PACKAGE.scripts?.test || '',
    'tests/nova22-study-mode.mjs'
  )
);

execFileSync(
  'node',
  [
    '--check',
    'frontend/app.js'
  ],
  {stdio:'pipe'}
);

pass(
  'frontend/app.js syntax'
);

console.log('');
console.log('==============================================');
console.log(' NOVA 22.0 · STUDY MODE AUDIT COMPLETE');
console.log('==============================================');
console.log('');
