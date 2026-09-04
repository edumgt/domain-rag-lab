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
  if (!document.getElementById('allWeatherVisualStyle')) document.head.insertAdjacentHTML('beforeend', `<style id="allWeatherVisualStyle">.all-weather-visual{padding:22px!important;background:linear-gradient(135deg,#f8fbff,#eef6ff)!important}.all-weather-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.all-weather-grid article{min-height:118px;padding:16px;border:1px solid #d8e3f3;border-radius:12px;background:#fff}.all-weather-grid span{display:block;margin-bottom:9px;color:#63708a;font-size:12px;font-weight:800}.all-weather-grid strong{display:block;margin-bottom:6px;color:#102a5d;font-size:18px}.all-weather-grid small{display:block;color:#4d607d;font-size:13px;line-height:1.5}.all-weather-grid .growth-up{border-top:4px solid #3b82f6}.all-weather-grid .inflation-up{border-top:4px solid #f59e0b}.all-weather-grid .growth-down{border-top:4px solid #7c8aa1}.all-weather-balance{display:grid;gap:4px;margin-top:12px;padding:14px 16px;border-radius:10px;background:#173d82;color:#fff}.all-weather-balance b{font-size:14px;line-height:1.5}.all-weather-balance span{color:#cfe2ff;font-size:12px;line-height:1.5}.platform-showcase-grid{grid-template-columns:1fr!important}.platform-screen-link{height:160px!important}.platform-screen-link img{max-width:100%;object-fit:cover}@media(max-width:560px){.all-weather-grid{grid-template-columns:1fr}.all-weather-visual{padding:16px!important}.platform-screen-link{height:135px!important}}</style>`);

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
  }

  if (day === 1 || day === 4) {
    addAfterText(target('HTS에서 외국인 KOSPI 200'), `<figure class="concept-visual source-visual"><p class="visual-kicker">REAL SCREEN EXAMPLE</p><img src="https://securities.koreainvestment.com/pro_help/images/5336_01.gif" alt="한국투자증권 HTS의 야간선물 투자자별 매매동향 예시 화면" loading="lazy">${caption('실제 HTS 도움말 화면', '외국인·개인·기관 등의 구분과 선물·옵션 조회 구조를 보는 예시입니다. 현재 시세나 매매 신호가 아닙니다. <a href="https://securities.koreainvestment.com/pro_help/5336.html" target="_blank" rel="noopener noreferrer">출처: 한국투자증권 화면 도움말</a>')}</figure>`);
    addAfterText(target('올웨더 포트폴리오:'), `<figure class="concept-visual all-weather-visual"><p class="visual-kicker">ALL WEATHER MAP · 경제 환경을 맞히는 표가 아니라 위험을 나누어 보는 지도</p><div class="all-weather-grid"><article class="growth-up inflation-down"><span>성장 ↑ · 물가 ↓</span><strong>성장 호조</strong><small>주식처럼 성장의 수혜를 기대하는 자산군을 검토</small></article><article class="growth-down inflation-down"><span>성장 ↓ · 물가 ↓</span><strong>경기 둔화</strong><small>명목채권처럼 방어 역할을 기대하는 자산군을 검토</small></article><article class="growth-up inflation-up"><span>성장 ↑ · 물가 ↑</span><strong>물가 압력</strong><small>원자재·물가연동채 등 인플레이션 민감 자산군을 검토</small></article><article class="growth-down inflation-up"><span>성장 ↓ · 물가 ↑</span><strong>침체 + 물가</strong><small>금·물가연동채 등 분산 후보를 함께 점검</small></article></div><div class="all-weather-balance"><b>핵심은 금액을 똑같이 나누는 것이 아니라, 한 자산의 충격이 전체 위험을 지배하지 않게 보는 것</b><span>자산별 변동성·상관관계·환율·비용은 계속 달라집니다.</span></div>${caption('올웨더의 사고방식', '위 표는 자산군의 일반적인 역할을 단순화한 학습용 지도입니다. 어떤 자산도 특정 경제 환경에서 수익이나 방어를 보장하지 않습니다.')}</figure>`);
    addAfterText(target('리밸런싱은 원래 계획'), `<figure class="concept-visual"><p class="visual-kicker">REBALANCING LOOP</p><div class="flow-visual"><div class="step">목표 비중 기록<small>예: 자산군별 역할</small></div><b class="flow-arrow">→</b><div class="step">정기 점검<small>분기·반기 또는 허용 범위</small></div><b class="flow-arrow">→</b><div class="step">규칙대로 조정<small>비용·세금도 확인</small></div></div>${caption('가격 예측 대신 규칙을 실행하기', '자주 바꾸는 것보다 사전에 정한 점검 조건을 지키는 것이 핵심입니다.')}</figure>`);
    addAfterText(target('위험을 읽는 네 가지 숫자'), `<figure class="concept-visual risk-dashboard"><p class="visual-kicker">RISK DASHBOARD · 같은 그래프, 서로 다른 질문</p><div class="metric-visual"><div class="metric-chart" aria-label="시작값 100에서 고점 120까지 오른 뒤 87로 하락하고 115로 마감한 예시 그래프"><svg viewBox="0 0 440 190" role="img" aria-hidden="true"><path d="M18 137 L72 105 L122 124 L174 47 L224 73 L274 154 L332 110 L385 30 L423 62 L423 164 L18 164 Z" fill="#315ff412"/><polyline points="18,137 72,105 122,124 174,47 224,73 274,154 332,110 385,30 423,62" fill="none" stroke="#315ff4" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><line x1="385" y1="30" x2="274" y2="154" stroke="#f06a67" stroke-width="3" stroke-dasharray="7 5"/><circle cx="18" cy="137" r="5" fill="#315ff4"/><circle cx="385" cy="30" r="6" fill="#f06a67"/><circle cx="274" cy="154" r="6" fill="#f06a67"/><circle cx="423" cy="62" r="5" fill="#10a36c"/><text x="16" y="184" fill="#63708a" font-size="13" font-weight="700">시작 100</text><text x="329" y="20" fill="#c53b35" font-size="13" font-weight="800">고점 120</text><text x="214" y="181" fill="#c53b35" font-size="13" font-weight="800">저점 87</text><text x="354" y="88" fill="#087a50" font-size="13" font-weight="800">마감 115</text></svg><span class="chart-callout volatility">파란 선의 들쭉날쭉함 = 변동성</span><span class="chart-callout drawdown">고점 120 → 저점 87 = MDD</span></div><div class="metric-legend"><span class="return"><i></i><b>수익률</b><small>시작 100 → 마감 115<br>결과는 <strong>+15%</strong></small></span><span class="volatility"><i></i><b>변동성</b><small>중간 과정에서 얼마나<br>자주·크게 흔들렸나</small></span><span class="drawdown"><i></i><b>MDD</b><small>고점 120 → 저점 87<br>가장 큰 하락은 <strong>−27.5%</strong></small></span><span class="sharpe"><i></i><b>샤프 비율</b><small>초과수익 ÷ 변동성<br>위험을 감안한 효율</small></span></div></div>${caption('네 숫자는 각각 다른 질문에 답합니다', '<b>수익률</b>은 최종 결과, <b>변동성</b>은 과정의 흔들림, <b>MDD</b>는 가장 아픈 하락, <b>샤프 비율</b>은 위험 대비 성과를 보여 줍니다.')}</figure>`);
    const alphaBody = target('알파와 베타:')?.querySelector('.lesson-body');
    if (alphaBody && !document.getElementById('alphaBetaSimTrigger')) {
      alphaBody.insertAdjacentHTML('beforeend', `<p class="lesson-video-cta"><button type="button" class="lesson-video-link" id="alphaBetaSimTrigger"><i class="fa-solid fa-chart-simple"></i> 알파·베타 계산 시뮬레이터</button><small>시장 수익률과 베타, 실제 수익률을 바꿔 기대수익률과 알파를 비교해 보세요.</small></p>`);
    }
    addAfterText(target('젠포트·퀀터스 같은 노코드 퀀트 플랫폼'), `<p class="lesson-video-cta platform-url-links"><a class="lesson-video-link" href="https://genport.newsystock.com/Main.aspx" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-arrow-up-right-from-square"></i> 젠포트 · genport.newsystock.com</a><a class="lesson-video-link" href="https://www.quantus.kr/ko" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-arrow-up-right-from-square"></i> 퀀터스 · quantus.kr</a><small>서비스 화면·기능·이용 조건은 각 공식 홈페이지에서 확인하세요.</small></p>`);
    const thorpBody = target('에드워드 소프 교수:')?.querySelector('.lesson-body');
    if (thorpBody && !document.getElementById('thorpOfficialLink')) {
      thorpBody.insertAdjacentHTML('beforeend', `<p class="lesson-video-cta"><a id="thorpOfficialLink" class="lesson-video-link" href="https://www.edwardothorp.com/" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-arrow-up-right-from-square"></i> 에드워드 O. 소프 공식 홈페이지</a><small>약력, 저서, 공개 논문·글을 확인할 수 있습니다.</small></p>`);
    }
    const simonsBody = target('제임스 사이먼스:')?.querySelector('.lesson-body');
    if (simonsBody && !document.getElementById('rentecOfficialLink')) {
      simonsBody.insertAdjacentHTML('beforeend', `<p class="lesson-video-cta"><a id="rentecOfficialLink" class="lesson-video-link" href="https://www.rentec.com/Home.action?index=true" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-arrow-up-right-from-square"></i> 르네상스 테크놀로지스 공식 홈페이지</a><small>제임스 사이먼스가 설립한 퀀트 운용사입니다. 공개된 회사 소개를 확인하세요.</small></p>`);
    }
    const hmmBody = target('히든 마코프 모델(HMM):')?.querySelector('.lesson-body');
    if (hmmBody && !document.getElementById('hmmDocsLink')) {
      hmmBody.insertAdjacentHTML('beforeend', `<p class="lesson-video-cta"><a id="hmmDocsLink" class="lesson-video-link" href="https://hmmlearn.readthedocs.io/en/latest/" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-arrow-up-right-from-square"></i> HMM 공개 구현체 공식 문서</a><small>HMM 자체는 특정 기업의 서비스가 아닌 통계 모형입니다. 대표 Python 구현체 hmmlearn의 공식 문서입니다.</small></p><p class="lesson-video-cta"><button type="button" class="lesson-video-link" id="hmmSimTrigger"><i class="fa-solid fa-wave-square"></i> 시장 국면(HMM) 시뮬레이터</button><small>관측된 수익률·변동성에 따라 잔잔함/불안함 국면 확률과 대응 규칙을 확인하세요.</small></p>`);
    }
    const executionBody = target('시타델·메릴린치 사례')?.querySelector('.lesson-body');
    if (executionBody && !document.getElementById('citadelSecuritiesLink')) {
      executionBody.insertAdjacentHTML('beforeend', `<p class="lesson-video-cta"><a id="citadelSecuritiesLink" class="lesson-video-link" href="https://citadelsecurities.com/" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-arrow-up-right-from-square"></i> Citadel Securities 공식 홈페이지</a><a class="lesson-video-link" href="https://www.merrilllynch.com/" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-arrow-up-right-from-square"></i> Merrill 공식 홈페이지</a><small>사례의 대상 회사 소개를 확인하는 링크이며, 과거 제재 내용은 각 규제기관의 원문으로 별도 확인하세요.</small></p>`);
    }
    const pairBody = target('벰버거의 페어 트레이딩:')?.querySelector('.lesson-body');
    if (pairBody && !document.getElementById('pairTradingSimTrigger')) {
      pairBody.insertAdjacentHTML('beforeend', `<p class="lesson-video-cta"><button type="button" class="lesson-video-link" id="pairTradingSimTrigger"><i class="fa-solid fa-code-branch"></i> 페어 트레이딩 시뮬레이터</button><small>두 가격의 간격과 Z-점수로 진입·청산 신호 및 롱·숏 손익을 살펴보세요.</small></p>`);
    }
    const koreanPairBody = target('국내 3개 페어로 보는 과거 신호')?.querySelector('.lesson-body');
    if (koreanPairBody && !document.getElementById('koreanPairSimTrigger')) {
      koreanPairBody.insertAdjacentHTML('beforeend', `<p class="lesson-video-cta"><button type="button" class="lesson-video-link" id="koreanPairSimTrigger"><i class="fa-solid fa-chart-line"></i> 국내 페어 신호 시뮬레이터</button><small>신호일 종가 → 다음 거래일 진입 → 청산/손절의 순서와 비용 차감 손익을 확인하세요.</small></p>`);
    }
  }
}());
