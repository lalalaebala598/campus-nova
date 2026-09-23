import fs from 'node:fs';

const app =
  fs.readFileSync(
    'frontend/app.js',
    'utf8'
  );

const css =
  fs.readFileSync(
    'frontend/dashboard-final.css',
    'utf8'
  );

const index =
  fs.readFileSync(
    'frontend/index.html',
    'utf8'
  );

const pkg =
  JSON.parse(
    fs.readFileSync(
      'package.json',
      'utf8'
    )
  );

function pass(label, ok){
  if(!ok){
    throw new Error(
      `FAIL nova25: ${label}`
    );
  }

  console.log(
    `PASS nova25: ${label}`
  );
}

pass(
  'deadline state',
  app.includes(
    "deadlineFilter: localStorage.getItem('nova-deadline-filter-v1') || 'active'"
  )
);

pass(
  'deadline data state',
  app.includes(
    'deadlines: null'
  )
);

pass(
  'deadline status',
  app.includes(
    'deadlines:\'idle\''
  )
);

pass(
  'deadline navigation',
  app.includes(
    "['deadlines','calendar','Дедлайны']"
  )
);

pass(
  'deadline route label',
  app.includes(
    "deadlines:'Дедлайны'"
  )
);

pass(
  'deadline normalize',
  app.includes(
    'function novaDeadlineNormalizeTimestamp'
  )
);

pass(
  'deadline extract',
  app.includes(
    'function novaDeadlineExtractDue'
  )
);

pass(
  'deadline completion',
  app.includes(
    'function novaDeadlineIsCompleted'
  )
);

pass(
  'deadline bucket',
  app.includes(
    'function novaDeadlineBucket'
  )
);

pass(
  'deadline priority',
  app.includes(
    'function novaDeadlinePriority'
  )
);

pass(
  'deadline why',
  app.includes(
    'function novaDeadlineWhy'
  )
);

pass(
  'deadline identity',
  app.includes(
    'function novaDeadlineIdentity'
  )
);

pass(
  'deadline items',
  app.includes(
    'function novaDeadlineItems'
  )
);

pass(
  'deadline calendar integration',
  app.includes(
    'calendarEventKind'
  ) &&
  app.includes(
    "eventKind !== 'task'"
  ) &&
  app.includes(
    "eventKind !== 'quiz'"
  )
);

pass(
  'deadline filter',
  app.includes(
    'function novaDeadlineFilteredItems'
  )
);

pass(
  'deadline open',
  app.includes(
    'function novaDeadlineOpen'
  )
);

pass(
  'deadline stats',
  app.includes(
    'function novaDeadlineStats'
  )
);

pass(
  'deadline page',
  app.includes(
    'function deadlinePage()'
  )
);

pass(
  'deadline loader',
  app.includes(
    'async function loadDeadlinesData'
  )
);

pass(
  'deadline route loader binding',
  app.includes(
    "if(r==='deadlines')return loadDeadlinesData(force,epoch);"
  )
);

pass(
  'deadline render route',
  app.includes(
    "case 'deadlines':body=deadlinePage();break;"
  )
);

pass(
  'deadline filter bindings',
  app.includes(
    'data-deadline-filter'
  )
);

pass(
  'deadline open bindings',
  app.includes(
    'data-deadline-open'
  )
);

pass(
  'deadline retry binding',
  app.includes(
    "el.dataset.retry==='deadlines'"
  )
);

pass(
  'deadline css marker',
  css.includes(
    'NOVA 25.0 · DEADLINE INTELLIGENCE CORE'
  )
);

pass(
  'deadline page css',
  css.includes(
    '.nova-deadlines-page'
  )
);

pass(
  'deadline next css',
  css.includes(
    '.nova-deadline-next'
  )
);

pass(
  'deadline stats css',
  css.includes(
    '.nova-deadline-stats'
  )
);

pass(
  'deadline row css',
  css.includes(
    '.nova-deadline-row'
  )
);

pass(
  'deadline responsive css',
  css.includes(
    '@media(max-width:680px)'
  ) &&
  css.includes(
    '.nova-deadline-filter'
  )
);

pass(
  'deadline app cache',
  index.includes(
    'nova-26-final-20260923-1'
  )
);

pass(
  'deadline npm test chain',
  pkg.scripts?.test?.includes(
    'tests/nova25-deadline-intelligence.mjs'
  )
);

console.log('');
console.log('==============================================');
console.log(' NOVA 25.0 · DEADLINE INTELLIGENCE AUDIT');
console.log('==============================================');
