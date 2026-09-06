(() => {
  const clean = (value) => value.replace(/\s+/g, ' ').trim();
  const extractEntries = (root) => [...root.querySelectorAll('.glossary-item')].map((item) => {
    const term = item.querySelector('dt');
    const description = item.querySelector('dd');
    if (!term || !description) return null;
    const clone = term.cloneNode(true);
    clone.querySelector('small')?.remove();
    return {
      title: clean(clone.textContent),
      aliases: clean(term.querySelector('small')?.textContent || ''),
      detail: [...description.querySelectorAll(':scope > p')].map((paragraph) => clean(paragraph.textContent)).filter(Boolean).length
        ? [...description.querySelectorAll(':scope > p')].map((paragraph) => clean(paragraph.textContent)).filter(Boolean)
        : [clean(description.textContent)],
      infographic: description.querySelector('.glossary-infographic')?.cloneNode(true) || null,
      item,
      manualOnly: item.hasAttribute('data-glossary-manual-only'),
    };
  }).filter((entry) => entry && entry.title);
  // 용어모음에서도 공통으로 쓰는, 일차별 본문에 반복 등장하는 핵심 용어입니다.
  const COMMON_ENTRIES = [
    { title: '중앙은행', aliases: 'Central Bank', detail: ['한 국가 또는 통화권의 물가와 금융시스템 안정을 위해 통화정책을 수행하는 기관입니다. 일반 개인에게 예금·대출 상품을 직접 판매하기보다 정부·은행·금융시장과의 거래를 중심으로 역할을 합니다.'] },
    { title: '통화정책', aliases: 'Monetary Policy', detail: ['중앙은행이 기준금리, 유동성 공급 등의 수단을 활용해 물가와 금융 여건에 대응하는 정책입니다. 효과가 나타나는 시점과 정도는 경제 상황에 따라 달라집니다.'] },
    { title: '기준금리', aliases: 'Policy Rate · Base Rate', detail: ['중앙은행이 정하는 대표 정책금리입니다. 시중 예금·대출 금리에 영향을 주지만, 개별 금융상품의 금리와 같지는 않습니다.'] },
    { title: '법정화폐', aliases: 'Fiat Money', detail: ['국가가 법에 따라 통용을 인정한 화폐입니다. 금처럼 실물자산으로의 교환을 약속해서가 아니라 국가의 제도와 신용을 바탕으로 사용됩니다.'] },
    { title: '최후의 대출자', aliases: 'Lender of Last Resort', detail: ['금융위기 때 유동성이 부족한 금융기관에 중앙은행이 정해진 조건과 담보 아래 긴급 자금을 공급해 금융시스템 불안을 줄이는 역할입니다.'] },
    { title: '현금흐름', aliases: 'Cash Flow', detail: ['일정 기간에 기업이나 개인에게 현금이 들어오고 나가는 움직임입니다. 회계상 이익과 현금흐름은 발생 시점과 비현금 비용 때문에 다를 수 있습니다.'] },
    { title: '캐시 카우', aliases: 'Cash Cow', detail: ['큰 추가 투자 없이도 꾸준하고 안정적인 현금을 만들어 내는 상품·사업부·자산을 뜻합니다. 돈의 움직임 자체를 뜻하는 현금흐름과는 다릅니다.'] },
    { title: '펀드', aliases: 'Fund', detail: ['여러 투자자의 자금을 모아 주식·채권 등 자산에 투자하는 집합투자 상품입니다. 상품에 따라 원금과 수익률이 보장되지 않으며, 환매 방식과 비용이 다릅니다.'] },
    { title: '차익거래', aliases: 'Arbitrage', detail: ['경제적으로 비슷한 대상 사이의 가격 차이를 이용해 위험을 낮춘 수익 기회를 찾는 거래입니다. 세금·수수료·차입·체결 비용과 시장 제약 때문에 무위험 수익이 보장되지는 않습니다.'] },
    { title: '공매도', aliases: 'Short Selling', detail: ['보유하지 않은 증권을 빌려 먼저 매도한 뒤, 나중에 사서 갚는 거래입니다. 가격 하락 시 이익을 기대할 수 있지만 가격이 오르면 손실이 커질 수 있습니다.'] },
    { title: '만기', aliases: 'Maturity · Expiration', detail: ['계약이 끝나고 정산 또는 권리 행사가 이루어지는 마지막 날입니다. 선물·옵션에서는 상품마다 만기와 정산 방식이 미리 정해져 있습니다.'] },
    { title: '옵션', aliases: 'Option', detail: ['정해진 기간 또는 날짜에 기초자산을 약정 가격으로 사고팔 수 있는 권리를 거래하는 계약입니다. 매수자는 프리미엄을 내고 권리를 얻고, 매도자는 행사될 때 이행 의무를 집니다.'] },
    { title: '인버스', aliases: 'Inverse', detail: ['기초지수와 반대 방향의 일간 수익률을 목표로 설계한 상품 또는 전략입니다. 장기 누적 수익률은 기초지수 수익률의 단순한 반대가 아닐 수 있습니다.'] },
    { title: 'ETN', aliases: 'Exchange-Traded Note', detail: ['증권회사가 발행하고 거래소에 상장한 파생결합증권입니다. 지수 수익률을 추종하도록 설계될 수 있으나 발행사의 신용위험도 함께 고려해야 합니다.'] },
    { title: '비트코인', aliases: 'Bitcoin · BTC', detail: ['블록체인 네트워크에서 거래되는 대표적인 암호자산입니다. 가격 변동성이 크고, 보관 방식·거래소·규제 환경에 따른 위험을 함께 확인해야 합니다.'] },
    { title: '스테이블코인', aliases: 'Stablecoin', detail: ['법정화폐 등 특정 자산의 가치에 연동되도록 설계한 암호자산입니다. 준비자산의 구성·상환 구조·발행사의 신용에 따라 실제 안정성은 다를 수 있습니다.'] },
    { title: '자산배분', aliases: 'Asset Allocation', detail: ['주식·채권·현금·대체자산 등 자산군에 투자 비중을 나누는 전략입니다. 분산은 손실을 없애지는 않지만 특정 자산에 대한 의존을 줄이는 데 도움을 줄 수 있습니다.'] },
    { title: '퀀트', aliases: 'Quantitative Investing · Quant', detail: ['데이터와 통계·규칙 기반 모델을 사용해 투자 의사결정이나 위험관리를 하는 접근입니다. 과거 성과를 바탕으로 한 모델은 미래 수익을 보장하지 않습니다.'] },
    { title: '집합투자', aliases: 'Collective Investment · 集合投資', detail: ['여러 투자자의 자금을 모아 전문가가 운용하고, 그 결과를 투자자에게 나누는 구조입니다. 펀드는 대표적인 집합투자 상품입니다.'] },
    { title: '상장지수집합투자기구', aliases: 'ETF · Exchange-Traded Fund', detail: ['거래소에 상장되어 장중에 주식처럼 매매할 수 있는 펀드입니다. 특정 지수를 따라가도록 설계되는 경우가 많습니다.'] },
    { title: '지정참가회사', aliases: 'AP · Authorized Participant', detail: ['ETF 운용사와 직접 ETF 지분을 설정·환매할 수 있는 금융회사입니다. ETF 시장가격과 순자산가치(NAV)의 차이가 커질 때 괴리 축소에 참여합니다.'] },
    { title: '설정·환매', aliases: 'Creation / Redemption', detail: ['ETF 지분을 새로 만들거나 없애는 과정입니다. 일반 투자자는 거래소에서 ETF를 사고팔고, 지정참가회사(AP)는 정해진 절차에 따라 설정·환매합니다.'] },
    { title: '집중투자 제한', aliases: 'Concentration Limit · 10% Rule', detail: ['펀드가 한 발행인의 증권에 지나치게 투자하지 않도록 두는 운용 한도입니다. 상품과 법령의 예외가 있어 일률적으로 적용되지는 않습니다.'] },
    { title: 'BIS 비율', aliases: 'Capital Adequacy Ratio · BIS', detail: ['은행 등의 규제자본을 위험가중자산(RWA)으로 나눈 자본적정성 지표입니다. 손실을 감당할 여력을 평가할 때 활용합니다.'] },
    { title: '보통주자본비율', aliases: 'CET1 Ratio · Common Equity Tier 1', detail: ['보통주와 이익잉여금처럼 손실흡수력이 높은 자본을 위험가중자산으로 나눈 비율입니다. 은행 건전성을 보는 핵심 지표 중 하나입니다.'] },
    { title: '위험가중자산', aliases: 'RWA · Risk-Weighted Assets', detail: ['대출·채권 등 자산의 금액에 신용·시장·운영 위험을 반영한 가중치를 적용해 계산한 값입니다. BIS 자본비율의 분모가 됩니다.'] },
    { title: '듀레이션', aliases: 'Duration · Dur.', detail: ['채권 가격이 금리 변화에 얼마나 민감한지 가늠하는 지표입니다. 듀레이션이 클수록 같은 금리 변화에 가격 변동 폭도 커지는 경향이 있습니다.'] },
    { title: '컨벡시티', aliases: 'Convexity', detail: ['채권 가격과 수익률의 관계가 직선이 아니라 휘는 정도를 나타내는 지표입니다. 금리 변동 폭이 클수록 듀레이션만으로는 설명하기 어려운 차이를 보완합니다.'] },
    { title: '베타', aliases: 'β · Beta', detail: ['종목이나 전략의 수익률이 시장 움직임에 얼마나 민감한지를 나타내는 값입니다. 과거 통계이므로 미래 움직임을 보장하지는 않습니다.'] },
  ];
  const entries = extractEntries(document);
  COMMON_ENTRIES.forEach((entry) => {
    if (!entries.some((item) => item.title === entry.title)) entries.push({ ...entry, item: null, manualOnly: false });
  });

  if (!entries.length) return;

  document.body.insertAdjacentHTML('beforeend', `
    <div class="glossary-modal" id="glossaryModal" hidden>
      <div class="glossary-modal__backdrop" data-glossary-close></div>
      <section class="glossary-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="glossaryModalTitle">
        <button class="glossary-modal__close" type="button" aria-label="용어 설명 닫기" data-glossary-close>×</button>
        <p class="glossary-modal__label">용어 설명</p>
        <h2 id="glossaryModalTitle"></h2>
        <p class="glossary-modal__aliases" id="glossaryModalAliases"></p>
        <div class="glossary-modal__detail" id="glossaryModalDetail"></div>
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
    detail.replaceChildren(...entry.detail.map((paragraph) => {
      const element = document.createElement('p');
      element.textContent = paragraph;
      return element;
    }));
    if (entry.infographic) detail.append(entry.infographic.cloneNode(true));
    modal.hidden = false;
    closeButton.focus();
  };
  const close = () => {
    if (modal.hidden) return;
    modal.hidden = true;
    trigger?.focus({ preventScroll: true });
  };
  const setMatchTerms = (entry) => {
    entry.matchTerms = (entry.manualOnly ? [] : [entry.title, ...entry.aliases.split(/\s*[·/]\s*/)])
      .map(clean)
      .filter((term, termIndex, terms) => term && (term === entry.title || /[가-힣]/.test(term) || term.length >= 3) && terms.indexOf(term) === termIndex);
  };

  entries.forEach((entry, index) => {
    if (entry.item) {
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
    }
    entry.index = index;
    setMatchTerms(entry);
  });

  document.querySelectorAll('[data-glossary-close]').forEach((element) => element.addEventListener('click', close));
  document.querySelectorAll('[data-glossary-term]').forEach((element) => {
    const entry = entries.find((item) => item.title === element.dataset.glossaryTerm);
    if (!entry) return;
    element.setAttribute('aria-label', `${entry.title} 용어 설명 보기`);
    element.addEventListener('click', () => open(entry, element));
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });

  const linkTerms = () => {
    const byTerm = entries.flatMap((entry) => entry.matchTerms.map((text) => ({ entry, text })))
      .sort((a, b) => b.text.length - a.text.length);
    const walker = document.createTreeWalker(document.querySelector('#app'), NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.parentElement?.closest('.lesson-body, .goal, .check')) return NodeFilter.FILTER_REJECT;
        if (node.parentElement.closest('a, button, script, style')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    textNodes.forEach((node) => {
      const text = node.nodeValue;
      const matches = [];
      byTerm.forEach((term) => {
        let start = 0;
        while (true) {
          const index = text.indexOf(term.text, start);
          if (index < 0) break;
          matches.push({ index, end: index + term.text.length, entry: term.entry, text: term.text });
          start = index + term.text.length;
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
        button.textContent = match.text;
        button.setAttribute('aria-label', `${match.entry.title} 용어 설명 보기`);
        button.addEventListener('click', () => open(match.entry, button));
        fragment.append(button);
        cursor = match.end;
      });
      fragment.append(text.slice(cursor));
      node.replaceWith(fragment);
    });
  };
  linkTerms();

  Promise.all([1, 2, 3, 4].map((day) => fetch(`${String(day).padStart(2, '0')}.html`).then((response) => response.ok ? response.text() : '').catch(() => '')))
    .then((pages) => {
      pages.filter(Boolean).forEach((page) => extractEntries(new DOMParser().parseFromString(page, 'text/html')).forEach((entry) => {
        if (entries.some((item) => item.title === entry.title)) return;
        setMatchTerms(entry);
        entries.push(entry);
      }));
      linkTerms();
    });
})();
