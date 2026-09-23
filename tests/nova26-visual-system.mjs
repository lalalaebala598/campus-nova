import fs from 'node:fs';

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
      `FAIL nova26: ${label}`
    );
  }

  console.log(
    `PASS nova26: ${label}`
  );
}

pass(
  'visual system marker',
  css.includes(
    'NOVA 26.0 · VISUAL SYSTEM'
  )
);

pass(
  'dark semantic tokens',
  css.includes('--bg:#060b12') &&
  css.includes('--surface:#0c131d') &&
  css.includes('--text:#f5f8fc') &&
  css.includes('--accent:#21b9ff')
);

pass(
  'light semantic tokens',
  css.includes('html[data-theme="light"]') &&
  css.includes('--bg:#eef3f7') &&
  css.includes('--surface:#ffffff') &&
  css.includes('--text:#18324c') &&
  css.includes('--accent:#087ff0')
);

pass(
  'theme bootstrap',
  index.includes(
    "localStorage.getItem('nova-theme')"
  ) &&
  index.includes(
    'document.documentElement.dataset.theme'
  )
);

pass(
  'dashboard css cache',
  index.includes(
    'nova-26-1-20260923-1'
  )
);

pass(
  'hero duplicate stats hidden',
  css.includes(
    '.nova-ambient-hero > .hero-stats'
  ) &&
  css.includes(
    'display:none!important'
  )
);

pass(
  'hero overflow buffer',
  css.includes(
    'inset:-26%!important'
  )
);

pass(
  'old hero edge removed',
  css.includes(
    '.nova-ambient-hero::after'
  ) &&
  css.includes(
    'display:none!important'
  )
);

pass(
  'old light rays removed',
  css.includes(
    '.nova-light-line'
  ) &&
  css.includes(
    'display:none!important'
  )
);

pass(
  'hero animation system',
  css.includes(
    '@keyframes nova26AuroraA'
  ) &&
  css.includes(
    '@keyframes nova26AuroraB'
  ) &&
  css.includes(
    '@keyframes nova26Core'
  )
);

pass(
  'material cards use grid contract',
  css.includes(
    'grid-template-columns:\n    42px\n    minmax(0,1fr)\n    34px!important'
  )
);

pass(
  'material kind no longer overlaps icon',
  css.includes(
    '.material-card-kind'
  ) &&
  css.includes(
    'display:none!important'
  )
);

pass(
  'material icon core aligned',
  css.includes(
    '.material-card-icon-core'
  ) &&
  css.includes(
    'place-items:center!important'
  )
);

pass(
  'file rows use fixed icon slot',
  css.includes(
    '.nova-file-icon'
  ) &&
  css.includes(
    'width:42px!important'
  ) &&
  css.includes(
    'min-width:42px!important'
  )
);

pass(
  'file action aligned',
  css.includes(
    '.nova-file-open'
  ) &&
  css.includes(
    'width:34px!important'
  ) &&
  css.includes(
    'height:34px!important'
  )
);

pass(
  'light body has no global wash',
  css.includes(
    'background-image:none!important'
  )
);

pass(
  'light hero has dedicated paint',
  css.includes(
    'html[data-theme="light"] .nova-ambient-hero'
  ) &&
  css.includes(
    'body[data-theme="light"] .nova-ambient-hero'
  )
);

pass(
  'light focus card is opaque and calm',
  css.includes(
    'background:\n    rgba(255,255,255,.79)!important'
  ) &&
  css.includes(
    'box-shadow:\n    0 19px 42px'
  )
);

pass(
  'reduced motion support',
  css.includes(
    '@media(prefers-reduced-motion:reduce)'
  )
);

pass(
  'nova26 audit in npm test',
  pkg.scripts?.test?.includes(
    'tests/nova26-visual-system.mjs'
  )
);

console.log('');
console.log('==============================================');
console.log(' NOVA 26.0 · VISUAL SYSTEM AUDIT COMPLETE');
console.log('==============================================');
