(function () {
  'use strict';

  const state = {
    domain: 'finance',
    sessionId: crypto.randomUUID(),
    topK: 4,
    loading: false,
    chatHistory: [],
    activeView: 'home',
    activeScenario: 'equity',
    savedSimulation: null,
    currentSimulation: null,
    calendarCursor: null,
  };

  const PRODUCT_EXPLAINERS = [
    {
      icon: 'fa-piggy-bank', title: '예금·적금',
      oneLine: '은행에 돈을 맡기고 약속한 이자를 받는 가장 기본적인 금융상품입니다.',
      analogy: '안전한 저금통에 돈을 넣고, 기다린 시간에 따라 작은 보상을 받는 방식이에요.',
      check: '이자율, 만기, 중도해지 시 받는 이자, 예금자보호 여부를 확인하세요.',
    },
    {
      icon: 'fa-building-columns', title: '채권',
      oneLine: '정부나 기업에 돈을 빌려주고 이자와 원금을 받기로 한 ‘차용증’입니다.',
      analogy: '친구에게 돈을 빌려주고 “언제, 얼마를 돌려줄지” 적은 약속장과 비슷해요.',
      check: '금리가 오르면 채권 가격은 내려갈 수 있고, 기업 채권은 돈을 못 돌려받을 위험도 있습니다.',
    },
    {
      icon: 'fa-chart-line', title: '주식',
      oneLine: '기업의 아주 작은 주인이 되는 증서로, 기업 성과에 따라 가격과 배당이 달라집니다.',
      analogy: '좋아하는 가게의 지분을 조금 갖고 가게가 잘되면 함께 성장하는 것과 같아요.',
      check: '가격이 크게 오르내릴 수 있으며, 한 기업에만 투자하면 위험이 커집니다.',
    },
    {
      icon: 'fa-boxes-stacked', title: 'ETF',
      oneLine: '여러 주식이나 채권을 한 바구니에 담아 거래소에서 사고파는 상품입니다.',
      analogy: '과일을 하나씩 고르기보다 여러 과일이 담긴 선물 세트를 사는 것과 비슷해요.',
      check: '무엇을 담는 ETF인지, 총보수·거래량·추적오차·괴리율을 함께 살펴보세요.',
    },
    {
      icon: 'fa-folder-tree', title: '펀드',
      oneLine: '투자자들의 돈을 모아 전문 운용사가 정한 기준에 따라 투자하는 상품입니다.',
      analogy: '반 친구들이 회비를 모아 대표가 정한 여행 계획을 함께 실행하는 모습과 같아요.',
      check: '운용 전략, 비용, 환매 가능 시점, 과거 성과가 미래를 보장하지 않는다는 점을 확인하세요.',
    },
    {
      icon: 'fa-shield-halved', title: '파생상품',
      oneLine: '주식·금리·환율 등의 가격 변화를 바탕으로 약속을 사고파는 고난도 상품입니다.',
      analogy: '비가 올 때를 대비해 우산을 미리 준비하는 ‘보험’처럼 위험을 줄이는 데 쓸 수 있어요.',
      check: '손실이 빠르게 커질 수 있어 구조와 최대 손실을 충분히 이해하기 전에는 접근하지 마세요.',
    },
    {
      icon: 'fa-coins', title: '금·귀금속',
      oneLine: '실물의 희소성과 국제 가격, 환율에 영향을 받는 대표적 실물자산입니다.',
      analogy: '같은 금이라도 순도와 무게, 매입·매도 가격 차이, 보관 방법에 따라 실제 거래 결과가 달라집니다.',
      check: '순도·중량·시세 기준·매매 스프레드·보관·진위 확인을 함께 살피세요.',
    },
    {
      icon: 'fa-house', title: '부동산',
      oneLine: '주거·임대·사업 공간을 거래하거나 이용할 권리와 관련된 실물자산입니다.',
      analogy: '가격만이 아니라 위치, 권리관계, 관리비, 공실 가능성, 계약 기간을 함께 읽어야 하는 거래예요.',
      check: '등기·권리관계·계약 조건·유지비·세금·유동성을 전문가와 함께 확인하세요.',
    },
    {
      icon: 'fa-stamp', title: '우표·수석 등 수집품',
      oneLine: '희소성·상태·진위·출처가 가치에 큰 영향을 주는 취미·수집 거래 대상입니다.',
      analogy: '같은 종류여도 보존 상태와 감정서, 거래 이력이 다르면 전혀 다른 물건이 될 수 있습니다.',
      check: '진품 여부·상태 등급·출처·감정 비용·보관·재판매 수요를 확인하세요.',
    },
    {
      icon: 'fa-recycle', title: '중고거래',
      oneLine: '사용하던 물건의 상태와 거래 조건을 확인해 가치를 교환하는 생활 거래입니다.',
      analogy: '새 제품 가격이 기준점일 뿐, 실제 가격은 사용감·구성품·수리 이력·인도 방식에서 정해집니다.',
      check: '실물 상태·작동 여부·시리얼·안전결제·직거래 장소·환불 조건을 기록하세요.',
    },
  ];

  const GLOSSARY = [
    { terms: ['분산투자'], korean: '분산투자', hanja: '分散投資', abbr: '—', english: 'Diversification', summary: '서로 다른 자산에 나누어 투자해 한 곳의 손실이 전체에 미치는 영향을 줄이려는 방법입니다.', detail: '종목 수를 많이 늘리는 것만으로 충분하지는 않습니다. 산업·국가·자산 종류가 서로 비슷하면 함께 움직일 수 있으므로, 자산 간 움직임도 함께 살펴야 합니다.' },
    { terms: ['상관관계'], korean: '상관관계', hanja: '相關關係', abbr: 'ρ (rho)', english: 'Correlation', summary: '두 자산이 같은 방향으로 움직이는 정도를 나타내는 수치입니다.', detail: '1에 가까우면 함께 움직이는 경향이 크고, -1에 가까우면 반대 방향으로 움직이는 경향이 있습니다. 낮은 상관관계는 분산투자 효과를 기대하게 하지만, 미래에도 항상 같지는 않습니다.' },
    { terms: ['변동성'], korean: '변동성', hanja: '變動性', abbr: 'σ (sigma)', english: 'Volatility', summary: '가격이나 수익률이 평균 주변에서 얼마나 크게 오르내렸는지 보여 주는 지표입니다.', detail: '변동성이 크면 단기간의 오르내림 폭도 클 수 있습니다. 변동성이 낮다고 손실 가능성이 없는 것은 아니며, 투자 기간과 감당 가능한 손실을 함께 고려해야 합니다.' },
    { terms: ['블랙 스완', 'Black Swan'], korean: '블랙 스완', hanja: '黑天鵝', abbr: '—', english: 'Black Swan', summary: '통상적인 예측 모형 밖에서 발생해 큰 충격을 주는 예외적 사건을 비유하는 말입니다.', detail: '나심 니콜라스 탈레브가 널리 알린 개념입니다. 핵심은 사건을 맞히는 것보다 분산·유동성·손실 한도·레버리지 관리로 극단적 상황에도 버틸 여력을 만드는 데 있습니다.' },
    { terms: ['회색 코뿔소', 'Gray Rhino'], korean: '회색 코뿔소', hanja: '灰色犀牛', abbr: '—', english: 'Gray Rhino', summary: '위험이 눈앞에 보이는데도 무시하다 큰 피해로 이어지는 상황을 비유하는 말입니다.', detail: '블랙 스완과 달리 이미 알려진 위험이라는 점이 강조됩니다. 예를 들어 부채 급증, 취약한 유동성처럼 관찰 가능한 위험 신호를 점검하고 대응 계획을 세우는 데 쓰입니다.' },
    { terms: ['최대낙폭', 'MDD'], korean: '최대낙폭', hanja: '最大落幅', abbr: 'MDD', english: 'Maximum Drawdown', summary: '특정 기간의 최고점에서 가장 크게 하락한 폭입니다.', detail: '예를 들어 100에서 70까지 내려갔다면 최대낙폭은 -30%입니다. 평균 수익률만으로 보이지 않는 실제 손실 구간을 보여 주므로, 투자자가 버틸 수 있는 위험을 판단할 때 유용합니다.' },
    { terms: ['샤프 비율', '샤프비율'], korean: '샤프 비율', hanja: '危險調整收益率', abbr: 'SR', english: 'Sharpe Ratio', summary: '감수한 변동성 대비 초과수익을 비교하는 위험조정 성과 지표입니다.', detail: '일반적으로 값이 높을수록 같은 변동성에서 더 나은 성과로 해석할 수 있습니다. 다만 과거 자료와 계산 기간에 따라 달라지며, 손실의 모양이나 미래 성과를 모두 설명하지는 못합니다.' },
    { terms: ['알파', 'alpha', '알파 팩터'], korean: '알파', hanja: '超過收益', abbr: 'α', english: 'Alpha', summary: '정한 벤치마크와 시장 노출(베타)으로 설명하고도 남는 초과성과 또는 이를 기대하게 하는 신호입니다.', detail: '“새 알고리즘”의 동의어는 아닙니다. 기간·비용·세금·벤치마크를 맞춘 뒤 해석해야 하며, 과거의 양(+) 알파는 우연·데이터 선택·측정 오류의 결과일 수 있습니다. 널리 공개되어 복제 가능한 신호는 시간이 지나 팩터 베타로 재분류될 수도 있습니다.' },
    { terms: ['베타', 'beta', '베타 팩터'], korean: '베타', hanja: '市場敏感度', abbr: 'β', english: 'Beta', summary: '벤치마크 시장 또는 널리 알려진 공통 팩터의 움직임에 대한 수익률의 민감도, 즉 노출도입니다.', detail: '“이미 알려진 알고리즘”의 동의어도 아닙니다. 베타가 1이면 시장과 비슷한 폭으로 움직이는 경향을 뜻합니다. 멀티팩터 모형에서는 시장·가치·규모·모멘텀 같은 공통 수익 원천에 대한 노출도 베타로 분석하며, 추정 기간과 모형에 따라 값이 달라집니다.' },
    { terms: ['자산배분'], korean: '자산배분', hanja: '資産配分', abbr: 'AA', english: 'Asset Allocation', summary: '주식·채권·현금성 자산 등에 얼마씩 나눌지 정하는 과정입니다.', detail: '목표, 투자 기간, 손실 허용 범위에 따라 비중이 달라집니다. 특정 자산의 미래를 맞히기보다 전체 위험을 관리하는 관점에서 사용합니다.' },
    { terms: ['올웨더 포트폴리오', '올 웨더 포트폴리오', 'All Weather Portfolio'], korean: '올웨더 포트폴리오', hanja: '—', abbr: 'AWP', english: 'All Weather Portfolio', summary: '서로 다른 성장·물가 환경에 대비하도록 여러 자산의 위험을 나누어 보려는 자산배분 접근입니다.', detail: '레이 달리오·브리지워터의 리스크 패리티 사고방식에서 널리 알려졌습니다. 정형 비중은 예시일 뿐이고 금리·환율·비용·투자기간에 따라 결과와 손실이 달라집니다.' },
    { terms: ['리밸런싱'], korean: '리밸런싱', hanja: '資産再配分', abbr: 'RB', english: 'Rebalancing', summary: '변한 자산 비중을 처음 정한 목표 비중에 맞추어 조정하는 일입니다.', detail: '많이 오른 자산의 비중이 커지면 포트폴리오 위험도 달라질 수 있습니다. 일정 주기 또는 허용 범위를 정해 점검하되 거래비용과 세금도 고려해야 합니다.' },
    { terms: ['수익률'], korean: '수익률', hanja: '收益率', abbr: 'R', english: 'Rate of Return', summary: '투자한 금액 대비 얼마가 늘거나 줄었는지를 비율로 나타낸 값입니다.', detail: '높은 과거 수익률이 미래 수익을 보장하지는 않습니다. 수익률은 변동성, 최대낙폭, 비용과 함께 해석하는 것이 좋습니다.' },
    { terms: ['위험'], korean: '위험', hanja: '危險', abbr: 'Risk', english: 'Investment Risk', summary: '예상과 다른 결과가 나와 손실을 볼 수 있는 가능성과 그 크기입니다.', detail: '투자에서 위험은 단순히 나쁜 일이 아니라 결과가 흔들릴 수 있다는 뜻입니다. 가격 변동, 신용, 유동성 등 여러 종류의 위험을 나누어 살펴야 합니다.' },
    { terms: ['유동성'], korean: '유동성', hanja: '流動性', abbr: '—', english: 'Liquidity', summary: '필요한 때 큰 가격 손해 없이 현금으로 바꾸기 쉬운 정도입니다.', detail: '거래량이 적거나 매수·매도 호가 차이가 큰 상품은 원하는 가격에 거래하기 어려울 수 있습니다. 가까운 시일에 쓸 돈일수록 유동성이 중요합니다.' },
    { terms: ['포트폴리오'], korean: '포트폴리오', hanja: '資産構成', abbr: 'PF', english: 'Portfolio', summary: '한 사람이 보유한 여러 투자자산의 전체 구성입니다.', detail: '한 종목의 성과보다 자산 전체가 어떻게 함께 움직이는지가 중요합니다. 목표와 위험 허용 범위에 맞춰 주식·채권·현금성 자산 등을 조합합니다.' },
    { terms: ['채권'], korean: '채권', hanja: '債券', abbr: 'Bond', english: 'Bond', summary: '정부나 기업에 돈을 빌려주고 이자와 원금을 받기로 한 증서입니다.', detail: '금리 변화, 발행자의 상환 능력, 만기에 따라 가격과 위험이 달라집니다. 중간에 팔면 손익이 생길 수 있으므로 원금이 항상 보장되는 것은 아닙니다.' },
    { terms: ['금리'], korean: '금리', hanja: '金利', abbr: 'IR', english: 'Interest Rate', summary: '돈을 빌리거나 맡길 때 붙는 이자의 비율입니다.', detail: '시장금리가 오르면 기존 채권의 가격은 내려갈 수 있고, 반대로 금리가 내려가면 기존 채권 가격이 오를 수 있습니다. 다만 만기와 신용위험에 따라 영향은 다릅니다.' },
    { terms: ['듀레이션'], korean: '듀레이션', hanja: '—', abbr: 'Dur.', english: 'Duration', summary: '채권 가격이 금리 변화에 얼마나 민감한지 가늠하는 지표입니다.', detail: '일반적으로 듀레이션이 길수록 금리 변화에 따른 가격 움직임이 커지는 경향이 있습니다. 실제 가격 변화는 금리 수준과 채권의 구조에도 영향을 받습니다.' },
    { terms: ['신용위험'], korean: '신용위험', hanja: '信用危險', abbr: 'CR', english: 'Credit Risk', summary: '돈을 빌린 주체가 이자나 원금을 약속대로 갚지 못할 위험입니다.', detail: '국채와 회사채, 기업별 채권은 상환 능력에 차이가 있을 수 있습니다. 높은 이자는 더 큰 신용위험에 대한 보상일 수 있으므로 발행자와 신용등급을 확인해야 합니다.' },
    { terms: ['파생상품'], korean: '파생상품', hanja: '派生商品', abbr: '—', english: 'Derivatives', summary: '주가·금리·환율 등 기초자산의 가격에서 가치가 파생되는 계약입니다.', detail: '선물과 옵션 등이 대표적입니다. 가격 위험을 줄이는 헤지에 쓸 수 있지만 구조가 복잡하고 손실이 커질 수 있어 계약 조건과 최대 손실을 먼저 이해해야 합니다.' },
    { terms: ['헤지'], korean: '헤지', hanja: '危險回避', abbr: 'Hedge', english: 'Hedging', summary: '예상하지 못한 가격 변동으로 생길 손실을 줄이려는 위험관리 방법입니다.', detail: '보험료를 내고 위험을 줄이는 것처럼, 헤지는 수익 가능성 일부를 포기하는 대가로 손실을 완화할 수 있습니다. 완전한 손실 방지를 뜻하지는 않습니다.' },
    { terms: ['평균분산'], korean: '평균분산', hanja: '平均分散', abbr: 'MVO', english: 'Mean-Variance Optimization', summary: '기대수익률과 변동성을 함께 고려해 자산 비중을 찾는 자산배분 방법입니다.', detail: '입력한 기대수익률과 상관관계가 조금만 달라져도 결과 비중이 크게 바뀔 수 있습니다. 따라서 하나의 정답으로 보기보다 가정을 점검하는 도구로 활용합니다.' },
    { terms: ['블랙-리터만', '블랙 리터만'], korean: '블랙-리터만 모형', hanja: '—', abbr: 'BL', english: 'Black-Litterman Model', summary: '시장 균형수익률과 투자자의 전망을 결합해 자산배분 입력값을 만드는 모형입니다.', detail: '평균분산 최적화에서 기대수익률 추정에 지나치게 민감한 문제를 완화하려는 목적이 있습니다. 전망의 신뢰도를 어떻게 설정하는지가 결과에 영향을 줍니다.' },
    { terms: ['Risk Parity', '리스크 패리티'], korean: '리스크 패리티', hanja: '危險均衡', abbr: 'RP', english: 'Risk Parity', summary: '투입 금액보다 각 자산이 전체 위험에 기여하는 정도를 균형 있게 보려는 자산배분 방식입니다.', detail: '변동성이 큰 자산은 같은 금액을 담아도 위험 기여도가 커질 수 있습니다. 레버리지와 금리 환경 등 실제 운용 조건에 따라 결과가 달라질 수 있습니다.' },
    { terms: ['ETF'], korean: '상장지수펀드', hanja: '上場指數펀드', abbr: 'ETF', english: 'Exchange-Traded Fund', summary: '여러 자산을 담은 펀드를 거래소에서 주식처럼 사고팔 수 있게 만든 상품입니다.', detail: '무엇을 추종하는지, 총보수, 거래량, 호가 차이, 시장가격과 순자산가치의 차이(괴리율)를 함께 확인해야 합니다.' },
    { terms: ['주식'], korean: '주식', hanja: '株式', abbr: 'Stock', english: 'Stock / Equity', summary: '기업의 지분 일부를 나타내는 증서로, 보유자는 기업 성과에 따른 가격 변동과 배당에 참여할 수 있습니다.', detail: '기업이 잘될 가능성뿐 아니라 산업 변화, 경쟁, 가격 수준에 따라 손실도 생길 수 있습니다. 한 기업에 집중하면 개별 기업 위험이 커집니다.' },
    { terms: ['펀드'], korean: '투자신탁', hanja: '投資信託', abbr: 'Fund', english: 'Investment Fund', summary: '여러 투자자의 돈을 모아 정한 운용 전략에 따라 자산에 투자하는 상품입니다.', detail: '운용 방식, 비용, 환매 시점, 편입 자산이 상품마다 다릅니다. 과거 수익률만 보지 말고 설명서와 위험등급도 확인해야 합니다.' },
    { terms: ['괴리율'], korean: '괴리율', hanja: '乖離率', abbr: 'Premium / Discount', english: 'Premium/Discount to NAV', summary: 'ETF의 시장 거래가격과 순자산가치(NAV)가 얼마나 차이 나는지 보여 주는 비율입니다.', detail: '괴리율이 크면 실제 담긴 자산 가치와 다른 가격에 사고팔 수 있습니다. 거래량과 호가 차이도 함께 확인하는 것이 좋습니다.' },
    { terms: ['추적오차'], korean: '추적오차', hanja: '追跡誤差', abbr: 'TE', english: 'Tracking Error', summary: 'ETF나 인덱스 펀드의 수익률이 목표 지수의 수익률과 얼마나 다르게 움직였는지 나타냅니다.', detail: '보수, 거래비용, 편입 방식, 현금 보유 등으로 차이가 생길 수 있습니다. 작다고 항상 좋은 것은 아니며 상품의 목표와 비교해야 합니다.' },
    { terms: ['배당'], korean: '배당', hanja: '配當', abbr: 'Div.', english: 'Dividend', summary: '기업이 이익 일부를 주주에게 나누어 주는 금액입니다.', detail: '배당 지급 여부와 규모는 기업이 결정하며 보장되지 않습니다. 배당만 보지 말고 기업의 이익, 재무상태, 배당정책을 함께 살펴야 합니다.' },
    { terms: ['기대수익률'], korean: '기대수익률', hanja: '期待收益率', abbr: 'E[R]', english: 'Expected Return', summary: '앞으로 기대하는 평균적인 수익 수준을 가정한 값입니다.', detail: '미래를 확정하는 숫자가 아니라 분석을 위한 가정입니다. 자산배분 모형은 기대수익률 가정에 민감할 수 있으므로 여러 시나리오를 비교하는 것이 좋습니다.' },
    { terms: ['CAGR'], korean: '연평균성장률', hanja: '年平均成長率', abbr: 'CAGR', english: 'Compound Annual Growth Rate', summary: '여러 해 동안의 누적 성과를 매년 같은 비율로 성장한 것처럼 환산한 수익률입니다.', detail: '중간의 큰 하락과 회복 과정은 가려질 수 있습니다. 따라서 CAGR은 변동성, 최대낙폭과 함께 보는 것이 좋습니다.' },
    { terms: ['옵션'], korean: '선택권', hanja: '選擇權', abbr: 'Option', english: 'Option', summary: '정해진 조건으로 자산을 사고팔 수 있는 권리를 거래하는 파생상품입니다.', detail: '매수자와 매도자의 손익 구조가 다르고, 만기와 행사가격에 따라 가치가 변합니다. 복잡한 구조와 손실 가능성을 충분히 이해해야 합니다.' },
    { terms: ['선물'], korean: '선물', hanja: '先物', abbr: 'Futures', english: 'Futures Contract', summary: '미래의 특정 시점에 정한 가격으로 자산을 사고팔기로 하는 계약입니다.', detail: '가격 변동 위험을 관리하는 데 쓸 수 있지만 증거금과 일일 정산 때문에 손익이 빠르게 변할 수 있습니다.' },
    { terms: ['ETN'], korean: '상장지수증권', hanja: '上場指數證券', abbr: 'ETN', english: 'Exchange-Traded Note', summary: '증권사가 특정 지수의 수익률을 따르도록 만든, 거래소에서 사고파는 증권입니다.', detail: 'ETF처럼 보이지만 펀드가 아니라 증권사의 약속에 기반합니다. 따라서 지수 움직임뿐 아니라 발행 증권사가 약속을 지킬 수 있는지도 살펴야 합니다.' },
    { terms: ['리츠'], korean: '부동산투자회사', hanja: '不動産投資會社', abbr: 'REITs', english: 'Real Estate Investment Trusts', summary: '여러 사람이 돈을 모아 건물·물류센터 같은 부동산에 투자하고 임대수익 등을 나누는 상품입니다.', detail: '직접 건물을 사지 않아도 부동산 투자에 참여하는 방식입니다. 임대료, 공실, 빚의 규모와 금리 변화가 수익에 영향을 줍니다.' },
    { terms: ['기준가격', '기준가'], korean: '기준가격', hanja: '基準價格', abbr: 'NAV', english: 'Net Asset Value', summary: '펀드가 가진 자산의 가치를 계산해 정한 1좌당 가격입니다.', detail: '일반 펀드는 보통 이 가격을 기준으로 가입하거나 환매합니다. 거래소에서 실시간으로 사고파는 ETF의 시장가격과는 다를 수 있습니다.' },
    { terms: ['NAV', '순자산가치'], korean: '순자산가치', hanja: '純資産價値', abbr: 'NAV', english: 'Net Asset Value', summary: '펀드가 보유한 자산에서 빚을 뺀 실제 가치입니다.', detail: 'ETF 1주에 담긴 자산의 값이라고 생각할 수 있습니다. 시장에서 거래되는 ETF 가격이 NAV와 다르면 괴리율이 생깁니다.' },
    { terms: ['환매'], korean: '환매', hanja: '還買', abbr: '—', english: 'Redemption', summary: '펀드에 넣은 돈을 되돌려 받기 위해 보유분을 팔아 현금화하는 일입니다.', detail: '주식처럼 즉시 팔리는 방식이 아니라 정해진 기준가격과 처리 시간이 적용될 수 있습니다. 상품에 따라 수수료나 환매 제한도 확인해야 합니다.' },
    { terms: ['증거금'], korean: '증거금', hanja: '證據金', abbr: 'Margin', english: 'Margin', summary: '선물·옵션 거래를 시작할 때 계약 이행을 보장하려고 맡기는 돈입니다.', detail: '계약 금액 전부가 아니라 일부만 내므로 적은 돈으로 큰 계약을 움직일 수 있습니다. 그만큼 가격이 조금만 움직여도 손익이 크게 달라질 수 있습니다.' },
    { terms: ['유지증거금'], korean: '유지증거금', hanja: '維持證據金', abbr: 'Maintenance Margin', english: 'Maintenance Margin', summary: '선물·옵션 포지션을 계속 보유하려면 계좌에 유지해야 하는 최소 금액입니다.', detail: '손실 때문에 이 금액 아래로 내려가면 추가 돈을 넣으라는 요구를 받을 수 있습니다. 제때 채우지 못하면 포지션이 정리될 수 있습니다.' },
    { terms: ['레버리지'], korean: '레버리지', hanja: '槓桿', abbr: '—', english: 'Leverage', summary: '적은 돈으로 더 큰 금액의 자산이나 계약을 움직이는 구조입니다.', detail: '지렛대처럼 수익을 키울 수도 있지만 손실도 같은 방식으로 커집니다. 투자금보다 큰 손실이 날 수 있는지 먼저 확인해야 합니다.' },
    { terms: ['강제청산', '반대매매'], korean: '강제청산', hanja: '強制淸算', abbr: '—', english: 'Forced Liquidation', summary: '증거금이 부족할 때 증권사가 포지션을 강제로 정리하는 일입니다.', detail: '추가 증거금을 정해진 기한 안에 넣지 못하면 발생할 수 있습니다. 원하지 않는 시점과 가격에 거래가 끝나 손실이 확정될 수 있습니다.' },
    { terms: ['롤오버'], korean: '롤오버', hanja: '—', abbr: '—', english: 'Rollover', summary: '만기가 가까운 선물·옵션 계약을 정리하고 다음 만기의 계약으로 옮기는 일입니다.', detail: '계약을 계속 보유하고 싶은 경우에 사용합니다. 다음 만기 가격 차이와 거래비용이 생길 수 있으므로 단순히 “연장”이라고만 보기는 어렵습니다.' },
    { terms: ['기초자산'], korean: '기초자산', hanja: '基礎資産', abbr: 'Underlying', english: 'Underlying Asset', summary: '파생상품의 가격과 손익을 결정하는 기준이 되는 주식·지수·금리·원자재 같은 대상입니다.', detail: '선물과 옵션은 기초자산 자체가 아니라, 그 가격 변화에 연결된 계약입니다. 무엇이 기초자산인지 알아야 계약의 위험도 이해할 수 있습니다.' },
    { terms: ['기초지수'], korean: '기초지수', hanja: '基礎指數', abbr: 'Benchmark', english: 'Underlying Index', summary: 'ETF나 ETN이 따라가도록 만든 기준 지수입니다.', detail: '상품 이름이 비슷해도 어떤 종목을 어떤 비중으로 담는지에 따라 기초지수가 다를 수 있습니다. 설명서에서 추종 대상과 지수 규칙을 확인하세요.' },
    { terms: ['거래승수'], korean: '거래승수', hanja: '去來乘數', abbr: 'Multiplier', english: 'Contract Multiplier', summary: '선물 1계약이 실제로 얼마의 금액을 뜻하는지 계산할 때 곱하는 숫자입니다.', detail: '지수에 거래승수를 곱하면 한 계약의 규모를 가늠할 수 있습니다. 승수가 클수록 같은 지수 변동에도 손익 금액이 커집니다.' },
    { terms: ['공실률'], korean: '공실률', hanja: '空室率', abbr: 'Vacancy Rate', english: 'Vacancy Rate', summary: '임대할 수 있는 공간 가운데 비어 있는 공간의 비율입니다.', detail: '공실률이 높으면 임대료 수입이 줄어 리츠나 부동산 소유자의 수익에 부담이 될 수 있습니다.' },
    { terms: ['차입금'], korean: '차입금', hanja: '借入金', abbr: 'Debt', english: 'Borrowings', summary: '기업이나 리츠가 은행·채권시장 등에서 빌린 돈입니다.', detail: '빚을 이용하면 투자 규모를 키울 수 있지만 이자와 상환 부담이 생깁니다. 금리가 오르거나 수입이 줄면 부담이 더 커질 수 있습니다.' },
    { terms: ['총보수'], korean: '총보수', hanja: '總報酬', abbr: 'TER', english: 'Total Expense Ratio', summary: '펀드·ETF를 운용하는 데 드는 연간 비용의 비율입니다.', detail: '보수는 보통 펀드 자산에서 조금씩 빠져나가므로 따로 청구서를 받지 않아도 수익률에 영향을 줍니다. 비슷한 상품끼리는 보수를 비교해 보세요.' },
    { terms: ['호가 스프레드', '호가 차이'], korean: '호가 스프레드', hanja: '呼價差', abbr: 'Spread', english: 'Bid-Ask Spread', summary: '살 수 있는 가장 싼 가격과 팔 수 있는 가장 비싼 가격의 차이입니다.', detail: '차이가 크면 사자마자 손해를 보고 시작하는 것처럼 느껴질 수 있습니다. 거래량이 적은 상품일수록 스프레드가 넓어질 수 있습니다.' },
    { terms: ['연환산'], korean: '연환산', hanja: '年換算', abbr: 'Annualized', english: 'Annualized', summary: '한 달·몇 년 등 서로 다른 기간의 성과를 1년 기준으로 바꾸어 비교하는 방법입니다.', detail: '기간이 짧을수록 연환산 수치는 실제보다 크게 보일 수 있습니다. 원래 기간과 함께 해석해야 합니다.' },
    { terms: ['무위험수익률'], korean: '무위험수익률', hanja: '無危險收益率', abbr: 'Rf', english: 'Risk-Free Rate', summary: '위험이 거의 없다고 가정한 투자에서 기대하는 기준 수익률입니다.', detail: '실제로 위험이 완전히 없는 투자는 드물지만, 성과를 비교할 때 기준점으로 사용합니다. 보통 단기 국채 수익률 등을 참고합니다.' },
  ];

  const CALENDAR_EVENTS = [
    { id: 'evt-us-nfp-aug', date: '2026-08-07', time: '한국시간 21:30(서머타임 기준)', category: 'macro', market: '미국', importance: 'high', title: '미국 7월 고용보고서(비농업 고용지수) 발표', summary: '미국 노동부가 7월 비농업 고용자 수, 실업률, 시간당 임금을 발표합니다.', detail: '고용지표는 미국 연준의 금리 결정에 큰 영향을 주는 자료 중 하나입니다. 고용이 예상보다 강하면 금리 인하 기대가 줄고, 예상보다 약하면 금리 인하 기대가 커지는 경향이 있어 국채금리·환율·주가지수 선물이 발표 직후 크게 움직일 수 있습니다. 숫자 하나만으로 방향을 단정하기보다 임금 상승률, 실업률 추세와 함께 확인하는 것이 좋습니다.' },
    { id: 'evt-kr-kakao-q2', date: '2026-08-07', time: '오전 이사회 · 오후 컨퍼런스콜(예정)', category: 'earnings', market: '한국', importance: 'medium', title: '카카오 2026년 2분기 실적 발표(잠정)', summary: '카카오가 2분기 매출·영업이익 잠정 실적과 사업부문별 성과를 공개합니다.', detail: '플랫폼 기업의 실적 발표에서는 광고·커머스·콘텐츠 등 사업부문별 매출 구성과 수익성 추세를 함께 확인하는 것이 좋습니다. 잠정실적은 이후 사업보고서·분기보고서로 확정되므로, 공식 공시(전자공시시스템)에서 원문을 다시 확인하는 습관이 중요합니다.' },
    { id: 'evt-us-cpi-aug', date: '2026-08-13', time: '한국시간 21:30(서머타임 기준)', category: 'macro', market: '미국', importance: 'high', title: '미국 7월 소비자물가지수(CPI) 발표', summary: '미국 노동통계국이 7월 CPI와 근원 CPI(식료품·에너지 제외) 상승률을 발표합니다.', detail: 'CPI는 인플레이션 흐름을 보여 주는 대표 지표로, 시장이 예상한 수치와 실제 발표치의 차이(서프라이즈)가 클수록 금리·환율·주가 변동성이 커질 수 있습니다. 전월 대비(MoM)와 전년 대비(YoY) 상승률을 함께 보고, 근원 CPI가 둔화 또는 재가속되는 추세인지 확인하세요.' },
    { id: 'evt-kr-kospi-opt-aug', date: '2026-08-13', time: '장중 · 최종거래일', category: 'expiry', market: '한국', importance: 'medium', title: '코스피200 옵션 만기일(매월 둘째 목요일)', summary: '코스피200 옵션의 최종거래일로, 미결제약정 정리와 관련 헤지 주문이 늘어날 수 있습니다.', detail: '옵션 만기일에는 옵션 매도자였던 기관·금융기관이 델타 헤지 물량을 정리하면서 장 막판 수급이 평소보다 출렁일 수 있습니다. “만기일이라 무조건 오르내린다”고 단정하기보다, 미결제약정과 프로그램 매매 동향을 함께 참고 자료로만 확인하는 것이 좋습니다.' },
    { id: 'evt-us-ppi-aug', date: '2026-08-14', time: '한국시간 21:30(서머타임 기준)', category: 'macro', market: '미국', importance: 'medium', title: '미국 7월 생산자물가지수(PPI) 발표', summary: '기업 간 거래 단계의 물가 변화를 보여 주는 PPI가 발표됩니다.', detail: 'PPI는 소비자물가(CPI)보다 한발 앞서 기업의 원가 압력을 보여 줄 수 있어 향후 CPI 흐름을 가늠하는 보조 지표로 활용됩니다. 에너지·식품처럼 변동성이 큰 항목을 제외한 근원 PPI를 함께 보면 추세를 판단하는 데 도움이 됩니다.' },
    { id: 'evt-fomc-minutes-aug', date: '2026-08-19', time: '한국시간 새벽(서머타임 기준)', category: 'macro', market: '미국', importance: 'medium', title: 'FOMC 7월 정례회의 의사록 공개', summary: '지난 7월 연방공개시장위원회(FOMC) 회의의 세부 논의 내용이 공개됩니다.', detail: '의사록에는 위원들이 금리 결정 당시 어떤 위험 요인과 데이터를 근거로 판단했는지가 담겨 있어, 다음 회의의 방향을 가늠하는 참고 자료로 쓰입니다. 성명서만으로 알기 어려운 위원 간 견해 차이를 확인할 수 있지만, 이미 지난 회의의 기록이라는 점도 함께 감안해야 합니다.' },
    { id: 'evt-jackson-hole', date: '2026-08-21', time: '현지시간 기준 3일간', category: 'macro', market: '미국', importance: 'high', title: '잭슨홀 경제정책 심포지엄 개막', summary: '미국 캔자스시티 연은이 주최하는 연례 경제정책 심포지엄으로, 연준 의장의 연설이 주목받습니다.', detail: '잭슨홀 심포지엄에서 연준 의장의 연설은 향후 통화정책 방향에 대한 힌트로 해석되는 경우가 많아 채권·주식·환율 시장이 민감하게 반응할 수 있습니다. 연설 하나로 다음 회의 결과가 확정되는 것은 아니므로, 이후 발표되는 경제지표와 함께 판단해야 합니다.' },
    { id: 'evt-nvidia-q2', date: '2026-08-26', time: '한국시간 오전(장 마감 후 발표, 서머타임 기준)', category: 'earnings', market: '미국', importance: 'high', title: '엔비디아(NVIDIA) 2026 회계연도 2분기 실적 발표', summary: 'AI 반도체 수요와 데이터센터 매출 전망을 가늠할 수 있는 엔비디아의 분기 실적이 발표됩니다.', detail: '데이터센터 부문 매출 성장률, 차세대 GPU 공급 상황, 다음 분기 매출 가이던스가 특히 주목받습니다. 엔비디아 실적은 국내 반도체·서버 공급망 관련 기업들의 투자심리에도 영향을 줄 수 있어 국내 투자자도 참고하는 경우가 많습니다.' },
    { id: 'evt-bok-rate-aug', date: '2026-08-28', time: '오전 9시 결정, 오전 통화정책방향 발표', category: 'macro', market: '한국', importance: 'high', title: '한국은행 금융통화위원회 기준금리 결정', summary: '한국은행 금통위가 기준금리 인상·인하·동결 여부를 결정하고 통화정책방향을 발표합니다.', detail: '기준금리는 예·적금 금리, 대출금리, 국고채 수익률과 채권형 상품 가격에 영향을 줄 수 있습니다. 결정 결과뿐 아니라 총재 기자간담회에서 나오는 향후 정책 방향에 대한 발언도 함께 확인하는 것이 좋습니다.' },
    { id: 'evt-us-nfp-sep', date: '2026-09-04', time: '한국시간 21:30(서머타임 기준)', category: 'macro', market: '미국', importance: 'high', title: '미국 8월 고용보고서 발표', summary: '8월 비농업 고용자 수와 실업률이 발표됩니다.', detail: '9월 FOMC 회의를 앞두고 발표되는 고용지표라 시장의 금리 전망에 미치는 영향이 특히 클 수 있습니다. 전월 수치의 수정(리비전) 여부도 함께 확인하면 고용 흐름을 더 정확히 읽을 수 있습니다.' },
    { id: 'evt-kospi-quad-sep', date: '2026-09-10', time: '장중 · 최종거래일', category: 'expiry', market: '한국', importance: 'high', title: '코스피200 선물·옵션 동시만기일(9월물, 분기 만기)', summary: '3·6·9·12월물 코스피200 선물이 옵션과 함께 만기를 맞는 분기 동시만기일입니다.', detail: '분기 동시만기일에는 선물·옵션 미결제약정 정리 물량이 한꺼번에 몰려 월간 만기보다 변동성이 커질 수 있습니다. 특히 장 마감 동시호가 구간에서 프로그램 매매(차익·비차익) 주문이 늘어나는 경향이 있어 참고 지표로만 활용하고 과도한 의미 부여는 주의해야 합니다.' },
    { id: 'evt-us-cpi-sep', date: '2026-09-11', time: '한국시간 21:30(서머타임 기준)', category: 'macro', market: '미국', importance: 'high', title: '미국 8월 CPI 발표', summary: '9월 FOMC 직전 발표되는 마지막 주요 CPI 지표입니다.', detail: '이 지표는 FOMC의 금리 결정 직전에 나오는 만큼 시장의 민감도가 특히 높습니다. 헤드라인 CPI와 근원 CPI의 방향이 엇갈릴 경우 해석에 더 주의가 필요합니다.' },
    { id: 'evt-fomc-sep', date: '2026-09-17', time: '한국시간 새벽(서머타임 기준)', category: 'macro', market: '미국', importance: 'high', title: 'FOMC 9월 정례회의 금리 결정 발표', summary: '연방공개시장위원회가 이틀간의 회의를 마치고 기준금리 결정과 경제전망(점도표)을 공개합니다.', detail: '금리 결정 자체뿐 아니라 위원들의 향후 금리 전망을 보여 주는 점도표(dot plot), 의장의 기자회견 발언이 시장에 큰 영향을 줄 수 있습니다. 결정 결과가 예상과 같아도 향후 전망 문구가 달라지면 시장이 반응할 수 있다는 점을 기억하세요.' },
    { id: 'evt-triple-witching-sep', date: '2026-09-18', time: '현지시간 장 마감 동시호가', category: 'expiry', market: '미국', importance: 'high', title: "미국 증시 '네 마녀의 날'(주가지수 선물·옵션, 개별주식 선물·옵션 동시만기)", summary: '3·6·9·12월 셋째 금요일, 네 가지 파생상품 계약이 한꺼번에 만기를 맞아 거래량이 크게 늘어날 수 있습니다.', detail: '동시만기일에는 지수를 추종하는 기관의 리밸런싱 주문과 만기 청산 물량이 겹치면서 장 마감 무렵 변동성이 커지는 경향이 있습니다. 국내 코스피200 동시만기일과 마찬가지로, 특정 방향을 예단하기보다 거래량·변동성이 커질 수 있는 날로 이해하는 것이 좋습니다.' },
    { id: 'evt-us-pce-sep', date: '2026-09-25', time: '한국시간 21:30(서머타임 기준)', category: 'macro', market: '미국', importance: 'medium', title: '미국 8월 근원 PCE 물가지수 발표', summary: '연준이 가장 중요하게 참고하는 물가지표인 근원 개인소비지출(PCE) 상승률이 발표됩니다.', detail: 'PCE는 CPI와 산출 방식이 달라 두 지표의 방향이 항상 일치하지는 않습니다. 연준이 정책 판단에서 PCE를 핵심 지표로 삼는다고 여러 차례 밝힌 만큼, CPI 발표 이후에도 PCE 결과를 다시 확인하는 습관이 필요합니다.' },
    { id: 'evt-kr-samsung-q3-preview', date: '2026-10-08', time: '오전(예정)', category: 'earnings', market: '한국', importance: 'medium', title: '삼성전자 2026년 3분기 잠정실적 발표', summary: '삼성전자가 3분기 매출·영업이익 잠정치를 공개합니다.', detail: '잠정실적은 사업부문별 세부 수치 없이 매출·영업이익 총액만 먼저 공개되는 경우가 많습니다. 반도체(메모리·파운드리)와 디바이스 부문의 세부 실적은 이후 확정 실적 발표와 사업보고서에서 확인할 수 있습니다.' },
  ];

  const MODEL_META = {
    mean_variance: {
      label: '평균분산',
      returnBoost: 0.004,
      volMultiplier: 1.02,
      note: '기대수익률과 공분산을 바탕으로 효율적 투자선을 찾는 접근입니다.',
    },
    black_litterman: {
      label: '블랙-리터만',
      returnBoost: 0.002,
      volMultiplier: 0.95,
      note: '시장 균형수익률에 전망을 섞어 평균분산의 입력 민감도를 완화합니다.',
    },
    risk_parity: {
      label: 'Risk-Parity',
      returnBoost: -0.001,
      volMultiplier: 0.88,
      note: '자본 비중보다 위험기여도를 고르게 맞추는 접근입니다.',
    },
  };

  // 학습용 시뮬레이션 가정치입니다. 선물·옵션 손익은 아래의 단순화된 지수·등가격 풋옵션 가정으로 계산합니다.
  const SIMULATION_ASSUMPTIONS = {
    riskFreeRate: 0.02,
    diversificationBonusScale: 0.004,
    stressVolatilityMultiplier: 1.55,
    equityStressPenalty: 0.08,
    indexFuturesMultiplier: 250000,
    expectedReturns: [0.082, 0.038, 0.052],
    annualVolatility: [0.19, 0.065, 0.11],
    correlationMatrix: [
      [1.0, 0.18, 0.42],
      [0.18, 1.0, 0.10],
      [0.42, 0.10, 1.0],
    ],
  };

  // 5일 × 40개: 시장 구분과 산업별로 읽는 국내 상장사 학습 아틀라스
  // 실시간 가격·투자의견이 아닌 사업 구조와 공시 확인 포인트를 위한 학습 데이터입니다.
  const $messages = document.getElementById('messages');
  const $questionInput = document.getElementById('questionInput');
  const $sendBtn = document.getElementById('sendBtn');
  const $topKLabel = document.getElementById('topKLabel');
  const $refList = document.getElementById('refList');
  const $fileInput = document.getElementById('fileInput');
  const $uploadTrigger = document.getElementById('uploadTrigger');
  const $uploadArea = document.getElementById('uploadArea');
  const $uploadStatus = document.getElementById('uploadStatus');
  const $ingestTextBtn = document.getElementById('ingestTextBtn');
  const $textTitle = document.getElementById('textTitle');
  const $textContent = document.getElementById('textContent');
  const $clearChatBtn = document.getElementById('clearChatBtn');
  const $closeRefBtn = document.getElementById('closeRefBtn');
  const $modelSelect = document.getElementById('modelSelect');
  const $stockWeight = document.getElementById('stockWeight');
  const $bondWeight = document.getElementById('bondWeight');
  const $altWeight = document.getElementById('altWeight');
  const $portfolioCapital = document.getElementById('portfolioCapital');
  const $futuresIndexLevel = document.getElementById('futuresIndexLevel');
  const $futuresContracts = document.getElementById('futuresContracts');
  const $putCoverage = document.getElementById('putCoverage');
  const $putPremium = document.getElementById('putPremium');
  const $stockWeightLabel = document.getElementById('stockWeightLabel');
  const $bondWeightLabel = document.getElementById('bondWeightLabel');
  const $altWeightLabel = document.getElementById('altWeightLabel');
  const $futuresContractsLabel = document.getElementById('futuresContractsLabel');
  const $putCoverageLabel = document.getElementById('putCoverageLabel');
  const $putPremiumLabel = document.getElementById('putPremiumLabel');
  const $simReturn = document.getElementById('simReturn');
  const $simVolatility = document.getElementById('simVolatility');
  const $simSharpe = document.getElementById('simSharpe');
  const $simDrawdown = document.getElementById('simDrawdown');
  const $simPromptBtn = document.getElementById('simPromptBtn');
  const $simAllocation = document.getElementById('simAllocation');
  const $simNarrative = document.getElementById('simNarrative');
  const $simCompare = document.getElementById('simCompare');
  const $simScenarioResult = document.getElementById('simScenarioResult');
  const $optionChainSample = document.getElementById('optionChainSample');
  const $simDonut = document.getElementById('simDonut');
  const $simRiskBars = document.getElementById('simRiskBars');
  const $simSaveBtn = document.getElementById('simSaveBtn');
  const $simScenarioButtons = Array.from(document.querySelectorAll('.sim-scenario'));
  const $chatInputArea = document.querySelector('.chat-input-area');
  const $viewButtons = Array.from(document.querySelectorAll('.brand-nav-btn'));
  const $offcanvasBackdrop = document.getElementById('offcanvasBackdrop');
  const $openLeftPanel = document.getElementById('openLeftPanel');
  const $openRightPanel = document.getElementById('openRightPanel');
  const $referencePanel = document.getElementById('referencePanel');
  const $closeLeftPanel = document.getElementById('closeLeftPanel');
  const $learningPanel = document.getElementById('learningPanel');
  const $ragPanel = document.getElementById('ragPanel');
  const $simulationPanel = document.getElementById('simulationPanel');
  const $openSimulationPanel = document.getElementById('openSimulationPanel');
  const $glossaryModal = document.getElementById('glossaryModal');
  const $glossaryTitle = document.getElementById('glossaryTitle');
  const $glossaryNames = document.getElementById('glossaryNames');
  const $glossarySummary = document.getElementById('glossarySummary');
  const $glossaryDetail = document.getElementById('glossaryDetail');
  const $calendarModal = document.getElementById('calendarModal');
  const $calendarModalCategory = document.getElementById('calendarModalCategory');
  const $calendarModalTitle = document.getElementById('calendarModalTitle');
  const $calendarModalMeta = document.getElementById('calendarModalMeta');
  const $calendarModalSummary = document.getElementById('calendarModalSummary');
  const $calendarModalDetail = document.getElementById('calendarModalDetail');

  // 좌측은 학습 메뉴, 우측은 RAG 자료와 참고 문서에만 집중합니다.
  $referencePanel.insertBefore($ragPanel, $refList);

  document.querySelectorAll('.sim-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      $stockWeight.value = btn.dataset.stock;
      $bondWeight.value = btn.dataset.bond;
      $altWeight.value = btn.dataset.alt;
      updateSimulation();
    });
  });


  $viewButtons.forEach(btn => {
    btn.addEventListener('click', () => setView(btn.dataset.view));
  });

  $openLeftPanel.addEventListener('click', () => togglePanel('left'));
  $openRightPanel.addEventListener('click', () => togglePanel('right'));
  $openSimulationPanel.addEventListener('click', () => {
    setView('simulation');
  });
  $closeLeftPanel.addEventListener('click', () => setPanel('left', false));
  $offcanvasBackdrop.addEventListener('click', () => closePanels());
  $messages.addEventListener('click', event => {
    const term = event.target.closest('[data-glossary-term]');
    if (term) openGlossary(Number(term.dataset.glossaryTerm));
  });
  $glossaryModal.addEventListener('click', event => {
    if (event.target.closest('[data-glossary-close]')) closeGlossary();
  });
  $calendarModal.addEventListener('click', event => {
    if (event.target.closest('[data-calendar-close]')) closeCalendarEvent();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closePanels();
    if (event.key === 'Escape') closeGlossary();
    if (event.key === 'Escape') closeCalendarEvent();
  });

  $questionInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      triggerSend();
    }
  });

  $questionInput.addEventListener('input', resizeInput);
  $sendBtn.addEventListener('click', triggerSend);

  $clearChatBtn.addEventListener('click', () => {
    state.chatHistory = [];
    state.sessionId = crypto.randomUUID();
    $messages.innerHTML = '';
    updateRefPanel([]);
    showWelcome();
  });

  $closeRefBtn.addEventListener('click', () => setPanel('right', false));

  $uploadTrigger.addEventListener('click', () => $fileInput.click());
  $uploadArea.addEventListener('click', (e) => {
    if (e.target === $uploadArea || e.target.classList.contains('upload-icon')) {
      $fileInput.click();
    }
  });
  $uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    $uploadArea.classList.add('drag-over');
  });
  $uploadArea.addEventListener('dragleave', () => $uploadArea.classList.remove('drag-over'));
  $uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    $uploadArea.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  });
  $fileInput.addEventListener('change', () => {
    if ($fileInput.files[0]) handleFileUpload($fileInput.files[0]);
    $fileInput.value = '';
  });

  $ingestTextBtn.addEventListener('click', ingestText);

  [$modelSelect, $stockWeight, $bondWeight, $altWeight, $portfolioCapital, $futuresIndexLevel, $futuresContracts, $putCoverage, $putPremium].forEach(input => {
    input.addEventListener('input', updateSimulation);
  });

  $simScenarioButtons.forEach(button => {
    button.addEventListener('click', () => {
      state.activeScenario = button.dataset.scenario;
      $simScenarioButtons.forEach(item => item.classList.toggle('active', item === button));
      updateSimulation();
    });
  });

  $simSaveBtn.addEventListener('click', () => {
    if (!state.currentSimulation) return;
    state.savedSimulation = { ...state.currentSimulation };
    updateSimulation();
  });

  $simPromptBtn.addEventListener('click', () => {
    setView('learn');
    $questionInput.value = buildSimulationPrompt();
    resizeInput();
    $questionInput.focus();
  });

  function setView(view) {
    state.activeView = view;
    $viewButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.view === view));
    $chatInputArea.classList.toggle('hidden', view !== 'learn');
    $clearChatBtn.classList.toggle('hidden', view !== 'learn');

    if (view === 'home') renderHome();
    if (view === 'learn') showWelcome();
    if (view === 'theory') { location.href = '/static/theory/index.html'; return; }
    if (view === 'simulation') {
      renderSimulationGuide();
      closePanels();
      requestAnimationFrame(() => $simulationPanel.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
    if (view === 'backtest') renderBacktestWorkflow();
    if (view === 'calendar') renderCalendar();
  }

  function togglePanel(panel) {
    const isOpen = document.body.classList.contains(`${panel}-panel-open`);
    setPanel(panel, !isOpen);
  }

  function setPanel(panel, isOpen) {
    const otherPanel = panel === 'left' ? 'right' : 'left';
    document.body.classList.toggle(`${panel}-panel-open`, isOpen);
    if (isOpen) document.body.classList.remove(`${otherPanel}-panel-open`);
    $offcanvasBackdrop.classList.toggle('visible', isOpen);
    $offcanvasBackdrop.setAttribute('aria-hidden', String(!isOpen));
    $openLeftPanel.setAttribute('aria-expanded', String(panel === 'left' && isOpen));
    $openRightPanel.setAttribute('aria-expanded', String(panel === 'right' && isOpen));
  }

  function closePanels() {
    document.body.classList.remove('left-panel-open', 'right-panel-open');
    $offcanvasBackdrop.classList.remove('visible');
    $offcanvasBackdrop.setAttribute('aria-hidden', 'true');
    $openLeftPanel.setAttribute('aria-expanded', 'false');
    $openRightPanel.setAttribute('aria-expanded', 'false');
  }

  function annotateGlossary(node) {
    const root = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    if (!root || root.closest?.('.glossary-term, .glossary-modal')) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(textNode) {
        const parent = textNode.parentElement;
        if (!textNode.nodeValue.trim() || parent?.closest('.glossary-term, .glossary-modal, button, textarea, script, style')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(textNode => {
      const matches = [];
      GLOSSARY.forEach((entry, index) => entry.terms.forEach(term => matches.push({ term, index })));
      matches.sort((a, b) => b.term.length - a.term.length);
      const pattern = new RegExp(matches.map(item => escapeRegex(item.term)).join('|'), 'g');
      if (!pattern.test(textNode.nodeValue)) return;
      pattern.lastIndex = 0;
      const fragment = document.createDocumentFragment();
      let cursor = 0;
      textNode.nodeValue.replace(pattern, (match, offset) => {
        fragment.append(document.createTextNode(textNode.nodeValue.slice(cursor, offset)));
        const item = matches.find(candidate => candidate.term === match);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'glossary-term';
        button.dataset.glossaryTerm = String(item.index);
        button.textContent = match;
        button.setAttribute('aria-label', `${match} 용어 설명 보기`);
        fragment.append(button);
        cursor = offset + match.length;
        return match;
      });
      fragment.append(document.createTextNode(textNode.nodeValue.slice(cursor)));
      textNode.replaceWith(fragment);
    });
  }

  function openGlossary(index) {
    const entry = GLOSSARY[index];
    if (!entry) return;
    $glossaryTitle.textContent = entry.korean;
    $glossaryNames.innerHTML = `
      <span><b>한자</b>${escHtml(entry.hanja)}</span>
      <span><b>약자</b>${escHtml(entry.abbr)}</span>
      <span><b>영문</b>${escHtml(entry.english)}</span>`;
    $glossarySummary.textContent = entry.summary;
    $glossaryDetail.textContent = entry.detail;
    $glossaryModal.classList.add('open');
    $glossaryModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    $glossaryModal.querySelector('.glossary-close').focus();
  }

  function closeGlossary() {
    $glossaryModal.classList.remove('open');
    $glossaryModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }

  function openCalendarEvent(id) {
    const entry = CALENDAR_EVENTS.find(item => item.id === id);
    if (!entry) return;
    $calendarModalCategory.textContent = `${calendarCategoryLabel(entry.category)} · ${entry.market}`;
    $calendarModalTitle.textContent = entry.title;
    $calendarModalMeta.innerHTML = `
      <span><b>날짜</b>${escHtml(formatCalendarDate(entry.date))}</span>
      <span><b>시간</b>${escHtml(entry.time)}</span>
      <span><b>중요도</b>${calendarImportanceLabel(entry.importance)}</span>`;
    $calendarModalSummary.textContent = entry.summary;
    $calendarModalDetail.textContent = entry.detail;
    $calendarModal.classList.add('open');
    $calendarModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    $calendarModal.querySelector('.glossary-close').focus();
  }

  function closeCalendarEvent() {
    $calendarModal.classList.remove('open');
    $calendarModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }

  function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) annotateGlossary(node);
    }));
  }).observe($messages, { childList: true, subtree: true });

  function renderHome() {
    const modules = [
      ['5일 이론 학습', '금융상품부터 자산배분·리밸런싱까지 하루 한 주제씩 읽습니다.', 'fa-calendar-days', 'theory'],
      ['자산배분 실습', '평균분산·블랙-리터만·Risk Parity를 같은 포트폴리오에 적용합니다.', 'fa-sliders', 'simulation'],
    ].map(([title, copy, icon, target]) => `
      <button class="home-module" data-go="${target}">
        <i class="fa-solid ${icon}"></i><strong>${title}</strong><span>${copy}</span><em>학습 시작 <i class="fa-solid fa-arrow-right"></i></em>
      </button>`).join('');
    const explainers = PRODUCT_EXPLAINERS.map(item => `
      <article class="product-explainer">
        <i class="fa-solid ${item.icon}"></i>
        <h3>${item.title}</h3>
        <p>${item.oneLine}</p>
        <div><strong>쉽게 말하면</strong><span>${item.analogy}</span></div>
        <div><strong>확인할 점</strong><span>${item.check}</span></div>
      </article>`).join('');
    const lifeTrades = [
      ['금·귀금속', '순도 · 중량 · 매매 차이 · 보관', 'fa-coins'],
      ['부동산', '권리관계 · 계약 · 유지비 · 유동성', 'fa-house'],
      ['자동차·가전', '상태 · 수리이력 · 보증 · 이전', 'fa-car-side'],
      ['우표·수석·예술품', '진위 · 보존상태 · 출처 · 감정', 'fa-gem'],
      ['중고 전자기기', '작동 · 계정 해제 · 구성품 · 안전결제', 'fa-mobile-screen-button'],
      ['티켓·예약권', '양도 가능 여부 · 유효기간 · 사기 위험', 'fa-ticket'],
      ['서비스 거래', '작업 범위 · 견적 · 결과물 · 분쟁 기준', 'fa-handshake'],
      ['디지털 자산·콘텐츠', '이용권한 · 약관 · 복제·양도 제한', 'fa-file-code'],
    ].map(([name, check, icon]) => `<article><i class="fa-solid ${icon}"></i><h3>${name}</h3><p>${check}</p></article>`).join('');

    $messages.innerHTML = `
      <article class="content-page home-page">
        <header class="home-page-head">
          <div>
            <div class="content-kicker">MONEY & EVERYDAY EXCHANGE · RAG 기반 학습</div>
            <h1><mark>금융·생활 거래</mark> 학습</h1>
          </div>
          <p class="content-lead">금·부동산·수집품·중고거래를 포함해, 가격뿐 아니라 상태·권리·비용·사기 위험을 함께 확인하는 학습 흐름을 제공합니다.</p>
        </header>
        <div class="home-actions">
          <button class="content-cta" data-go="theory"><i class="fa-solid fa-calendar-days"></i> 5일 이론 학습 시작</button>
          <button class="content-cta" data-go="learn"><i class="fa-solid fa-comments"></i> RAG에게 질문하기</button>
        </div>
        <section class="home-stats">
          <div><strong>2</strong><span>학습 방식<br>콘텐츠 · 실습</span></div>
          <div><strong>5</strong><span>핵심 지표<br>CAGR · 변동성 · MDD 등</span></div>
          <div><strong>3</strong><span>배분 모델<br>MVO · BL · RP</span></div>
        </section>
        <section class="learning-map" aria-label="학습 흐름 인포그래픽"><div class="map-heading"><span>LEARNING FLOW</span><strong>읽고 → 직접 비교하고 → 질문합니다</strong></div><div class="map-steps"><div><i class="fa-solid fa-book-open"></i><b>이론</b><small>상품과 시장 구조</small></div><i class="fa-solid fa-arrow-right"></i><div><i class="fa-solid fa-chart-pie"></i><b>실습</b><small>비중과 위험 비교</small></div><i class="fa-solid fa-arrow-right"></i><div><i class="fa-solid fa-comments"></i><b>RAG</b><small>문서 근거로 확장</small></div></div></section>
        <section class="content-section"><div class="section-heading"><span>01</span><h2>학습 메뉴</h2></div><div class="home-module-grid">${modules}</div></section>
        <section class="content-section"><div class="section-heading"><span>02</span><h2>금융상품과 실물자산, 쉽게 시작하기</h2></div><p class="section-intro">투자와 거래는 ‘얼마나 많이 버는가’보다 <strong>무엇을 받고, 어떤 조건에서 가치가 줄어들 수 있는가</strong>를 이해하는 일에서 시작합니다.</p><div class="product-explainer-grid">${explainers}</div></section>
        <section class="life-trade-guide"><div><span>EVERYDAY EXCHANGE GUIDE</span><h2>사회생활에서 만나는 모든 거래를<br>같은 질문으로 점검합니다.</h2><p>금융상품뿐 아니라 실물자산, 수집품, 중고 물건, 서비스와 디지털 권리도 거래 전 확인 기준이 필요합니다.</p></div><div class="life-trade-grid">${lifeTrades}</div><footer><b>공통 점검 순서</b><span>① 거래 대상과 권리 확인</span><i></i><span>② 상태·진위·가격 비교</span><i></i><span>③ 비용·보관·인도 조건</span><i></i><span>④ 기록·안전결제·분쟁 대비</span></footer></section>
        <section class="markdown-card">
          <p class="markdown-label">LEARNING NOTE</p>
          <h2>좋은 포트폴리오는 ‘정답’보다<br>위험을 감당할 수 있는 구조에 가깝습니다.</h2>
          <blockquote>수익률만으로 상품을 비교하지 말고 비용, 유동성, 상관관계와 최대낙폭을 함께 검토하세요.</blockquote>
          <div class="markdown-columns"><div><h3>상품을 볼 때</h3><ul><li>무엇에 투자하는가</li><li>총비용과 거래비용은 얼마인가</li><li>유동성·추적오차·신용위험은 어떤가</li></ul></div><div><h3>배분을 볼 때</h3><ul><li>투자기간과 손실 허용 범위는 어떤가</li><li>자산 간 상관관계가 낮은가</li><li>리밸런싱 규칙이 있는가</li></ul></div></div>
        </section>
        <p class="content-disclaimer">학습용 서비스이며 특정 투자상품의 매수·매도를 권유하지 않습니다. 투자 판단과 책임은 투자자 본인에게 있습니다.</p>
      </article>`;
    bindViewLinks();
  }

  function renderSimulationGuide() {
    $messages.innerHTML = `<article class="content-page simulation-page"><header class="simulation-guide-head"><div><div class="content-kicker">ALLOCATION WORKBENCH</div><h1>자산배분 <mark>실습</mark></h1></div><p class="content-lead">비중·헤지를 조절하고 성과, 시장 충격, 저장한 설정을 비교합니다.</p></header><div class="simulation-steps" aria-label="실습 순서"><div><span>01</span><h3>설계</h3></div><i class="fa-solid fa-arrow-right"></i><div><span>02</span><h3>검증</h3></div><i class="fa-solid fa-arrow-right"></i><div><span>03</span><h3>비교</h3></div></div><div class="simulation-workbench" id="simulationMount"></div></article>`;
    document.getElementById('simulationMount').appendChild($simulationPanel);
    updateSimulation();
  }

  const BACKTEST_STRATEGIES = [
    { value: 'buy_hold', label: '매수 후 보유', hint: '처음 한 번 매수해서 기간 내내 그대로 들고 갑니다. 가장 단순한 기준선입니다.' },
    { value: 'ma_cross', label: '이동평균 교차', hint: '20일 평균이 60일 평균을 웃돌면 매수, 밑돌면 청산합니다. 추세를 따라가는 전략입니다.' },
    { value: 'dca', label: '정액 적립매수(DCA)', hint: '약 한 달(21거래일)마다 정해진 금액만큼 나눠서 매수합니다. 한 번에 몰빵하는 부담을 줄입니다.' },
    { value: 'momentum', label: '추세추종(돌파)', hint: '최근 20거래일 최고가를 뚫으면 매수, 최근 20거래일 최저가를 깨면 청산합니다.' },
  ];

  function renderBacktestWorkflow() {
    const today = new Date().toISOString().slice(0, 10);
    const strategyOptions = BACKTEST_STRATEGIES.map(s => `<option value="${s.value}">${escHtml(s.label)}</option>`).join('');
    $messages.innerHTML = `<article class="content-page backtest-page"><header class="backtest-page-head"><div class="content-kicker">QUANTCONNECT LEAN · YFINANCE WORKFLOW</div><h1>LEAN <mark>수익률 비교</mark></h1><p class="content-lead">yfinance 일봉과 QuantConnect LEAN으로 4가지 교육용 예시 전략의 결과를 비교합니다.</p></header><section class="backtest-canvas" aria-label="백테스트 워크플로우"><div class="workflow-node input"><span>01 · 예시 전략</span><select id="btStrategy" aria-label="예시 전략 선택">${strategyOptions}</select><small id="btStrategyHint">${escHtml(BACKTEST_STRATEGIES[0].hint)}</small></div><i class="fa-solid fa-arrow-right"></i><div class="workflow-node input"><span>02 · 국내 종목</span><input id="btTicker" value="005930.KS" maxlength="12" aria-label="종목 티커" /><small>예: 삼성전자 005930.KS · SK하이닉스 000660.KS</small></div><i class="fa-solid fa-arrow-right"></i><div class="workflow-node input"><span>03 · 백테스트 기간</span><div><input id="btStart" type="date" value="2023-01-01" /><input id="btEnd" type="date" value="${today}" /></div><small>전략 성과를 계산할 기간</small></div><i class="fa-solid fa-arrow-right"></i><div class="workflow-node input"><span>04 · 비교 기간</span><div><input id="btCompareStart" type="date" value="2022-01-01" /><input id="btCompareEnd" type="date" value="${today}" /></div><small>이전 기간과 수익률 비교</small></div><i class="fa-solid fa-arrow-right"></i><div class="workflow-node engine"><span>05 · 실행 엔진</span><strong><i class="fa-brands fa-docker"></i> LEAN</strong><small>yfinance → 원격 Docker</small></div></section><div class="backtest-actions"><button class="content-cta" id="runBacktest"><i class="fa-solid fa-play"></i> 백테스트 실행</button><span>교육용 예시이며 투자 권유가 아닙니다.</span></div><section class="backtest-result" id="backtestResult"><div class="backtest-empty"><i class="fa-solid fa-diagram-project"></i><p>전략을 고르고 워크플로우의 입력값을 설정한 뒤 실행하세요.</p></div></section></article>`;
    document.getElementById('runBacktest').addEventListener('click', runBacktest);
    document.getElementById('btStrategy').addEventListener('change', (event) => {
      const chosen = BACKTEST_STRATEGIES.find(s => s.value === event.target.value);
      document.getElementById('btStrategyHint').textContent = chosen ? chosen.hint : '';
    });
  }

  async function runBacktest() {
    const button = document.getElementById('runBacktest');
    const result = document.getElementById('backtestResult');
    const payload = { ticker: document.getElementById('btTicker').value, start_date: document.getElementById('btStart').value, end_date: document.getElementById('btEnd').value, compare_start_date: document.getElementById('btCompareStart').value, compare_end_date: document.getElementById('btCompareEnd').value, initial_cash: 10000, strategy: document.getElementById('btStrategy').value };
    button.disabled = true; button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> LEAN 실행 중';
    result.innerHTML = '<div class="backtest-empty"><i class="fa-solid fa-spinner fa-spin"></i><p>yfinance 데이터를 정리하고 원격 LEAN 컨테이너를 실행하고 있습니다.</p></div>';
    try {
      const response = await fetch('/backtests/run', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || '백테스트를 실행하지 못했습니다.');
      result.innerHTML = `<div class="backtest-result-head"><span>${escHtml(data.engine)} · ${escHtml(data.strategy_label || '')}</span><h2>${escHtml(data.ticker)} 결과</h2></div>${buildBacktestSummary(data)}<div class="backtest-metrics"><article><span>전략 수익률</span><strong class="${data.strategy_return_pct >= 0 ? 'up' : 'down'}">${data.strategy_return_pct >= 0 ? '+' : ''}${data.strategy_return_pct}%</strong></article><article><span>단순 매수·보유 수익률</span><strong class="${data.benchmark_return_pct >= 0 ? 'up' : 'down'}">${data.benchmark_return_pct >= 0 ? '+' : ''}${data.benchmark_return_pct}%</strong></article><article><span>비교 기간 수익률</span><strong class="${data.comparison_return_pct >= 0 ? 'up' : 'down'}">${data.comparison_return_pct >= 0 ? '+' : ''}${data.comparison_return_pct}%</strong></article><article><span>최대 낙폭</span><strong class="down">${data.max_drawdown_pct}%</strong></article></div><canvas id="backtestChart" width="900" height="250" aria-label="자산 곡선"></canvas><p class="backtest-disclaimer">${escHtml(data.disclaimer)}</p><details><summary>LEAN 실행 로그 보기</summary><pre>${escHtml(data.lean_log || '결과 로그 없음')}</pre></details>`;
      drawBacktestChart(data.points);
    } catch (error) { result.innerHTML = `<div class="backtest-error"><i class="fa-solid fa-triangle-exclamation"></i>${escHtml(error.message)}</div>`; }
    finally { button.disabled = false; button.innerHTML = '<i class="fa-solid fa-play"></i> 백테스트 실행'; }
  }

  function buildBacktestSummary(data) {
    const returnText = `${data.strategy_return_pct >= 0 ? '+' : ''}${data.strategy_return_pct}%`;
    const comparisonGap = Math.abs(data.outperformance_pct).toFixed(2);
    const comparisonText = data.outperformance_pct >= 0
      ? `비교 기간보다 ${comparisonGap}%p 높았습니다.`
      : `비교 기간보다 ${comparisonGap}%p 낮았습니다.`;
    const drawdown = Math.abs(data.max_drawdown_pct).toFixed(2);
    const direction = data.strategy_return_pct >= 0 ? '상승' : '하락';
    return `<section class="backtest-summary" aria-label="결과 해석"><span><i class="fa-solid fa-lightbulb"></i> 결과 한눈에 보기</span><strong>이 기간 ${escHtml(data.ticker)}의 매수·보유 결과는 <em>${returnText}</em> ${direction}했습니다.</strong><p>${comparisonText} 다만 진행 중 최고점 대비 최대 <b>${drawdown}%</b> 하락 구간이 있었습니다.</p><small>과거 특정 기간의 가격 변화를 설명한 교육용 결과이며, 미래 수익이나 실제 투자 성과를 뜻하지 않습니다.</small></section>`;
  }

  function drawBacktestChart(points) { const canvas = document.getElementById('backtestChart'); if (!canvas || !points?.length) return; const ctx = canvas.getContext('2d'); const values = points.map(p => p.value), min = Math.min(...values), max = Math.max(...values), pad = 24, w = canvas.width - pad * 2, h = canvas.height - pad * 2; ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.strokeStyle = '#dbeafe'; ctx.beginPath(); ctx.moveTo(pad, canvas.height - pad); ctx.lineTo(canvas.width - pad, canvas.height - pad); ctx.stroke(); ctx.strokeStyle = '#0ea5e9'; ctx.lineWidth = 3; ctx.beginPath(); points.forEach((p, i) => { const x = pad + w * i / Math.max(1, points.length - 1), y = pad + (max - p.value) / Math.max(1, max - min) * h; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); }

  function calendarCategoryLabel(category) {
    return { macro: '경제지표', earnings: '실적발표', expiry: '선물·옵션 만기' }[category] || category;
  }

  function calendarImportanceLabel(level) {
    return { high: '높음', medium: '보통', low: '낮음' }[level] || level;
  }

  function calendarWeekdayKo(dateStr) {
    return `${['일', '월', '화', '수', '목', '금', '토'][new Date(`${dateStr}T00:00:00`).getDay()]}요일`;
  }

  function formatCalendarDate(dateStr) {
    const [year, month, day] = dateStr.split('-');
    return `${year}년 ${Number(month)}월 ${Number(day)}일 (${calendarWeekdayKo(dateStr)})`;
  }

  function toDateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function buildCalendarCells(year, month) {
    const startWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = new Array(startWeekday).fill(null);
    for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }

  function groupCalendarEvents() {
    const map = {};
    CALENDAR_EVENTS.forEach(event => {
      if (!map[event.date]) map[event.date] = [];
      map[event.date].push(event);
    });
    return map;
  }

  function renderCalendar() {
    const now = new Date();
    if (!state.calendarCursor) state.calendarCursor = { year: now.getFullYear(), month: now.getMonth() };
    const { year, month } = state.calendarCursor;
    const todayKey = toDateKey(now);
    const eventsByDate = groupCalendarEvents();
    const cellsHtml = buildCalendarCells(year, month).map(day => {
      if (!day) return '<div class="calendar-cell is-empty"></div>';
      const key = toDateKey(new Date(year, month, day));
      const dayEvents = eventsByDate[key] || [];
      const chips = dayEvents.slice(0, 3).map(event => `<button type="button" class="calendar-chip cal-cat-${event.category}" data-calendar-event="${event.id}">${escHtml(event.title)}</button>`).join('');
      const more = dayEvents.length > 3 ? `<span class="calendar-more">+${dayEvents.length - 3}건 더보기</span>` : '';
      return `<div class="calendar-cell${key === todayKey ? ' is-today' : ''}${dayEvents.length ? ' has-event' : ''}"><span class="calendar-daynum">${day}</span><div class="calendar-chips">${chips}${more}</div></div>`;
    }).join('');

    const upcomingHtml = CALENDAR_EVENTS
      .filter(event => event.date >= todayKey)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 8)
      .map(event => `
        <li class="calendar-agenda-item">
          <div class="calendar-agenda-date"><b>${event.date.slice(5).replace('-', '.')}</b><span>${calendarWeekdayKo(event.date)}</span></div>
          <div class="calendar-agenda-body">
            <span class="calendar-tag cal-cat-${event.category}">${calendarCategoryLabel(event.category)} · ${event.market}</span>
            <button type="button" class="calendar-agenda-title" data-calendar-event="${event.id}">${escHtml(event.title)}</button>
            <p>${escHtml(event.summary)}</p>
          </div>
        </li>`).join('');

    $messages.innerHTML = `
      <article class="content-page calendar-page">
        <header class="calendar-page-head">
          <div>
            <div class="content-kicker">MARKET CALENDAR · 학습용 샘플</div>
            <h1>증시 일정 <mark>캘린더</mark></h1>
          </div>
          <p class="content-lead">주요 경제지표 발표, 기업 실적 발표, 선물·옵션 만기일을 한눈에 확인하세요. 일정 이름을 누르면 상세 설명이 열립니다.</p>
        </header>
        <section class="calendar-board" aria-label="월간 증시 일정 캘린더">
          <div class="calendar-toolbar">
            <div class="calendar-toolbar-nav">
              <button type="button" class="calendar-nav-btn" data-calendar-nav="-1" aria-label="이전 달"><i class="fa-solid fa-chevron-left"></i></button>
              <strong>${year}년 ${month + 1}월</strong>
              <button type="button" class="calendar-nav-btn" data-calendar-nav="1" aria-label="다음 달"><i class="fa-solid fa-chevron-right"></i></button>
              <button type="button" class="calendar-today-btn" data-calendar-today>오늘</button>
            </div>
            <div class="calendar-legend"><span class="cal-cat-macro">경제지표</span><span class="cal-cat-earnings">실적발표</span><span class="cal-cat-expiry">선물·옵션 만기</span></div>
          </div>
          <div class="calendar-weekdays"><span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span></div>
          <div class="calendar-grid">${cellsHtml}</div>
        </section>
        <section class="content-section calendar-agenda-section">
          <div class="section-heading"><span>UPCOMING</span><h2>다가오는 일정</h2></div>
          <ul class="calendar-agenda-list">${upcomingHtml || '<li class="calendar-agenda-empty">이번 달 이후 표시할 예정 일정이 없습니다.</li>'}</ul>
        </section>
        <p class="content-disclaimer">학습용 예시 일정입니다. 실제 발표 일정·시간은 변경될 수 있으니 거래소·기관의 공식 캘린더에서 다시 확인하세요. 특정 상품의 매수·매도를 권유하지 않습니다.</p>
      </article>`;
    bindCalendarInteractions();
  }

  function bindCalendarInteractions() {
    $messages.querySelectorAll('[data-calendar-nav]').forEach(button => {
      button.addEventListener('click', () => {
        let { year, month } = state.calendarCursor;
        month += Number(button.dataset.calendarNav);
        if (month < 0) { month = 11; year -= 1; }
        if (month > 11) { month = 0; year += 1; }
        state.calendarCursor = { year, month };
        renderCalendar();
      });
    });
    $messages.querySelector('[data-calendar-today]')?.addEventListener('click', () => {
      const now = new Date();
      state.calendarCursor = { year: now.getFullYear(), month: now.getMonth() };
      renderCalendar();
    });
    $messages.querySelectorAll('[data-calendar-event]').forEach(button => {
      button.addEventListener('click', () => openCalendarEvent(button.dataset.calendarEvent));
    });
  }

  function renderKoreaMarketMagazine() {
    const companies = [
      ['삼성전자', 'AI 메모리 · 파운드리 · 디바이스', 'HBM·서버 메모리 수요, 파운드리 수율과 고객 구성을 함께 확인'],
      ['SK하이닉스', 'D램 · 낸드 · HBM', 'AI 메모리 제품 전환, 가격 사이클과 고객 인증이 핵심 변수'],
      ['현대차', '완성차 · 하이브리드 · EV', '지역별 판매, 인센티브, 환율과 전동화 제품 구성을 점검'],
      ['HD현대중공업', '상선 · 특수선 · 엔진', '수주잔고가 매출·이익으로 전환되는 시점과 원가를 확인'],
      ['NAVER', '광고 · 커머스 · 콘텐츠 · AI', '광고 회복, 커머스 수익성, AI 서비스의 수익화가 관찰 포인트'],
      ['셀트리온', '바이오시밀러 · 직접판매', '허가·출시 일정, 경쟁약 가격, 판매망 확대를 함께 확인'],
      ['KB금융', '은행 · 증권 · 보험 · 자산운용', '대손비용, CET1, 비이자이익과 주주환원 지속성을 점검'],
      ['LG에너지솔루션', '배터리 · ESS', '전기차·ESS 수요, 고객 주문, 가동률과 투자 규모가 중요'],
    ];
    return `<section class="market-magazine" aria-label="한국 주식 시장 매거진">
      <header class="magazine-hero"><div><span>KOREA EQUITY ATLAS · 2026</span><h2>산업 흐름으로 <em>기업 읽기</em></h2><p>종목 이름을 외우기보다, 어떤 사업이 어떤 변수로 움직이는지부터 살펴보는 한국시장 리딩 가이드입니다.</p></div><div class="market-pulse"><span>SECTOR PULSE</span><div><b>AI 반도체</b><i style="height:82%"></i></div><div><b>자동차</b><i style="height:63%"></i></div><div><b>조선·방산</b><i style="height:72%"></i></div><div><b>금융</b><i style="height:55%"></i></div><small>막대 높이는 수익률이 아닌<br>학습용 산업 관찰 강도입니다.</small></div></header>
      <div class="magazine-lead-grid"><article class="lead-story"><span>LEAD STORY</span><h3>AI는 반도체 한 종목의 이야기가 아닙니다.</h3><p>메모리, 파운드리, 서버, 전력·냉각, 데이터센터 투자까지 연결된 공급망을 함께 봐야 합니다. 삼성전자와 SK하이닉스는 HBM·서버 메모리라는 공통 변수를 공유하지만 사업 구조와 제품 포트폴리오는 다릅니다.</p><div class="mini-compare"><span>수요</span><i></i><span>제품 믹스</span><i></i><span>가격</span><i></i><span>설비</span></div></article><article class="market-check"><span>INVESTOR CHECK</span><strong>3가지 질문</strong><ol><li>회사는 무엇을 팔아 매출을 만드나?</li><li>다음 분기 숫자를 바꿀 변수는 무엇인가?</li><li>가장 나쁜 경우의 위험은 무엇인가?</li></ol></article></div>
      <div class="company-card-grid">${companies.map(([name, sector, note], index) => `<article class="company-feature"><span>0${index + 1}</span><h3>${name}</h3><b>${sector}</b><p>${note}</p><i class="fa-solid ${['fa-microchip','fa-memory','fa-car-side','fa-ship','fa-network-wired','fa-flask','fa-building-columns','fa-battery-three-quarters'][index]}"></i></article>`).join('')}</div>
      <section class="sector-lens"><div><span>HOW TO READ</span><h3>업종별로 다른 ‘전망’의 뜻</h3></div><div class="sector-lens-grid"><p><b>반도체</b><span>가격·재고·고객 인증</span></p><p><b>자동차</b><span>판매·인센티브·환율</span></p><p><b>조선·방산</b><span>수주·납기·원가</span></p><p><b>플랫폼·바이오</b><span>수익화·허가·경쟁</span></p><p><b>금융·배터리</b><span>자본·대손·가동률</span></p></div></section>
    </section>`;
  }

  function bindViewLinks() {
    $messages.querySelectorAll('[data-go]').forEach(button => button.addEventListener('click', () => setView(button.dataset.go)));
  }

  function showWelcome() {
    const prompts = [
      '주식, ETF, 펀드의 차이를 고등학생도 이해할 수 있게 설명해줘.',
      '채권 가격과 금리의 관계를 쉬운 예시로 설명해줘.',
      '분산투자와 자산배분, 리밸런싱이 왜 필요한지 알려줘.',
      '평균분산, 블랙-리터만, Risk Parity의 차이를 비교해줘.',
    ].map(prompt => `
      <button class="example-chip" data-q="${escHtml(prompt)}">${escHtml(prompt)}</button>
    `).join('');

    $messages.innerHTML = `
      <div class="welcome-msg">
        <div class="welcome-icon"><i class="fa-solid fa-graduation-cap"></i></div>
        <h2>금융·투자 RAG 질문</h2>
        <p>5일 이론에서 읽은 내용을 바탕으로 궁금한 점을 자유롭게 질문하세요. 답변에 사용한 참고 문서도 함께 확인할 수 있습니다.</p>

        <section class="rag-flow" aria-label="RAG 답변 과정"><div><i class="fa-solid fa-keyboard"></i><b>질문</b><span>궁금한 점을 입력</span></div><i class="fa-solid fa-arrow-right"></i><div><i class="fa-solid fa-file-lines"></i><b>문서 탐색</b><span>등록 자료에서 근거 찾기</span></div><i class="fa-solid fa-arrow-right"></i><div><i class="fa-solid fa-lightbulb"></i><b>답변</b><span>핵심 내용과 참고 문서</span></div></section>

        <div class="quick-examples" id="quickExamples">
          <p class="examples-label">추천 RAG 질문</p>
          ${prompts}
        </div>
      </div>
    `;

    $messages.querySelectorAll('.example-chip').forEach(chip => {
      chip.addEventListener('click', () => sendQuestion(chip.dataset.q));
    });
  }

  function triggerSend() {
    const question = $questionInput.value.trim();
    if (!question || state.loading) return;
    $questionInput.value = '';
    resizeInput();
    sendQuestion(question);
  }

  async function sendQuestion(question) {
    if (state.loading) return;
    clearWelcome();

    appendMessage('user', question);
    const typingId = appendTyping();

    state.loading = true;
    setInputDisabled(true);

    try {
      const res = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          domain: state.domain,
          top_k: state.topK,
          session_id: state.sessionId,
        }),
      });

      removeTyping(typingId);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        appendMessage('bot', `⚠️ 오류: ${err.detail || res.statusText}`);
        return;
      }

      const data = await res.json();
      appendMessage('bot', data.answer, data.references || []);
      updateRefPanel(data.references || []);
    } catch (err) {
      removeTyping(typingId);
      appendMessage('bot', `⚠️ 네트워크 오류: ${err.message}`);
    } finally {
      state.loading = false;
      setInputDisabled(false);
      $questionInput.focus();
    }
  }

  function appendMessage(role, content, chunks = []) {
    const isUser = role === 'user';
    const id = `msg-${Date.now()}`;
    const time = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    const refBtnHtml = (!isUser && chunks.length)
      ? `<button class="ref-btn" data-msgid="${id}"><i class="fa-solid fa-paperclip"></i> 참고 ${chunks.length}건</button>`
      : '';

    const html = `
      <div class="msg ${role}" id="${id}">
        <div class="msg-avatar">${isUser ? '<i class="fa-solid fa-user"></i>' : '<i class="fa-solid fa-robot"></i>'}</div>
        <div>
          <div class="msg-bubble">${formatContent(content)}</div>
          <div class="msg-meta">
            <span>${time}</span>
            ${refBtnHtml}
          </div>
        </div>
      </div>
    `;

    $messages.insertAdjacentHTML('beforeend', html);
    if (chunks.length) {
      const btn = document.getElementById(id).querySelector('.ref-btn');
      btn?.addEventListener('click', () => updateRefPanel(chunks));
    }
    scrollToBottom();
    state.chatHistory.push({ role, content, chunks });
  }

  function appendTyping() {
    const id = `typing-${Date.now()}`;
    $messages.insertAdjacentHTML('beforeend', `
      <div class="msg bot" id="${id}">
        <div class="msg-avatar"><i class="fa-solid fa-robot"></i></div>
        <div class="msg-bubble">
          <div class="typing-dots"><span></span><span></span><span></span></div>
        </div>
      </div>
    `);
    scrollToBottom();
    return id;
  }

  function removeTyping(id) {
    document.getElementById(id)?.remove();
  }

  function clearWelcome() {
    $messages.querySelector('.welcome-msg')?.remove();
  }

  function updateRefPanel(chunks) {
    if (!chunks.length) {
      $refList.innerHTML = '<p class="ref-empty">질문 후 참고 문서가 여기에 표시됩니다.</p>';
      setPanel('right', false);
      return;
    }

    $refList.innerHTML = chunks.map((chunk, idx) => `
      <div class="ref-card">
        <div class="ref-card-title">${idx + 1}. ${escHtml(chunk.title || '제목 없음')}</div>
        <span class="ref-card-score">유사도 ${(chunk.score * 100).toFixed(1)}%</span>
        <div class="ref-card-content">${escHtml(chunk.content || '')}</div>
      </div>
    `).join('');
    setPanel('right', true);
  }

  async function handleFileUpload(file) {
    const lowerName = file.name.toLowerCase();
    const allowed = lowerName.endsWith('.txt') || lowerName.endsWith('.pdf');
    if (!allowed) {
      showUploadStatus('error', 'TXT 또는 PDF 파일만 지원합니다.');
      return;
    }

    showUploadStatus('loading', `"${escHtml(file.name)}" 업로드 중…`);
    const form = new FormData();
    form.append('file', file);
    form.append('domain', state.domain);

    try {
      const res = await fetch('/ingest/file', { method: 'POST', body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showUploadStatus('error', `오류: ${err.detail || res.statusText}`);
        return;
      }
      const data = await res.json();
      showUploadStatus('success', `"${escHtml(data.title)}" 등록 완료 (${data.chunks}개 청크)`);
    } catch (err) {
      showUploadStatus('error', `네트워크 오류: ${err.message}`);
    }
  }

  async function ingestText() {
    const title = $textTitle.value.trim();
    const content = $textContent.value.trim();

    if (!title || !content) {
      showUploadStatus('error', '제목과 내용을 모두 입력하세요.');
      return;
    }

    $ingestTextBtn.disabled = true;
    showUploadStatus('loading', '등록 중…');

    try {
      const res = await fetch('/ingest/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: crypto.randomUUID(),
          title,
          content,
          domain: state.domain,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showUploadStatus('error', `오류: ${err.detail || res.statusText}`);
        return;
      }

      const data = await res.json();
      showUploadStatus('success', `"${escHtml(data.title || data.document_id)}" 등록 완료 (${data.chunks}개 청크)`);
      $textTitle.value = '';
      $textContent.value = '';
    } catch (err) {
      showUploadStatus('error', `네트워크 오류: ${err.message}`);
    } finally {
      $ingestTextBtn.disabled = false;
    }
  }

  function updateSimulation() {
    const snapshot = getSimulationSnapshot();
    const { weights, model, total, derivatives } = snapshot;
    const normalizedSuffix = total === 100 ? '' : ' (정규화)';

    $stockWeightLabel.textContent = `${percent(weights.stock)}${normalizedSuffix}`;
    $bondWeightLabel.textContent = `${percent(weights.bond)}${normalizedSuffix}`;
    $altWeightLabel.textContent = `${percent(weights.alt)}${normalizedSuffix}`;
    $futuresContractsLabel.textContent = `${derivatives.futuresContracts}계약`;
    $putCoverageLabel.textContent = percent(derivatives.putCoverage);
    $putPremiumLabel.textContent = percent(derivatives.putPremiumRate);

    if (total === 0) {
      state.currentSimulation = null;
      $simReturn.textContent = '-';
      $simVolatility.textContent = '-';
      $simSharpe.textContent = '-';
      $simDrawdown.textContent = '-';
      $simAllocation.innerHTML = '<span>자산 비중 합계가 0%입니다. 슬라이더를 조정해 포트폴리오를 구성하세요.</span>';
      $simNarrative.innerHTML = '<strong>실습 안내</strong><br>주식/ETF, 채권, 대체·현금 중 하나 이상에 비중을 배분하면 리스크와 성과 지표를 계산합니다.';
      $simScenarioResult.innerHTML = '';
      renderOptionChainSample(snapshot);
      $simCompare.innerHTML = '';
      $simDonut.style.background = '#e2e8f0';
      $simRiskBars.innerHTML = '';
      return;
    }

    const returns = SIMULATION_ASSUMPTIONS.expectedReturns;
    const vols = SIMULATION_ASSUMPTIONS.annualVolatility;
    const corr = SIMULATION_ASSUMPTIONS.correlationMatrix;
    const vector = [weights.stock, weights.bond, weights.alt];

    let variance = 0;
    for (let i = 0; i < vector.length; i += 1) {
      for (let j = 0; j < vector.length; j += 1) {
        variance += vector[i] * vector[j] * vols[i] * vols[j] * corr[i][j];
      }
    }

    const baseReturn = vector.reduce((sum, value, idx) => sum + value * returns[idx], 0);
    // 가장 큰 자산 집중도를 제외한 나머지 비중을 단순 분산효과로 보는 학습용 휴리스틱
    const diversification = 1 - Math.max(...vector);
    const expectedReturn = baseReturn + model.returnBoost + diversification * SIMULATION_ASSUMPTIONS.diversificationBonusScale;
    const volatility = Math.max(
      0.03,
      Math.sqrt(variance) * model.volMultiplier,
    );
    const sharpe = (expectedReturn - SIMULATION_ASSUMPTIONS.riskFreeRate) / volatility;
    // 스트레스 손실은 학습자에게 손실값으로 보이도록 음수로 표기합니다.
    const drawdown = -Math.max(0, (
      volatility * SIMULATION_ASSUMPTIONS.stressVolatilityMultiplier
      + Math.max(0, weights.stock - 0.5) * SIMULATION_ASSUMPTIONS.equityStressPenalty
    ));

    $simReturn.textContent = percent(expectedReturn);
    $simVolatility.textContent = percent(volatility);
    $simSharpe.textContent = sharpe.toFixed(2);
    $simDrawdown.textContent = percent(drawdown);

    state.currentSimulation = {
      expectedReturn,
      volatility,
      sharpe,
      drawdown,
      weights: { ...weights },
      derivatives,
      model: model.label,
    };

    $simAllocation.innerHTML = `
      <div class="allocation-bar" aria-label="정규화 자산 비중">
        <i style="width:${weights.stock * 100}%"></i><i style="width:${weights.bond * 100}%"></i><i style="width:${weights.alt * 100}%"></i>
      </div>
      <div class="allocation-legend">
        <span><b></b>주식/ETF ${percent(weights.stock)}</span>
        <span><b></b>채권 ${percent(weights.bond)}</span>
        <span><b></b>대체·현금 ${percent(weights.alt)}</span>
      </div>
      <small>지수선물 숏 ${derivatives.futuresContracts}계약 · 선물 명목금액 ${formatWon(derivatives.futuresNotional)} · 풋옵션 보호 ${percent(derivatives.putCoverage)} (${formatWon(derivatives.putProtectedNotional)})</small>
    `;
    const stockStop = weights.stock * 100;
    const bondStop = stockStop + weights.bond * 100;
    $simDonut.style.background = `conic-gradient(#2563eb 0 ${stockStop}%, #14b8a6 ${stockStop}% ${bondStop}%, #f59e0b ${bondStop}% 100%)`;
    $simDonut.innerHTML = `<div><strong>${derivatives.futuresContracts} / ${Math.round(derivatives.putCoverage * 100)}%</strong><span>선물 / 풋 보호</span></div>`;
    const riskScale = Math.min(100, volatility * 400);
    const returnScale = Math.min(100, Math.max(0, expectedReturn * 600));
    const stressScale = Math.min(100, Math.abs(drawdown) * 300);
    $simRiskBars.innerHTML = `
      <div><span>기대수익</span><i><b style="width:${returnScale}%"></b></i><strong>${percent(expectedReturn)}</strong></div>
      <div><span>예상변동성</span><i><b style="width:${riskScale}%"></b></i><strong>${percent(volatility)}</strong></div>
      <div class="loss"><span>스트레스 손실</span><i><b style="width:${stressScale}%"></b></i><strong>${percent(drawdown)}</strong></div>`;

    // 정규화 비중 기준의 학습용 분류: 대략적인 성향 비교를 위한 규칙입니다.
    const tilt = weights.stock >= 0.55 ? '공격형' : weights.bond >= 0.4 ? '방어형' : '균형형';
    $simNarrative.innerHTML = `
      <strong>${model.label}</strong> 기준 ${tilt} 포트폴리오입니다.<br>
      ${model.note}<br>
      현재 설정은 기대수익률 ${percent(expectedReturn)}, 예상 변동성 ${percent(volatility)}, 샤프 비율 ${sharpe.toFixed(2)} 수준으로 계산됩니다. 아래 스트레스 테스트에서만 선물 숏과 풋옵션의 단순 손익을 합산합니다.
    `;
    renderScenarioResult(state.currentSimulation);
    renderOptionChainSample(state.currentSimulation);
    renderSavedComparison(state.currentSimulation);
  }

  function renderScenarioResult(snapshot) {
    const scenarios = {
      equity: { title: '주식 급락', detail: '주식/ETF가 크게 하락하고 채권의 완충 효과가 일부 나타나는 상황', stock: -0.22, bond: 0.04, alt: -0.08 },
      rates: { title: '금리 급등', detail: '채권 가격 하락과 위험자산 약세가 동시에 발생하는 상황', stock: -0.07, bond: -0.12, alt: -0.03 },
      inflation: { title: '인플레이션 재확산', detail: '채권 부담과 자산 전반의 변동성이 높아지는 상황', stock: -0.08, bond: -0.09, alt: -0.02 },
    };
    const scenario = scenarios[state.activeScenario];
    const { weights, derivatives } = snapshot;
    const cashPortfolioPnL = derivatives.capital * (
      weights.stock * scenario.stock + weights.bond * scenario.bond + weights.alt * scenario.alt
    );
    // 지수선물 매도는 지수가 내려가면 이익, 오르면 손실이 나는 단순 일일 손익 구조입니다.
    const futuresPnL = derivatives.futuresNotional * -scenario.stock;
    // 등가격 풋옵션은 지수 하락분만큼 보호금액에서 이익이 난다고 단순화했습니다.
    const putPayoff = Math.max(0, -scenario.stock) * derivatives.putProtectedNotional;
    const putPremiumCost = derivatives.putProtectedNotional * derivatives.putPremiumRate;
    const putPnL = putPayoff - putPremiumCost;
    const totalPnL = cashPortfolioPnL + futuresPnL + putPnL;
    const plainLoss = cashPortfolioPnL / derivatives.capital;
    const hedgedLoss = totalPnL / derivatives.capital;
    const change = totalPnL - cashPortfolioPnL;
    $simScenarioResult.innerHTML = `
      <div class="scenario-result-head"><span>${scenario.title} 가정</span><strong>${formatSignedWon(totalPnL)}</strong></div>
      <div class="scenario-breakdown">
        <span>현물 포트폴리오 <b>${formatSignedWon(cashPortfolioPnL)}</b></span>
        <span>지수선물 매도 <b>${formatSignedWon(futuresPnL)}</b></span>
        <span>풋옵션 (행사차익 − 권리금) <b>${formatSignedWon(putPnL)}</b></span>
      </div>
      <p>헤지 전 ${percent(plainLoss)} → 헤지 후 ${percent(hedgedLoss)} (차이 ${formatSignedWon(change)}). ${scenario.detail}입니다. 풋옵션 권리금은 하락하지 않아도 비용이 되며, 선물은 반대로 움직이면 손실·증거금 부담이 생길 수 있습니다.</p>`;
  }

  function renderOptionChainSample(snapshot) {
    const { indexLevel } = snapshot.derivatives;
    const step = indexLevel >= 100 ? 5 : 1;
    const atTheMoney = Math.round(indexLevel / step) * step;
    const strikes = [-2, -1, 0, 1, 2].map(offset => atTheMoney + offset * step);
    const rows = strikes.map((strike, index) => {
      const distance = strike - indexLevel;
      const timeValue = 7 + Math.max(0, 8 - Math.abs(distance) * 0.45);
      const callPremium = Math.max(0, -distance) + timeValue;
      const putPremium = Math.max(0, distance) + timeValue;
      const impliedVolatility = 17 + Math.abs(distance) * 0.16;
      const callOi = 780 + (4 - index) * 165;
      const putOi = 720 + index * 175;
      const marker = Math.abs(distance) < step / 2 ? '<small class="atm-marker">ATM</small>' : '';
      return `<tr>
        <td>${callPremium.toFixed(1)}</td><td>${impliedVolatility.toFixed(1)}%</td><td>${callOi.toLocaleString('ko-KR')}</td>
        <th>${strike.toFixed(step === 1 ? 0 : 1)}${marker}</th>
        <td>${putPremium.toFixed(1)}</td><td>${impliedVolatility.toFixed(1)}%</td><td>${putOi.toLocaleString('ko-KR')}</td>
      </tr>`;
    }).join('');
    $optionChainSample.innerHTML = `
      <div class="option-chain-summary">
        <strong>가정 지수 ${indexLevel.toFixed(1)}</strong>
        <span>가운데 행의 ATM(등가격)은 현재 지수와 행사가가 가장 가까운 계약입니다.</span>
      </div>
      <div class="option-chain-scroll">
        <table class="option-chain-table">
          <caption>만기까지 약 30일 남은 지수옵션의 예시 표</caption>
          <thead><tr><th colspan="3" scope="colgroup">콜옵션: 오를 때 유리한 살 권리</th><th scope="col">행사가</th><th colspan="3" scope="colgroup">풋옵션: 내릴 때 유리한 팔 권리</th></tr>
          <tr><th>프리미엄</th><th>IV</th><th>OI</th><th>정한 가격</th><th>프리미엄</th><th>IV</th><th>OI</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="option-chain-explainer">
        <p><b>프리미엄</b>은 옵션 한 계약의 권리 가격입니다. 콜은 지수가 오를수록, 풋은 지수가 내릴수록 보통 가치가 커집니다.</p>
        <p><b>IV(내재변동성)</b>는 시장이 예상하는 앞으로의 흔들림을 숫자로 나타낸 것입니다. 높을수록 옵션 프리미엄도 비싸질 수 있습니다.</p>
        <p><b>OI(미결제약정)</b>는 아직 청산되지 않은 계약 수입니다. 거래량이나 OI가 많다고 가격 방향이 확정되는 것은 아닙니다.</p>
      </div>
      <p class="option-chain-disclaimer">표의 프리미엄·IV·OI는 입력한 가정 지수를 기준으로 만든 예시입니다. 실제 옵션 체인, 호가, 만기, 수수료, 거래 가능 여부를 반영하지 않으며 매매 신호가 아닙니다.</p>`;
  }

  function renderSavedComparison(snapshot) {
    if (!state.savedSimulation) {
      $simCompare.innerHTML = '<span><i class="fa-regular fa-bookmark"></i> 현재 설정을 저장하면 다음 조정안과 수익률·변동성을 비교할 수 있습니다.</span>';
      return;
    }
    const saved = state.savedSimulation;
    const diff = (value, previous) => `${value - previous >= 0 ? '+' : ''}${percent(value - previous)}`;
    $simCompare.innerHTML = `<strong><i class="fa-solid fa-code-compare"></i> 저장한 설정과 비교</strong><div><span>기대수익률 ${diff(snapshot.expectedReturn, saved.expectedReturn)}</span><span>변동성 ${diff(snapshot.volatility, saved.volatility)}</span><span>스트레스 손실 ${diff(snapshot.drawdown, saved.drawdown)}</span></div><small>기준: ${saved.model} · 주식/ETF ${percent(saved.weights.stock)} · 채권 ${percent(saved.weights.bond)}</small>`;
  }

  function buildSimulationPrompt() {
    const snapshot = getSimulationSnapshot();
    const model = snapshot.model.label;
    const { derivatives } = snapshot;
    const allocation = `포트폴리오 금액은 ${formatWon(derivatives.capital)}이고, 정규화 비중은 주식/ETF ${percent(snapshot.weights.stock)}, 채권 ${percent(snapshot.weights.bond)}, 대체·현금 ${percent(snapshot.weights.alt)}입니다. 지수선물 ${derivatives.futuresContracts}계약 매도(명목 ${formatWon(derivatives.futuresNotional)})와 주식/ETF 노출의 ${percent(derivatives.putCoverage)}를 보호하는 풋옵션(권리금 가정 ${percent(derivatives.putPremiumRate)})을 사용합니다.`;
    return `${model} 기준 실습 포트폴리오를 설명해줘. ${allocation}. 금융상품과 자산배분 관점에서 선물 매도와 풋옵션 매수의 역할, 주요 위험, 리밸런싱 포인트를 정리해줘.`;
  }

  function getSimulationSnapshot() {
    const raw = {
      stock: Number($stockWeight.value),
      bond: Number($bondWeight.value),
      alt: Number($altWeight.value),
    };
    const total = raw.stock + raw.bond + raw.alt;
    const safeTotal = total || 0.001;
    const capital = Math.max(1000000, Number($portfolioCapital.value) || 100000000);
    const indexLevel = Math.max(100, Number($futuresIndexLevel.value) || 400);
    const futuresContracts = Number($futuresContracts.value);
    const putCoverage = Number($putCoverage.value) / 100;
    const putPremiumRate = Number($putPremium.value) / 100;
    const stockWeight = raw.stock / safeTotal;
    const futuresNotional = indexLevel * SIMULATION_ASSUMPTIONS.indexFuturesMultiplier * futuresContracts;
    const putProtectedNotional = capital * stockWeight * putCoverage;
    return {
      raw,
      total,
      model: MODEL_META[$modelSelect.value],
      weights: {
        stock: stockWeight,
        bond: raw.bond / safeTotal,
        alt: raw.alt / safeTotal,
      },
      derivatives: {
        capital,
        indexLevel,
        futuresContracts,
        futuresNotional,
        putCoverage,
        putPremiumRate,
        putProtectedNotional,
      },
    };
  }

  function formatContent(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
  }

  function showUploadStatus(type, msg) {
    $uploadStatus.className = `upload-status ${type}`;
    $uploadStatus.innerHTML = msg;
    $uploadStatus.classList.remove('hidden');
    if (type === 'success') {
      setTimeout(() => $uploadStatus.classList.add('hidden'), 4000);
    }
  }

  function setInputDisabled(disabled) {
    $sendBtn.disabled = disabled;
    $questionInput.disabled = disabled;
  }

  function resizeInput() {
    $questionInput.style.height = 'auto';
    $questionInput.style.height = `${Math.min($questionInput.scrollHeight, 140)}px`;
  }

  function scrollToBottom() {
    $messages.scrollTop = $messages.scrollHeight;
  }

  function percent(value) {
    return `${(value * 100).toFixed(1)}%`;
  }

  function formatWon(value) {
    return `${Math.round(value).toLocaleString('ko-KR')}원`;
  }

  function formatSignedWon(value) {
    return `${value >= 0 ? '+' : '−'}${formatWon(Math.abs(value))}`;
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  updateSimulation();
  setView('home');
  $topKLabel.textContent = state.topK;
})();
