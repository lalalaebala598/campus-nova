import fs from 'node:fs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const APP = fs.readFileSync('frontend/app.js', 'utf8');
const SERVER = fs.readFileSync('backend/src/server.js', 'utf8');
const INDEX = fs.readFileSync('frontend/index.html', 'utf8');
const PACKAGE = JSON.parse(
  fs.readFileSync('package.json', 'utf8')
);

function pass(name){
  console.log(`PASS nova21: ${name}`);
}

function check(name, condition, detail=''){
  assert.equal(
    Boolean(condition),
    true,
    detail || `Audit check failed: ${name}`
  );
  pass(name);
}

function has(source, pattern){
  return source.includes(pattern);
}

function count(source, pattern){
  return (
    source.match(
      new RegExp(pattern, 'g')
    ) || []
  ).length;
}

console.log('');
console.log('==============================================');
console.log(' NOVA 21.0 · FULL FUNCTIONAL AUDIT');
console.log('==============================================');
console.log('');

console.log('--- STRUCTURE ---');

check(
  'frontend app exists',
  fs.existsSync('frontend/app.js')
);

check(
  'backend server exists',
  fs.existsSync('backend/src/server.js')
);

check(
  'dashboard stylesheet exists',
  fs.existsSync('frontend/dashboard-final.css')
);

check(
  'schedule stylesheet exists',
  fs.existsSync('frontend/schedule-final.css')
);

check(
  'test command exists',
  typeof PACKAGE.scripts?.test === 'string'
);

console.log('');
console.log('--- SYNTAX ---');

execFileSync(
  'node',
  ['--check', 'frontend/app.js'],
  { stdio:'pipe' }
);

pass('frontend/app.js syntax');

execFileSync(
  'node',
  ['--check', 'backend/src/server.js'],
  { stdio:'pipe' }
);

pass('backend/src/server.js syntax');

console.log('');
console.log('--- NAVIGATION ---');

const navRoutes = [
  'dashboard',
  'courses',
  'course',
  'schedule',
  'grades',
  'tasks',
  'calendar',
  'messages',
  'files',
  'tests',
  'materials',
  'activity',
  'profile',
  'view',
  'search'
];

for(const route of navRoutes){

  check(
    `render route: ${route}`,
    has(
      APP,
      `case '${route}'`
    ) ||
    has(
      APP,
      `case "${route}"`
    ),
    `Missing render switch case for route: ${route}`
  );

}

const routeLoaderChecks = [
  ["dashboard", "if(r==='dashboard')"],
  ["courses", "if(r==='courses')"],
  ["course", "if(r==='course')"],
  ["schedule", "if(r==='schedule')"],
  ["grades", "if(r==='grades')"],
  ["tasks", "if(r==='tasks')"],
  ["calendar", "if(r==='calendar')"],
  ["messages", "if(r==='messages')"],
  ["files", "if(r==='files')"],
  ["tests", "if(r==='tests')"],
  ["materials", "if(r==='materials')"],
  ["activity", "if(r==='activity')"],
  ["profile", "if(r==='profile')"],
  ["view", "if(r==='view')"],
  ["search", "if(r==='search')"]
];

for(const [route, pattern] of routeLoaderChecks){

  check(
    `route loader: ${route}`,
    has(APP, pattern),
    `Missing loadRouteData branch: ${route}`
  );

}

console.log('');
console.log('--- STATE / DATA ---');

check(
  'state has route epoch',
  has(APP, 'routeEpoch')
);

check(
  'state has request isolation',
  has(APP, 'requests:')
);

check(
  'state has activity data',
  has(APP, 'activity:null')
);

check(
  'state has search status',
  has(APP, "search:'idle'")
);

check(
  'state has course status',
  has(APP, "course:'idle'")
);

console.log('');
console.log('--- API CONTRACTS ---');

const apiRoutes = [
  '/api/auth/login',
  '/api/auth/logout',
  '/api/dashboard',
  '/api/courses',
  '/api/course',
  '/api/tasks',
  '/api/tests',
  '/api/files',
  '/api/materials',
  '/api/grades',
  '/api/calendar',
  '/api/messages',
  '/api/profile',
  '/api/activity',
  '/api/activity/action',
  '/api/activity/upload',
  '/api/activity/meta'
];

for(const route of apiRoutes){

  check(
    `server API route: ${route}`,
    has(SERVER, `'${route}'`) ||
    has(SERVER, `"${route}"`),
    `Server route is missing: ${route}`
  );

}

console.log('');
console.log('--- ACTIVITY ENGINE ---');

check(
  'Activity Engine open endpoint',
  has(APP, '/api/activity?')
);

check(
  'Activity Engine action endpoint',
  has(APP, '/api/activity/action')
);

check(
  'Activity Engine upload endpoint',
  has(APP, '/api/activity/upload')
);

check(
  'Activity Engine metadata endpoint',
  has(APP, '/api/activity/meta') ||
  has(SERVER, '/api/activity/meta')
);

check(
  'activity reference encoding',
  has(APP, 'encodeActivityRef')
);

check(
  'activity reference decoding',
  has(APP, 'decodeActivityRef')
);

