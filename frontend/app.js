(function () {
  'use strict';

  const state = {
    domain: 'finance',
    sessionId: crypto.randomUUID(),
    topK: 4,
    loading: false,
    chatHistory: [],
    activeView: 'home',
    activeTheoryDay: 1,
    quizIndex: 0,
    quizAnswers: [],
  };

  const QUIZ_QUESTIONS = [
    {
      category: '금융상품',
      question: 'ETF를 일반펀드와 비교할 때, 장중 실시간으로 거래되는 특성과 가장 직접적으로 연결되는 항목은 무엇인가요?',
      choices: ['기준가가 하루 한 번만 산정된다', '호가 스프레드와 거래 유동성을 확인한다', '만기까지 중도 환매가 불가능하다', '예금자보호 한도가 적용된다'],
      answer: 1,
      explanation: 'ETF는 거래소에서 실시간으로 매매되므로 거래대금, 호가 스프레드, 괴리율을 함께 점검해야 합니다.',
    },
    {
      category: '성과·위험',
      question: '최대낙폭(MDD)이 특히 잘 보여 주는 정보는 무엇인가요?',
      choices: ['특정 기간의 최고점 대비 가장 큰 하락 폭', '매년 평균 수익률', '무위험수익률 대비 초과수익', '자산 간 상관관계'],
      answer: 0,
      explanation: 'MDD는 고점에서 저점까지의 가장 큰 하락 폭으로, 투자자가 견뎌야 할 손실 구간을 파악하는 데 쓰입니다.',
    },
    {
      category: '자산배분',
      question: 'Risk Parity 접근의 핵심 목표로 가장 알맞은 것은 무엇인가요?',
      choices: ['모든 자산에 동일한 금액을 투자한다', '기대수익률이 가장 큰 자산만 편입한다', '각 자산의 위험기여도를 균형 있게 조정한다', '매월 가장 많이 오른 자산으로 교체한다'],
      answer: 2,
      explanation: 'Risk Parity는 자본 비중이 아니라 포트폴리오 위험에 각 자산이 기여하는 정도를 균형 있게 보는 방식입니다.',
    },
    {
      category: '포트폴리오 이론',
      question: '분산투자 효과를 설명할 때 자산 간 상관관계가 중요한 이유는 무엇인가요?',
      choices: ['상관관계가 낮으면 함께 움직일 가능성이 낮아 전체 변동성을 낮출 수 있다', '상관관계는 수익률 계산에만 쓰이고 위험과는 무관하다', '상관관계가 높을수록 항상 분산 효과가 커진다', '상관관계는 채권에만 적용된다'],
      answer: 0,
      explanation: '같은 방향으로 덜 움직이는 자산을 결합하면 개별 자산의 변동성이 포트폴리오에서 일부 상쇄될 수 있습니다.',
    },
    {
      category: '자산배분',
      question: '블랙-리터만 모델은 평균-분산 최적화의 어떤 문제를 완화하는 데 유용한가요?',
      choices: ['입력값 변화에 따라 최적 비중이 과도하게 흔들리는 문제', 'ETF의 거래소 상장 문제', '채권의 이자 지급 문제', '현금의 유동성 문제'],
      answer: 0,
      explanation: '시장 균형수익률과 투자자의 전망을 결합해 기대수익률 추정의 불안정성을 낮추려는 접근입니다.',
    },
  ];

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
  ];

  const THEORY_DAYS = [
    {
      day: 1,
      icon: 'fa-compass',
      title: '금융상품과 투자 기초',
      subtitle: '돈을 쓰는 목적과 위험의 크기를 먼저 정하면 상품 선택이 쉬워집니다.',
      goal: '저축과 투자의 차이, 수익률·위험·유동성의 의미를 설명할 수 있어요.',
      keywords: ['원금', '수익률', '위험', '유동성', '분산투자'],
      lessons: [
        ['저축과 투자는 무엇이 다른가요?', ['저축은 가까운 미래에 쓸 돈을 비교적 안전하게 보관하는 데 알맞습니다. 예금·적금이 대표적입니다.', '투자는 시간이 지나며 자산을 키우기 위해 가격 변동을 감수하는 선택입니다. 주식, 채권, 펀드, ETF 등이 여기에 해당합니다.', '둘 중 하나만 고르는 문제가 아닙니다. 생활비와 비상금은 먼저 확보하고, 남는 돈의 기간과 목표에 맞춰 투자 여부를 판단합니다.']],
        ['상품을 고를 때 보는 세 가지', ['수익률은 돈이 얼마나 늘어날 가능성이 있는지, 위험은 예상과 다르게 줄어들 수 있는 정도를 뜻합니다.', '유동성은 필요할 때 현금으로 바꾸기 쉬운 정도입니다. 수익률이 높아 보여도 급하게 돈이 필요할 때 팔기 어렵다면 내 상황에는 맞지 않을 수 있습니다.', '“높은 수익률, 낮은 위험, 높은 유동성”을 동시에 모두 얻기는 어렵다는 점을 기억하세요.']],
        ['기본 금융상품 지도', ['예금·적금은 안정성과 목적자금 관리에, 주식은 기업 성장에 참여하는 데 쓰입니다.', '채권은 정부나 기업에 돈을 빌려주고 이자와 원금을 받는 구조입니다. ETF·펀드는 여러 자산을 한 상품에 담아 분산투자를 쉽게 합니다.', '상품 이름보다 “무엇에 투자하는지, 비용은 얼마인지, 어떤 위험이 있는지”를 먼저 확인하세요.']],
      ],
      check: '내가 1년 안에 꼭 써야 하는 돈과 5년 이상 기다릴 수 있는 돈을 나누어 적어 보세요.',
      ragPrompt: '저축과 투자의 차이, 수익률·위험·유동성의 관계를 고등학생 수준의 예시로 설명해줘.',
    },
    {
      day: 2,
      icon: 'fa-chart-line',
      title: '주식 · ETF · 펀드',
      subtitle: '기업 한 곳에 투자할지, 여러 자산을 묶은 바구니를 고를지 이해합니다.',
      goal: '주식, ETF, 펀드의 구조와 확인할 비용·유동성 항목을 구분할 수 있어요.',
      keywords: ['주주', '배당', 'ETF', '총보수', '괴리율'],
      lessons: [
        ['주식은 기업의 작은 주인이 되는 증서', ['주식을 사면 그 기업의 지분 일부를 갖게 됩니다. 기업의 성과와 기대에 따라 가격이 오르내리고, 일부 기업은 이익을 배당으로 나눕니다.', '좋은 회사라고 해서 언제나 좋은 투자 결과를 주는 것은 아닙니다. 이미 비싼 가격에 거래되고 있거나 산업 환경이 바뀔 수 있기 때문입니다.', '한 기업에만 돈이 몰리면 그 기업의 문제에 크게 흔들릴 수 있습니다.']],
        ['ETF와 펀드는 왜 바구니라고 부르나요?', ['ETF와 펀드는 여러 주식·채권 등을 한데 묶어 투자할 수 있게 합니다. 하나의 상품만 사도 여러 자산에 나누어 투자하는 효과를 기대할 수 있습니다.', 'ETF는 거래소에서 주식처럼 장중에 사고팔 수 있고, 펀드는 보통 하루 한 번 기준가격으로 가입·환매가 처리됩니다.', '바구니라고 해서 위험이 사라지는 것은 아닙니다. 특정 국가·산업에만 담긴 ETF는 여전히 크게 움직일 수 있습니다.']],
        ['구매 전 확인표', ['ETF는 무엇을 추종하는지, 총보수, 거래량, 호가 차이(스프레드), 시장가격과 순자산가치의 차이(괴리율)를 봅니다.', '펀드는 운용 전략, 보수, 환매에 걸리는 시간, 편입 자산을 살핍니다.', '과거 수익률은 참고 자료일 뿐 미래 성과를 보장하지 않습니다.']],
      ],
      check: '관심 있는 ETF 하나를 골라 “무엇을 담는지”와 “연간 총보수”를 찾아 보세요.',
      ragPrompt: '주식, ETF, 펀드의 차이를 투자 초보자가 이해할 수 있게 비교해줘. ETF 확인 항목도 알려줘.',
    },
    {
      day: 3,
      icon: 'fa-landmark',
      title: '채권 · 금리 · 파생상품',
      subtitle: '빌려준 돈의 약속과 가격 변동, 그리고 위험을 줄이기 위한 도구를 살펴봅니다.',
      goal: '채권 가격과 금리의 관계, 파생상품의 헤지 목적과 위험을 설명할 수 있어요.',
      keywords: ['만기', '이자', '금리', '신용위험', '헤지'],
      lessons: [
        ['채권은 돈을 빌려준 약속장', ['채권을 산다는 것은 정부나 기업에 돈을 빌려주고 정해진 이자와 만기 원금을 받기로 하는 것입니다.', '국채는 정부가 발행하고, 회사채는 기업이 발행합니다. 발행자가 약속한 돈을 갚지 못할 가능성은 신용위험이라고 합니다.', '만기가 길수록 금리 변화에 가격이 더 민감해지는 경향이 있습니다. 이를 설명할 때 듀레이션이라는 지표를 사용합니다.']],
        ['금리가 오르면 채권 가격은 왜 내려갈까요?', ['새로 나온 채권의 이자가 더 높아지면, 기존의 낮은 이자를 주는 채권은 같은 가격으로는 매력이 줄어듭니다. 그래서 기존 채권 가격이 조정될 수 있습니다.', '반대로 금리가 내려가면 기존에 높은 이자를 약속한 채권의 매력이 커져 가격이 오를 수 있습니다.', '채권도 중간에 팔면 손익이 생길 수 있으므로 “항상 안전하다”고 단정할 수는 없습니다.']],
        ['파생상품은 보험처럼도 쓰입니다', ['선물·옵션 같은 파생상품은 주가, 금리, 환율 등의 움직임을 바탕으로 한 계약입니다.', '가격 하락이 걱정될 때 손실을 일부 줄이는 헤지에 활용할 수 있지만, 구조가 복잡하고 손실이 빠르게 커질 수도 있습니다.', '학습 단계에서는 “어떤 위험을 줄이려는 계약인지, 최대 손실은 얼마인지”를 먼저 묻는 습관이 중요합니다.']],
      ],
      check: '금리가 오를 때 기존 채권 가격이 왜 달라질 수 있는지 자신의 말로 한 문장 써 보세요.',
      ragPrompt: '채권 가격과 금리의 관계, 듀레이션, 파생상품 헤지의 기본을 쉬운 예시로 설명해줘.',
    },
    {
      day: 4,
      icon: 'fa-chart-column',
      title: '포트폴리오와 위험 지표',
      subtitle: '한 종목의 성과보다 여러 자산을 함께 봐야 하는 이유를 배웁니다.',
      goal: '분산투자, 상관관계, 변동성, MDD, 샤프 비율의 역할을 말할 수 있어요.',
      keywords: ['상관관계', '변동성', 'MDD', '샤프 비율', '위험기여도'],
      lessons: [
        ['분산투자는 왜 필요한가요?', ['서로 다른 방식으로 움직이는 자산을 섞으면 한 자산의 하락이 전체 포트폴리오에 미치는 충격을 줄일 수 있습니다.', '이를 판단할 때 상관관계를 봅니다. 상관관계가 낮다는 것은 두 자산이 같은 방향으로만 움직이지 않을 가능성이 있다는 뜻입니다.', '자산을 많이 담는 것만으로는 충분하지 않습니다. 비슷한 산업·국가에 몰려 있으면 실제로는 한 방향으로 움직일 수 있습니다.']],
        ['위험을 읽는 네 가지 숫자', ['변동성은 수익률이 평소에 얼마나 크게 흔들렸는지 보여 줍니다. 숫자가 크면 오르내림도 큰 편입니다.', 'MDD(최대낙폭)는 최고점에서 가장 크게 떨어진 폭입니다. 내가 실제로 견딜 수 있는 손실을 생각하는 데 도움이 됩니다.', '샤프 비율은 감수한 변동성에 비해 수익이 어느 정도였는지 비교하는 지표입니다. 하나의 숫자만으로 투자 결정을 내리면 안 됩니다.']],
        ['수익률보다 먼저 물어볼 질문', ['“얼마나 벌었나?”와 함께 “얼마나 크게, 얼마나 오래 손실을 견뎠나?”를 봐야 합니다.', '같은 수익률이라도 손실 폭이 작고 회복 과정이 안정적인 포트폴리오가 어떤 사람에게는 더 적합할 수 있습니다.', '내 투자 기간, 목표, 손실 허용 범위가 위험 지표를 해석하는 기준입니다.']],
      ],
      check: '수익률이 같다면 변동성과 MDD가 더 작은 포트폴리오를 선호할 이유를 생각해 보세요.',
      ragPrompt: '분산투자와 상관관계, 변동성, MDD, 샤프 비율을 고등학생도 이해할 수 있게 설명해줘.',
    },
    {
      day: 5,
      icon: 'fa-scale-balanced',
      title: '자산배분과 리밸런싱',
      subtitle: '목표와 위험 수준에 맞게 비중을 정하고, 흔들리지 않도록 규칙을 세웁니다.',
      goal: '자산배분의 의미와 리밸런싱 원칙을 자신의 투자 계획에 적용할 수 있어요.',
      keywords: ['자산배분', '리밸런싱', '목표수익률', '위험허용도', '투자기간'],
      lessons: [
        ['자산배분은 비중을 정하는 일', ['자산배분은 주식, 채권, 현금성 자산 등 어디에 얼마씩 나눌지 정하는 과정입니다.', '정답 비중은 사람마다 다릅니다. 투자 기간이 길고 가격 변동을 견딜 수 있는지, 언제 돈을 써야 하는지가 기준이 됩니다.', '평균분산, 블랙-리터만, Risk Parity 같은 모델은 생각을 돕는 도구입니다. 미래를 정확히 맞히는 기계는 아닙니다.']],
        ['리밸런싱은 원래 계획으로 돌아오는 규칙', ['시간이 지나면 많이 오른 자산의 비중이 커져 처음 계획보다 위험이 커질 수 있습니다.', '리밸런싱은 일정 기간마다 또는 목표 비중에서 일정 폭 벗어났을 때 비중을 조정하는 방법입니다.', '매일 자주 바꾸기보다, 미리 정한 규칙과 거래비용·세금을 함께 고려하는 것이 좋습니다.']],
        ['나만의 한 장 투자 원칙', ['목표: 언제 어떤 목적으로 돈을 쓸지 적습니다.', '범위: 감당할 수 있는 최대 손실과 각 자산의 목표 비중을 정합니다.', '점검: 분기 또는 반기처럼 점검 시점과 리밸런싱 조건을 미리 기록합니다.']],
      ],
      check: '목표, 투자기간, 손실 허용 범위, 점검 주기 네 줄로 나만의 가상 투자 원칙을 작성해 보세요.',
      ragPrompt: '자산배분과 리밸런싱이 왜 필요한지, 평균분산·블랙-리터만·Risk Parity를 학습용으로 비교해줘.',
    },
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

  // 학습용 시뮬레이션 가정치: 무위험수익률, 헤지 비용/완충 효과, 스트레스 손실 보정치
  const SIMULATION_ASSUMPTIONS = {
    riskFreeRate: 0.02,
    diversificationBonusScale: 0.004,
    hedgeCostPerUnit: 0.01,
    hedgeVolatilityReduction: 0.35,
    stressVolatilityMultiplier: 1.55,
    equityStressPenalty: 0.08,
    hedgeStressOffset: 0.025,
    expectedReturns: [0.082, 0.038, 0.052],
    annualVolatility: [0.19, 0.065, 0.11],
    correlationMatrix: [
      [1.0, 0.18, 0.42],
      [0.18, 1.0, 0.10],
      [0.42, 0.10, 1.0],
    ],
  };

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
  const $theoryDayButtons = Array.from(document.querySelectorAll('[data-theory-day]'));
  const $modelSelect = document.getElementById('modelSelect');
  const $stockWeight = document.getElementById('stockWeight');
  const $bondWeight = document.getElementById('bondWeight');
  const $altWeight = document.getElementById('altWeight');
  const $hedgeRatio = document.getElementById('hedgeRatio');
  const $stockWeightLabel = document.getElementById('stockWeightLabel');
  const $bondWeightLabel = document.getElementById('bondWeightLabel');
  const $altWeightLabel = document.getElementById('altWeightLabel');
  const $hedgeRatioLabel = document.getElementById('hedgeRatioLabel');
  const $simReturn = document.getElementById('simReturn');
  const $simVolatility = document.getElementById('simVolatility');
  const $simSharpe = document.getElementById('simSharpe');
  const $simDrawdown = document.getElementById('simDrawdown');
  const $simPromptBtn = document.getElementById('simPromptBtn');
  const $simAllocation = document.getElementById('simAllocation');
  const $simNarrative = document.getElementById('simNarrative');
  const $chatInputArea = document.querySelector('.chat-input-area');
  const $viewButtons = Array.from(document.querySelectorAll('.brand-nav-btn'));
  const $offcanvasBackdrop = document.getElementById('offcanvasBackdrop');
  const $openLeftPanel = document.getElementById('openLeftPanel');
  const $openRightPanel = document.getElementById('openRightPanel');
  const $closeLeftPanel = document.getElementById('closeLeftPanel');

  document.querySelectorAll('.sim-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      $stockWeight.value = btn.dataset.stock;
      $bondWeight.value = btn.dataset.bond;
      $altWeight.value = btn.dataset.alt;
      $hedgeRatio.value = btn.dataset.hedge;
      updateSimulation();
    });
  });

  $theoryDayButtons.forEach(btn => {
    btn.addEventListener('click', () => openTheoryDay(Number(btn.dataset.theoryDay)));
  });

  $viewButtons.forEach(btn => {
    btn.addEventListener('click', () => setView(btn.dataset.view));
  });

  $openLeftPanel.addEventListener('click', () => togglePanel('left'));
  $openRightPanel.addEventListener('click', () => togglePanel('right'));
  $closeLeftPanel.addEventListener('click', () => setPanel('left', false));
  $offcanvasBackdrop.addEventListener('click', () => closePanels());
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closePanels();
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

  [$modelSelect, $stockWeight, $bondWeight, $altWeight, $hedgeRatio].forEach(input => {
    input.addEventListener('input', updateSimulation);
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
    if (view === 'theory') renderTheoryIndex();
    if (view === 'quiz') renderQuiz();
    if (view === 'simulation') renderSimulationGuide();
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

  function renderHome() {
    const modules = [
      ['5일 이론 학습', '금융상품부터 자산배분·리밸런싱까지 하루 한 주제씩 읽습니다.', 'fa-calendar-days', 'theory'],
      ['개념 퀴즈', 'ETF, 채권, 분산투자와 위험 지표의 핵심을 확인합니다.', 'fa-circle-question', 'quiz'],
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

    $messages.innerHTML = `
      <article class="content-page home-page">
        <div class="content-kicker">FINANCE LEARNING LAB · RAG 기반 학습</div>
        <h1>금융상품을 이해하고,<br><mark>나만의 자산배분 원칙</mark>을 설계합니다.</h1>
        <p class="content-lead">교재형 콘텐츠, 개념 퀴즈, 학습용 포트폴리오 시뮬레이션과 근거 문서 기반 RAG를 한 흐름으로 제공합니다.</p>
        <div class="home-actions">
          <button class="content-cta" data-go="theory"><i class="fa-solid fa-calendar-days"></i> 5일 이론 학습 시작</button>
          <button class="content-cta" data-go="learn"><i class="fa-solid fa-comments"></i> RAG에게 질문하기</button>
          <button class="content-secondary" data-go="quiz"><i class="fa-solid fa-circle-question"></i> 5문제 퀴즈 풀기</button>
        </div>
        <section class="home-stats">
          <div><strong>3</strong><span>학습 방식<br>콘텐츠 · 퀴즈 · 실습</span></div>
          <div><strong>5</strong><span>핵심 지표<br>CAGR · 변동성 · MDD 등</span></div>
          <div><strong>3</strong><span>배분 모델<br>MVO · BL · RP</span></div>
        </section>
        <section class="content-section"><div class="section-heading"><span>01</span><h2>학습 메뉴</h2></div><div class="home-module-grid">${modules}</div></section>
        <section class="content-section"><div class="section-heading"><span>02</span><h2>금융상품, 쉽게 시작하기</h2></div><p class="section-intro">투자는 ‘얼마나 많이 버는가’보다 <strong>내 돈이 어디에 쓰이고 어떤 상황에서 줄어들 수 있는가</strong>를 이해하는 일에서 시작합니다.</p><div class="product-explainer-grid">${explainers}</div></section>
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

  function renderQuiz() {
    const question = QUIZ_QUESTIONS[state.quizIndex];
    const complete = state.quizIndex >= QUIZ_QUESTIONS.length;
    if (complete) {
      const score = state.quizAnswers.filter((answer, i) => answer === QUIZ_QUESTIONS[i].answer).length;
      const saved = JSON.parse(localStorage.getItem('finance-rag-quiz-results') || '[]');
      if (!state.quizAnswers.saved) {
        saved.unshift({ score, total: QUIZ_QUESTIONS.length, completedAt: new Date().toISOString() });
        localStorage.setItem('finance-rag-quiz-results', JSON.stringify(saved.slice(0, 10)));
        state.quizAnswers.saved = true;
      }
      $messages.innerHTML = `<article class="content-page quiz-page quiz-result"><div class="content-kicker">QUIZ RESULT</div><div class="result-ring"><strong>${score}</strong><span>/ ${QUIZ_QUESTIONS.length}</span></div><h1>${score >= 4 ? '훌륭합니다. 핵심 개념을 잘 이해하고 있어요.' : '풀이를 바탕으로 핵심 개념을 다시 연결해 보세요.'}</h1><p class="content-lead">정답과 해설을 복습한 뒤 시뮬레이션에서 자산 비중을 바꿔 보세요.</p><div class="quiz-review">${QUIZ_QUESTIONS.map((item, i) => `<div class="review-row ${state.quizAnswers[i] === item.answer ? 'correct' : 'incorrect'}"><span>${i + 1}</span><div><strong>${state.quizAnswers[i] === item.answer ? '정답' : '복습 필요'} · ${item.category}</strong><p>${item.explanation}</p></div></div>`).join('')}</div><div class="home-actions"><button class="content-cta" data-reset-quiz><i class="fa-solid fa-rotate-right"></i> 다시 풀기</button><button class="content-secondary" data-go="simulation">시뮬레이션으로 이동</button></div></article>`;
      $messages.querySelector('[data-reset-quiz]').addEventListener('click', () => { state.quizIndex = 0; state.quizAnswers = []; renderQuiz(); });
      bindViewLinks();
      return;
    }
    $messages.innerHTML = `<article class="content-page quiz-page"><div class="quiz-topline"><span class="content-kicker">${question.category.toUpperCase()} QUIZ</span><span>${state.quizIndex + 1} / ${QUIZ_QUESTIONS.length}</span></div><div class="quiz-progress"><i style="width:${((state.quizIndex + 1) / QUIZ_QUESTIONS.length) * 100}%"></i></div><h1>${question.question}</h1><p class="content-lead">가장 적절한 답을 하나 선택하세요.</p><div class="quiz-choices">${question.choices.map((choice, index) => `<button class="quiz-choice" data-answer="${index}"><span>${String.fromCharCode(65 + index)}</span>${choice}</button>`).join('')}</div><div id="quizFeedback"></div></article>`;
    $messages.querySelectorAll('[data-answer]').forEach(button => button.addEventListener('click', () => answerQuiz(Number(button.dataset.answer))));
  }

  function answerQuiz(answer) {
    const question = QUIZ_QUESTIONS[state.quizIndex];
    const correct = answer === question.answer;
    state.quizAnswers[state.quizIndex] = answer;
    $messages.querySelectorAll('.quiz-choice').forEach(button => {
      const value = Number(button.dataset.answer);
      button.disabled = true;
      if (value === question.answer) button.classList.add('correct');
      if (value === answer && !correct) button.classList.add('incorrect');
    });
    document.getElementById('quizFeedback').innerHTML = `<div class="quiz-feedback ${correct ? 'correct' : 'incorrect'}"><strong>${correct ? '정답입니다.' : '다시 확인해 보세요.'}</strong><p>${question.explanation}</p><button class="content-cta" id="nextQuizBtn">${state.quizIndex + 1 === QUIZ_QUESTIONS.length ? '결과 보기' : '다음 문제'} <i class="fa-solid fa-arrow-right"></i></button></div>`;
    document.getElementById('nextQuizBtn').addEventListener('click', () => { state.quizIndex += 1; renderQuiz(); });
  }

  function renderSimulationGuide() {
    $messages.innerHTML = `<article class="content-page simulation-page"><div class="content-kicker">ALLOCATION SIMULATOR</div><h1>비중을 바꾸며 위험과<br><mark>수익의 균형</mark>을 살펴보세요.</h1><p class="content-lead">오른쪽 시뮬레이터에서 주식/ETF·채권·대체/현금 비중과 헤지 강도를 조정하면 학습용 가정에 따른 기대수익률, 변동성, 샤프 비율, 스트레스 손실을 확인할 수 있습니다.</p><div class="simulation-steps"><div><span>01</span><h3>모델 선택</h3><p>평균분산, 블랙-리터만, Risk Parity의 관점을 선택합니다.</p></div><div><span>02</span><h3>비중 조정</h3><p>투자 성향 프리셋을 출발점으로 자산 비중과 헤지 강도를 수정합니다.</p></div><div><span>03</span><h3>RAG로 해석</h3><p>‘이 설정으로 RAG 질문 만들기’로 결과와 리스크를 문서 근거로 검토합니다.</p></div></div><section class="markdown-card warning-card"><h2><i class="fa-solid fa-circle-info"></i> 시뮬레이션 가정</h2><p>표시 수치는 교육을 위한 단순화된 가정과 상관관계 행렬을 사용한 예시이며, 실시간 가격·세금·수수료·상품별 제약을 반영하지 않습니다.</p></section></article>`;
  }

  function renderTheoryIndex() {
    const dayCards = THEORY_DAYS.map(item => `
      <button class="theory-day-card" data-theory-day-link="${item.day}">
        <span class="theory-day-number">DAY ${item.day}</span>
        <i class="fa-solid ${item.icon}"></i>
        <h2>${escHtml(item.title)}</h2>
        <p>${escHtml(item.subtitle)}</p>
        <small>학습 목표 · ${escHtml(item.goal)}</small>
        <em>내용 보기 <i class="fa-solid fa-arrow-right"></i></em>
      </button>
    `).join('');
    $messages.innerHTML = `
      <article class="content-page theory-page">
        <div class="content-kicker">5-DAY FINANCE THEORY</div>
        <h1>하루 하나씩 읽는<br><mark>금융상품·자산배분 이론</mark></h1>
        <p class="content-lead">각 일차 메뉴는 독립적으로 읽을 수 있습니다. 개념을 먼저 읽고, 궁금한 점은 RAG 학습으로 이어서 질문해 보세요.</p>
        <section class="theory-overview">
          <div><strong>5일</strong><span>짧고 분명한 이론 학습</span></div>
          <div><strong>고등학생 수준</strong><span>어려운 용어는 쉬운 말로 풉니다</span></div>
          <div><strong>실천 질문</strong><span>매일 한 가지 확인 과제가 있습니다</span></div>
        </section>
        <section class="theory-index-grid">${dayCards}</section>
        <p class="content-disclaimer">학습용 콘텐츠이며 특정 상품의 매수·매도를 권유하지 않습니다.</p>
      </article>`;
    bindTheoryLinks();
  }

  function openTheoryDay(day) {
    const lesson = THEORY_DAYS.find(item => item.day === day);
    if (!lesson) return;
    state.activeTheoryDay = day;
    state.activeView = 'theory';
    $viewButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.view === 'theory'));
    $chatInputArea.classList.add('hidden');
    $clearChatBtn.classList.add('hidden');
    $theoryDayButtons.forEach(btn => btn.classList.toggle('active', Number(btn.dataset.theoryDay) === day));
    setPanel('left', false);
    renderTheoryDay(lesson);
  }

  function renderTheoryDay(lesson) {
    const lessonBlocks = lesson.lessons.map(([heading, paragraphs], index) => `
      <section class="theory-lesson">
        <span>${String(index + 1).padStart(2, '0')}</span>
        <div><h2>${escHtml(heading)}</h2>${paragraphs.map(text => `<p>${escHtml(text)}</p>`).join('')}</div>
      </section>
    `).join('');
    const previous = lesson.day > 1 ? lesson.day - 1 : null;
    const next = lesson.day < THEORY_DAYS.length ? lesson.day + 1 : null;
    $messages.innerHTML = `
      <article class="content-page theory-page theory-detail-page">
        <button class="theory-back" data-go="theory"><i class="fa-solid fa-arrow-left"></i> 5일 이론 전체 보기</button>
        <div class="theory-detail-heading">
          <span class="theory-day-number">DAY ${lesson.day} / ${THEORY_DAYS.length}</span>
          <i class="fa-solid ${lesson.icon}"></i>
          <h1>${escHtml(lesson.title)}</h1>
          <p>${escHtml(lesson.subtitle)}</p>
        </div>
        <div class="theory-progress" aria-label="5일 학습 중 ${lesson.day}일차">${THEORY_DAYS.map(item => `<i class="${item.day <= lesson.day ? 'done' : ''}"></i>`).join('')}</div>
        <section class="theory-goal"><strong>오늘의 학습 목표</strong><p>${escHtml(lesson.goal)}</p></section>
        <div class="theory-lesson-list">${lessonBlocks}</div>
        <section class="theory-check"><i class="fa-solid fa-pen-to-square"></i><div><strong>오늘의 확인</strong><p>${escHtml(lesson.check)}</p></div></section>
        <section class="theory-keywords"><strong>핵심 단어</strong><div>${lesson.keywords.map(word => `<span>${escHtml(word)}</span>`).join('')}</div></section>
        <div class="theory-actions">
          <button class="content-cta" data-theory-rag="${escHtml(lesson.ragPrompt)}"><i class="fa-solid fa-comments"></i> 이 내용 RAG에게 질문하기</button>
          ${previous ? `<button class="content-secondary" data-theory-day-link="${previous}"><i class="fa-solid fa-arrow-left"></i> ${previous}일차</button>` : '<span></span>'}
          ${next ? `<button class="content-secondary" data-theory-day-link="${next}">${next}일차 <i class="fa-solid fa-arrow-right"></i></button>` : '<button class="content-secondary" data-go="quiz">퀴즈 풀기 <i class="fa-solid fa-arrow-right"></i></button>'}
        </div>
      </article>`;
    bindViewLinks();
    bindTheoryLinks();
    $messages.querySelector('[data-theory-rag]')?.addEventListener('click', () => {
      setView('learn');
      $questionInput.value = lesson.ragPrompt;
      resizeInput();
      $questionInput.focus();
    });
  }

  function bindTheoryLinks() {
    $messages.querySelectorAll('[data-theory-day-link]').forEach(button => {
      button.addEventListener('click', () => openTheoryDay(Number(button.dataset.theoryDayLink)));
    });
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
    const { weights, hedgeRatio, model, total } = snapshot;
    const normalizedSuffix = total === 100 ? '' : ' (정규화)';

    $stockWeightLabel.textContent = `${percent(weights.stock)}${normalizedSuffix}`;
    $bondWeightLabel.textContent = `${percent(weights.bond)}${normalizedSuffix}`;
    $altWeightLabel.textContent = `${percent(weights.alt)}${normalizedSuffix}`;
    $hedgeRatioLabel.textContent = `${Math.round(hedgeRatio * 100)}%`;

    if (total === 0) {
      $simReturn.textContent = '-';
      $simVolatility.textContent = '-';
      $simSharpe.textContent = '-';
      $simDrawdown.textContent = '-';
      $simAllocation.innerHTML = '<span>자산 비중 합계가 0%입니다. 슬라이더를 조정해 포트폴리오를 구성하세요.</span>';
      $simNarrative.innerHTML = '<strong>실습 안내</strong><br>주식/ETF, 채권, 대체·현금 중 하나 이상에 비중을 배분하면 리스크와 성과 지표를 계산합니다.';
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
    const expectedReturn = baseReturn
      + model.returnBoost
      - hedgeRatio * SIMULATION_ASSUMPTIONS.hedgeCostPerUnit
      + diversification * SIMULATION_ASSUMPTIONS.diversificationBonusScale;
    const volatility = Math.max(
      0.03,
      Math.sqrt(variance) * model.volMultiplier * (1 - hedgeRatio * SIMULATION_ASSUMPTIONS.hedgeVolatilityReduction),
    );
    const sharpe = (expectedReturn - SIMULATION_ASSUMPTIONS.riskFreeRate) / volatility;
    // 스트레스 손실은 학습자에게 손실값으로 보이도록 음수로 표기합니다.
    const drawdown = -Math.max(0, (
      volatility * SIMULATION_ASSUMPTIONS.stressVolatilityMultiplier
      + Math.max(0, weights.stock - 0.5) * SIMULATION_ASSUMPTIONS.equityStressPenalty
      - hedgeRatio * SIMULATION_ASSUMPTIONS.hedgeStressOffset
    ));

    $simReturn.textContent = percent(expectedReturn);
    $simVolatility.textContent = percent(volatility);
    $simSharpe.textContent = sharpe.toFixed(2);
    $simDrawdown.textContent = percent(drawdown);

    $simAllocation.innerHTML = [
      `정규화 비중 · 주식/ETF ${percent(weights.stock)} / 채권 ${percent(weights.bond)} / 대체·현금 ${percent(weights.alt)}`,
      `헤지 강도 · ${Math.round(hedgeRatio * 100)}%`,
    ].map(line => `<span>${line}</span>`).join('');

    // 정규화 비중 기준의 학습용 분류: 대략적인 성향 비교를 위한 규칙입니다.
    const tilt = weights.stock >= 0.55 ? '공격형' : weights.bond >= 0.4 ? '방어형' : '균형형';
    $simNarrative.innerHTML = `
      <strong>${model.label}</strong> 기준 ${tilt} 포트폴리오입니다.<br>
      ${model.note}<br>
      현재 설정은 기대수익률 ${percent(expectedReturn)}, 예상 변동성 ${percent(volatility)}, 샤프 비율 ${sharpe.toFixed(2)} 수준으로 계산됩니다.
    `;
  }

  function buildSimulationPrompt() {
    const snapshot = getSimulationSnapshot();
    const model = snapshot.model.label;
    const allocation = `정규화 비중은 주식/ETF ${percent(snapshot.weights.stock)}, 채권 ${percent(snapshot.weights.bond)}, 대체·현금 ${percent(snapshot.weights.alt)}, 파생 헤지 강도 ${Math.round(snapshot.hedgeRatio * 100)}%입니다.`;
    return `${model} 기준 실습 포트폴리오를 설명해줘. ${allocation}. 금융상품과 자산배분 관점에서 개요, 주요 리스크 지표, 리밸런싱 포인트를 정리해줘.`;
  }

  function getSimulationSnapshot() {
    const raw = {
      stock: Number($stockWeight.value),
      bond: Number($bondWeight.value),
      alt: Number($altWeight.value),
    };
    const total = raw.stock + raw.bond + raw.alt;
    const safeTotal = total || 0.001;
    return {
      raw,
      total,
      hedgeRatio: Number($hedgeRatio.value) / 100,
      model: MODEL_META[$modelSelect.value],
      weights: {
        stock: raw.stock / safeTotal,
        bond: raw.bond / safeTotal,
        alt: raw.alt / safeTotal,
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
