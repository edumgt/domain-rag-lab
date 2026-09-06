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
  if (!document.getElementById('allWeatherVisualStyle')) document.head.insertAdjacentHTML('beforeend', `<style id="allWeatherVisualStyle">.all-weather-visual{padding:22px!important;background:linear-gradient(135deg,#f8fbff,#eef6ff)!important}.all-weather-sim-controls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.all-weather-sim-controls button{min-height:76px;padding:13px 15px;border:1px solid #cbdcf3;border-radius:12px;background:#fff;color:#173d82;text-align:left;cursor:pointer}.all-weather-sim-controls button:hover,.all-weather-sim-controls button:focus-visible,.all-weather-sim-controls button.active{border-color:#1769e0;background:#e9f2ff;box-shadow:0 0 0 2px #1769e022;outline:none}.all-weather-sim-controls span{display:block;margin-bottom:5px;color:#63708a;font-size:14.5px;font-weight:800}.all-weather-sim-controls b{font-size:16px}.all-weather-sim-result{display:grid;grid-template-columns:auto 1fr;gap:14px;align-items:start;margin-top:12px;padding:17px;border:1px solid #b9d6ff;border-radius:12px;background:#fff}.all-weather-sim-icon{display:grid;place-items:center;width:42px;height:42px;border-radius:50%;background:#dcebff;color:#075ecb;font-weight:900}.all-weather-sim-result p{margin:5px 0 0;color:#4d607d;font-size:14.5px;line-height:1.6}.all-weather-sim-result small{display:block;margin-top:9px;color:#63708a;line-height:1.5}.all-weather-balance{display:grid;gap:4px;margin-top:12px;padding:14px 16px;border-radius:10px;background:#173d82;color:#fff}.all-weather-balance b{font-size:14.5px;line-height:1.5}.all-weather-balance span{color:#cfe2ff;font-size:14.5px;line-height:1.5}.platform-showcase-grid{grid-template-columns:1fr!important}.platform-screen-link{height:160px!important}.platform-screen-link img{max-width:100%;object-fit:cover}@media(max-width:560px){.all-weather-sim-controls{grid-template-columns:1fr}.all-weather-visual{padding:16px!important}.platform-screen-link{height:135px!important}}</style>`);

  if (day === 1) {
    addAfterText(target('선물은 미래 거래를'), `<figure class="concept-visual"><p class="visual-kicker">FUTURES CONTRACT FLOW</p><div class="flow-visual"><div class="step">오늘<small>가격·수량·만기 합의</small></div><b class="flow-arrow">→</b><div class="step">거래 기간<small>증거금과 일일 손익 정산</small></div><b class="flow-arrow">→</b><div class="step">만기 또는 청산<small>반대거래·현금결제·인도</small></div></div>${caption('선물의 시간 흐름', '선물은 물건 자체가 아니라 미래 거래 조건을 표준화한 계약입니다.')}</figure>`);
    addAfterText(target('주문이 만나야 선물·옵션 계약이 생깁니다'), `<section class="lesson-inline-topic"><h3>제로섬 게임: 한쪽의 이익이 다른 쪽의 손실인 거래</h3><p>제로섬 게임(zero-sum game)은 참여자들의 이익과 손실을 모두 더하면 0이 되는 구조입니다. 예를 들어 선물 계약에서 A가 10만 원을 벌면 같은 계약의 반대편 B는 비용 전 10만 원을 잃습니다.</p><p>선물·옵션처럼 계약의 양쪽이 마주 보는 거래는 비용 전 손익이 서로 반대 방향으로 움직이는 구조입니다. 수수료·세금·매수·매도 호가 차이(스프레드)까지 더하면 참여자 전체의 합은 음수가 되며, 이를 네거티브섬이라고 합니다. 두 사람의 계약 손익 합계가 0이어도 각각 수수료 1,000원씩을 내면 최종 합계는 −2,000원입니다.</p><p>반면 모든 주식투자가 제로섬이라는 뜻은 아닙니다. 기업이 이익을 내고 배당을 지급하거나 장기적으로 가치가 성장하면 주식을 보유한 투자자 전체가 혜택을 볼 수 있습니다. 따라서 선물·옵션 같은 계약 거래의 손익 구조와 기업의 장기 가치 창출을 구분해야 합니다.</p></section>`);
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
    addAfterText(target('올웨더 포트폴리오:'), `<figure class="concept-visual all-weather-visual"><p class="visual-kicker">ALL WEATHER SIMULATOR · 경제 환경별 분산 관점 살펴보기</p><p class="visual-sim-intro">성장과 물가의 방향을 선택하면, 해당 환경에서 검토할 수 있는 자산군의 일반적 역할을 확인합니다.</p><div class="all-weather-sim-controls" role="group" aria-label="경제 환경 선택"><button type="button" class="active" data-weather-scenario="growth"><span>성장 ↑ · 물가 ↓</span><b>성장 호조</b></button><button type="button" data-weather-scenario="slowdown"><span>성장 ↓ · 물가 ↓</span><b>경기 둔화</b></button><button type="button" data-weather-scenario="inflation"><span>성장 ↑ · 물가 ↑</span><b>물가 압력</b></button><button type="button" data-weather-scenario="stagflation"><span>성장 ↓ · 물가 ↑</span><b>침체 + 물가</b></button></div><div class="all-weather-sim-result" aria-live="polite"><span class="all-weather-sim-icon" aria-hidden="true">↗</span><div><b id="allWeatherScenarioTitle">성장 호조: 성장 민감 자산군을 살펴볼 환경</b><p id="allWeatherScenarioText">주식처럼 성장의 수혜를 기대하는 자산군을 검토합니다.</p><small id="allWeatherScenarioNote">한 환경을 맞히는 도구가 아니라, 한 자산에 위험이 쏠리지 않는지 점검하는 출발점입니다.</small></div></div><div class="all-weather-balance"><b>핵심은 금액을 똑같이 나누는 것이 아니라, 한 자산의 충격이 전체 위험을 지배하지 않게 보는 것</b><span>자산별 변동성·상관관계·환율·비용은 계속 달라집니다.</span></div>${caption('올웨더의 사고방식', '선택 결과는 자산군의 일반적 역할을 단순화한 교육용 설명입니다. 어떤 자산도 특정 경제 환경에서 수익이나 방어를 보장하지 않습니다.')}</figure>`);
    const weatherSimulator = document.querySelector('.all-weather-visual');
    if (weatherSimulator && !weatherSimulator.dataset.ready) {
      const scenarios = {
        growth: { icon: '↗', title: '성장 호조: 성장 민감 자산군을 살펴볼 환경', text: '주식처럼 성장의 수혜를 기대하는 자산군을 검토합니다.', note: '성장 기대가 높아도 밸류에이션·금리·기업 실적에 따라 가격은 다르게 움직일 수 있습니다.' },
        slowdown: { icon: '↘', title: '경기 둔화: 방어 역할을 기대하는 자산군을 살펴볼 환경', text: '명목채권처럼 경기 둔화 시 방어 역할을 기대하는 자산군을 검토합니다.', note: '금리·신용위험·만기 구조에 따라 채권의 방어력과 가격 변동은 달라질 수 있습니다.' },
        inflation: { icon: '↑', title: '물가 압력: 인플레이션 민감 자산군을 살펴볼 환경', text: '원자재·물가연동채 등 인플레이션에 민감한 자산군을 함께 검토합니다.', note: '물가가 오르더라도 원자재 가격과 물가연동채 성과가 항상 같은 방향으로 움직이지는 않습니다.' },
        stagflation: { icon: '↕', title: '침체 + 물가: 여러 위험 요인을 함께 점검할 환경', text: '금·물가연동채 등 분산 후보와 포트폴리오의 위험 쏠림을 함께 점검합니다.', note: '복합 환경에서는 어느 한 자산의 방어를 단정하기보다 비용·유동성·상관관계를 함께 확인해야 합니다.' },
      };
      const icon = weatherSimulator.querySelector('.all-weather-sim-icon');
      const title = weatherSimulator.querySelector('#allWeatherScenarioTitle');
      const text = weatherSimulator.querySelector('#allWeatherScenarioText');
      const note = weatherSimulator.querySelector('#allWeatherScenarioNote');
      weatherSimulator.querySelectorAll('[data-weather-scenario]').forEach((button) => button.addEventListener('click', () => {
        const scenario = scenarios[button.dataset.weatherScenario];
        weatherSimulator.querySelectorAll('[data-weather-scenario]').forEach((item) => item.classList.toggle('active', item === button));
        icon.textContent = scenario.icon;
        title.textContent = scenario.title;
        text.textContent = scenario.text;
        note.textContent = scenario.note;
      }));
      weatherSimulator.dataset.ready = 'true';
    }
    addAfterText(target('위험을 읽는 네 가지 숫자'), `<figure class="concept-visual risk-dashboard"><p class="visual-kicker">RISK DASHBOARD · 같은 그래프, 서로 다른 질문</p><div class="metric-visual"><div class="metric-chart" aria-label="시작값 100에서 고점 120까지 오른 뒤 87로 하락하고 115로 마감한 예시 그래프"><svg viewBox="0 0 440 190" role="img" aria-hidden="true"><path d="M18 137 L72 105 L122 124 L174 47 L224 73 L274 154 L332 110 L385 30 L423 62 L423 164 L18 164 Z" fill="#315ff412"/><polyline points="18,137 72,105 122,124 174,47 224,73 274,154 332,110 385,30 423,62" fill="none" stroke="#315ff4" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><line x1="385" y1="30" x2="274" y2="154" stroke="#f06a67" stroke-width="3" stroke-dasharray="7 5"/><circle cx="18" cy="137" r="5" fill="#315ff4"/><circle cx="385" cy="30" r="6" fill="#f06a67"/><circle cx="274" cy="154" r="6" fill="#f06a67"/><circle cx="423" cy="62" r="5" fill="#10a36c"/><text x="16" y="184" fill="#63708a" font-size="14.5" font-weight="700">시작 100</text><text x="329" y="20" fill="#c53b35" font-size="14.5" font-weight="800">고점 120</text><text x="214" y="181" fill="#c53b35" font-size="14.5" font-weight="800">저점 87</text><text x="354" y="88" fill="#087a50" font-size="14.5" font-weight="800">마감 115</text></svg><span class="chart-callout volatility">파란 선의 들쭉날쭉함 = 변동성</span><span class="chart-callout drawdown">고점 120 → 저점 87 = MDD</span></div><div class="metric-legend"><span class="return"><i></i><b>수익률</b><small>시작 100 → 마감 115<br>결과는 <strong>+15%</strong></small></span><span class="volatility"><i></i><b>변동성</b><small>중간 과정에서 얼마나<br>자주·크게 흔들렸나</small></span><span class="drawdown"><i></i><b>MDD</b><small>고점 120 → 저점 87<br>가장 큰 하락은 <strong>−27.5%</strong></small></span><span class="sharpe"><i></i><b>샤프 비율</b><small>초과수익 ÷ 변동성<br>위험을 감안한 효율</small></span></div></div>${caption('네 숫자는 각각 다른 질문에 답합니다', '<b>수익률</b>은 최종 결과, <b>변동성</b>은 과정의 흔들림, <b>MDD</b>는 가장 아픈 하락, <b>샤프 비율</b>은 위험 대비 성과를 보여 줍니다.')}</figure>`);
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
    if (!document.getElementById('koreanPairBreakTimeModal')) {
      document.body.insertAdjacentHTML('beforeend', `<div class="glossary-modal breaktime-modal" id="koreanPairBreakTimeModal" hidden><div class="glossary-modal__backdrop" data-korean-pair-breaktime-close></div><section class="glossary-modal__dialog breaktime-dialog" role="dialog" aria-modal="true" aria-labelledby="koreanPairBreakTimeTitle"><button class="glossary-modal__close" type="button" aria-label="닫기" data-korean-pair-breaktime-close>×</button><p class="glossary-modal__label">BREAKTIME · 확장 과제</p><h2 id="koreanPairBreakTimeTitle">다른 종목 페어도 비교해 보세요</h2><p>비교하려는 두 종목의 업종·사업 구조·거래량·공매도 가능 여부와 주요 이벤트를 먼저 찾아보세요. 단지 상관관계가 높다는 이유만으로 페어가 적합한 것은 아닙니다.</p><p><b>시스템 확장 과제:</b> 종목 선택 목록에 새 페어를 추가하고, 각 페어별 가격 데이터·비교 기간·진입 Z 기준·거래비용을 바꿔 결과를 비교해 보세요.</p><p><small>당일 종가로 신호를 만들었다면 다음 거래일 체결가로 검증하고, 수수료·세금·대차료·슬리피지와 표본 밖 기간을 함께 반영해야 합니다.</small></p></section></div>`);
    }
    const koreanPairBreakTimeTrigger = document.getElementById('koreanPairBreakTimeTrigger');
    const koreanPairBreakTimeModal = document.getElementById('koreanPairBreakTimeModal');
    if (koreanPairBreakTimeTrigger && koreanPairBreakTimeModal && !koreanPairBreakTimeTrigger.dataset.ready) {
      const closeKoreanPairBreakTime = () => { koreanPairBreakTimeModal.hidden = true; koreanPairBreakTimeTrigger.focus(); };
      koreanPairBreakTimeTrigger.addEventListener('click', () => { koreanPairBreakTimeModal.hidden = false; koreanPairBreakTimeModal.querySelector('.glossary-modal__close')?.focus(); });
      koreanPairBreakTimeModal.querySelectorAll('[data-korean-pair-breaktime-close]').forEach((element) => element.addEventListener('click', closeKoreanPairBreakTime));
      koreanPairBreakTimeTrigger.dataset.ready = 'true';
    }
    const koreanPairBody = target('국내 3개 페어로 보는 과거 신호')?.querySelector('.lesson-body');
    if (koreanPairBody && !document.getElementById('koreanPairSimTrigger')) {
      koreanPairBody.insertAdjacentHTML('beforeend', `<p class="lesson-video-cta"><button type="button" class="lesson-video-link" id="koreanPairSimTrigger"><i class="fa-solid fa-chart-line"></i> 국내 페어 신호 시뮬레이터</button><small>신호일 종가 → 다음 거래일 진입 → 청산/손절의 순서와 비용 차감 손익을 확인하세요.</small></p>`);
    }
    const spoofingBody = target('허수성 주문(스푸핑):')?.querySelector('.lesson-body');
    if (spoofingBody && !document.getElementById('spoofingOrderBookTrigger')) {
      spoofingBody.insertAdjacentHTML('beforeend', `<p class="lesson-video-cta"><button type="button" class="lesson-video-link" id="spoofingOrderBookTrigger"><i class="fa-solid fa-table-list"></i> 가상 호가창 빠른 변화 보기</button><small>대량 호가가 나타났다가 취소되는 교육용 흐름을 확인하세요. 실제 시세·탐지 화면이 아닙니다.</small></p>`);
    }
    if (!document.getElementById('spoofingOrderBookModal')) {
      document.head.insertAdjacentHTML('beforeend', `<style id="spoofingOrderBookStyle">.spoofing-book-dialog{width:min(820px,calc(100vw - 40px));max-height:calc(100vh - 40px);overflow:auto}.spoofing-book-intro,.spoofing-book-note{color:var(--muted);font-size:14.5px;line-height:1.65}.spoofing-book-status{margin:14px 0;padding:10px 13px;border-left:4px solid #e69b00;border-radius:8px;background:#fff8e8;color:#704d00;font-size:15px;font-weight:800}.spoofing-book-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.spoofing-book-side{overflow:hidden;border:1px solid var(--line);border-radius:10px;background:#fff}.spoofing-book-side h3{margin:0;padding:10px 13px;font-size:16px}.spoofing-book-side.ask h3{background:#fff0ed;color:#a83730}.spoofing-book-side.bid h3{background:#eaf2ff;color:#1d56bc}.spoofing-book-side table{width:100%;border-collapse:collapse;font-size:14.5px}.spoofing-book-side th,.spoofing-book-side td{padding:8px 12px;border-top:1px solid #edf0f6;text-align:right}.spoofing-book-side th:first-child,.spoofing-book-side td:first-child{text-align:left}.spoofing-book-side tr.spoof td{background:#fff0f7;color:#a00056;font-weight:900;animation:spoof-pulse .42s ease-in-out infinite alternate}.spoofing-book-side tr.cancelled td{background:#f3f4f6;color:#8791a4;text-decoration:line-through}@keyframes spoof-pulse{to{background:#ffd4e9}}.spoofing-book-actions{display:flex;gap:8px;margin-top:14px}.spoofing-book-actions button{padding:8px 12px;border:1px solid #9bb9ec;border-radius:8px;background:#fff;color:#194e9e;font:800 14.5px inherit;cursor:pointer}.spoofing-book-actions button:hover{background:#edf4ff}.spoofing-book-note{margin:14px 0 0}@media(max-width:560px){.spoofing-book-dialog{width:calc(100vw - 24px);padding:24px 18px}.spoofing-book-grid{grid-template-columns:1fr}}</style>`);
      document.body.insertAdjacentHTML('beforeend', `<div class="glossary-modal" id="spoofingOrderBookModal" hidden><div class="glossary-modal__backdrop" data-spoofing-book-close></div><section class="glossary-modal__dialog spoofing-book-dialog" role="dialog" aria-modal="true" aria-labelledby="spoofingOrderBookTitle"><button class="glossary-modal__close" type="button" aria-label="닫기" data-spoofing-book-close>×</button><p class="glossary-modal__label">SIMULATION · 교육용 가상 호가창</p><h2 id="spoofingOrderBookTitle">대량 호가 → 취소: 빠른 호가창 변화</h2><p class="spoofing-book-intro">아래는 실제 종목·시세와 무관한 가상 주문장입니다. 큰 매수 호가가 보이는 것만으로 체결 의사나 시장 방향을 단정할 수 없다는 점을 보여 줍니다.</p><p class="spoofing-book-status" id="spoofingBookStatus" aria-live="polite"></p><div class="spoofing-book-grid"><section class="spoofing-book-side ask"><h3>매도 호가</h3><table><thead><tr><th>가격</th><th>잔량</th></tr></thead><tbody id="spoofingAskRows"></tbody></table></section><section class="spoofing-book-side bid"><h3>매수 호가</h3><table><thead><tr><th>가격</th><th>잔량</th></tr></thead><tbody id="spoofingBidRows"></tbody></table></section></div><div class="spoofing-book-actions"><button type="button" id="spoofingReplay">처음부터 다시 보기</button><button type="button" id="spoofingPause">일시정지</button></div><p class="spoofing-book-note">판단할 때는 큰 잔량 하나보다 실제 체결량, 반복된 주문·취소, 주문의 위치·지속시간과 시장을 오인하게 할 목적을 함께 살펴야 합니다. 정상적인 주문 변경도 있을 수 있으며, 위 흐름만으로 불공정거래를 판정할 수 없습니다.</p></section></div>`);
    }
    const spoofingTrigger = document.getElementById('spoofingOrderBookTrigger');
    const spoofingModal = document.getElementById('spoofingOrderBookModal');
    if (spoofingTrigger && spoofingModal && !spoofingTrigger.dataset.ready) {
      const askRows = document.getElementById('spoofingAskRows');
      const bidRows = document.getElementById('spoofingBidRows');
      const status = document.getElementById('spoofingBookStatus');
      const replay = document.getElementById('spoofingReplay');
      const pause = document.getElementById('spoofingPause');
      const phases = [
        { status: '1단계 · 일반적인 호가창: 작은 주문이 여러 가격에 나뉘어 있습니다.', bid: [['10,000', '180'], ['9,990', '240'], ['9,980', '150']], ask: [['10,010', '170'], ['10,020', '220'], ['10,030', '140']] },
        { status: '2단계 · 큰 매수 호가가 갑자기 나타납니다. 화면만 보면 강한 매수세처럼 보일 수 있습니다.', bid: [['10,000', '180'], ['9,990', '12,000', 'spoof'], ['9,980', '150']], ask: [['10,010', '170'], ['10,020', '220'], ['10,030', '140']] },
        { status: '3단계 · 가격이 닿기 전에 큰 호가가 취소됩니다. 실제 체결은 일어나지 않았습니다.', bid: [['10,000', '180'], ['9,990', '12,000', 'cancelled'], ['9,980', '150']], ask: [['10,010', '170'], ['10,020', '220'], ['10,030', '140']] },
        { status: '4단계 · 원래 수준의 잔량으로 돌아왔습니다. 이 과정을 반복 관찰해야 합니다.', bid: [['10,000', '205'], ['9,990', '265'], ['9,980', '170']], ask: [['10,010', '160'], ['10,020', '205'], ['10,030', '155']] },
      ];
      let phase = 0;
      let timer = null;
      const rows = (items) => items.map(([price, amount, state = '']) => `<tr class="${state}"><td>${price}</td><td>${amount}</td></tr>`).join('');
      const renderSpoofing = () => { const current = phases[phase]; askRows.innerHTML = rows(current.ask); bidRows.innerHTML = rows(current.bid); status.textContent = current.status; };
      const stop = () => { if (timer) clearInterval(timer); timer = null; pause.textContent = '계속 보기'; };
      const play = () => { stop(); pause.textContent = '일시정지'; timer = setInterval(() => { phase = (phase + 1) % phases.length; renderSpoofing(); }, 650); };
      const closeSpoofing = () => { stop(); spoofingModal.hidden = true; spoofingTrigger.focus(); };
      spoofingTrigger.addEventListener('click', () => { phase = 0; renderSpoofing(); spoofingModal.hidden = false; spoofingModal.querySelector('.glossary-modal__close')?.focus(); play(); });
      replay.addEventListener('click', () => { phase = 0; renderSpoofing(); play(); });
      pause.addEventListener('click', () => { if (timer) stop(); else play(); });
      spoofingModal.querySelectorAll('[data-spoofing-book-close]').forEach((element) => element.addEventListener('click', closeSpoofing));
      document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !spoofingModal.hidden) closeSpoofing(); });
      spoofingTrigger.dataset.ready = 'true';
    }
    const blackSwanBody = target('블랙 스완:')?.querySelector('.lesson-body');
    if (blackSwanBody && !document.getElementById('blackSwanMarketTrigger')) {
      blackSwanBody.insertAdjacentHTML('beforeend', `<p class="lesson-video-cta"><button type="button" class="lesson-video-link" id="blackSwanMarketTrigger"><i class="fa-solid fa-chart-line"></i> 2020년 급락 구간 4개국 비교</button><small>한국·미국·중국·일본 대표 주가지수를 같은 시작값으로 맞춰, 당시의 변동 폭을 함께 비교해 보세요.</small></p>`);
    }
    if (!document.getElementById('blackSwanMarketModal')) {
      document.head.insertAdjacentHTML('beforeend', `<style id="blackSwanMarketStyle">.black-swan-market-dialog{width:min(980px,calc(100vw - 40px));max-height:calc(100vh - 40px);overflow:auto}.black-swan-market-intro,.black-swan-market-note{margin:5px 0 15px;color:var(--muted);font-size:14.5px;line-height:1.65}.black-swan-market-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:15px}.black-swan-market-summary article{padding:12px;border:1px solid var(--line);border-radius:10px;background:#fbfcff}.black-swan-market-summary span,.black-swan-market-summary small{display:block;color:var(--muted);font-size:14.5px;font-weight:700;line-height:1.45}.black-swan-market-summary strong{display:block;margin:5px 0;color:var(--ink);font-size:19px}.black-swan-market-chart{width:100%;min-height:330px;border:1px solid #d7e2f0;border-radius:12px;background:#fff}.black-swan-market-legend{display:flex;flex-wrap:wrap;gap:12px;margin:12px 0}.black-swan-market-legend span{display:inline-flex;align-items:center;gap:6px;color:#243b63;font-size:14.5px;font-weight:800}.black-swan-market-legend i{display:block;width:12px;height:12px;border-radius:50%}.black-swan-market-table{width:100%;border-collapse:collapse;font-size:14.5px}.black-swan-market-table th,.black-swan-market-table td{padding:9px;border:1px solid var(--line);text-align:right}.black-swan-market-table th:first-child,.black-swan-market-table td:first-child{text-align:left}.black-swan-market-table th{background:#eef3ff;color:#173d82}@media(max-width:650px){.black-swan-market-dialog{width:calc(100vw - 24px);padding:24px 18px}.black-swan-market-summary{grid-template-columns:repeat(2,1fr)}.black-swan-market-chart{min-height:260px}.black-swan-market-table{font-size:12px}.black-swan-market-table th,.black-swan-market-table td{padding:6px 4px}}</style>`);
      document.body.insertAdjacentHTML('beforeend', `<div class="glossary-modal" id="blackSwanMarketModal" hidden><div class="glossary-modal__backdrop" data-black-swan-market-close></div><section class="glossary-modal__dialog black-swan-market-dialog" role="dialog" aria-modal="true" aria-labelledby="blackSwanMarketTitle"><button class="glossary-modal__close" type="button" aria-label="닫기" data-black-swan-market-close>×</button><p class="glossary-modal__label">HISTORICAL MARKET DATA · 교육용 비교</p><h2 id="blackSwanMarketTitle">코로나19 초기 충격: 4개국 증시 변동 비교</h2><p class="black-swan-market-intro">2020년 2월 19일을 100으로 맞춘 대표 주가지수 종가입니다. 같은 출발점으로 바꾸면 지수의 절대 수준이 아니라 <b>각 시장이 얼마나 크게 흔들렸는지</b>를 비교할 수 있습니다.</p><div class="black-swan-market-summary"><article><span>한국 · KOSPI</span><strong>−34.1%</strong><small>일간 변동성 3.78%</small></article><article><span>미국 · S&amp;P 500</span><strong>−33.9%</strong><small>일간 변동성 5.41%</small></article><article><span>중국 · 상하이종합</span><strong>−13.4%</strong><small>일간 변동성 1.89%</small></article><article><span>일본 · Nikkei 225</span><strong>−29.5%</strong><small>일간 변동성 2.81%</small></article></div><svg class="black-swan-market-chart" id="blackSwanMarketChart" viewBox="0 0 900 360" role="img" aria-label="2020년 2월 19일부터 3월 23일까지 한국, 미국, 중국, 일본 주가지수의 기준값 100 대비 변화"></svg><div class="black-swan-market-legend"><span><i style="background:#2563eb"></i>한국 KOSPI</span><span><i style="background:#dc2626"></i>미국 S&amp;P 500</span><span><i style="background:#16a34a"></i>중국 상하이종합</span><span><i style="background:#7c3aed"></i>일본 Nikkei 225</span></div><table class="black-swan-market-table"><thead><tr><th>지수</th><th>2/19 종가</th><th>기간 최저일</th><th>최대낙폭</th><th>일간 수익률 표준편차</th></tr></thead><tbody><tr><td>KOSPI</td><td>2,210.34</td><td>3/19</td><td>−34.1%</td><td>3.78%</td></tr><tr><td>S&amp;P 500</td><td>3,386.15</td><td>3/23</td><td>−33.9%</td><td>5.41%</td></tr><tr><td>상하이종합</td><td>2,975.40</td><td>3/23</td><td>−13.4%</td><td>1.89%</td></tr><tr><td>Nikkei 225</td><td>23,400.70</td><td>3/19</td><td>−29.5%</td><td>2.81%</td></tr></tbody></table><p class="black-swan-market-note">자료: Yahoo Finance 일별 종가(^KS11, ^GSPC, 000001.SS, ^N225), 2020-02-19~2020-03-24 조회. ‘일간 변동성’은 이 기간 일간 수익률의 표준편차이며, 과거 수치가 미래 위험을 예측하거나 투자 성과를 보장하지 않습니다.</p></section></div>`);
    }
    if (!document.getElementById('blackSwanMarketFitStyle')) document.head.insertAdjacentHTML('beforeend', `<style id="blackSwanMarketFitStyle">.black-swan-market-dialog{height:calc(100vh - 24px)!important;max-height:none!important;padding:20px 28px!important;overflow:hidden!important;display:flex;flex-direction:column}.black-swan-market-dialog h2{margin:0 46px 5px 0!important;font-size:25px}.black-swan-market-intro{margin:2px 0 8px!important}.black-swan-market-summary{gap:8px!important;margin-bottom:8px!important}.black-swan-market-summary article{padding:8px!important}.black-swan-market-summary strong{margin:2px 0!important;font-size:17px!important}.black-swan-market-chart{height:min(33vh,280px)!important;min-height:0!important;flex:0 0 min(33vh,280px)}.black-swan-market-legend{gap:9px!important;margin:7px 0!important}.black-swan-market-table th,.black-swan-market-table td{padding:5px 7px!important}.black-swan-market-note{margin:7px 0 0!important;font-size:13px!important;line-height:1.45!important}@media(max-width:650px){.black-swan-market-dialog{height:calc(100vh - 12px)!important;padding:16px!important}.black-swan-market-dialog h2{font-size:20px}.black-swan-market-summary{grid-template-columns:repeat(2,1fr)}.black-swan-market-chart{height:26vh!important;flex-basis:26vh}.black-swan-market-table{font-size:11px!important}.black-swan-market-table th,.black-swan-market-table td{padding:4px 3px!important}.black-swan-market-note{font-size:11px!important}}</style>`);
    const blackSwanMarketTrigger = document.getElementById('blackSwanMarketTrigger');
    const blackSwanMarketModal = document.getElementById('blackSwanMarketModal');
    const blackSwanMarketChart = document.getElementById('blackSwanMarketChart');
    const drawBlackSwanChart = () => {
      if (!blackSwanMarketChart || blackSwanMarketChart.dataset.ready) return;
      const series = [{ color: '#2563eb', values: [2210.34, 1987.01, 2040.22, 1771.44, 1457.64, 1482.46] }, { color: '#dc2626', values: [3386.15, 2954.22, 2972.37, 2711.02, 2409.39, 2237.40] }, { color: '#16a34a', values: [2975.40, 2880.30, 3034.51, 2887.43, 2702.13, 2660.17] }, { color: '#7c3aed', values: [23400.70, 21142.96, 20749.75, 17431.05, 16552.83, 16887.78] }];
      const dates = ['2/19', '2/28', '3/6', '3/13', '3/19', '3/23'];
      const x = (index) => 68 + index * 156;
      const y = (value) => 42 + (110 - value) * 2.35;
      const grid = [70, 80, 90, 100, 110].map((value) => `<line x1="68" x2="848" y1="${y(value)}" y2="${y(value)}" stroke="#dbe5f3"/><text x="14" y="${y(value) + 5}" fill="#63708a" font-size="14" font-weight="700">${value}</text>`).join('');
      const lines = series.map(({ color, values }) => { const indexed = values.map((value) => value / values[0] * 100); return `<polyline points="${indexed.map((value, index) => `${x(index)},${y(value)}`).join(' ')}" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>${indexed.map((value, index) => `<circle cx="${x(index)}" cy="${y(value)}" r="4" fill="${color}"/>`).join('')}`; }).join('');
      blackSwanMarketChart.innerHTML = `${grid}<line x1="68" x2="848" y1="300" y2="300" stroke="#9fb1ca"/>${dates.map((date, index) => `<text x="${x(index)}" y="326" text-anchor="middle" fill="#63708a" font-size="14" font-weight="700">${date}</text>`).join('')}<text x="68" y="20" fill="#173d82" font-size="15" font-weight="800">기준값 (2/19 = 100)</text>${lines}`;
      blackSwanMarketChart.dataset.ready = 'true';
    };
    if (blackSwanMarketTrigger && blackSwanMarketModal && !blackSwanMarketTrigger.dataset.ready) {
      const closeBlackSwanMarket = () => { blackSwanMarketModal.hidden = true; blackSwanMarketTrigger.focus(); };
      blackSwanMarketTrigger.addEventListener('click', () => { drawBlackSwanChart(); blackSwanMarketModal.hidden = false; blackSwanMarketModal.querySelector('.glossary-modal__close')?.focus(); });
      blackSwanMarketModal.querySelectorAll('[data-black-swan-market-close]').forEach((element) => element.addEventListener('click', closeBlackSwanMarket));
      blackSwanMarketTrigger.dataset.ready = 'true';
    }
  }
}());
