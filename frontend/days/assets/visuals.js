(function () {
  'use strict';

  const day = Number(document.body.dataset.day || 0);
  const lessons = Array.from(document.querySelectorAll('.lesson'));
  const target = (needle) => lessons.find((lesson) => lesson.querySelector('h2')?.textContent.includes(needle));
  const addAfterText = (lesson, html) => {
    const body = lesson?.querySelector('.lesson-body');
    if (!body || body.querySelector('.concept-visual')) return;
    body.insertAdjacentHTML('beforeend', html);
  };

  const caption = (title, text) => `<figcaption><b>${title}</b> · ${text}</figcaption>`;

  if (day === 1) {
    addAfterText(target('상품을 고를 때 보는 세 가지'), `<figure class="concept-visual"><p class="visual-kicker">DECISION MAP</p><div class="visual-row"><div class="visual-card blue"><strong>수익률</strong><span>얼마나 늘어날 가능성이 있나</span></div><div class="visual-card"><strong>위험</strong><span>예상과 다르게 줄어들 수 있나</span></div><div class="visual-card"><strong>유동성</strong><span>필요할 때 현금화할 수 있나</span></div></div>${caption('세 가지를 함께 보기', '한 꼭짓점을 크게 만들면 다른 조건에 대가가 생길 수 있어요. 목표 시점에 맞춰 우선순위를 정합니다.')}</figure>`);
    addAfterText(target('선물은 미래 거래를'), `<figure class="concept-visual"><p class="visual-kicker">FUTURES CONTRACT FLOW</p><div class="flow-visual"><div class="step">오늘<small>가격·수량·만기 합의</small></div><b class="flow-arrow">→</b><div class="step">거래 기간<small>증거금과 일일 손익 정산</small></div><b class="flow-arrow">→</b><div class="step">만기 또는 청산<small>반대거래·현금결제·인도</small></div></div>${caption('선물의 시간 흐름', '선물은 물건 자체가 아니라 미래 거래 조건을 표준화한 계약입니다.')}</figure>`);
  }

  if (day === 2) {
    addAfterText(target('펀드와 ETF는 어떻게 다른가요?'), `<figure class="concept-visual"><p class="visual-kicker">FUND VS ETF</p><div class="visual-row"><div class="visual-card"><strong>펀드</strong><span>운용사가 모은 자산을 기준가로 가입·환매</span></div><div class="visual-card blue"><strong>공통점</strong><span>여러 자산을 한 상품에 담을 수 있음</span></div><div class="visual-card"><strong>ETF</strong><span>거래소에서 장중 시장가격으로 매매</span></div></div>${caption('상품의 “그릇”과 거래방식', '같은 ETF라도 기초지수·총보수·유동성·괴리율은 각각 다릅니다.')}</figure>`);
    addAfterText(target('NAV·iNAV'), `<figure class="concept-visual"><p class="visual-kicker">ETF PRICE CHECK</p><div class="flow-visual"><div class="step">편입 자산 가치<small>보유 주식·채권 등의 값</small></div><b class="flow-arrow">→</b><div class="step">NAV<small>순자산가치</small></div><b class="flow-arrow">↔</b><div class="step">시장가격<small>호가·수요로 장중 변동</small></div></div>${caption('NAV와 시장가격은 같은 말이 아닙니다', '둘의 간격이 괴리율입니다. 거래량과 매수·매도 호가 차이도 함께 확인하세요.')}</figure>`);
  }

  if (day === 3) {
    addAfterText(target('금리가 오르면 채권 가격'), `<figure class="concept-visual"><p class="visual-kicker">BOND PRICE & RATE</p><div class="visual-row"><div class="visual-card blue"><strong>시장금리 ↑</strong><span>새로 발행되는 채권의 이자가 높아짐</span></div><div class="visual-card"><strong>기존 채권 가격 ↓</strong><span>낮은 쿠폰의 매력을 조정하는 과정</span></div><div class="visual-card"><strong>듀레이션</strong><span>만기가 길수록 가격 변화가 커질 수 있음</span></div></div>${caption('금리와 채권 가격의 기본 방향', '다른 조건이 같다는 단순화된 설명입니다. 신용위험과 만기 구조도 함께 작용합니다.')}</figure>`);
    addAfterText(target('배추 판매로 보는 선물 계약'), `<figure class="concept-visual"><p class="visual-kicker">HEDGE EXAMPLE</p><div class="flow-visual"><div class="step">농부<small>가격 하락이 걱정</small></div><b class="flow-arrow">↔</b><div class="step">미래 가격 약속<small>수량·가격·시점 표준화</small></div><b class="flow-arrow">↔</b><div class="step">구매자<small>가격 상승이 걱정</small></div></div>${caption('선물은 가격 위험을 나누는 도구이기도 합니다', '가격 방향을 맞히는 거래와 위험을 줄이는 헤지는 목적이 다릅니다.')}</figure>`);
  }

  if (day === 4) {
    addAfterText(target('HTS에서 외국인 KOSPI 200'), `<figure class="concept-visual source-visual"><p class="visual-kicker">REAL SCREEN EXAMPLE</p><img src="https://securities.koreainvestment.com/pro_help/images/5336_01.gif" alt="한국투자증권 HTS의 야간선물 투자자별 매매동향 예시 화면" loading="lazy">${caption('실제 HTS 도움말 화면', '외국인·개인·기관 등의 구분과 선물·옵션 조회 구조를 보는 예시입니다. 현재 시세나 매매 신호가 아닙니다. <a href="https://securities.koreainvestment.com/pro_help/5336.html" target="_blank" rel="noopener noreferrer">출처: 한국투자증권 화면 도움말</a>')}</figure>`);
    addAfterText(target('리밸런싱은 원래 계획'), `<figure class="concept-visual"><p class="visual-kicker">REBALANCING LOOP</p><div class="flow-visual"><div class="step">목표 비중 기록<small>예: 자산군별 역할</small></div><b class="flow-arrow">→</b><div class="step">정기 점검<small>분기·반기 또는 허용 범위</small></div><b class="flow-arrow">→</b><div class="step">규칙대로 조정<small>비용·세금도 확인</small></div></div>${caption('가격 예측 대신 규칙을 실행하기', '자주 바꾸는 것보다 사전에 정한 점검 조건을 지키는 것이 핵심입니다.')}</figure>`);
    addAfterText(target('위험을 읽는 네 가지 숫자'), `<figure class="concept-visual"><p class="visual-kicker">RISK DASHBOARD</p><div class="metric-visual"><div class="metric-chart" aria-label="수익률이 오르내리는 예시 선 그래프"><svg viewBox="0 0 320 126" role="img"><polyline points="0,88 42,70 80,84 120,35 158,53 194,103 238,76 280,22 320,47" fill="none" stroke="#315ff4" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><line x1="120" y1="35" x2="194" y2="103" stroke="#f06a67" stroke-width="2" stroke-dasharray="5 4"/></svg></div><div class="metric-legend"><span><i></i>변동성 · 흔들림의 크기</span><span><i></i>MDD · 고점 대비 최대 하락</span><span><i></i>샤프 비율 · 위험 대비 성과</span></div></div>${caption('수익률 하나로는 보이지 않는 것', '같은 수익률이어도 하락 폭과 흔들림은 다를 수 있어요.')}</figure>`);
  }
}());
