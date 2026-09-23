import fs from 'node:fs';

const app = fs.readFileSync(
  'frontend/app.js',
  'utf8'
);

const css = fs.readFileSync(
  'frontend/dashboard-final.css',
  'utf8'
);

const index = fs.readFileSync(
  'frontend/index.html',
  'utf8'
);

const pkg = JSON.parse(
  fs.readFileSync(
    'package.json',
    'utf8'
  )
);

function pass(label, ok){
  if(!ok){
    throw new Error(`FAIL nova23: ${label}`);
  }

  console.log(
    `PASS nova23: ${label}`
  );
}

pass(
  'notifications data state',
  app.includes(
    'notifications: null'
  )
);

pass(
  'notifications status',
  app.includes(
    "notifications:'idle'"
  )
);

pass(
  'notifications route label',
  app.includes(
    "notifications:'Уведомления'"
  )
);

pass(
  'notifications route loader',
  app.includes(
    "r==='notifications'"
  )
);

pass(
  'notifications render route',
  app.includes(
    "case 'notifications':body=notificationsPage();break;"
  )
);

pass(
  'notification storage',
  app.includes(
    "nova-notifications-v1"
  )
);

pass(
  'notification filter storage',
  app.includes(
    "nova-notifications-filter-v1"
  )
);

pass(
  'notification engine',
  app.includes(
    'function novaNotificationItems()'
  )
);

pass(
  'notification read state',
  app.includes(
    'function novaNotificationMarkRead'
  )
);

pass(
  'mark all read',
  app.includes(
    'function novaNotificationMarkAllRead'
  )
);

pass(
  'notification page',
  app.includes(
    'function notificationsPage()'
  )
);

pass(
  'notification loader',
  app.includes(
    'function loadNotificationsData'
  )
);

pass(
  'notification filters',
  app.includes(
    'data-notification-filter'
  )
);

pass(
  'notification open binding',
  app.includes(
    'data-notification-open'
  )
);

pass(
  'notification read binding',
  app.includes(
    'data-notification-read'
  )
);

pass(
  'header bell navigation',
  app.includes(
    "navigate('notifications')"
  )
);

pass(
  'notification css',
  css.includes(
    'NOVA 23.0 · NOTIFICATIONS CENTER'
  )
);

pass(
  'notification page css',
  css.includes(
    '.nova-notifications-page'
  )
);

pass(
  'notification list css',
  css.includes(
    '.nova-notification-list'
  )
);

pass(
  'notification cache',
  index.includes(
    'nova-26-20260923-1'
  )
);

pass(
  'nova23 audit in npm test',
  pkg.scripts?.test?.includes(
    'tests/nova23-notifications.mjs'
  )
);

console.log('');
console.log('==============================================');
console.log(' NOVA 23.0 · NOTIFICATIONS AUDIT COMPLETE');
console.log('==============================================');
