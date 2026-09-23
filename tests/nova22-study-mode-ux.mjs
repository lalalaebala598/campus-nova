import fs from 'node:fs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const APP =
  fs.readFileSync(
    'frontend/app.js',
    'utf8'
  );

const CSS =
  fs.readFileSync(
    'frontend/dashboard-final.css',
    'utf8'
  );

const INDEX =
  fs.readFileSync(
    'frontend/index.html',
    'utf8'
  );

const PACKAGE =
  JSON.parse(
    fs.readFileSync(
      'package.json',
      'utf8'
    )
  );

function pass(name){
  console.log(
    `PASS nova22.1: ${name}`
  );
}

function check(name,condition){
  assert.equal(
    Boolean(condition),
    true,
    `Nova 22.1 UX audit failed: ${name}`
  );

  pass(name);
}

function has(source,value){
  return source.includes(value);
}

console.log('');
console.log('==============================================');
console.log(' NOVA 22.1 · STUDY MODE UX AUDIT');
console.log('==============================================');
console.log('');

check(
  'persistent study filter',
  has(
    APP,
    "studyFilter: localStorage.getItem('nova-study-filter')"
  )
);

check(
  'priority explanation',
  has(
    APP,
    'function novaStudyWhy('
  )
);

check(
  'filtered queue',
  has(
    APP,
    'function novaStudyFilteredCandidates('
  )
);

check(
  'session reset',
  has(
    APP,
    'function novaStudyReset(){'
  )
);

check(
  'single clear start action',
  has(
    APP,
    'function novaStudyBegin('
  )
);

check(
  'dashboard quick start',
  has(
    APP,
    'function novaStudyQuickStart('
  )
);

check(
  'how-it-works block',
  has(
    APP,
    'КАК ЭТО РАБОТАЕТ'
  )
);

check(
  'priority explanation UI',
  has(
    APP,
    'Почему Nova выбрала это?'
  )
);

check(
  'Campus/Nova separation',
  has(
    APP,
    'Оценки, дедлайны и статусы Campus'
  )
);

check(
  'start action label',
  has(
    APP,
    'Начать занятие'
  )
);

check(
  'open without timer',
  has(
    APP,
    'Открыть без таймера'
  )
);

check(
  'queue filters',
  has(
    APP,
    'data-study-filter'
  )
);

check(
  'dashboard quickstart binding',
  has(
    APP,
    '[data-study-quickstart]'
  )
);

check(
  'dashboard says learn now',
  has(
    APP,
    'Учиться сейчас'
  )
);

for(
  const value of [
    '[data-study-begin]',
    '[data-study-complete]',
    '[data-study-next]',
    '[data-study-pause]',
    '[data-study-reset]'
  ]
){
  check(
    `binding ${value}`,
    has(APP,value)
  );
}

for(
  const value of [
    '.nova-study-how',
    '.nova-study-how-step',
    '.nova-study-why',
    '.nova-study-campus-note',
    '.nova-study-session-explain',
    '.nova-study-filters',
    '.nova-study-filter',
    '.nova-study-queue-empty'
  ]
){
  check(
    `css ${value}`,
    has(CSS,value)
  );
}

check(
  '22.1 app cache',
  has(
    INDEX,
    'app.js?v=nova-25-20260923-1'
  )
);

check(
  '22.1 css cache',
  has(
    INDEX,
    'dashboard-final.css?v=nova-25-20260923-1'
  )
);

check(
  '22.1 test chain',
  has(
    PACKAGE.scripts?.test || '',
    'tests/nova22-study-mode-ux.mjs'
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
console.log(' NOVA 22.1 · STUDY MODE UX AUDIT COMPLETE');
console.log('==============================================');
console.log('');
