(() => {
  const clean = (value) => value.replace(/\s+/g, ' ').trim();
  const extractEntries = (root) => [...root.querySelectorAll('.glossary-item')].map((item) => {
    const term = item.querySelector('dt');
    const description = item.querySelector('dd');
    if (!term || !description) return null;
    const richDetailTemplate = description.querySelector(':scope > template.glossary-rich-detail');
    const clone = term.cloneNode(true);
    clone.querySelector('small')?.remove();
    return {
      title: clean(clone.textContent),
      aliases: clean(term.querySelector('small')?.textContent || ''),
      detail: [...description.querySelectorAll(':scope > p')].map((paragraph) => clean(paragraph.textContent)).filter(Boolean).length
        ? [...description.querySelectorAll(':scope > p')].map((paragraph) => clean(paragraph.textContent)).filter(Boolean)
        : [clean(description.textContent)],
      richDetail: richDetailTemplate
        ? [...richDetailTemplate.content.childNodes].map((node) => node.cloneNode(true))
        : null,
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
    { title: '차익거래', aliases: 'Arbitrage(아비트라지)', detail: ['경제적으로 비슷한 대상 사이의 가격 차이를 이용해 위험을 낮춘 수익 기회를 찾는 거래입니다. 세금·수수료·차입·체결 비용과 시장 제약 때문에 무위험 수익이 보장되지는 않습니다.'] },
    { title: '공매도', aliases: 'Short Selling', detail: ['보유하지 않은 증권을 빌려 먼저 매도한 뒤, 나중에 사서 갚는 거래입니다. 가격 하락 시 이익을 기대할 수 있지만 가격이 오르면 손실이 커질 수 있습니다.'] },
    { title: '만기', aliases: 'Maturity · Expiration', detail: ['금융상품이나 계약에서 약정한 기간이 끝나 원금·이자 지급, 상환, 정산 또는 권리 행사가 이루어지는 시점입니다. 상품마다 만기일과 만기 때 처리 방식이 미리 정해져 있습니다.', '채권은 보통 만기에 발행자가 원금을 상환하고, 예금·적금은 약정 기간이 끝나 만기 이율을 적용해 원리금을 지급합니다. 약속어음·환어음에서는 만기가 지급을 청구할 수 있는 기한 또는 지급일을 뜻합니다. 반면 만기 전 해지·매도·할인은 약정한 만기 조건과 다른 금리·가격 또는 비용이 적용될 수 있습니다.', '선물·옵션에서는 계약이 끝나 현금결제 또는 실물인도가 이루어지거나, 옵션의 권리 행사가 가능한 마지막 시점을 뜻합니다. 같은 ‘만기’라도 상품에 따라 자동 연장 여부, 휴일 처리, 중도상환·중도해지 조건, 결제일이 다를 수 있으므로 약관과 상품설명서를 확인해야 합니다.'] },
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
    { title: '근사', aliases: 'Approximation · ≈', detail: ['복잡한 실제 값을 계산하기 전에, 핵심 관계를 살려 가까운 값으로 간단히 추정하는 방법입니다. 정확한 값과 같다는 뜻은 아니므로, 변화 폭이 커지거나 조건이 달라지면 오차도 커질 수 있습니다.', '기호 “≈”는 “대략 같다”, “약”이라고 읽습니다. 예를 들어 100 ÷ 3 ≈ 33.3은 정확한 값이 끝없이 이어지는 33.333…이지만, 계산에 편한 가까운 값 33.3으로 쓴다는 뜻입니다.', '채권에서는 듀레이션을 이용해 가격 변화율 ≈ −수정듀레이션 × 금리 변화(%p)로 빠르게 가늠합니다. 예: 수정듀레이션 5, 금리 변화 +0.2%p라면 가격 변화율 ≈ −5 × 0.2% = −1.0%입니다. 가격이 10만 원이었다면 약 1,000원 하락해 약 9만 9,000원으로 볼 수 있습니다. 여기서 %p는 금리의 차이(예: 3.0%→3.2%), %는 채권 가격의 변화율입니다. 컨벡시티는 실제 가격 곡선의 휘어짐을 반영해 이 듀레이션 근사의 오차를 보완합니다.'] },
    { title: '컨벡시티', aliases: '볼록성 · Convexity', detail: ['쉽게 말해 직선으로 예상한 값과 실제로 휘어진 곡선 사이의 차이를 설명하는 개념입니다. 수학에서는 집합·함수의 모양, 경제학에서는 여러 재화의 조합을 선호하는 볼록선호를 설명할 때 사용합니다.', '채권에서는 금리와 가격의 곡선 관계를 나타냅니다. 듀레이션이 가격 변화를 직선으로 어림잡는 1차 민감도라면, 컨벡시티는 그 직선 근사의 오차를 보완하는 2차 효과입니다. 일반적인 양(+)의 컨벡시티에서는 금리 하락 때 가격 상승 폭이 더 커지고, 금리 상승 때 가격 하락 폭은 더 작아지는 경향이 있습니다.'] },
    { title: '베타', aliases: 'β · Beta', detail: ['베타는 종목이나 투자 전략이 시장과 비교해 얼마나 크게 함께 움직이는지를 보여 주는 값입니다. 쉽게 말해 시장이 오르거나 내릴 때 이 종목이 얼마나 민감하게 반응하는지 가늠하는 지표입니다.', '베타가 1이면 시장과 비슷한 폭으로 움직이는 경향이 있습니다. 예를 들어 시장이 10% 오를 때 베타가 1인 종목도 약 10% 오르는 식입니다. 베타가 1.5이면 시장이 10% 움직일 때 약 15% 움직일 수 있어, 오를 때와 내릴 때 모두 더 큰 폭으로 흔들릴 수 있습니다. 베타가 0.5이면 시장 움직임의 약 절반 수준으로 반응하는 경향을 뜻합니다.', '베타는 과거 가격을 바탕으로 계산한 값이라 앞으로도 똑같이 움직인다고 보장하지 않습니다. 또 어떤 시장지수와 비교했는지, 어느 기간의 자료를 썼는지에 따라서도 값이 달라질 수 있습니다.'] },
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
    detail.replaceChildren(...(entry.richDetail
      ? entry.richDetail.map((node) => node.cloneNode(true))
      : entry.detail.map((paragraph) => {
        const element = document.createElement('p');
        element.textContent = paragraph;
        return element;
      })));
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
