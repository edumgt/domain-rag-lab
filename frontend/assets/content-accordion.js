/* PR long-content accordions. Keep existing content nodes and their event handlers intact. */
(() => {
  if (window.PrContentAccordion) return;
  const threshold = 800;
  const records = new Map();
  let frame = 0, serial = 0;
  const excluded = '[data-pr-accordion-exempt],aside,nav,dialog,footer,[role="dialog"],.glossary-modal,.modal,.chart-modal,[data-pr-accordion-bar]';
  const headingSelector = ':scope>h1,:scope>h2,:scope>h3,:scope>header h1,:scope>header h2,:scope>header h3,:scope>div>h2,:scope>div>h3';
  function hashTarget(hash = location.hash) {
    try { return hash && document.getElementById(decodeURIComponent(hash.replace(/^#/,''))); }
    catch { return null; }
  }
  function setExpanded(section, expanded, returnToHeader = false) {
    const record = records.get(section);
    if (!record) return;
    section.dataset.prCollapsed = String(!expanded);
    record.button.setAttribute('aria-expanded', String(expanded));
    record.button.textContent = expanded ? '내용 숨기기 ▴' : '내용 보기 ▾';
    record.button.setAttribute('aria-label', `${record.title} · ${expanded ? '내용 숨기기' : '내용 보기'}`);
    // A native lesson may already have its own collapsed state. Our single control owns it.
    if (expanded) section.classList.remove('is-collapsed');
    record.label.hidden = expanded;
    if (returnToHeader && section.getBoundingClientRect().top < 0) record.bar.scrollIntoView({block:'start',behavior:'instant'});
    if (expanded) window.dispatchEvent(new Event('resize'));
  }
  function reveal(target) {
    if (!target) return;
    for (const section of records.keys()) {
      if (section === target || section.contains(target)) setExpanded(section, true);
    }
  }
  function register(section, heading) {
    const title = heading.textContent.replace(/\s+/g,' ').trim();
    if (!title) return;
    const bar = document.createElement('div');
    bar.className = 'pr-accordion-bar no-glossary-link';
    bar.dataset.prAccordionBar = '';
    const label = document.createElement('span');
    label.className = 'pr-accordion-title';
    label.textContent = title;
    label.setAttribute('role','heading');
    label.setAttribute('aria-level',heading.tagName.replace('H',''));
    const button = document.createElement('button');
    button.type = 'button';button.className = 'pr-accordion-toggle';
    const controlled = [];
    // Existing direct-child selectors, charts, forms and listeners remain in place.
    for (const child of section.children) {
      if (child.matches('[data-lesson-toggle],.lesson-toggle,.lesson-accordion-toggle')) {
        child.dataset.prReplacedToggle = '';
        continue;
      }
      if (!child.id) child.id = `pr-accordion-content-${++serial}`;
      controlled.push(child.id);
    }
    button.setAttribute('aria-controls',controlled.join(' '));
    bar.append(label,button);
    section.prepend(bar);
    section.dataset.prAccordion = '';
    records.set(section,{button,label,bar,title});
    button.addEventListener('click',() => setExpanded(section,button.getAttribute('aria-expanded') !== 'true',true));
    const target = hashTarget();
    setExpanded(section,Boolean(target && (target === section || section.contains(target))));
  }
  const resizeObserver = new ResizeObserver(() => schedule());
  const observed = new WeakSet();
  function scan() {
    frame = 0;
    for (const section of records.keys()) if (!section.isConnected) records.delete(section);
    const candidates = [];
    document.querySelectorAll('main section,.messages section').forEach(section => {
      if (section.closest(excluded) || records.has(section) || section.closest('[data-pr-accordion]')) return;
      const heading = section.matches('.lesson,.theory-lesson,.requirement,.content-section')
        ? section.querySelector('h1,h2,h3') : section.querySelector(headingSelector);
      if (!heading || !heading.textContent.trim()) return;
      if (!observed.has(section)) { observed.add(section);resizeObserver.observe(section); }
      if (section.getClientRects().length && section.getBoundingClientRect().height >= threshold) candidates.push([section,heading]);
    });
    // Measure first and mutate second, so nested sections do not change the threshold mid-scan.
    let added = false;
    for (const [section,heading] of candidates) {
      if (section.closest('[data-pr-accordion]')) continue;
      register(section,heading);added = true;
    }
    if (added && location.hash) {
      const target = hashTarget();reveal(target);
      if (target) requestAnimationFrame(() => target.scrollIntoView({block:'start',behavior:'instant'}));
    }
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(scan); }
  function start() {
    scan();
    new MutationObserver(changes => {
      if (changes.some(change => !change.target.closest?.('[data-pr-accordion-bar]'))) schedule();
    }).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','class']});
    window.addEventListener('resize',schedule,{passive:true});
    window.addEventListener('load',schedule,{once:true});
    document.fonts?.ready.then(schedule);
    window.addEventListener('hashchange',() => {const target=hashTarget();reveal(target);if(target)target.scrollIntoView({block:'start',behavior:'instant'});});
    document.addEventListener('click',event => {
      const link=event.target.closest('a[href^="#"]');
      if(link)reveal(hashTarget(link.getAttribute('href')));
    });
  }
  window.PrContentAccordion = {refresh:schedule,threshold};
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