check(
  'openActivity exists',
  has(APP, 'function openActivity(')
);

check(
  'activity click binding exists',
  has(APP, "$$('[data-activity]'")
);

check(
  'smart download binding exists',
  has(APP, "$$('[data-download]'")
);

console.log('');
console.log('--- COURSE OS ---');

check(
  'Course OS page exists',
  has(APP, 'function coursePage(){')
);

check(
  'Course OS filters exist',
  has(APP, 'data-course-filter')
);

check(
  'Course OS activity classification exists',
  has(APP, 'activityKinds')
);

check(
  'Course OS smart activity cards exist',
  has(APP, 'nova18-activity-card')
);

check(
  'Course OS contextual actions exist',
  has(APP, 'nova18-activity-action')
);

check(
  'Course OS updates exist',
  has(APP, 'nova18-updates-card')
);

check(
  'Course OS sidebar exists',
  has(APP, 'nova-course-sidebar') ||
  has(APP, 'nova18-sidebar')
);

check(
  'Course OS progress exists',
  has(APP, 'nova18-progress-card')
);

console.log('');
console.log('--- DASHBOARD ---');

check(
  'Dashboard exists',
  has(APP, 'function dashboard(){')
);

check(
  'smart priority engine exists',
  has(APP, 'function novaDashboardNextAction(')
);

check(
  'dashboard agenda exists',
  has(APP, 'function novaDashboardAgendaRows()')
);

check(
  'dashboard deadlines exist',
  has(APP, 'novaDashboardDeadlineRows')
);

check(
  'dashboard course progress exists',
  has(APP, 'novaDashboardProgressCourses')
);

check(
  'dashboard updates exists',
  has(APP, 'function novaDashboardUpdatesMarkup(){')
);

check(
  'global update commit exists',
  has(APP, 'function novaGlobalUpdateCommit(){')
);

check(
  'global update storage exists',
  has(APP, 'novaGlobalUpdateStorageKey')
);

check(
  'dashboard sync includes files',
  has(APP, "loadData('files',false,epoch)")
);

check(
  'dashboard sync includes tests',
  has(APP, "loadData('tests',false,epoch)")
);

check(
  'dashboard sync includes materials',
  has(APP, "loadData('materials',false,epoch)")
);

console.log('');
console.log('--- GLOBAL SEARCH ---');

check(
  'search page exists',
  has(APP, 'function searchPage(){')
);

check(
  'search index exists',
  has(APP, 'function novaSearchItems(){')
);

check(
  'full search results exist',
  has(APP, 'function novaSearchResultsFull(')
);

check(
  'Enter opens full search page',
  has(APP, "navigate(\n            'search'")
);

check(
  'search submit opens full search page',
  count(
    APP,
    "navigate\\(\\s*'search'"
  ) >= 2
);

console.log('');
console.log('--- INTERACTION BINDINGS ---');

const bindings = [
  '#expand-all',
  '#collapse-all',
  '#global-search-submit',
  '#nova-search-clear',
  '#theme-sidebar',
  '#theme-top',
  '#theme-profile',
  '#profile-menu-trigger',
  '#profile-logout',
  '#mobile-menu',
  '#login-form',
  '#content-refresh'
];

for(const selector of bindings){

  check(
    `binding: ${selector}`,
    has(
      APP,
      selector
    ),
    `Missing UI binding: ${selector}`
  );

}

check(
  'course filter binding',
  has(APP, '[data-course-filter]')
);

check(
  'course action expand binding',
  has(APP, '[data-course-action="expand"]')
);

check(
  'schedule import binding',
  has(APP, '[data-schedule-action="import"]')
);

console.log('');
console.log('--- DATA SAFETY / LEGACY ---');

check(
  'legacy branch label removed',
  !has(APP, 'Кубанский')
);

check(
  'no unresolved custom tag marker',
  !has(APP, '<custom-')
);

check(
  'BETA label exists',
  has(APP, 'BETA1.0')
);

check(
  'Schedule parser remains in test chain',
  has(
    PACKAGE.scripts?.test || '',
    'tests/schedule-parser.mjs'
  )
);

check(
  'nova19 stylesheet cache bust exists',
  /dashboard-final\.css\?v=nova-/.test(INDEX)
);

console.log('');
console.log('--- DUPLICATE FUNCTION AUDIT ---');

const functionNames = [
  ...APP.matchAll(
    /function\s+([A-Za-z_$][\w$]*)\s*\(/g
  )
].map(
  match => match[1]
);

const duplicates = [
  ...new Set(
    functionNames.filter(
      (name,index)=>
        functionNames.indexOf(name)!==
        index
    )
  )
];

check(
  'no duplicate function declarations',
  duplicates.length===0,
  duplicates.length
    ? `Duplicate functions: ${duplicates.join(', ')}`
    : ''
);

console.log('');
console.log('--- PACKAGE TEST CONTRACT ---');

check(
  'nova21 audit is included in npm test',
  has(
    PACKAGE.scripts?.test || '',
    'tests/nova21-audit.mjs'
  )
);

console.log('');
console.log('==============================================');
console.log(' NOVA 21.0 · AUDIT COMPLETE');
console.log('==============================================');
console.log('');
