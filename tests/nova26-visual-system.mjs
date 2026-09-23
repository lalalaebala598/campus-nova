import fs from 'node:fs';

const INDEX = fs.readFileSync('frontend/index.html', 'utf8');

const pkg =
  JSON.parse(
    fs.readFileSync(
      'package.json',
      'utf8'
    )
  );

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
  CSS.includes(
    'NOVA 26.0 · VISUAL SYSTEM'
  )
);

pass(
  'dark semantic tokens',
  CSS.includes('--bg:#060b12') &&
  CSS.includes('--surface:#0c131d') &&
  CSS.includes('--text:#f5f8fc') &&
  CSS.includes('--accent:#21b9ff')
);

pass(
  'light semantic tokens',
  CSS.includes('html[data-theme="light"]') &&
  CSS.includes('--bg:#eef3f7') &&
  CSS.includes('--surface:#ffffff') &&
  CSS.includes('--text:#18324c') &&
  CSS.includes('--accent:#087ff0')
);

pass(
  'theme bootstrap',
  INDEX.includes(
    "localStorage.getItem('nova-theme')"
  ) &&
  INDEX.includes(
    'document.documentElement.dataset.theme'
  )
);

pass(
  'dashboard css cache',
  INDEX.includes(
    'nova-26-final-20260923-1'
  )
);

pass(
  'hero duplicate stats hidden',
  CSS.includes(
    '.nova-ambient-hero > .hero-stats'
  ) &&
  CSS.includes(
    'display:none!important'
  )
);

pass(
  'hero overflow buffer',
  CSS.includes(
    'inset:-26%!important'
  )
);

pass(
  'old hero edge removed',
  CSS.includes(
    '.nova-ambient-hero::after'
  ) &&
  CSS.includes(
    'display:none!important'
  )
);

pass(
  'old light rays removed',
  CSS.includes(
    '.nova-light-line'
  ) &&
  CSS.includes(
    'display:none!important'
  )
);

pass(
  'hero animation system',
  CSS.includes(
    '@keyframes nova26AuroraA'
  ) &&
  CSS.includes(
    '@keyframes nova26AuroraB'
  ) &&
  CSS.includes(
    '@keyframes nova26Core'
  )
);

pass(
  'material cards use grid contract',
  CSS.includes(
    'grid-template-columns:\n    42px\n    minmax(0,1fr)\n    34px!important'
  )
);

pass(
  'material kind no longer overlaps icon',
  CSS.includes(
    '.material-card-kind'
  ) &&
  CSS.includes(
    'display:none!important'
  )
);

pass(
  'material icon core aligned',
  CSS.includes(
    '.material-card-icon-core'
  ) &&
  CSS.includes(
    'place-items:center!important'
  )
);

pass(
  'file rows use fixed icon slot',
  CSS.includes(
    '.nova-file-icon'
  ) &&
  CSS.includes(
    'width:42px!important'
  ) &&
  CSS.includes(
    'min-width:42px!important'
  )
);

pass(
  'file action aligned',
  CSS.includes(
    '.nova-file-open'
  ) &&
  CSS.includes(
    'width:34px!important'
  ) &&
  CSS.includes(
    'height:34px!important'
  )
);

pass(
  'light body has no global wash',
  CSS.includes(
    'background-image:none!important'
  )
);

pass(
  'light hero has dedicated paint',
  CSS.includes(
    'html[data-theme="light"] .nova-ambient-hero'
  ) &&
  CSS.includes(
    'body[data-theme="light"] .nova-ambient-hero'
  )
);

pass(
  'light focus card is opaque and calm',
  CSS.includes(
    'background:\n    rgba(255,255,255,.79)!important'
  ) &&
  CSS.includes(
    'box-shadow:\n    0 19px 42px'
  )
);

pass(
  'reduced motion support',
  CSS.includes(
    '@media(prefers-reduced-motion:reduce)'
  )
);

pass(
  'nova26 audit in npm test',
  pkg.scripts?.test?.includes(
    'tests/nova26-visual-system.mjs'
  )
);


pass(
  'final cache',
  INDEX.includes(
    'nova-26-final-20260923-1'
  )
);

pass(
  'hero stats removed from DOM',
  !APP.includes(
    '<div class="hero-stats">'
  )
);

pass(
  'legacy hero lines removed from DOM',
  !APP.includes(
    'nova-light-line-a'
  ) &&
  !APP.includes(
    'nova-light-line-b'
  )
);

pass(
  'legacy hero grid removed from DOM',
  !APP.includes(
    'nova-ambient-grid'
  )
);

pass(
  'study action wrapper',
  APP.includes(
    'nova20-action-label-text'
  ) &&
  APP.includes(
    'Учиться сейчас'
  )
);

pass(
  'open action wrapper',
  APP.includes(
    'Открыть'
  ) &&
  APP.includes(
    'nova20-action-label-text'
  )
);

pass(
  'final icon line box reset',
  CSS.includes(
    '.icon{'
  ) &&
  CSS.includes(
    'line-height:0!important'
  ) &&
  CSS.includes(
    'vertical-align:middle!important'
  )
);

pass(
  'final file download square',
  CSS.includes(
    'width:42px!important'
  ) &&
  CSS.includes(
    'height:42px!important'
  ) &&
  CSS.includes(
    'justify-self:center!important'
  )
);

pass(
  'final command action geometry',
  CSS.includes(
    'grid-template-columns:\n    52px\n    minmax(0,1fr)\n    126px!important'
  ) &&
  CSS.includes(
    '.nova20-action-label-text'
  )
);

pass(
  'final visual lock marker',
  CSS.includes(
    'NOVA 26.2 · FINAL VISUAL LOCK'
  )
);


console.log('');
console.log('==============================================');
console.log(' NOVA 26.0 · VISUAL SYSTEM AUDIT COMPLETE');
console.log('==============================================');
