(() => {
  const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
  // 모든 일차의 용어모음에 공통으로 노출할 핵심 금융 용어입니다.
  const SYSTEM_ENTRIES = [
    { title: '집합투자', alias: 'Collective Investment · 集合投資', paragraphs: ['2명 이상의 투자자에게서 모은 금전 등을 투자자의 일상적인 운용지시 없이 투자대상자산에 운용하고, 그 결과를 투자자에게 배분·귀속시키는 구조입니다. 펀드는 대표적인 집합투자 상품입니다.'] },
    { title: '상장지수집합투자기구', alias: 'ETF · Exchange-Traded Fund', paragraphs: ['거래소에 상장되어 장중 매매가 가능한 집합투자기구입니다. 펀드의 법적 구조를 따르면서도 지수 추종, 상장, 설정·환매에 관한 별도 규율을 적용받습니다.'] },
    { title: '지정참가회사', alias: 'AP · Authorized Participant', paragraphs: ['ETF 운용사와 직접 ETF 지분을 설정·환매할 수 있는 금융회사입니다. 보통 ETF 시장가격과 순자산가치(NAV)의 차이가 커질 때 설정·환매와 차익거래를 통해 괴리 축소에 참여합니다.'] },
    { title: '설정·환매', alias: 'Creation / Redemption', paragraphs: ['ETF 지분을 새로 만들거나 없애는 과정입니다. 일반 투자자는 거래소에서 ETF를 사고팔고, 지정참가회사(AP)는 약관에 따라 주식 바스켓 또는 현금 등으로 ETF를 설정·환매할 수 있습니다.'] },
    { title: '집중투자 제한', alias: 'Concentration Limit · 10% Rule', paragraphs: ['일반 공모펀드가 같은 발행인의 증권에 과도하게 투자하지 않도록 두는 운용한도입니다. 지수 추종, 국채 등 법령상 예외와 상품별 특례가 있으므로 “모든 자산에 무조건 10%”라고 이해하면 정확하지 않습니다.'] },
    { title: 'BIS 비율', alias: 'Capital Adequacy Ratio · BIS', paragraphs: ['은행 등의 규제자본을 위험가중자산(RWA)으로 나눈 자본적정성 지표입니다. 넓은 뜻으로는 총자본비율을 가리키며, CET1·기본자본비율과 함께 손실흡수 여력을 봅니다.'] },
    { title: '보통주자본비율', alias: 'CET1 Ratio · Common Equity Tier 1', paragraphs: ['보통주와 이익잉여금처럼 손실흡수력이 높은 자본을 위험가중자산으로 나눈 비율입니다. BIS 체계에서 핵심적인 자본 건전성 지표이지만, 회사별 연결 범위와 규제 기준을 맞춰 비교해야 합니다.'] },
    { title: '위험가중자산', alias: 'RWA · Risk-Weighted Assets', paragraphs: ['대출·채권 등 자산의 금액에 신용·시장·운영 위험을 반영한 가중치를 적용해 계산한 값입니다. BIS 자본비율의 분모이며, 같은 자산 규모라도 위험 구성에 따라 달라질 수 있습니다.'] },
    { title: '듀레이션', alias: 'Duration · Dur.', paragraphs: ['채권 가격이 금리 변화에 얼마나 민감한지 가늠하는 지표입니다. 듀레이션이 클수록 같은 폭의 금리 변화에 가격 변동 폭도 커지는 경향이 있습니다.'] },
    { title: '컨벡시티', alias: 'Convexity', paragraphs: ['채권 가격과 수익률의 관계가 직선이 아니라 휘는 정도를 나타내는 지표입니다. 금리 변동이 작을 때는 듀레이션 근사가 유용하지만, 폭이 커질수록 컨벡시티가 가격 변화의 차이를 설명합니다.'] },
    { title: '베타', alias: 'β · Beta', paragraphs: ['종목·전략 수익률이 벤치마크 시장 움직임에 얼마나 민감한지 나타내는 값입니다. 추정 기간과 벤치마크에 따라 달라지는 과거 통계이므로 미래 민감도를 보장하지 않습니다.'] },
  ];
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
  addEntries(SYSTEM_ENTRIES);

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
