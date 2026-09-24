/* NOVA 34 · ACTIVITY WORKSPACE */
(() => {
  'use strict';

  const qs = (root, selector) => root?.querySelector(selector) || null;
  const qsa = (root, selector) => [...(root?.querySelectorAll(selector) || [])];

  function make(tag, className, text = '') {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text) el.textContent = text;
    return el;
  }

  function enhanceActivity(root = document) {
    const page = root.querySelector?.('.activity-page');
    if (!page || page.dataset.nova34Ready === '1') return;

    const card = qs(page, ':scope > .content-card');
    const content = qs(card, ':scope > #campus-content');
    const source = qs(content, ':scope > .nova-practice-source');

    if (!card || !content || !source) return;

    const toolbar = qs(card, ':scope > .content-toolbar');
    const oldKicker = qs(card, ':scope > .eyebrow');
    const title = qs(card, ':scope > h1');
    const sourceHead = qs(source, ':scope > .nova-practice-source-head');
    const statusGrid = qs(source, ':scope > .nova-practice-status-grid');
    const description = qs(source, ':scope > .nova-practice-description');
    const myAnswer = qs(source, ':scope > .nova-practice-my-answer');
    const sourceFiles = qsa(source, ':scope > .nova-practice-files')
      .filter(el => !el.classList.contains('nova-practice-my-answer'));
    const cta = qs(content, ':scope > .nova-bottom-cta');

    if (!title) return;

    const head = make('header', 'nova34-activity-head');

    if (toolbar) head.appendChild(toolbar);

    const meta = make('div', 'nova34-head-meta');
    if (oldKicker) {
      oldKicker.classList.add('nova34-kicker');
      meta.appendChild(oldKicker);
    }

    head.appendChild(meta);
    title.classList.add('nova34-title');
    head.appendChild(title);

    const grid = make('div', 'nova34-grid');
    const main = make('div', 'nova34-main');
    const side = make('aside', 'nova34-side');

    if (description) {
      const condition = make('section', 'nova34-section nova34-condition');
      const sectionHead = make('div', 'nova34-section-head');
      sectionHead.appendChild(make('span', 'nova34-section-label', 'УСЛОВИЕ'));
      sectionHead.appendChild(make('h2', 'nova34-section-title', 'Что нужно сделать'));
      condition.appendChild(sectionHead);

      description.classList.add('nova34-description');
      condition.appendChild(description);
      main.appendChild(condition);
    }

    sourceFiles.forEach((filesCard, index) => {
      filesCard.classList.add('nova34-source-files', 'nova34-card');
      main.appendChild(filesCard);
    });

    if (myAnswer) {
      myAnswer.classList.add('nova34-my-answer', 'nova34-card');
      main.appendChild(myAnswer);
    }

    if (statusGrid) {
      const overview = make('section', 'nova34-overview nova34-card');
      const overviewHead = make('div', 'nova34-overview-head');
      overviewHead.appendChild(make('span', 'nova34-section-label', 'О ЗАДАНИИ'));
      overviewHead.appendChild(make('h2', '', 'Статус и срок'));
      overview.appendChild(overviewHead);
      overview.appendChild(statusGrid);
      side.appendChild(overview);
    }

    if (cta) {
      cta.classList.add('nova34-submit', 'nova34-card');
      side.appendChild(cta);
    }

    const hasMain = main.children.length > 0;
    const hasSide = side.children.length > 0;
    if (!hasMain && !hasSide) return;

    if (sourceHead) {
      sourceHead.classList.add('nova34-hide-source-head');
      sourceHead.remove();
    }
    source.remove();

    if (hasMain) grid.appendChild(main);
    if (hasSide) grid.appendChild(side);

    head.classList.add('nova34-cardless-head');
    content.prepend(head);
    content.appendChild(grid);

    page.dataset.nova34Ready = '1';
  }

  function boot() {
    enhanceActivity(document);

    const observer = new MutationObserver(() => {
      requestAnimationFrame(() => enhanceActivity(document));
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
