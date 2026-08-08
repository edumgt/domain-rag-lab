(function () {
  'use strict';

  const state = {
    domain: 'finance',
    sessionId: crypto.randomUUID(),
    topK: 4,
    loading: false,
    chatHistory: [],
    activeTopic: 'products',
    activeView: 'home',
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

  const TOPIC_META = {
    products: {
      label: '금융상품 이해',
      icon: 'fa-layer-group',
      summary: '주식/ETF, 채권, 파생상품의 개요와 운용 전략을 연결해 이해합니다.',
      bullets: ['주식과 ETF 구조 비교', '채권 듀레이션·크레딧 포인트', '파생상품 헤지 목적과 리스크'],
      prompts: [
        '주식과 ETF의 차이, 장단점, 운용 전략을 학습자 관점에서 설명해줘.',
        '채권 상품의 기본 구조와 금리 변화에 따른 운용 전략을 설명해줘.',
        '파생상품의 개요와 헤지 중심 운용 전략을 예시와 함께 설명해줘.',
      ],
    },
    'stocks-etf': {
      label: '주식 / ETF',
      icon: 'fa-chart-line',
      summary: '주식과 ETF의 구조, 비용, 추적 방식, 운용 전략을 비교합니다.',
      bullets: ['직접 투자와 패시브 투자 비교', '추적오차·괴리율·유동성 점검', '리밸런싱과 적립식 활용'],
      prompts: [
        '주식 직접투자와 ETF 투자 전략의 차이를 설명하고 학습 포인트를 정리해줘.',
        'ETF를 평가할 때 추적오차, 괴리율, 유동성을 어떻게 봐야 하는지 설명해줘.',
      ],
    },
    bonds: {
      label: '채권 상품',
      icon: 'fa-landmark',
      summary: '채권 가격, 금리, 듀레이션, 신용스프레드가 운용 전략에 미치는 영향을 학습합니다.',
      bullets: ['표면금리와 만기수익률', '듀레이션과 금리 민감도', '국채·회사채·하이일드 비교'],
      prompts: [
        '채권 가격과 금리의 관계를 설명하고 듀레이션 관점의 운용 전략을 알려줘.',
        '국채와 회사채의 차이, 신용위험, 금리 사이클별 전략을 설명해줘.',
      ],
    },
    derivatives: {
      label: '파생상품',
      icon: 'fa-wave-square',
      summary: '선물, 옵션, 스왑의 구조를 이해하고 헤지와 위험관리 목적의 활용법을 정리합니다.',
      bullets: ['선물과 현물의 차이', '콜·풋 옵션의 손익 구조', '헤지 비율과 롤오버 리스크'],
      prompts: [
        '선물과 옵션의 차이, 주요 리스크, 헤지 중심 운용 전략을 설명해줘.',
        '파생상품을 투기가 아니라 리스크 관리 도구로 사용할 때의 원칙을 정리해줘.',
      ],
    },
    'portfolio-theory': {
      label: '포트폴리오 이론',
      icon: 'fa-chart-column',
      summary: '수익률과 위험의 균형, 성과 분석, 리스크 지표를 함께 이해합니다.',
      bullets: ['분산투자와 상관관계', 'CAGR·변동성·MDD·샤프 비율', '성과를 위험 대비로 해석하기'],
      prompts: [
        '포트폴리오 이론의 핵심과 샤프 비율, MDD, 변동성을 함께 설명해줘.',
        '성과 분석에서 CAGR과 변동성, 최대낙폭을 왜 같이 봐야 하는지 알려줘.',
      ],
    },
    'allocation-models': {
      label: '자산배분 모델',
      icon: 'fa-sliders',
      summary: '평균분산, 블랙-리터만, Risk-Parity 모델의 차이와 활용 상황을 비교합니다.',
      bullets: ['평균분산의 입력 민감도', '블랙-리터만의 균형수익률 + 뷰 반영', 'Risk-Parity의 위험기여도 균등화'],
      prompts: [
        '평균분산, 블랙-리터만, Risk-Parity 모델을 비교해서 설명해줘.',
        '블랙-리터만이 평균분산의 어떤 한계를 보완하는지 사례 중심으로 설명해줘.',
      ],
    },
    'case-practice': {
      label: '사례 분석 실습',
      icon: 'fa-flask',
      summary: '시장 시나리오별 자산배분과 금융상품 선택을 실습 질문으로 연결합니다.',
      bullets: ['금리 인하·인상 시나리오', '방어형/균형형/공격형 포트폴리오', '리밸런싱과 헤지 아이디어'],
      prompts: [
        '금리 하락 국면에서 주식/ETF, 채권, 파생 헤지를 어떻게 조합할지 사례로 설명해줘.',
        '균형형 투자자의 사례를 두고 평균분산과 Risk-Parity 결과 차이를 설명해줘.',
      ],
    },
  };

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
  const $domainBadge = document.getElementById('domainBadge');
  const $currentTrackLabel = document.getElementById('currentTrackLabel');
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
  const $topicButtons = Array.from(document.querySelectorAll('.topic-btn'));
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

  $topicButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      $topicButtons.forEach(item => item.classList.remove('active'));
      btn.classList.add('active');
      state.activeTopic = btn.dataset.topic;
      if (state.activeView !== 'learn') setView('learn');
      updateTopicUI();
    });
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

  function updateTopicUI() {
    const meta = TOPIC_META[state.activeTopic];
    $domainBadge.innerHTML = `<i class="fa-solid ${meta.icon}"></i> ${meta.label} 학습 모드`;
    $currentTrackLabel.textContent = meta.label;
    if (!state.chatHistory.length && state.activeView === 'learn') showWelcome();
  }

  function setView(view) {
    state.activeView = view;
    $viewButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.view === view));
    $chatInputArea.classList.toggle('hidden', view !== 'learn');
    $clearChatBtn.classList.toggle('hidden', view !== 'learn');

    if (view === 'home') renderHome();
    if (view === 'learn') showWelcome();
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
      ['금융상품 이해', '주식·ETF·채권·파생상품의 구조, 비용, 위험을 비교합니다.', 'fa-layer-group'],
      ['포트폴리오 이론', '분산투자와 상관관계, 변동성·MDD·샤프 비율을 해석합니다.', 'fa-chart-column'],
      ['자산배분 실습', '평균분산·블랙-리터만·Risk Parity를 같은 포트폴리오에 적용합니다.', 'fa-sliders'],
    ].map(([title, copy, icon]) => `
      <button class="home-module" data-go="learn">
        <i class="fa-solid ${icon}"></i><strong>${title}</strong><span>${copy}</span><em>학습 시작 <i class="fa-solid fa-arrow-right"></i></em>
      </button>`).join('');

    $messages.innerHTML = `
      <article class="content-page home-page">
        <div class="content-kicker">FINANCE LEARNING LAB · RAG 기반 학습</div>
        <h1>금융상품을 이해하고,<br><mark>나만의 자산배분 원칙</mark>을 설계합니다.</h1>
        <p class="content-lead">교재형 콘텐츠, 개념 퀴즈, 학습용 포트폴리오 시뮬레이션과 근거 문서 기반 RAG를 한 흐름으로 제공합니다.</p>
        <div class="home-actions">
          <button class="content-cta" data-go="learn"><i class="fa-solid fa-book-open"></i> 학습 트랙 둘러보기</button>
          <button class="content-secondary" data-go="quiz"><i class="fa-solid fa-circle-question"></i> 5문제 퀴즈 풀기</button>
        </div>
        <section class="home-stats">
          <div><strong>3</strong><span>학습 방식<br>콘텐츠 · 퀴즈 · 실습</span></div>
          <div><strong>5</strong><span>핵심 지표<br>CAGR · 변동성 · MDD 등</span></div>
          <div><strong>3</strong><span>배분 모델<br>MVO · BL · RP</span></div>
        </section>
        <section class="content-section"><div class="section-heading"><span>01</span><h2>학습 로드맵</h2></div><div class="home-module-grid">${modules}</div></section>
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

  function bindViewLinks() {
    $messages.querySelectorAll('[data-go]').forEach(button => button.addEventListener('click', () => setView(button.dataset.go)));
  }

  function showWelcome() {
    const active = TOPIC_META[state.activeTopic];
    const cards = Object.entries(TOPIC_META).map(([key, meta]) => `
      <button class="course-card ${key === state.activeTopic ? 'active' : ''}" data-topic-card="${key}">
        <div class="course-card-head">
          <span class="course-card-icon"><i class="fa-solid ${meta.icon}"></i></span>
          <strong>${escHtml(meta.label)}</strong>
        </div>
        <p>${escHtml(meta.summary)}</p>
      </button>
    `).join('');

    const bullets = active.bullets.map(item => `<li>${escHtml(item)}</li>`).join('');
    const prompts = active.prompts.map(prompt => `
      <button class="example-chip" data-q="${escHtml(prompt)}">${escHtml(prompt)}</button>
    `).join('');

    $messages.innerHTML = `
      <div class="welcome-msg">
        <div class="welcome-icon"><i class="fa-solid fa-graduation-cap"></i></div>
        <h2>금융상품·자산배분 RAG 학습랩</h2>
        <p>설명형 RAG, 참고 문서, 자산배분 시뮬레이션을 연결해 금융 학습 콘텐츠를 탐색합니다.</p>

        <div class="hero-layout">
          <section class="hero-focus">
            <div class="hero-focus-badge">현재 학습 트랙</div>
            <h3>${escHtml(active.label)}</h3>
            <p>${escHtml(active.summary)}</p>
            <ul class="hero-bullets">${bullets}</ul>
          </section>
          <section class="course-grid">${cards}</section>
        </div>

        <div class="quick-examples" id="quickExamples">
          <p class="examples-label">추천 RAG 질문</p>
          ${prompts}
        </div>
      </div>
    `;

    $messages.querySelectorAll('.example-chip').forEach(chip => {
      chip.addEventListener('click', () => sendQuestion(chip.dataset.q));
    });
    $messages.querySelectorAll('[data-topic-card]').forEach(card => {
      card.addEventListener('click', () => {
        const key = card.dataset.topicCard;
        state.activeTopic = key;
        $topicButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.topic === key));
        updateTopicUI();
      });
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
    const meta = TOPIC_META[state.activeTopic];
    return `${model} 기준 실습 포트폴리오를 설명해줘. ${allocation}. ${meta.label} 관점에서 개요, 운용 전략, 주요 리스크 지표, 리밸런싱 포인트를 정리해줘.`;
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

  updateTopicUI();
  updateSimulation();
  setView('home');
  $topKLabel.textContent = state.topK;
})();
