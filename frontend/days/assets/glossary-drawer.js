(() => {
  const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
  const extractEntries = (documentRoot) => [...documentRoot.querySelectorAll('.glossary-item')].map((item) => {
    const term = item.querySelector('dt');
    const definition = item.querySelector('dd');
    if (!term || !definition) return null;
    const titleNode = term.cloneNode(true);
    titleNode.querySelector('small')?.remove();
    const title = normalize(titleNode.textContent);
    const alias = normalize(term.querySelector('small')?.textContent);
    const paragraphs = [...definition.querySelectorAll(':scope > p')].map((paragraph) => normalize(paragraph.textContent)).filter(Boolean);
    return title ? { title, alias, paragraphs: paragraphs.length ? paragraphs : [normalize(definition.textContent)] } : null;
  }).filter(Boolean);

  const currentGlossary = document.querySelector('.glossary');
  if (!currentGlossary) return;
  currentGlossary.hidden = true;

  const entries = new Map();
  const addEntries = (items) => items.forEach((entry) => {
    if (!entries.has(entry.title)) entries.set(entry.title, entry);
  });
  addEntries(extractEntries(document));

  document.body.insertAdjacentHTML('beforeend', `
    <div class="glossary-drawer-backdrop" data-glossary-drawer-close></div>
    <aside class="glossary-drawer" id="glossaryDrawer" aria-label="용어모음" aria-hidden="true">
      <header><div><p>GLOSSARY</p><h2>용어모음</h2></div><button type="button" aria-label="용어모음 닫기" data-glossary-drawer-close>×</button></header>
      <p class="glossary-drawer-intro">용어를 선택하면 쉬운 설명이 펼쳐집니다.</p>
      <div class="glossary-drawer-list" id="glossaryDrawerList"></div>
    </aside>`);
  const drawer = document.getElementById('glossaryDrawer');
  const backdrop = document.querySelector('.glossary-drawer-backdrop');
  const headerActions = document.querySelector('.day-header-actions');
  if (!drawer || !backdrop || !headerActions) return;
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'day-glossary-toggle';
  trigger.setAttribute('aria-controls', 'glossaryDrawer');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.innerHTML = '<i class="fa-solid fa-book-open" aria-hidden="true"></i> 용어모음';
  headerActions.prepend(trigger);

  const render = () => {
    const list = document.getElementById('glossaryDrawerList');
    list.replaceChildren(...[...entries.values()].sort((a, b) => a.title.localeCompare(b.title, 'ko')).map((entry) => {
      const details = document.createElement('details');
      details.className = 'glossary-drawer-item';
      const summary = document.createElement('summary');
      summary.textContent = entry.title;
      details.append(summary);
      if (entry.alias) {
        const alias = document.createElement('small');
        alias.textContent = entry.alias;
        details.append(alias);
      }
      entry.paragraphs.forEach((text) => {
        const paragraph = document.createElement('p');
        paragraph.textContent = text;
        details.append(paragraph);
      });
      return details;
    }));
  };
  const open = () => { drawer.classList.add('is-open'); backdrop.classList.add('is-open'); drawer.setAttribute('aria-hidden', 'false'); trigger.setAttribute('aria-expanded', 'true'); };
  const close = () => { drawer.classList.remove('is-open'); backdrop.classList.remove('is-open'); drawer.setAttribute('aria-hidden', 'true'); trigger.setAttribute('aria-expanded', 'false'); trigger.focus(); };
  trigger.addEventListener('click', open);
  document.querySelectorAll('[data-glossary-drawer-close]').forEach((button) => button.addEventListener('click', close));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && drawer.classList.contains('is-open')) close(); });
  render();

  Promise.all([1, 2, 3, 4].map((day) => fetch(`${String(day).padStart(2, '0')}.html`).then((response) => response.ok ? response.text() : '').catch(() => '')))
    .then((pages) => {
      pages.filter(Boolean).forEach((page) => addEntries(extractEntries(new DOMParser().parseFromString(page, 'text/html'))));
      render();
    });
})();
