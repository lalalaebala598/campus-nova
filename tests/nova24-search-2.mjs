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
      `FAIL nova24: ${label}`
    );
  }

  console.log(
    `PASS nova24: ${label}`
  );
}

pass(
  'search filter state',
  app.includes(
    "searchFilter: localStorage.getItem('nova-search-filter') || 'all'"
  )
);

pass(
  'search token engine',
  app.includes(
    'function novaSearchTokens'
  )
);

pass(
  'search filter function',
  app.includes(
    'function novaSearchFilter'
  )
);

pass(
  'search recent storage',
  app.includes(
    'nova-search-recent-v1'
  )
);

pass(
  'search recent remember',
  app.includes(
    'function novaSearchRemember'
  )
);

pass(
  'search recent clear',
  app.includes(
    'function novaSearchClearRecent'
  )
);

pass(
  'search scoring',
  app.includes(
    'function novaSearchScore'
  )
);

pass(
  'search 2 results',
  app.includes(
    'function novaSearchResultsFull'
  )
);

pass(
  'search 2 page',
  app.includes(
    'function searchPage()'
  )
);

pass(
  'search filter bindings',
  app.includes(
    'data-search-filter'
  )
);

pass(
  'recent search bindings',
  app.includes(
    'data-search-recent'
  )
);

pass(
  'search reset binding',
  app.includes(
    'nova-search-reset-filter'
  )
);

pass(
  'search cache',
  index.includes(
    'nova-25-1-20260923-1'
  )
);

pass(
  'search css marker',
  css.includes(
    'NOVA 24.0 · SEARCH 2.0'
  )
);

pass(
  'search command css',
  css.includes(
    '.nova-search-command'
  )
);

pass(
  'search filter css',
  css.includes(
    '.nova-search-filter'
  )
);

pass(
  'search result css',
  css.includes(
    '.nova-search-page-result'
  )
);

pass(
  'nova24 audit in npm test',
  pkg.scripts?.test?.includes(
    'tests/nova24-search-2.mjs'
  )
);

console.log('');
console.log('==============================================');
console.log(' NOVA 24.0 · SEARCH 2.0 AUDIT COMPLETE');
console.log('==============================================');
