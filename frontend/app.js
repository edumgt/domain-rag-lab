(function () {
  'use strict';

  const state = {
    domain: 'finance',
    sessionId: crypto.randomUUID(),
    topK: 4,
    loading: false,
    chatHistory: [],
    activeTopic: 'products',
  };

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
  const $simPromptBtn = document.getElementById('simPromptBtn');
  const $simAllocation = document.getElementById('simAllocation');
  const $simNarrative = document.getElementById('simNarrative');

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
      updateTopicUI();
    });
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

  $closeRefBtn.addEventListener('click', () => updateRefPanel([]));

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
    $questionInput.value = buildSimulationPrompt();
    resizeInput();
    $questionInput.focus();
  });

  function updateTopicUI() {
    const meta = TOPIC_META[state.activeTopic];
    $domainBadge.innerHTML = `<i class="fa-solid ${meta.icon}"></i> ${meta.label} 학습 모드`;
    $currentTrackLabel.textContent = meta.label;
    if (!state.chatHistory.length) showWelcome();
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
      return;
    }

    $refList.innerHTML = chunks.map((chunk, idx) => `
      <div class="ref-card">
        <div class="ref-card-title">${idx + 1}. ${escHtml(chunk.title || '제목 없음')}</div>
        <span class="ref-card-score">유사도 ${(chunk.score * 100).toFixed(1)}%</span>
        <div class="ref-card-content">${escHtml(chunk.content || '')}</div>
      </div>
    `).join('');
  }

  async function handleFileUpload(file) {
    const allowed = file.name.toLowerCase().endsWith('.txt') || file.name.toLowerCase().endsWith('.pdf');
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
      document.getElementById('simReturn').textContent = '-';
      document.getElementById('simVolatility').textContent = '-';
      document.getElementById('simSharpe').textContent = '-';
      document.getElementById('simDrawdown').textContent = '-';
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
    const drawdown = Math.min(0, -(
      volatility * SIMULATION_ASSUMPTIONS.stressVolatilityMultiplier
      + Math.max(0, weights.stock - 0.5) * SIMULATION_ASSUMPTIONS.equityStressPenalty
      - hedgeRatio * SIMULATION_ASSUMPTIONS.hedgeStressOffset
    ));

    document.getElementById('simReturn').textContent = percent(expectedReturn);
    document.getElementById('simVolatility').textContent = percent(volatility);
    document.getElementById('simSharpe').textContent = sharpe.toFixed(2);
    document.getElementById('simDrawdown').textContent = percent(drawdown);

    $simAllocation.innerHTML = [
      `정규화 비중 · 주식/ETF ${percent(weights.stock)} / 채권 ${percent(weights.bond)} / 대체·현금 ${percent(weights.alt)}`,
      `헤지 강도 · ${Math.round(hedgeRatio * 100)}%`,
    ].map(line => `<span>${line}</span>`).join('');

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
    const safeTotal = Math.max(total, 1);
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
  $topKLabel.textContent = state.topK;
})();
