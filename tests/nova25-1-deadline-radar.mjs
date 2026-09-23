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
      `FAIL nova25.1: ${label}`
    );
  }

  console.log(
    `PASS nova25.1: ${label}`
  );
}

pass(
  'dashboard radar function',
  app.includes(
    'function novaDashboardDeadlineRadar'
  )
);

pass(
  'dashboard radar uses deadline core',
  app.includes(
    'novaDashboardDeadlineRadar();'
  )
);

pass(
  'dashboard radar stats',
  app.includes(
    'deadlineRadar.overdue'
  ) &&
  app.includes(
    'deadlineRadar.today'
  ) &&
  app.includes(
    'deadlineRadar.soon'
  )
);

pass(
  'dashboard radar normalized rows',
  app.includes(
    'data-deadline-open="${esc(item.id)}"'
  )
);

pass(
  'dashboard radar opens deadline center',
  app.includes(
    'data-go="deadlines"'
  )
);

pass(
  'study deadline context function',
  app.includes(
    'function novaStudyDeadlineContext'
  )
);

pass(
  'study deadline context variable',
  app.includes(
    'currentDeadlineContext'
  )
);

pass(
  'study deadline intelligence ui',
  app.includes(
    'nova-study-deadline-intel'
  )
);

pass(
  'deadline open binding',
  app.includes(
    "data-deadline-open"
  )
);

pass(
  'dashboard radar css',
  css.includes(
    '.nova-dashboard-deadline-radar'
  )
);

pass(
  'dashboard radar stats css',
  css.includes(
    '.nova-dashboard-deadline-radar-stats'
  )
);

pass(
  'study deadline intel css',
  css.includes(
    '.nova-study-deadline-intel'
  )
);

pass(
  '25.1 cache bust',
  index.includes(
    'nova-26-20260923-1'
  )
);

pass(
  'nova25.1 test chain',
  pkg.scripts?.test?.includes(
    'tests/nova25-1-deadline-radar.mjs'
  )
);

console.log('');
console.log('==============================================');
console.log(' NOVA 25.1 · DEADLINE RADAR AUDIT COMPLETE');
console.log('==============================================');
