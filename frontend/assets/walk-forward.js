(function () {
  'use strict';

  const esc = value => String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
  const score = value => value == null ? '계산 불가' : Number(value).toFixed(3);
  const percent = value => `${(Number(value) * 100).toFixed(1)}%`;

  function renderFoldDetails(root, fold) {
    const events = fold.points.filter(point => point.actual || point.alert).slice(-20).reverse();
    const cells = (key, className) => fold.points.map(point =>
      `<span class="${point[key] ? className : ''}" title="${esc(point.date)} · ${key === 'actual' ? '실제 위험' : '모델 경보'} ${point[key] ? '있음' : '없음'}"></span>`
    ).join('');
    root.innerHTML = `
      <div class="wf-detail-head"><div><span>FOLD ${fold.number}</span><h3>테스트 구간의 경보 살펴보기</h3></div><p>${esc(fold.test.start)} ~ ${esc(fold.test.end)}</p></div>
      <p class="wf-explain">이 폴드의 기준은 학습 구간에서 계산한 <b>향후 10거래일 SPY 수익률 ${fold.cutoff_pct}% 이하</b>입니다. 테스트 날짜의 위험 여부도 같은 기준으로 판정했습니다.</p>
      <div class="wf-confusion">
        <article><strong>${fold.confusion.tp}</strong><span>맞힌 경보</span><small>경보를 냈고 실제 위험</small></article>
        <article><strong>${fold.confusion.fp}</strong><span>헛경보</span><small>경보를 냈지만 위험 아님</small></article>
        <article><strong>${fold.confusion.fn}</strong><span>놓친 위험</span><small>경보가 없었지만 실제 위험</small></article>
        <article><strong>${fold.confusion.tn}</strong><span>맞힌 정상</span><small>경보도 없고 위험도 없음</small></article>
      </div>
      <div class="wf-event-legend"><span><i class="wf-event-dot actual"></i> 실제 위험</span><span><i class="wf-event-dot alert"></i> 모델 경보</span><small>칸 하나 = 테스트 1거래일 · 가로로 스크롤해 전체 기간 확인</small></div>
      <div class="wf-strip-scroll" aria-hidden="true"><div class="wf-strip-grid" style="grid-template-columns:72px repeat(${fold.points.length},8px)"><b>실제 위험</b>${cells('actual', 'actual')}<b>모델 경보</b>${cells('alert', 'alert')}</div></div>
      <p class="wf-strip-dates"><span>${esc(fold.test.start)}</span><span>${esc(fold.test.end)}</span></p>
      <div class="wf-table-wrap"><table><caption>최근 위험 또는 경보 날짜 최대 20건</caption><thead><tr><th>날짜</th><th>모델의 위험 예상</th><th>경보</th><th>실제 위험</th></tr></thead><tbody>${events.length ? events.map(point => `<tr><td>${esc(point.date)}</td><td>${percent(point.probability)}</td><td>${point.alert ? '발생' : '없음'}</td><td>${point.actual ? '발생' : '없음'}</td></tr>`).join('') : '<tr><td colspan="4">이 구간에는 위험 이벤트와 경보가 없습니다.</td></tr>'}</tbody></table></div>
      <p class="wf-footnote">예상치는 모델 출력값이며 실제 발생 확률을 보장하지 않습니다. 가상 난수 데이터로 만든 검증 구조 실습이며 투자 판단에 사용할 수 없습니다.</p>`;
  }

  function renderResult(root, data) {
    root.innerHTML = `
      <section class="wf-section" aria-labelledby="wfResultTitle"><div class="wf-detail-head"><div><span>검증 결과</span><h3 id="wfResultTitle">${data.n_splits}개 폴드를 순서대로 테스트</h3></div><p>시드 ${data.seed} · 유효한 가상 거래일 ${data.valid_count.toLocaleString()}개</p></div>
        <p class="wf-explain">학습은 2019년부터 시작해 매번 길어지고, 테스트는 그 다음 구간으로 이동합니다. <b>파랑 = 학습, 빈 간격 = ${data.purge_window}거래일 격리, 초록 = 테스트</b>입니다. 마지막 ${data.excluded_tail_count}거래일은 향후 ${data.horizon}일의 정답을 알 수 없어 제거했습니다.</p>
        <div class="wf-metrics"><article><span>평균 ROC-AUC</span><strong>${score(data.average.roc_auc)}</strong><small>1에 가까울수록 위험일을 앞에 잘 배치</small></article><article><span>평균 재현율</span><strong>${score(data.average.recall)}</strong><small>실제 위험 중 경보를 낸 비율</small></article><article><span>평균 정밀도</span><strong>${score(data.average.precision)}</strong><small>경보 중 실제 위험이었던 비율</small></article><article><span>평균 F1</span><strong>${score(data.average.f1)}</strong><small>재현율과 정밀도의 균형</small></article></div>
        <p class="wf-footnote">위 숫자는 폴드별 지표의 단순 평균입니다. ROC-AUC는 테스트 구간에 위험과 비위험이 모두 있을 때만 계산합니다.</p>
        <div class="wf-folds">${data.folds.map(fold => `
          <article class="wf-fold"><div class="wf-fold-title"><h4>폴드 ${fold.number}</h4><button type="button" data-wf-fold="${fold.number}">상세 보기</button></div>
            <div class="wf-segment" role="img" aria-label="폴드 ${fold.number}: 학습 ${fold.train.count}일, 격리 ${fold.purge.count}일, 테스트 ${fold.test.count}일"><span class="train" style="width:${fold.train.count / data.valid_count * 100}%"></span><span class="purge" style="width:${fold.purge.count / data.valid_count * 100}%"></span><span class="test" style="width:${fold.test.count / data.valid_count * 100}%"></span></div>
            <div class="wf-fold-periods"><span><b>학습 ${fold.train.count}일</b> ${esc(fold.train.start)} ~ ${esc(fold.train.end)}</span><span><b>격리 ${fold.purge.count}일</b> ${esc(fold.purge.start)} ~ ${esc(fold.purge.end)}</span><span><b>테스트 ${fold.test.count}일</b> ${esc(fold.test.start)} ~ ${esc(fold.test.end)}</span></div>
            <p>실제 위험 ${fold.test_event_count}건 · 경보 ${fold.alert_count}건 <span>ROC-AUC ${score(fold.metrics.roc_auc)} · 재현율 ${score(fold.metrics.recall)} · 정밀도 ${score(fold.metrics.precision)} · F1 ${score(fold.metrics.f1)}</span></p>
          </article>`).join('')}</div>
      </section><section class="wf-section" id="wfFoldDetails" aria-live="polite"></section>`;
    const details = root.querySelector('#wfFoldDetails');
    const chooseFold = number => {
      const fold = data.folds[number - 1];
      renderFoldDetails(details, fold);
      root.querySelectorAll('[data-wf-fold]').forEach(button => {
        const active = Number(button.dataset.wfFold) === number;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
      });
    };
    root.querySelectorAll('[data-wf-fold]').forEach(button => {
      button.addEventListener('click', () => chooseFold(Number(button.dataset.wfFold)));
    });
    chooseFold(1);
  }

  // Mirrors the server-side split rules so the layout can be shown before running.
  const SAMPLE_COUNT = 1250;
  const HORIZON = 10;
  const START_DATE = new Date(Date.UTC(2019, 0, 1));
  function businessDay(offset) {
    const date = new Date(START_DATE);
    let remaining = offset;
    while (remaining > 0) {
      date.setUTCDate(date.getUTCDate() + 1);
      const day = date.getUTCDay();
      if (day !== 0 && day !== 6) remaining -= 1;
    }
    return date.toISOString().slice(0, 10);
  }
  function planFolds(nSplits, purgeWindow) {
    const validCount = SAMPLE_COUNT - HORIZON;
    const testSize = Math.floor(validCount / (nSplits + 1));
    const folds = [];
    for (let index = 0; index < nSplits; index += 1) {
      const testStart = (index + 1) * testSize;
      const testEnd = index < nSplits - 1 ? (index + 2) * testSize : validCount;
      const trainEnd = testStart - purgeWindow;
      folds.push({ number: index + 1, trainEnd, testStart, testEnd, shortTrain: trainEnd < 50 });
    }
    return { validCount, testSize, folds };
  }
  function renderPreview(root, formData) {
    const nSplits = Number(formData.get('n_splits'));
    const purgeWindow = Number(formData.get('purge_window'));
    const seed = formData.get('seed');
    const plan = planFolds(nSplits, purgeWindow);
    const first = plan.folds[0];
    const last = plan.folds[plan.folds.length - 1];
    root.innerHTML = `
      <div class="wf-preview-head"><b>폴드 미리보기 · 실행 전에 구조 확인</b><span>시드 ${esc(seed)} · 유효 거래일 ${plan.validCount.toLocaleString()}개 (${SAMPLE_COUNT.toLocaleString()}일 중 마지막 ${HORIZON}일 제외)</span></div>
      <p class="wf-preview-story">${plan.validCount.toLocaleString()}일을 ${nSplits + 1}등분하면 한 조각이 <b>${plan.testSize}거래일(약 ${(plan.testSize / 21).toFixed(1)}개월)</b>입니다. 첫 조각은 공부만 하고, 두 번째 조각부터 하나씩 시험을 봅니다. 시험 직전 <b>${purgeWindow}거래일</b>은 매번 공부에서 뺍니다.</p>
      <div class="wf-preview-folds">${plan.folds.map(fold => `
        <div class="wf-preview-fold${fold.shortTrain ? ' short' : ''}">
          <div class="wf-preview-title"><b>폴드 ${fold.number}</b><span>학습 ${fold.trainEnd}일 → 격리 ${purgeWindow}일 → 테스트 ${fold.testEnd - fold.testStart}일</span></div>
          <div class="wf-segment" role="img" aria-label="폴드 ${fold.number}: 학습 ${fold.trainEnd}일, 격리 ${purgeWindow}일, 테스트 ${fold.testEnd - fold.testStart}일"><span class="train" style="width:${fold.trainEnd / plan.validCount * 100}%"></span><span class="purge" style="width:${purgeWindow / plan.validCount * 100}%"></span><span class="test" style="width:${(fold.testEnd - fold.testStart) / plan.validCount * 100}%"></span></div>
          <div class="wf-fold-periods"><span><b>학습</b> ${businessDay(0)} ~ ${businessDay(fold.trainEnd - 1)}</span><span><b>격리</b> ${businessDay(fold.trainEnd)} ~ ${businessDay(fold.testStart - 1)}</span><span><b>테스트</b> ${businessDay(fold.testStart)} ~ ${businessDay(fold.testEnd - 1)}</span></div>
          ${fold.shortTrain ? '<p class="wf-preview-warn">격리 후 학습 데이터가 50일 미만이라 서버가 실행을 거부합니다.</p>' : ''}
        </div>`).join('')}</div>
      <p class="wf-preview-example"><b>읽는 법 (예시):</b> 폴드 1은 ${businessDay(0)}부터 ${businessDay(first.trainEnd - 1)}까지 ${first.trainEnd}일로 공부한 뒤, ${purgeWindow}일을 비우고 ${businessDay(first.testStart)}부터 ${first.testEnd - first.testStart}일 동안 매일 “앞으로 10일 안에 하위 10% 하락이 올까?”를 맞혀 봅니다. 마지막 폴드 ${last.number}은 학습이 ${last.trainEnd}일로 가장 길어집니다(누적 방식). 파랑 = 학습, 빈 간격 = 격리, 초록 = 테스트입니다.</p>
      <details class="wf-guide-more wf-fold-help"><summary>폴드(Fold)란 무엇인가요?</summary>
        <p>위 미리보기는 “Purging(격리)을 적용한 Expanding Window 방식의 시계열 교차 검증(TimeSeries Cross-Validation) 구조”를 보기 쉽게 요약한 것입니다. 여기서 나오는 <strong>‘폴드(Fold)’</strong>는 머신러닝 교차 검증에서 데이터를 나눈 <strong>‘단계(Step) 또는 검증 구간’</strong>을 뜻합니다.</p>
        <h4>1. ‘폴드(Fold)’의 의미 (여기서는 ‘1회 차 테스트 단계’)</h4>
        <ul>
          <li><strong>폴드 1 ~ 폴드 ${nSplits}:</strong> 전체 데이터를 ${nSplits + 1}조각(각 ${plan.testSize}일)으로 나눈 뒤, <strong>시간 흐름에 따라 검증을 총 ${nSplits}회(${nSplits}개의 Fold) 진행</strong>하겠다는 뜻입니다.
            <ul>${plan.folds.map(fold => `<li><strong>폴드 ${fold.number}:</strong> 약 ${(fold.trainEnd / 252).toFixed(1)}년(${fold.trainEnd}일) 공부해서 다음 약 ${((fold.testEnd - fold.testStart) / 252).toFixed(1)}년(${fold.testEnd - fold.testStart}일) 시험 보기</li>`).join('')}</ul>
          </li>
        </ul>
        <h4>2. 이 설계가 ‘시계열 검증’으로 안전한 3가지 이유</h4>
        <p><b>① Expanding Window (누적 학습 방식) 적용</b></p>
        <ul>
          <li>학습일수가 ${plan.folds.map(fold => `폴드 ${fold.number}(${fold.trainEnd}일)`).join(' → ')}로 <strong>과거 학습 시작일(${businessDay(0)})을 고정한 채 학습 데이터가 계속 누적</strong>됩니다.</li>
          <li>2019년의 시장 데이터(과거 경험)를 버리지 않고 계속 누적하여, 금융위기/폭락장 같은 희귀한 위험(하위 10%)을 모델이 기억하게 만드는 구조입니다.</li>
        </ul>
        <p><b>② Purging (격리 ${purgeWindow}일) 적용으로 데이터 유출 차단</b></p>
        <ul>
          <li><strong>“시험 직전 ${purgeWindow}거래일은 매번 공부에서 뺍니다.”</strong></li>
          <li>예를 들어 폴드 1을 보면, 테스트 시작일인 <code>${businessDay(first.testStart)}</code>의 바로 직전 ${purgeWindow}일(<code>${businessDay(first.trainEnd)} ~ ${businessDay(first.testStart - 1)}</code>)을 격리 구간(Purge)으로 비워 두었습니다.</li>
          <li>테스트 첫날부터 예측해야 하는 라벨이 ‘미래 10일 수익률’이기 때문에, 학습 데이터 끝자리에 테스트 첫날의 주가 정보가 흘러 들어가는 <strong>Look-ahead Bias(미래 정보 유출)를 정확히 차단</strong>합니다.</li>
        </ul>
        <p><b>③ 마지막 ${HORIZON}일 완전히 제외 (유효 거래일 ${plan.validCount.toLocaleString()}개)</b></p>
        <ul>
          <li>${SAMPLE_COUNT.toLocaleString()}일 중 맨 마지막 ${HORIZON}일을 뺀 이유는, 데이터의 맨 끝 ${HORIZON}일은 <strong>“그 다음 10일간 주가가 어떻게 될지”에 대한 정답(미래 10일 수익률 라벨)을 만들 수 없기 때문</strong>입니다. (미래 주가가 없으므로)</li>
        </ul>
        <h4>3. 한 줄 요약</h4>
        <blockquote><strong>“여기서의 ‘폴드’는 데이터 유출(${purgeWindow}일 격리)을 차단하면서, 학습 기간을 점점 늘려가며 총 ${nSplits}번에 걸쳐 모델의 위험 예측 성능을 현실적으로 시험해 보는 ‘검증 회차’를 의미합니다.”</strong></blockquote>
        <p>이 백테스트·검증 파이프라인은 퀀트 금융 머신러닝에서 요구하는 데이터 무결성 기준(시간 순서 유지, 격리, 미래 라벨 제거)을 그대로 따른 설계입니다.</p>
        <h4>4. 폴드 수는 몇 개가 적당한가요?</h4>
        <p>머신러닝 전반과 금융 시계열 분야에서 가장 많이 쓰이는 표준 폴드 개수는 <strong>5개 또는 10개</strong>입니다. 하지만 금융 시계열 분석에서는 무작정 폴드를 늘리지 않고 <strong>4~5개 정도로 제한</strong>하는 편입니다.</p>
        <p><b>① 일반 머신러닝 vs 금융 시계열 폴드 수 비교</b></p>
        <ul>
          <li><strong>일반 머신러닝 (K-Fold): K = 5 또는 K = 10</strong><br>데이터 교차 검증의 세계적 표준입니다. 10-Fold는 데이터를 10%씩 나누어 90% 학습/10% 검증을 수행하므로 편향(Bias)과 분산(Variance) 간의 균형이 가장 좋다고 알려져 있습니다.</li>
          <li><strong>금융 시계열 분석 (Expanding / Walk-Forward): K = 4 또는 K = 5</strong><br>주식/금융 데이터에서는 4개 또는 5개를 가장 많이 씁니다.</li>
        </ul>
        <p><b>② 금융 시계열에서 폴드 수를 4~5개로 잡는 이유</b></p>
        <ul>
          <li><strong>테스트 구간의 길이 (약 1년 단위의 의미 있는 기간):</strong> 주식 시장의 1년 유효 거래일은 약 252일입니다. 데이터를 5개 정도로 나누어야 각 폴드의 테스트 기간이 약 1년(250일 안팎)이 됩니다. 만약 폴드를 20개~30개로 너무 크게 늘리면 한 폴드의 테스트 기간이 겨우 10~20일에 불과해져, 특정 계절성이나 단기 해프닝에 테스트 결과가 휘둘리는 문제가 발생합니다.<br><span class="wf-fold-now">현재 설정: 폴드 ${nSplits}개 → 테스트 한 구간 ${plan.testSize}일(약 ${(plan.testSize / 252).toFixed(1)}년)</span></li>
          <li><strong>학습 데이터의 최소 분량 확보:</strong> 위 미리보기처럼 첫 번째 폴드(Fold 1)는 전체 데이터의 첫 번째 조각만 가지고 학습을 시작합니다. 폴드 수가 너무 많으면(예: 10개) 첫 번째 폴드의 학습 기간이 너무 짧아져(예: 6개월 분량) 모델이 제대로 패턴을 학습조차 하지 못하고 테스트에 들어가는 문제가 생깁니다.<br><span class="wf-fold-now">현재 설정: 폴드 1의 학습 기간 ${first.trainEnd}일(약 ${(first.trainEnd / 21).toFixed(0)}개월)</span></li>
          <li><strong>격리 구간(Purging) 데이터 손실 최소화:</strong> 폴드가 늘어날 때마다 폴드와 폴드 사이에서 ${purgeWindow}일씩 버려지는 격리(Purging) 구간이 추가로 생깁니다. 폴드를 무리하게 늘리면 그만큼 버려지는 데이터의 총량이 많아집니다.<br><span class="wf-fold-now">현재 설정: 폴드마다 ${purgeWindow}일씩, 총 ${nSplits * purgeWindow}일이 학습에서 제외됨</span></li>
        </ul>
        <p><b>③ 한 줄 요약</b></p>
        <blockquote><strong>“일반 데이터 분석은 5개나 10개를 쓰지만, 금융 시계열에서는 [1년 치 테스트 기간 확보]와 [초기 학습 분량 확보]를 위해 보통 4개~5개 폴드를 가장 선호합니다.”</strong></blockquote>
      </details>`;
  }

  function mount(element, fetchJson) {
    element.innerHTML = `
      <section class="walk-forward" aria-labelledby="wfTitle">
        <div class="wf-hero"><span>WALK-FORWARD LAB · 검증 구조 실습</span><h2 id="wfTitle">Expanding Window + Purging</h2><p>과거 구간을 점점 늘려 학습하고, 테스트 직전의 날짜를 비운 뒤 다음 구간에서 위험 경보를 평가합니다.</p></div>
        <details class="wf-guide-more wf-howto"><summary>Walk-Forward, 쉽게 이해하기</summary>
          <p>Walk-Forward는 한마디로 <strong>“과거로 공부하고, 바로 다음 구간을 시험 보고, 한 칸 앞으로 걸어가서 또 반복”</strong>하는 검증 방법입니다. 모델은 과거 데이터로 학습한 뒤, 테스트일(오늘 또는 미래의 어느 날) 시점에서 <strong>“앞으로 10거래일 안에 하위 10% 폭락이 올 확률”</strong>을 0~100%로 내놓고, 그 확률이 높으면 경보를 켭니다.</p>
            <h4>1. 흔한 오해: “날짜를 과거로 되돌리며 테스트한다?”</h4>
            <p>“과거의 일정 기간을 계속 뒤로 보내면서 날짜를 추가한다”고 이해하기 쉽지만, 실제로는 반대입니다. 학습과 테스트는 날짜를 과거(뒤)로 되돌리는 것이 아니라, <strong>시간이 흐르는 순서대로 과거에서 미래(앞)로 전진</strong>하면서 진행됩니다. 그래서 이름도 ‘앞으로 걸어간다’는 뜻의 Walk-Forward입니다.</p>
            <h4>2. 실제로 돌아가는 방식 (롤링 윈도우 / Walk-Forward)</h4>
            <p>주식 시장에는 매일 새 데이터가 쌓입니다. 그래서 <strong>“기준일을 미래 쪽으로 한 칸씩 밀고 나가면서”</strong> 학습과 테스트를 반복합니다.</p>
            <pre class="wf-code"><code>[1차 학습 및 테스트]
[=========== 학습 기간 (예: 2010~2020) ===========] [Purge 10일] [테스트: 2021년 1월]
                                                                        │
                                                                   위험 확률 산출

[2차 학습 및 테스트 (시간이 1달 흐른 후)]
  [=========== 학습 기간 (예: 2010~2021년 1월) ===========] [Purge 10일] [테스트: 2021년 2월]
                                                                                │
                                                                           위험 확률 산출</code></pre>
            <ol>
              <li><strong>시간 순서 유지:</strong> 과거 데이터(예: 2010년~2020년)만 모아서 모델을 만듭니다. 미래 데이터는 절대 섞지 않습니다.</li>
              <li><strong>완충 지대(Purge):</strong> 테스트일 바로 앞 10거래일은 학습에서 뺍니다. 이 날들의 ‘정답’은 테스트 기간의 주가로 만들어졌기 때문에, 넣으면 답을 미리 보는 셈이 됩니다.</li>
              <li><strong>확률 예측:</strong> 테스트일(예: 2021년 1월 1일)의 피처(SPY 수익률, VIX 변화율, HY 스프레드 변화율)를 모델에 넣고 “앞으로 10일간 폭락할 확률이 몇 %인가?”를 계산합니다.</li>
              <li><strong>전진(Walk-Forward):</strong> 하루 또는 한 달이 지나면, 그동안 새로 쌓인 데이터를 학습 데이터에 추가하고 테스트 기준일을 미래로 한 칸 옮겨 다시 확률을 구합니다. 이 과정을 끝까지 반복합니다.</li>
            </ol>
            <div class="wf-subnote">
              <p><b>학습(Retrain)은 몇 번 하나요?</b><br>위 그림처럼 2차 학습(한 달이 흐른 뒤)까지 진행되었다면, 모델을 처음부터 다시 새로 학습시킨 전체 학습 횟수는 <strong>총 2회</strong>입니다. 구체적으로 나누어 보면 다음과 같습니다.</p>
              <ul>
                <li><strong>1차 학습 (첫 번째 실행):</strong>
                  <ul>
                    <li>학습 기간: 2010 ~ 2020년 데이터</li>
                    <li>목적: 2021년 1월 테스트를 위해 모델을 처음 학습 (1회 학습)</li>
                  </ul>
                </li>
                <li><strong>2차 학습 (한 달이 흐른 뒤):</strong>
                  <ul>
                    <li>학습 기간: 2010 ~ 2021년 1월 데이터 (새로운 한 달치 데이터가 누적됨)</li>
                    <li>목적: 2021년 2월 테스트를 위해 모델을 다시 새로 학습 (2회 학습)</li>
                  </ul>
                </li>
              </ul>
              <p>따라서 시간이 흐르며 테스트 구간이 한 달씩 뒤로 밀릴 때마다, 모델은 기존에 학습한 방대한 과거 데이터에 최신 한 달 데이터를 추가하여 <strong>매번 새롭게 처음부터 학습(Retrain)</strong>을 진행하게 되며, 위 예시 시점까지는 총 2번의 학습이 이루어진 것입니다. 이전 모델을 이어서 조금만 더 배우는 것이 아니라, 매번 늘어난 전체 학습 데이터로 모델을 새로 만든다는 점이 핵심입니다.</p>
              <p><b>이 페이지에서는:</b> 폴드 하나가 학습 1회입니다. 폴드 수를 4개로 두면 모델을 4번 새로 학습하고, 10개로 두면 10번 새로 학습합니다. 폴드마다 위험 기준(하위 10%)도 그때의 학습 데이터로 다시 계산합니다.</p>
            </div>
            <blockquote><b>이 페이지에서는:</b> 위 그림의 1차·2차가 곧 ‘폴드(fold)’입니다. 폴드가 넘어갈수록 학습 기간이 점점 길어지는 것이 Expanding Window이고, 학습과 테스트 사이에 비워 둔 10거래일이 Purging입니다. 아래에서 폴드 수와 격리 일수를 바꿔 실행하면 폴드별로 이 과정이 어떻게 달라지는지 확인할 수 있습니다.</blockquote>
            <h4>3. 학습 시작일은 언제로 잡나요?</h4>
            <p>학습에 사용할 ‘과거 시점의 최초 시작일(Start Date)’을 언제로 잡을 것인지는 퀀트 모델링에서 매우 중요한 질문입니다.</p>
            <p>결론부터 말씀드리면, “SPY, VIX, HY 스프레드 3개 피처가 모두 제공되고 데이터 품질이 신뢰할 수 있는 가장 빠른 시점”을 기준으로 잡아야 하며, 실전 기준으로는 <strong>1997년~2000년대 초반</strong>이 가장 적절합니다.</p>
            <h5>3-1. 피처별 데이터 제공 시작일 (데이터 제약 조건)</h5>
            <p>모델에 들어가는 3가지 지표의 historical 데이터 제공 시점이 서로 다릅니다. 가장 나중에 시작된 지표에 맞춰야 합니다.</p>
            <div class="wf-guide-table"><table>
              <thead><tr><th>피처</th><th>실제 데이터 시작 시점</th><th>비고</th></tr></thead>
              <tbody>
                <tr><th>SPY (S&amp;P 500 ETF)</th><td><strong>1993년 1월</strong></td><td>미국 최초의 상장 ETF</td></tr>
                <tr><th>VIX 지수 (공포 지수)</th><td><strong>1990년 / 2004년</strong></td><td>1990년부터 소급 계산 데이터 존재, CBOE 공식 선물 거래는 2004년 시작</td></tr>
                <tr><th>HY 스프레드 (High Yield Spread)</th><td><strong>1996년 12월</strong></td><td>FRED(BAMLH0A0HYM2) 기준 데이터 제공 시점</td></tr>
              </tbody>
            </table></div>
            <blockquote>📌 <b>결론 1:</b> 3개 지표가 완벽히 일치하여 존재하는 최초 시점은 <strong>1997년 1월</strong>입니다.</blockquote>
            <h5>3-2. 금융 모형 관점에서의 추천 기준: 최소 15~20년 (2000년~2007년 시작)</h5>
            <p>통계 모델이나 로지스틱 회귀가 ‘위험(하위 10%)’을 제대로 학습하려면 <strong>충분한 수의 폭락장/위기(Crisis) 데이터</strong>를 포함해야 합니다.</p>
            <p>실전 모델링에서는 주로 다음과 같은 역사적 사건들이 포함되도록 시작일을 설정합니다.</p>
            <ol>
              <li><strong>2000년 이전 (1997년~):</strong> 닷컴 버블, 2008 금융위기, 2020 코로나 폭락, 2022 인플레이션 하락장을 모두 학습 (가장 권장)</li>
              <li><strong>2007년 이전 (2007년~):</strong> 최소한 2008 서브프라임 금융위기 포함</li>
              <li><strong>최소 기준:</strong> 모델 학습 기간에 최소 2~3번 이상의 대형 리스크 이벤트가 들어있어야 함</li>
            </ol>
            <blockquote>📌 <b>결론 2:</b> 데이터의 양과 위기 학습 측면에서 <strong>1997년 1월 1일</strong> 또는 <strong>2000년 1월 1일</strong>을 시작점으로 잡는 것이 가장 좋습니다.</blockquote>
            <h5>3-3. 실전 적용 시 2가지 데이터 관리 전략</h5>
            <p>과거 최초 시작일을 정한 후, 데이터를 학습 시에 사용하는 방식은 2가지가 있습니다.</p>
            <p><b>① 누적 방식 (Expanding Window) — 추천</b></p>
            <ul>
              <li><strong>방식:</strong> 고정된 최초 시작일(예: 1997년)부터 현재까지 데이터가 쌓이는 대로 계속 누적하여 학습합니다.</li>
              <li><strong>장점:</strong> 장기적인 시장 구조와 대형 금융위기 데이터가 손실되지 않고 모델에 유지됩니다.</li>
            </ul>
            <p><b>② 고정 기간 이동 방식 (Rolling Window)</b></p>
            <ul>
              <li><strong>방식:</strong> 항상 최근 N년(예: 최근 10년) 데이터만 유지하면서 과거 오래된 데이터를 버립니다.</li>
              <li><strong>장점:</strong> 최근 시장 환경(고주파 매매, 금리 체계 등) 변화를 잘 반영하지만, 최근 10년간 대형 위기가 없었다면 위기 감지력이 떨어질 수 있습니다.</li>
            </ul>
            <div class="wf-subnote">
              <p><b>Expanding Window vs Rolling Window, 더 자세히</b><br>시계열 백테스팅에서 학습 데이터를 구성하는 두 가지 핵심 방식인 Expanding Window(확장형 창)와 Rolling Window(이동형 창)는 “과거의 기억을 얼마나 오래 유지할 것인가”에 대한 관점 차이에서 출발합니다.</p>
              <p><b>① 두 방식의 구조적 차이</b></p>
              <pre class="wf-code"><code>[Expanding Window: 고정된 시작점, 계속 확장]
T1: [===== Train (5년) =====] [Purge] [Test]
T2: [====== Train (6년) ======] [Purge] [Test]
T3: [======== Train (7년) ========] [Purge] [Test]

[Rolling Window: 고정된 길이, 계속 이동]
T1: [===== Train (5년) =====] [Purge] [Test]
T2:   [===== Train (5년) =====] [Purge] [Test]
T3:     [===== Train (5년) =====] [Purge] [Test]</code></pre>
              <ul>
                <li><strong>Expanding Window:</strong> 최초 시작일(예: 1997년)을 고정한 채, 시간이 흐름에 따라 새로 쌓이는 데이터를 뒤에 계속 붙여나가며 학습 세트를 점점 늘려갑니다.</li>
                <li><strong>Rolling Window:</strong> 학습 데이터의 기간(예: 최근 5년)을 고정해 두고, 새로운 데이터가 들어오면 그만큼 오래된 과거 데이터를 버리면서 한 칸씩 밀고 나갑니다.</li>
              </ul>
              <p><b>② 장단점 상세 비교</b></p>
              <div class="wf-guide-table"><table>
                <thead><tr><th>구분</th><th>Expanding Window (확장형)</th><th>Rolling Window (이동형)</th></tr></thead>
                <tbody>
                  <tr><th>핵심 철학</th><td>“모든 과거 경험(금융위기 포함)은 자산이다.”</td><td>“최근 시장 체제(Regime)에 맞추는 것이 더 중요하다.”</td></tr>
                  <tr><th>데이터 활용</th><td>데이터 누적으로 <strong>희귀 이벤트(폭락장) 학습에 유익</strong></td><td>최근 데이터에 집중하여 <strong>시장 환경 변화에 빠르게 적응</strong></td></tr>
                  <tr><th>장점</th><td>• 희귀한 ‘위험(하위 10%)’ 클래스 데이터가 계속 축적됨<br>• 표본 크기(N)가 커져 모델 예측의 <strong>분산(Variance)이 낮아짐</strong></td><td>• 연준 금리 정책변화, 고주파 매매 등 <strong>구조적 변화 적응력이 뛰어남</strong><br>• 오래된 쓸모없는 패턴(노이즈)을 자동으로 폐기함</td></tr>
                  <tr><th>단점</th><td>• 아주 오래된 무의미해진 시장 상관관계까지 계속 학습함<br>• 데이터가 커질수록 <strong>학습 연산 시간이 점점 증가함</strong></td><td>• 학습 기간이 너무 짧으면 금융위기 같은 <strong>희귀한 위험을 학습 못 함</strong><br>• 창 크기(Window Size: 3년? 5년?) 설정 시 편향 위험</td></tr>
                </tbody>
              </table></div>
              <p><b>③ 두 방식의 성능 및 특성 차이</b><br>두 방식 중 어느 것이 절대적으로 우위에 있다고 볼 수는 없으며, <strong>예측하려는 지표의 성격</strong>에 따라 성능 특성이 크게 갈립니다.</p>
              <p><b>희귀 이벤트/위험 경보 모델 (이 페이지의 모델) → Expanding Window 우세</b></p>
              <ul>
                <li><strong>이유:</strong> “하위 10% 위험 경보 모델”처럼 희귀한 이벤트를 예측할 때는 최근 3~5년(Rolling Window) 내에 대형 폭락장이 한 번도 없었을 가능성이 높습니다.</li>
                <li><strong>성능 차이:</strong> Rolling Window를 쓰면 폭락장 데이터(Positive Label)가 학습 세트에 아예 없거나 부족해져 <strong>경보 시스템으로서의 재현율(Recall)이 급격히 떨어집니다.</strong> 반면 Expanding Window는 2008년, 2020년 폭락장 데이터가 계속 유지되므로 위기 감지 성능이 뛰어납니다.</li>
              </ul>
              <p><b>단기 매매 / 모멘텀 전략 모델 → Rolling Window 우세</b></p>
              <ul>
                <li><strong>이유:</strong> 시장의 국면(Bull/Bear Market)이나 금리 체계가 바뀌면 과거 10년 전의 주가 상관관계는 아무런 의미가 없어집니다.</li>
                <li><strong>성능 차이:</strong> Rolling Window가 노이즈가 된 옛 데이터를 지워주므로 <strong>적응력(Adaptability) 측면에서 훨씬 우수한 성과</strong>를 보입니다.</li>
              </ul>
              <p><b>④ 실전 추천 및 하이브리드 전략</b><br><strong>SPY, VIX, HY 스프레드 기반 리스크 예측 모델</strong>에는 다음과 같은 전략을 권장합니다.</p>
              <ol>
                <li><strong>Expanding Window 우선 적용:</strong> 희귀한 폭락 위험을 잡는 것이 목표이므로 1997년/2000년대 초반부터 누적되는 <strong>Expanding Window</strong>를 기본 구조로 잡는 것이 안전합니다.</li>
                <li><strong>Exponential Weighting (지수 가중치) 결합:</strong> Expanding Window를 쓰되, 과거 오래된 데이터일수록 가중치를 점점 낮추는(Decay Factor) 방식을 적용하면 <strong>“옛 금융위기 데이터도 기억하면서, 최근 데이터에 더 민감하게 반응하는”</strong> 두 방식의 장점을 모두 취할 수 있습니다.</li>
              </ol>
            </div>
            <h5>3-4. 한 줄 요약</h5>
            <blockquote><strong>“HY 스프레드가 제공되는 1997년 1월을 최초 시점으로 잡거나, 깔끔한 2000년 1월 1일을 시작일로 설정하여 2008년 금융위기 등 주요 대형 폭락장을 학습 데이터에 반드시 포함시키는 것이 베스트입니다.”</strong></blockquote>
            <h4>4. “매일 예측한다”는 게 무슨 뜻인가요?</h4>
            <p>“매일 예측한다”는 말은 다소 추상적으로 들릴 수 있습니다. <strong>실제 달력 날짜와 함께 시뮬레이션</strong>을 해보면 아주 명확하게 이해됩니다. 핵심만 짚어서 쉽게 설명합니다.</p>
            <h5>4-1. “매일 장 마감 후”의 의미</h5>
            <p>이 시스템을 실제 실전(또는 백테스트)에 적용한다고 상상해 보겠습니다.</p>
            <ul>
              <li><strong>시간:</strong> 매일 주식 시장이 끝나는 장 마감 후(미국 기준 현지 시각 오후 4시).</li>
              <li><strong>행동:</strong> 그날까지 나온 <strong>[SPY 수익률, VIX 변화율, HY 스프레드 변화율]</strong> 데이터를 모델에 쏙 집어넣습니다.</li>
              <li><strong>모델의 대답:</strong> 모델은 그 데이터를 보고 다음과 같이 확률을 뱉어냅니다.</li>
            </ul>
            <blockquote><em>“오늘 데이터를 보니까, <strong>내일부터 앞으로 10거래일 동안</strong> SPY가 하위 10% 수준으로 폭락할 확률이 <strong>78%</strong>입니다!”</em></blockquote>
            <h5>4-2. “992일 동안 단 하루도 빠짐없이”의 구체적 예시</h5>
            <p>기본 설정(4폴드 × 248일)에서 테스트 기간은 총 992일입니다. 모델은 가만히 있는 것이 아니라 <strong>달력을 한 장씩 넘기며 매일 이 작업을 반복</strong>합니다.</p>
            <ul>
              <li><strong>2019년 12월 13일 (금) 장 마감 후:</strong>
                <ul>
                  <li>입력: 이날까지의 시장 데이터</li>
                  <li>예측: <strong>“2019년 12월 16일 ~ 2019년 12월 30일(앞으로 10일)”</strong> 동안 폭락이 올 확률은 <strong>15%</strong> (안전)</li>
                </ul>
              </li>
              <li><strong>2019년 12월 16일 (월) 장 마감 후:</strong>
                <ul>
                  <li>입력: 하루 더 쌓인 시장 데이터</li>
                  <li>예측: <strong>“2019년 12월 17일 ~ 2019년 12월 31일(앞으로 10일)”</strong> 동안 폭락이 올 확률은 <strong>82%</strong> (<strong>위험 경보 발령!</strong>)</li>
                </ul>
              </li>
              <li><strong>2019년 12월 17일 (화) 장 마감 후:</strong>
                <ul>
                  <li>입력: 또 하루 더 쌓인 시장 데이터</li>
                  <li>예측: <strong>“2019년 12월 18일 ~ 2020년 1월 2일(앞으로 10일)”</strong> 동안 폭락이 올 확률은 <strong>85%</strong> (<strong>위험 경보 유지!</strong>)</li>
                </ul>
              </li>
            </ul>
            <p>이런 식으로 테스트 기간 992일 동안 <strong>매일매일 하루씩 앞으로 전진하며 “내일부터 10일 뒤”를 예측</strong>하는 것입니다. 위 확률 숫자는 설명용 예시이며, 실제 값은 아래 시뮬레이션 결과의 폴드 상세 표에서 날짜별로 확인할 수 있습니다.</p>
            <h5>4-3. 이걸 왜 이렇게 매일 할까요? (백테스트의 진짜 목적)</h5>
            <p>이 모델을 평가하려는 이유는 “실전에서 이 경보 시스템을 켰을 때, 진짜 위기가 오기 전에 미리 경보를 울렸는가?”를 검증하기 위해서입니다.</p>
            <ul>
              <li>만약 실제 역사에서 2020년 2월 말(코로나 폭락 직전)에 시장이 조용하다가 갑자기 꺾였다면, 모델은 폭락 며칠 전부터 “위험 확률 90%!”라는 경보를 울려야 합니다.</li>
              <li>992일 동안 매일 예측을 해봐야, 모델이 <strong>“위기가 오기 전(10일 전)에 정확히 경보를 켰는지”</strong> 혹은 “평화로울 때 쓸데없이 거짓 경보(False Alarm)를 울리지 않았는지”를 하루 단위로 낱낱이 채점할 수 있습니다.</li>
            </ul>
            <h5>4-4. 한 줄 요약</h5>
            <blockquote><strong>“오늘 장 끝나고 데이터 넣어서 ‘내일부턴 10일 동안 위험할까?’ 맞히고, 내일 장 끝나고 또 데이터 넣어서 ‘모레부턴 10일 동안 위험할까?’ 맞히고… 이걸 테스트 기간 992일 동안 하루도 빠짐없이 매일 반복해서 수행한다는 뜻입니다.”</strong></blockquote>
          </details>
        <div class="wf-guide"><article><b>① 무엇을 맞히나요?</b><p>가상의 SPY 하루 수익률로 계산한 <strong>향후 10거래일 합계</strong>가 학습 시점의 하위 10% 이하이면 ‘위험’입니다.</p>
          <details class="wf-guide-more"><summary>자세히 보기</summary>
            <p>이 문장은 “과거 주가 데이터(학습 데이터)를 기준으로 봤을 때, 앞으로의 10일 연속 주가 흐름이 상위 90% 수준보다 나쁘다면 ‘위험’ 상태로 판단하겠다”라는 조건식(룰)을 뜻합니다. 어려운 금융·통계 용어가 섞여 있어 복잡해 보이지만, 핵심 개념을 세 가지로 나눠서 풀면 쉽게 이해할 수 있습니다.</p>
            <h4>1. 주요 개념 풀어보기</h4>
            <ul>
              <li><strong>가상의 SPY 하루 수익률로 계산한 향후 10거래일 합계</strong>
                <ul>
                  <li><b>SPY:</b> S&amp;P 500 지수를 추종하는 대표적인 미국 주식 ETF입니다.</li>
                  <li><b>하루 수익률:</b> 하루 동안 가격이 몇 % 오르고 내렸는지 계산한 값입니다 (예: +0.5%, -1.2%).</li>
                  <li><b>10거래일 합계:</b> 주식 시장이 열리는 10일 동안의 하루 수익률을 다 더한 값입니다. 즉, “앞으로 10일 동안 누적해서 총 몇 %나 오르고 내릴지 시뮬레이션해 본 값”을 의미합니다.</li>
                </ul>
              </li>
              <li><strong>학습 시점의 하위 10% 이하</strong>
                <ul>
                  <li>인공지능(AI)이나 quantitative(수량적 분석) 모델을 만들 때 과거 수년~수십 년 동안의 SPY 10일 누적 수익률 데이터를 모아둡니다.</li>
                  <li>그 수많은 10일 수익률 데이터 중 <b>가장 성적이 나쁜(마이너스가 큰) 하위 10% 구간의 기준선</b>을 정해둡니다. (예: 10일 합계 수익률이 -5% 이하이면 하위 10%에 해당 등)</li>
                </ul>
              </li>
              <li><strong>‘위험’입니다</strong>
                <ul>
                  <li>예상되는 10일 수익률 합계가 그 ‘하위 10% 기준선’보다도 더 낮거나 나쁘다면, “과거 패턴에 비추어 볼 때 통계적으로 매우 이례적인 폭락/하락장 가능성이 높으니 위험 경보를 켠다”는 뜻입니다.</li>
                </ul>
              </li>
            </ul>
            <h4>2. 한 줄 요약</h4>
            <blockquote><strong>“모델이 예측해 본 향후 10일간의 SPY 누적 수익률이 과거 데이터 기준 상위 90% 구간에서 벗어나 ‘손에 꼽힐 정도로 극심한 하락(하위 10%)’ 수준이라면, 시장 상태를 ‘위험’으로 정하겠다.”</strong></blockquote>
            <p>즉, 리스크 관리(손절매, 비중 축소 등)를 실행하기 위한 <strong>통계적 위험 신호 발생 조건</strong>을 설명한 문장입니다.</p>
            <h4>3. ‘하위 10% 기준선’은 어떻게 구하나요?</h4>
            <p>주식 시장에서 <strong>‘하위 10% 기준선’</strong> 또는 ‘VaR(Value at Risk, 위험가치)’을 구하는 방식은 데이터 분석 목적과 가정에 따라 크게 3가지 방법(역사적 시뮬레이션, 모수적 방법, 몬테카를로 시뮬레이션)으로 나뉩니다.</p>
            <p>여기서 <strong>90% 신뢰수준의 10일 VaR</strong>을 구한다는 것은 “향후 10일간 발생할 수 있는 최대 손실 액수(또는 비율)”를 통계적으로 추정하는 것을 의미하며, 이 값이 바로 ‘하위 10% 기준선’이 됩니다.</p>
            <h5>3-1. 역사적 시뮬레이션 기법 (Historical Simulation)</h5>
            <p>과거의 실제 주가 데이터를 있는 그대로 활용하여 하위 10% 위치를 찾는 가장 직관적인 방법입니다.</p>
            <ul>
              <li><b>1단계 (데이터 수집):</b> 과거 N년 동안의 SPY 일별 수익률 데이터를 수집합니다.</li>
              <li><b>2단계 (10일 누적 수익률 산출):</b> 연속된 10거래일 단위로 수익률을 묶어 누적 수익률을 계산합니다.
                <div class="wf-formula">10일 누적 수익률 = r<sub>1</sub> + r<sub>2</sub> + … + r<sub>10</sub> &nbsp;또는&nbsp; (1 + r<sub>1</sub>)(1 + r<sub>2</sub>)…(1 + r<sub>10</sub>) − 1</div>
              </li>
              <li><b>3단계 (정렬 및 분위수 추출):</b> 구해진 모든 10일 누적 수익률 데이터를 가장 낮은 값(큰 손실)부터 가장 높은 값 순서로 나열합니다.</li>
              <li><b>4단계 (하위 10% 선별):</b> 전체 데이터 개수가 1,000개라면, 앞에서 100번째(하위 10%)에 해당하는 수익률 값이 바로 <strong>하위 10% 기준선</strong>이 됩니다.</li>
            </ul>
            <blockquote><b>특징:</b> 과거에 발생했던 실제 시장 변동성과 위기 상황(예: 금융위기, 코로나 폭락장 등)이 그대로 반영되는 장점이 있습니다.</blockquote>
            <h5>3-2. 모수적 방법 / 분산-코바리언스 기법 (Parametric VaR)</h5>
            <p>수익률 분포가 정규분포(Normal Distribution)를 따른다는 통계적 가정을 바탕으로 평균과 표준편차를 이용해 구하는 방식입니다.</p>
            <ul>
              <li><b>1단계 (통계량 계산):</b> 일별 수익률의 평균(μ)과 표준편차(σ)를 구합니다.</li>
              <li><b>2단계 (10일 단위 변환):</b>
                <ul>
                  <li>10일 평균 수익률: μ<sub>10</sub> = μ × 10</li>
                  <li>10일 표준편차: σ<sub>10</sub> = σ × √10 (기간의 제곱근 법칙 적용)</li>
                </ul>
              </li>
              <li><b>3단계 (Z-score 적용):</b> 정규분포에서 하위 10% 단측(One-tailed) 영역에 해당하는 표준화 점수(Z-score)는 −1.28입니다.</li>
              <li><b>4단계 (하위 10% 기준선 산출):</b>
                <div class="wf-formula">하위 10% 기준선 = μ<sub>10</sub> + (−1.28 × σ<sub>10</sub>)</div>
              </li>
            </ul>
            <blockquote><b>예시:</b> 10일 평균 수익률이 +0.5%, 10일 표준편차가 4.0%라면:
              <div class="wf-formula">기준선 = 0.5% − (1.28 × 4.0%) = 0.5% − 5.12% = −4.62%</div>
              즉, 10일 누적 수익률이 <strong>−4.62% 이하</strong>로 떨어지면 하위 10% ‘위험’ 구간에 진입합니다.</blockquote>
            <h5>3-3. 몬테카를로 시뮬레이션 (Monte Carlo Simulation)</h5>
            <p>주가의 무작위 이동(기하 브라운 운동 등) 모델을 설정한 후, 컴퓨터로 수만 번 이상 미래 주가 흐름을 난수로 생성해 측정하는 방법입니다.</p>
            <ol>
              <li>주가 변동성 모형을 설정합니다.</li>
              <li>향후 10일간의 주가 경로를 <strong>10,000번 이상 가상 시뮬레이션</strong>합니다.</li>
              <li>시뮬레이션 결과로 나온 10,000개의 10일 수익률 중 하위 1,000번째(10%)에 해당하는 손실값을 기준선으로 삼습니다.</li>
            </ol>
            <h5>3가지 계산 방식 요약 비교</h5>
            <div class="wf-guide-table"><table>
              <thead><tr><th>구분</th><th>역사적 시뮬레이션</th><th>모수적 방법 (정규분포)</th><th>몬테카를로 시뮬레이션</th></tr></thead>
              <tbody>
                <tr><th>계산 난이도</th><td>쉬움 (데이터 정렬)</td><td>매우 쉬움 (공식 적용)</td><td>복잡함 (컴퓨터 연산 필요)</td></tr>
                <tr><th>핵심 가정</th><td>과거 패턴이 미래에도 반복됨</td><td>수익률이 정규분포를 따름</td><td>주가 변동 모형(확률과정) 설정</td></tr>
                <tr><th>장단점</th><td>계산이 명확하나 과거 없던 극단적 폭락 미반영</td><td>빠른 계산 가능하나 주식의 ‘뚱뚱한 꼬리(Fat tail)’ 현상 미반영</td><td>복잡한 조건/옵션 구조 반영 가능하나 계산 비용 큼</td></tr>
              </tbody>
            </table></div>
            <p>실제 quantitative 모델이나 리스크 관리 시스템에서는 정규분포의 한계(실제 주식은 폭락이 정규분포 예측보다 자주 발생함)를 보완하기 위해 <strong>역사적 시뮬레이션</strong>이나 <strong>몬테카를로 방식</strong>을 주로 활용합니다.</p>
            <h4>4. SPY 과거 일별 수익률 데이터는 어떻게 수집하나요?</h4>
            <p>SPY의 과거 일별 수익률 데이터를 수집하는 방법은 사용 목적(단순 분석 vs 자동화 시스템 구축)과 <strong>프로그래밍 능력</strong>에 따라 선택할 수 있습니다. 가장 많이 활용되는 4가지 주요 수집 방식을 추천해 드립니다.</p>
            <h5>4-1. Python 라이브러리 활용 (<code>yfinance</code> / <code>FinanceDataReader</code>) — <strong>가장 추천</strong></h5>
            <p>파이썬을 사용할 수 있다면 가장 간편하고 강력한 방법입니다. 미국 주식 데이터 수집에는 <code>yfinance</code>가 대세이며, 국내외 주식을 통합 관리하기에는 <code>FinanceDataReader</code>가 편리합니다.</p>
            <p><b>① <code>yfinance</code> (Yahoo Finance API)</b><br>가장 널리 쓰이는 Open Source 라이브러리로, 수십 년 치의 수정주가(Adjusted Close) 데이터를 한 줄로 불러올 수 있습니다.</p>
            <pre class="wf-code"><code>import yfinance as yf

# SPY 데이터 다운로드 (예: 과거 10년)
spy = yf.download("SPY", start="2014-01-01", end="2024-12-31")

# 수정종가(Adj Close) 기준 일별 수익률 계산 (pct_change)
spy["Daily_Return"] = spy["Adj Close"].pct_change()

# 10일 누적 수익률 계산 (단순 합산 방식)
spy["10D_Return_Sum"] = spy["Daily_Return"].rolling(window=10).sum()

# 10일 누적 수익률 계산 (복리 연속 곱 방식)
spy["10D_Return_Compound"] = (
    spy["Daily_Return"].add(1).rolling(window=10).apply(lambda x: x.prod()) - 1
)

print(spy[["Adj Close", "Daily_Return", "10D_Return_Sum"]].dropna().head())</code></pre>
            <blockquote><b>주의사항:</b> 주식 수익률 계산 시 배당금 지급과 주식 분할 영향이 반영된 <strong>수정종가(Adj Close / Adjusted Close)</strong>를 기반으로 수익률을 계산해야 통계적 오류가 없습니다.</blockquote>
            <h5>4-2. 금융 데이터 API 활용 (Polygon.io, Alpha Vantage, Tiingo)</h5>
            <p>정교한 알고리즘 매매 시스템을 구축하거나, 데이터의 정확도 및 실시간성이 중요한 경우 전문 API 서비스를 이용합니다.</p>
            <ul>
              <li><strong>Polygon.io / Alpha Vantage / Tiingo:</strong>
                <ul>
                  <li><b>장점:</b> 데이터 유실이 없고, API 안정성이 높으며, 분 단위 및 일 단위 수정주가 데이터를 정확하게 제공합니다.</li>
                  <li><b>단점:</b> 일정 호출 건수 이상은 유료 플랜 가입이 필요합니다 (Alpha Vantage, Tiingo 등은 무료 티어 제공).</li>
                </ul>
              </li>
            </ul>
            <h5>4-3. 노코드 / 엑셀(Excel) &amp; 구글 시트 활용</h5>
            <p>코딩 없이 빠르게 데이터를 받거나 엑셀로 분석하고 싶을 때 적합합니다.</p>
            <p><b>① Google Sheets (<code>GOOGLEFINANCE</code> 함수)</b><br>구글 시트 셀에 아래 함수를 입력하면 10년 치 데이터가 자동으로 불러와집니다.</p>
            <pre class="wf-code"><code>=GOOGLEFINANCE("SPY", "price", DATE(2014,1,1), DATE(2024,12,31), "DAILY")</code></pre>
            <p>불러온 종가 열 옆에 <code>= (B3 - B2) / B2</code> 공식을 넣어 일별 수익률을 쉽게 산출할 수 있습니다.</p>
            <div class="wf-subnote">
              <p><b>OHLCV 전체도 완전히 동일하게 <code>GOOGLEFINANCE</code> 단일 함수로 가져올 수 있습니다.</b><br>구글 시트에서는 함수 속성에 <code>"all"</code>을 입력하면 OHLCV(시가 Open, 고가 High, 저가 Low, 종가 Close, 거래량 Volume) 전체 데이터 세트를 한 번에 표 형태로 표출해 줍니다.</p>
              <p><b>현대차 10년치 OHLCV 가져오는 수식</b></p>
              <pre class="wf-code"><code>=GOOGLEFINANCE("KRX:005380", "all", TODAY()-DATE(10,0,0), TODAY(), "DAILY")</code></pre>
              <p>또는 시작 날짜를 직접 명시하고 싶다면 아래와 같이 작성할 수도 있습니다.</p>
              <pre class="wf-code"><code>=GOOGLEFINANCE("KRX:005380", "all", DATE(2016,1,1), DATE(2026,10,1), "DAILY")</code></pre>
              <p><b>수식 주요 파라미터 설명</b></p>
              <ol>
                <li><strong><code>"KRX:005380"</code></strong>: 현대자동차의 한국 거래소 종목 코드입니다.</li>
                <li><strong><code>"all"</code></strong>: OHLCV 항목 전체를 한 번에 불러오는 핵심 옵션입니다.
                  <ul><li>출력이 될 때 <code>Date</code>, <code>Open</code>, <code>High</code>, <code>Low</code>, <code>Close</code>, <code>Volume</code>의 6개 열(Column)로 구성된 데이터 표가 자동 생성됩니다.</li></ul>
                </li>
                <li><strong><code>TODAY()-DATE(10,0,0)</code></strong>: 현재 날짜 기준으로 정확히 10년 전 날짜를 지정합니다.</li>
                <li><strong><code>"DAILY"</code></strong>: 일별 데이터를 의미합니다. (주별 데이터가 필요하다면 <code>"WEEKLY"</code>로 변경 가능)</li>
              </ol>
              <p><b>실제 실행 결과 구조</b><br>수식을 입력하면 별도의 셀 확장 없이 2,400여 개 이상의 행(영업일 기준)에 걸쳐 아래와 같은 표 데이터가 자동으로 채워집니다.</p>
              <div class="wf-guide-table"><table>
                <thead><tr><th>Date</th><th>Open</th><th>High</th><th>Low</th><th>Close</th><th>Volume</th></tr></thead>
                <tbody>
                  <tr><td>2016-10-04 15:30:00</td><td>141,000</td><td>142,500</td><td>140,000</td><td>141,500</td><td>412,034</td></tr>
                  <tr><td>...</td><td>...</td><td>...</td><td>...</td><td>...</td><td>...</td></tr>
                  <tr><td>2026-10-01 15:30:00</td><td>350,000</td><td>353,500</td><td>344,500</td><td>345,000</td><td>437,670</td></tr>
                </tbody>
              </table></div>
              <p><b>알아두면 유용한 추가 팁</b></p>
              <ol>
                <li><strong>헤더(열 이름) 제외하고 데이터만 뽑기</strong><br>구글파이낸스는 기본적으로 첫 번째 행에 <code>Date</code>, <code>Open</code> 같은 헤더 이름을 함께 출력합니다. 차트/분석용으로 수치 데이터만 가져오려면 <code>INDEX</code> 함수를 씌워 헤더를 잘라낼 수 있습니다.
                  <pre class="wf-code"><code>=INDEX(GOOGLEFINANCE("KRX:005380", "all", DATE(2016,1,1), TODAY()), 2, 1)</code></pre>
                </li>
                <li><strong>OHLCV 중 특정 단일 항목만 가져오기</strong><br><code>"all"</code> 대신 원하는 속성명만 적으면 개별 데이터(1개 열)만 따로 출력됩니다.
                  <ul>
                    <li>시가만 필요할 때: <code>"open"</code></li>
                    <li>고가만 필요할 때: <code>"high"</code></li>
                    <li>저가만 필요할 때: <code>"low"</code></li>
                    <li>종가만 필요할 때: <code>"close"</code></li>
                    <li>거래량만 필요할 때: <code>"volume"</code></li>
                  </ul>
                </li>
              </ol>
            </div>
            <p><b>② Yahoo Finance 웹사이트 직접 다운로드</b></p>
            <ol>
              <li><a href="https://finance.yahoo.com/quote/SPY/history/" target="_blank" rel="noopener noreferrer">Yahoo Finance SPY 페이지</a> 접속</li>
              <li><strong>Time Period</strong>를 원하는 N년 기간으로 설정</li>
              <li><strong>Download</strong> 버튼을 눌러 CSV 파일로 저장 후 분석에 활용</li>
            </ol>
            <h5>4-4. 전문 학술/투자 플랫폼 (WRDS, Bloomberg, FRED)</h5>
            <ul>
              <li><strong>FRED (Federal Reserve Economic Data):</strong> 세인트루이스 연방준비은행 데이터베이스로, S&amp;P 500 지수 자체의 장기 데이터(지수값)를 무료로 안전하게 다운로드할 수 있습니다.</li>
              <li><strong>Bloomberg Terminal / Refinitiv Eikon:</strong> 프로 트레이더 및 금융기관용 솔루션으로 완벽한 품질의 데이터를 제공하지만 매우 고가입니다.</li>
            </ul>
            <h5>💡 데이터 수집 시 필수 체크리스트</h5>
            <ol>
              <li><strong>수정주가(Adjusted Close) 사용 여부:</strong> SPY는 연 1.3~1.5% 수준의 배당을 지급하므로, 단순 종가(Close) 대신 수정종가(Adj Close)를 써야 배당 재투자가 반영된 실제 Total Return을 구할 수 있습니다.</li>
              <li><strong>거래일(Trading Days) 처리:</strong> 주식 시장은 주말과 공휴일에 쉬므로, 10거래일은 실제 날짜 기준 약 14일(2주)입니다. 날짜 기반(Calendar Days)이 아닌 행 단위(Row Index / Trading Days)로 10일 Window를 잡아야 합니다.</li>
            </ol>
            <h4>5. 왜 하필 ‘10거래일’인가요?</h4>
            <p>위험 예측 시스템에서 예측 기간을 ‘10일’로 설정한 것은 리스크 관리의 실효성과 통계적 정확성 사이에서 가장 이상적인 균형점이기 때문입니다. 5일, 10일, 20일로 예측 기간을 바꿨을 때의 장단점을 비교합니다. (이 시뮬레이터에서는 10거래일이 고정값이라 바꿀 수 없습니다.)</p>
            <h5>5-1. 10일 예측 (현재 기준) — 실전성과 대응의 균형</h5>
            <ul>
              <li><strong>의미:</strong> 오늘 장 마감 후, “지금부터 향후 2주일(거래일 기준 2주 = 10일) 동안 내 포트폴리오가 하위 10%의 극심한 타격을 입을 것인가?”를 예측합니다.</li>
              <li><strong>장점:</strong>
                <ul>
                  <li><strong>대응 시간 확보:</strong> 주가가 폭락하기 시작할 때 현금화, 헤지(인버스/풋옵션) 등 방어 조치를 취하기에 너무 짧지도 길지도 않은 <strong>가장 현실적인 시간</strong>입니다.</li>
                  <li><strong>통계적 노이즈 회피:</strong> 하루이틀의 일시적 주가 출렁임(노이즈)에 흔들리지 않고, 진짜 하락 추세의 전조를 포착하기 좋습니다.</li>
                </ul>
              </li>
            </ul>
            <h5>5-2. 5일 예측 (초단기 예측)</h5>
            <ul>
              <li><strong>의미:</strong> 향후 1주일(5거래일) 이내의 급락을 예측합니다.</li>
              <li><strong>장점:</strong>
                <ul><li><strong>민첩성 (Agility):</strong> 폭락 직전의 급격한 변동성(VIX 급등 등)을 빠르게 감지하여 며칠 안에 터질 악재에 즉각 반응할 수 있습니다.</li></ul>
              </li>
              <li><strong>단점:</strong>
                <ul>
                  <li><strong>대응 시간 부족:</strong> 경보가 울리고 실제 포트폴리오를 조정(매도 등)하기에 시간이 촉박할 수 있습니다.</li>
                  <li><strong>노이즈에 취약:</strong> 시장의 단순 조정을 ‘폭락 위험’으로 오인하여 거짓 경보(False Positive)가 잦아질 수 있습니다.</li>
                </ul>
              </li>
            </ul>
            <h5>5-3. 20일 예측 (중기 예측)</h5>
            <ul>
              <li><strong>의미:</strong> 향후 한 달(20거래일) 동안의 하락 위험을 예측합니다.</li>
              <li><strong>장점:</strong>
                <ul>
                  <li><strong>여유로운 대응:</strong> 한 달 뒤의 위험을 미리 알려주므로 대규모 자산을 정리하거나 비중을 조절하는 데 충분한 시간을 가질 수 있습니다.</li>
                  <li><strong>안정성:</strong> 단기적인 주가 등락에 덜 흔들립니다.</li>
                </ul>
              </li>
              <li><strong>단점:</strong>
                <ul>
                  <li><strong>모호성 (Bluntness):</strong> “한 달 안에 폭락이 온다”는 정보는 너무 광범위해서, <strong>정작 언제 방어 체계를 가동해야 할지 시점 타이밍을 잡기 애매</strong>해집니다.</li>
                  <li><strong>예측력 저하:</strong> 기간이 길어질수록 중간에 변수가 너무 많이 발생하여(경제지표 발표, 연준 회의 등) 모델의 적중률(ROC-AUC)이 떨어지는 경향이 있습니다.</li>
                </ul>
              </li>
            </ul>
            <h5>5-4. 요약 비교 표</h5>
            <div class="wf-guide-table"><table>
              <thead><tr><th>구분</th><th>5일 (단기)</th><th>10일 (현재 기준)</th><th>20일 (중기)</th></tr></thead>
              <tbody>
                <tr><th>대응 속도</th><td>매우 빠름</td><td><strong>적절함</strong></td><td>느림</td></tr>
                <tr><th>거짓 경보(노이즈)</th><td>높음</td><td><strong>낮음~보통</strong></td><td>낮음</td></tr>
                <tr><th>타이밍 정밀도</th><td>높음</td><td><strong>적절함</strong></td><td>모호함</td></tr>
                <tr><th>특징</th><td>단타/초단기 방어용</td><td><strong>실전 리스크 관리 표준</strong></td><td>거시적 추세 방어용</td></tr>
              </tbody>
            </table></div>
            <blockquote><b>결론:</b> 10거래일(약 2주)은 투자자가 위기를 감지하고 실제로 자산을 방어하기 위한 <strong>골든타임</strong>을 확보하면서도, 통계적으로 유의미한 패턴을 잡아내기에 가장 검증된 기간입니다.</blockquote>
          </details></article><article><b>② 왜 날짜를 비우나요?</b><p>학습 행의 정답은 미래 10일 수익률을 사용합니다. 테스트 직전 최소 10일을 학습에서 빼야 테스트 기간 정보가 섞이지 않습니다.</p>
          <details class="wf-guide-more"><summary>자세히 보기</summary>
            <p>이 설명은 머신러닝/데이터 분석에서 흔히 발생하는 <strong>‘미래 정보 유출(Data Leakage / Look-ahead Bias)’</strong> 문제를 방지하기 위한 필수적인 validation 기법을 나타냅니다.</p>
            <p>쉽게 말해, “시험 문제를 풀기 직전에 정답지를 미리 들여다보는 실수를 막기 위한 규칙”입니다.</p>
            <h4>1. 왜 미래 10일 수익률을 빼야 할까요? (이유)</h4>
            <p>시계열 데이터에서 ‘미래 10일 누적 수익률’을 정답(Target/Label)으로 사용할 때, 특정 날짜(예: 오늘)의 학습 데이터에는 ‘오늘부터 앞으로 10일 동안의 미래 주가 정보’가 포함되어 정답으로 만들어집니다.</p>
            <p>만약 모델 학습(Train) 기간과 성능 테스트(Test) 기간을 연속되게 딱 붙여버리면 다음과 같은 문제가 생깁니다.</p>
            <pre class="wf-code"><code>[ 학습 기간 (Train) ] | [ 테스트 기간 (Test) ]
                  ▲
             테스트 시작일 (Day T)</code></pre>
            <ul>
              <li><strong>학습 데이터의 마지막 날(Day T-1)의 정답(Target):</strong>
                <ul><li>Day T-1일의 정답 = <strong>Day T-1부터 Day T+9까지</strong>의 10일간 수익률</li></ul>
              </li>
              <li><strong>문제 발생:</strong>
                <ul>
                  <li>Day T-1일의 정답을 만드는 데 <strong>테스트 기간에 해당하는 Day T ~ Day T+9의 미래 주가 데이터</strong>가 이미 사용되었습니다.</li>
                  <li>즉, AI 모델이 학습을 진행하면서 “아, 테스트 기간(Day T 이후)에 주가가 이렇게 움직이는구나!”라는 미래 정답 정보를 미리 학습해 버리게 됩니다.</li>
                </ul>
              </li>
            </ul>
            <h4>2. 퍼지 기간(Purging Period) 설정</h4>
            <p>이러한 데이터 유출을 막기 위해 학습 데이터와 테스트 데이터 사이에 미래 정답을 계산하는 데 쓰인 기간(최소 10거래일)만큼의 ‘완충 지대(Gap)’를 두고 학습 데이터에서 제외해야 합니다.</p>
            <p>이를 금융 ML에서는 퍼징(Purging)이라고 부릅니다.</p>
            <pre class="wf-code"><code>[ 학습 데이터 (Train) ] | [ 제거 구간 (Purge: 최소 10일) ] | [ 테스트 데이터 (Test) ]
                        ▲
                   미래 정보 유출 방지</code></pre>
            <ul>
              <li><strong>테스트 시작일이 Day T 라면:</strong>
                <ul>
                  <li>학습 데이터로 사용할 수 있는 마지막 날은 <strong>Day T - 11일</strong>이어야 합니다.</li>
                  <li><strong>Day T - 10일 ~ Day T - 1일</strong>의 10일 치 데이터는 정답을 만드는 과정에서 Day T 이후의 테스트 주가가 섞여 들어갔으므로 학습 집합에서 완전히 제외(Drop)해야 합니다.</li>
                </ul>
              </li>
            </ul>
            <h4>3. 한 줄 요약</h4>
            <blockquote><strong>“오늘(Day T)부터 테스트를 시작할 때, 어제(Day T-1)의 정답을 계산하느라 쓰인 ‘테스트 기간의 주가(Day T~)’가 학습 모델에 흘러 들어가지 않도록 최소 10일간의 데이터를 중간에서 쳐내야(Purge) 유효한 검증이 가능합니다.”</strong></blockquote>
            <p>이 과정을 거치지 않으면 백테스팅이나 모델 평가 시 성능이 터무니없이 좋게 나오는 착시 현상(Overfitting &amp; Leakage)이 발생하고, 실제 매매에 적용했을 때 큰 손실을 보게 됩니다.</p>
            <h4>4. 일반 K-Fold처럼 데이터를 섞어도 되나요?</h4>
            <p><strong>일반적인 K-Fold 교차 검증에서는 전체 데이터를 무작위로 섞는(Shuffle) 과정이 기본으로 포함</strong>됩니다.</p>
            <p>하지만 <strong>주식이나 시계열 데이터에서는 절대 섞으면(Shuffle) 안 됩니다.</strong> 이 차이점을 이해하는 것이 금융 머신러닝의 핵심입니다.</p>
            <h5>4-1. 일반 K-Fold의 무작위 섞기 (Shuffle = True)</h5>
            <p>이미지 분류나 고객 이탈 예측 같은 일반 데이터 분석에서는 데이터 행(Row) 간의 순서가 중요하지 않습니다. 따라서 데이터를 무작위로 골고루 섞은 뒤 K개로 나눕니다.</p>
            <pre class="wf-code"><code>[원래 데이터] : 1번(월), 2번(화), 3번(수), 4번(목), 5번(금) ...
              ▼ Shuffle (무작위 섞기)
[섞인 데이터] : 4번(목), 1번(월), 5번(금), 2번(화), 3번(수)
              ▼
[Train 세트]  : 1번(월), 3번(수), 4번(목), 5번(금)
[Validation]  : 2번(화)  &lt;-- 월, 수, 목, 금을 보고 '화요일'을 맞히는 꼴!</code></pre>
            <h5>4-2. 금융 시계열에서 섞었을 때 발생하는 참사</h5>
            <p>주식 데이터에서 데이터를 무작위로 섞으면 <strong>미래의 주가 정보가 과거 학습 세트에 완전히 녹아들어가 버립니다.</strong></p>
            <ul>
              <li><strong>과거와 미래의 역전:</strong> 예를 들어 수요일(3번)과 금요일(5번) 주가를 모델이 이미 다 공부한 상태에서, 화요일(2번) 주가가 어떻게 될지 예측하라는 시험을 보는 것과 같습니다.</li>
              <li><strong>지표의 오염:</strong> 이동평균선(MA), RSI, 변동성 같은 특성(Feature)들은 모두 과거 N일의 종가를 기반으로 연속되게 연결된 값입니다. 무작위로 섞으면 이 연속성이 파괴될 뿐만 아니라 미래 지표가 과거에 유출됩니다.</li>
            </ul>
            <h5>4-3. 결론: 금융 데이터에서는 순서 유지(Purged / TimeSeries Split)가 필수</h5>
            <p>따라서 금융 시계열을 다룰 때는:</p>
            <ol>
              <li><strong>시간 순서(Chronological Order)를 절대 깨뜨리지 않고 순차적으로 나눕니다.</strong></li>
              <li>무작위 섞기 해제(<code>shuffle=False</code>)를 기본으로 해야 합니다.</li>
              <li>앞서 설명한 Purging(퍼징)과 Embargo(임바고)를 적용해 구간 경계에서 발생하는 유출까지 완벽하게 도려내야만 의미 있는 검증이 됩니다.</li>
            </ol>
          </details></article><article><b>③ 어떻게 평가하나요?</b><p>SPY 수익률·VIX 변화율·HY 스프레드 변화율을 넣고, 클래스 불균형을 보정한 로지스틱 회귀로 경보를 예측합니다.</p>
          <details class="wf-guide-more"><summary>자세히 보기</summary>
            <p>이 모델 구조는 퀀트 리스크 관리에서 매우 표준적이고 효율적인 <strong>조기 경보 시스템(Early Warning System, EWS)</strong> 설계 방식입니다.</p>
            <p>입력된 피처(Feature), 알고리즘, 클래스 불균형 보정 기법의 의미와 실제 구현 시 주의해야 할 핵심 포인트를 정리해 드립니다.</p>
            <h4>1. 피처(Feature) 구성의 의미</h4>
            <div class="wf-guide-table"><table>
              <thead><tr><th>구분</th><th>피처 명칭</th><th>시장에서 갖는 의미</th></tr></thead>
              <tbody>
                <tr><th>SPY 수익률</th><td>주식 시장 모멘텀</td><td>주식 시장 자체의 단기 수익률 및 추세 (주가 하락 압력 측정)</td></tr>
                <tr><th>VIX 변화율</th><td>시장 변동성 (공포 지수)</td><td>S&amp;P 500 옵션 변동성 변화로, 투자자들의 <strong>단기 공포감/불확실성 급증</strong> 측정</td></tr>
                <tr><th>HY 스프레드 변화율</th><td>신용 위험 (Credit Risk)</td><td>하이일드 채권과 국채 간의 금리 차이로, <strong>기업 부도 위험 및 금융 시장 신용 경색</strong> 측정</td></tr>
              </tbody>
            </table></div>
            <blockquote><b>핵심 조합:</b> 주식 시장(SPY) + 옵션 시장(VIX) + 채권 시장(HY Spread)을 동시에 반영하여, 단일 시장 착시 현상을 방지하고 리스크 감지력을 극대화합니다.</blockquote>
            <h4>2. 클래스 불균형(Class Imbalance) 보정이 필요한 이유</h4>
            <p>주식 시장에서 ‘위험(경보)’ 상황(예: 하위 10% 폭락장)은 전체 거래일 중 10%에 불과한 희귀 이벤트(Minority Class)입니다.</p>
            <p>보정 없이 일반 로지스틱 회귀를 학습시키면, 모델은 정확도를 높이기 위해 무조건 “평상시(정상)”로만 예측하려는 편향이 생깁니다. 이를 해결하기 위해 다음 기법들을 적용합니다.</p>
            <ol>
              <li><strong>클래스 가중치 조정 (<code>class_weight='balanced'</code>):</strong>
                <ul><li>희귀한 ‘위험(1)’ 클래스에 더 높은 가중치를 주어, 위험을 틀렸을 때 패널티를 크게 부여합니다.</li></ul>
              </li>
              <li><strong>리샘플링 (SMOTE / Undersampling):</strong>
                <ul><li>오버샘플링(SMOTE)으로 위험 클래스 샘플을 인공적으로 늘리거나, 정상 클래스 샘플을 줄여 균형을 맞춥니다.</li></ul>
              </li>
              <li><strong>분류 임계값(Threshold) 이동:</strong>
                <ul><li>기본 확률 cutoff인 <code>0.5</code> 대신, Recall(재현율, 실제 위험을 얼마나 잘 잡아냈는가)을 높이도록 임계값을 <code>0.3</code>~<code>0.4</code> 수준으로 낮춥니다.</li></ul>
              </li>
            </ol>
            <h4>3. 파이썬 구현 예시 (Scikit-Learn)</h4>
            <p>앞서 다룬 <strong>Purging</strong> 개념과 <strong>클래스 가중치 보정</strong>을 적용한 로지스틱 회귀 예시 코드입니다.</p>
            <pre class="wf-code"><code>import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, roc_auc_score
from sklearn.preprocessing import StandardScaler

# 1. 피처(X) 및 라벨(y) 예시 데이터 생성
# X: [SPY 수익률, VIX 변화율, HY 스프레드 변화율]
# y: 1 (위험 - 하위 10%), 0 (정상)

# 2. 스케일링 (로지스틱 회귀는 피처 단위가 다르므로 정규화 필수)
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# 3. 클래스 불균형 보정 로지스틱 회귀 모델 선언
model = LogisticRegression(
    class_weight="balanced",  # 클래스 불균형 자동 보정
    random_state=42,
)

model.fit(X_train_scaled, y_train)

# 4. 예측 및 평가
# 단순 0/1 분류 대신 위험 확률(Probability) 산출
risk_probabilities = model.predict_proba(X_test_scaled)[:, 1]

# 원하는 임계값(예: 0.4)으로 위험 경보 발령
threshold = 0.4
y_pred = (risk_probabilities &gt;= threshold).astype(int)

print("ROC-AUC Score:", roc_auc_score(y_test, risk_probabilities))
print(classification_report(y_test, y_pred))</code></pre>
            <h4>4. 실전 적용 시 핵심 주의사항</h4>
            <ol>
              <li><strong>피처 단위 정규화 (Standardization):</strong>
                <ul><li>VIX 변화율(%)과 HY 스프레드 변화율(bp/%)은 변동 폭과 단위가 완전히 다릅니다. 로지스틱 회귀 계수(Coefficient)의 해석과 학습 안정성을 위해 반드시 <code>StandardScaler</code>나 <code>RobustScaler</code>를 적용해야 합니다.</li></ul>
              </li>
              <li><strong>평가 지표 선택:</strong>
                <ul><li>Accuracy(정확도)는 의미가 없습니다. 위기 상황을 놓치지 않는 Recall(재현율)과 <strong>ROC-AUC</strong> 지표를 핵심 평가지표로 삼아야 합니다.</li></ul>
              </li>
              <li><strong>다중공선성 (Multicollinearity):</strong>
                <ul><li>시장 폭락 시 SPY 하락, VIX 상승, HY 스프레드 확대가 동시에 일어나 3개 변수 간 상관관계가 매우 높아질 수 있습니다. VIF(변수팽창지수)를 확인하거나 L2 규제(<code>penalty='l2'</code>)를 사용하여 모델 안정성을 확보하세요.</li></ul>
              </li>
            </ol>
          </details></article></div>
        <div class="wf-setup-intro"><b>시뮬레이션 설정 3가지</b><p>아래 세 값을 고르면 1,250거래일(2019-01-01부터 주말 제외, 약 5년)의 가상 데이터를 어떻게 자를지 정해집니다. 값을 바꾸면 실행 전에 <b>폴드 미리보기</b>가 바로 갱신됩니다.</p></div>
        <form class="wf-form" id="wfForm">
          <label>테스트 구간 개수 (폴드 수)<select name="n_splits"><option value="3">3개</option><option value="4" selected>4개</option><option value="5">5개</option><option value="6">6개</option><option value="7">7개</option><option value="8">8개</option><option value="9">9개</option><option value="10">10개</option></select><small>“시험을 몇 번 볼까?”입니다. 데이터를 (폴드 수 + 1)등분해 첫 조각은 공부만 하고, 나머지 조각을 하나씩 시험 봅니다.<br><b>예:</b> 4개면 1,240일 ÷ 5 = 248일씩 잘라 4번, 10개면 ÷ 11 = 112일씩 잘라 10번 시험합니다. 금융 시계열에서는 4~5개를 주로 쓰고, 많이 늘리면 테스트 구간이 짧아지고 첫 폴드의 학습 분량이 줄어듭니다.</small></label>
          <label>테스트 직전 격리 (Purge)<select name="purge_window"><option value="10" selected>10거래일</option><option value="15">15거래일</option><option value="20">20거래일</option><option value="30">30거래일</option></select><small>“시험 직전 며칠을 공부에서 뺄까?”입니다. 정답이 미래 10일 수익률이라 최소 10일은 빼야 시험 범위를 미리 보는 일이 없습니다.<br><b>예:</b> 테스트가 7월 1일 시작이면 6월 중순~말 10거래일을 학습에서 지웁니다.</small></label>
          <label>가상 데이터 시드<select name="seed"><option value="42" selected>42 · 원본 예제</option><option value="7">7 · 다른 난수</option><option value="2026">2026 · 다른 난수</option></select><small>“어떤 가상 시장을 쓸까?”입니다. 같은 시드는 항상 같은 가격 흐름을 만들어 결과를 재현할 수 있고, 시드를 바꾸면 다른 시장에서 같은 검증 구조를 시험해 볼 수 있습니다.</small></label>
          <button type="submit" class="btn-primary">검증 시뮬레이션 실행</button>
        </form>
        <section class="wf-preview" id="wfPreview" aria-live="polite"></section>
        <p class="wf-context">각 폴드에서 위험 기준(하위 10%)을 <b>그때의 학습 데이터만으로</b> 정하고, 미래 10일을 모르는 마지막 10행은 빼서 데이터 누수를 방지합니다. 가상 특징은 난수이므로 좋은 예측 성능을 기대하는 실습은 아닙니다.</p>
        <details class="wf-guide-more wf-howto"><summary>위 설명 문서와 이 시뮬레이션이 다른 점</summary>
          <ul>
            <li><b>데이터:</b> 문서는 1997년부터의 실제 SPY·VIX·HY 스프레드를 권하지만, 여기서는 2019-01-01부터 1,250거래일의 <b>가상 난수 데이터</b>를 씁니다. 검증 구조를 익히는 것이 목적이라 시작일을 고를 수는 없습니다.</li>
            <li><b>전진 단위:</b> 문서는 하루·한 달 단위로 기준일을 옮기는 예를 들었지만, 여기서는 <b>폴드 하나(약 1년)</b> 단위로 한 번에 전진합니다. 폴드 수를 늘리면 전진 간격이 짧아집니다.</li>
            <li><b>창 방식:</b> 문서의 두 전략 중 <b>누적 방식(Expanding Window)</b>만 구현되어 있습니다. 학습 시작일은 항상 2019-01-01로 고정되고 끝만 늘어납니다.</li>
            <li><b>경보 임계값:</b> 문서는 0.3~0.4로 낮추는 방법을 소개하지만, 여기서는 scikit-learn 기본값인 <b>0.5</b>를 그대로 씁니다. 클래스 가중치 보정(balanced)은 문서와 동일하게 적용됩니다.</li>
          </ul>
        </details>
        <div class="wf-status" id="wfStatus" role="status">기본 설정으로 실행해 보세요.</div><div id="wfResults"></div>
      </section>`;
    const form = element.querySelector('#wfForm');
    const status = element.querySelector('#wfStatus');
    const result = element.querySelector('#wfResults');
    const preview = element.querySelector('#wfPreview');
    const updatePreview = () => renderPreview(preview, new FormData(form));
    form.addEventListener('change', updatePreview);
    updatePreview();
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const params = new URLSearchParams(new FormData(form));
      const button = form.querySelector('button');
      button.disabled = true;
      status.textContent = '폴드별 학습과 테스트를 계산하고 있습니다…';
      try {
        const data = await fetchJson(`/walk-forward/simulate?${params}`, value => value && Array.isArray(value.folds) && value.average);
        if (!element.isConnected) return;
        renderResult(result, data);
        status.textContent = `완료 · ${data.n_splits}개 폴드, ${data.purge_window}거래일 격리`;
      } catch (error) {
        if (element.isConnected) status.textContent = error.detail || error.message || '검증을 실행하지 못했습니다.';
      } finally {
        if (element.isConnected) button.disabled = false;
      }
    });
  }

  window.WalkForwardLab = { mount };
})();
