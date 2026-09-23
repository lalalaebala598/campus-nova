import assert from 'node:assert/strict';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('../frontend/app.js',import.meta.url),'utf8');
assert.match(source,/NAV\.map\(\(\[r,i,l\]\)=>\{const href=r==='dashboard'\?'\/'/);
assert.match(source,/<a class=\"nav-item/);
assert.match(source,/data-go=\"\$\{r\}\" aria-current/);
assert.match(source,/\$\$\('\[data-go\]:not\(a\)'\)/);
assert.match(source,/closest\?\.\('a\[data-go\]'\)/);
assert.match(source,/window\.location\.assign\(href\)/);

assert.match(
  source,
  /function novaBindAnchorNavigation\(\)/,
  'SPA anchor navigation helper missing'
);

assert.match(
  source,
  /novaBindAnchorNavigation\(\);\s*\$\$\('\[data-go\]:not\(a\)'\)/s,
  'bind() must activate SPA anchor navigation'
);

for (const route of ['courses','schedule','grades','tasks','calendar','messages','files','materials','tests']) assert.ok(source.includes(`['${route}'`), `NAV must contain ${route}`);
console.log('PASS navigation: sidebar nav has native href fallback + delegated SPA handler');
