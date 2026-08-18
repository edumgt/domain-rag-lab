(() => {
  const clean = (value) => value.replace(/\s+/g, ' ').trim();
  const entries = [...document.querySelectorAll('.glossary-item')].map((item) => {
    const term = item.querySelector('dt');
    const description = item.querySelector('dd');
    if (!term || !description) return null;
    const clone = term.cloneNode(true);
    clone.querySelector('small')?.remove();
    return {
      title: clean(clone.textContent),
      aliases: clean(term.querySelector('small')?.textContent || ''),
      detail: clean(description.textContent),
      item,
    };
  }).filter((entry) => entry && entry.title);

  if (!entries.length) return;

  document.body.insertAdjacentHTML('beforeend', `
    <div class="glossary-modal" id="glossaryModal" hidden>
      <div class="glossary-modal__backdrop" data-glossary-close></div>
      <section class="glossary-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="glossaryModalTitle">
        <button class="glossary-modal__close" type="button" aria-label="용어 설명 닫기" data-glossary-close>×</button>
        <p class="glossary-modal__label">용어 설명</p>
        <h2 id="glossaryModalTitle"></h2>
        <p class="glossary-modal__aliases" id="glossaryModalAliases"></p>
        <p class="glossary-modal__detail" id="glossaryModalDetail"></p>
      </section>
    </div>`);

  const modal = document.querySelector('#glossaryModal');
  const title = document.querySelector('#glossaryModalTitle');
  const aliases = document.querySelector('#glossaryModalAliases');
  const detail = document.querySelector('#glossaryModalDetail');
  const closeButton = modal.querySelector('.glossary-modal__close');
  let trigger = null;
  const open = (entry, source) => {
    trigger = source;
    title.textContent = entry.title;
    aliases.textContent = entry.aliases;
    aliases.hidden = !entry.aliases;
    detail.textContent = entry.detail;
    modal.hidden = false;
    closeButton.focus();
  };
  const close = () => {
    if (modal.hidden) return;
    modal.hidden = true;
    trigger?.focus();
  };

  entries.forEach((entry, index) => {
    entry.item.tabIndex = 0;
    entry.item.setAttribute('role', 'button');
    entry.item.setAttribute('aria-label', `${entry.title} 용어 설명 보기`);
    entry.item.addEventListener('click', () => open(entry, entry.item));
    entry.item.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        open(entry, entry.item);
      }
    });
    entry.index = index;
  });

  document.querySelectorAll('[data-glossary-close]').forEach((element) => element.addEventListener('click', close));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });

  const byTerm = [...entries].sort((a, b) => b.title.length - a.title.length);
  const walker = document.createTreeWalker(document.querySelector('#app'), NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.parentElement?.closest('.lesson-body, .goal, .check')) return NodeFilter.FILTER_REJECT;
      if (node.parentElement.closest('button, script, style')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  textNodes.forEach((node) => {
    const text = node.nodeValue;
    const matches = [];
    byTerm.forEach((entry) => {
      let start = 0;
      while (true) {
        const index = text.indexOf(entry.title, start);
        if (index < 0) break;
        matches.push({ index, end: index + entry.title.length, entry });
        start = index + entry.title.length;
      }
    });
    matches.sort((a, b) => a.index - b.index || b.end - a.end);
    const selected = matches.reduce((result, match) => {
      if (!result.length || match.index >= result[result.length - 1].end) result.push(match);
      return result;
    }, []);
    if (!selected.length) return;
    const fragment = document.createDocumentFragment();
    let cursor = 0;
    selected.forEach((match) => {
      fragment.append(text.slice(cursor, match.index));
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'glossary-term';
      button.textContent = match.entry.title;
      button.setAttribute('aria-label', `${match.entry.title} 용어 설명 보기`);
      button.addEventListener('click', () => open(match.entry, button));
      fragment.append(button);
      cursor = match.end;
    });
    fragment.append(text.slice(cursor));
    node.replaceWith(fragment);
  });
})();
