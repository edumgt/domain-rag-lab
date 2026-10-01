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

  function mount(element, fetchJson) {
    element.innerHTML = `
      <section class="walk-forward" aria-labelledby="wfTitle">
        <div class="wf-hero"><span>WALK-FORWARD LAB · 검증 구조 실습</span><h2 id="wfTitle">Expanding Window + Purging</h2><p>과거 구간을 점점 늘려 학습하고, 테스트 직전의 날짜를 비운 뒤 다음 구간에서 위험 경보를 평가합니다.</p></div>
        <div class="wf-guide"><article><b>① 무엇을 맞히나요?</b><p>가상의 SPY 하루 수익률로 계산한 <strong>향후 10거래일 합계</strong>가 학습 시점의 하위 10% 이하이면 ‘위험’입니다.</p></article><article><b>② 왜 날짜를 비우나요?</b><p>학습 행의 정답은 미래 10일 수익률을 사용합니다. 테스트 직전 최소 10일을 학습에서 빼야 테스트 기간 정보가 섞이지 않습니다.</p></article><article><b>③ 어떻게 평가하나요?</b><p>SPY 수익률·VIX 변화율·HY 스프레드 변화율을 넣고, 클래스 불균형을 보정한 로지스틱 회귀로 경보를 예측합니다.</p></article></div>
        <form class="wf-form" id="wfForm"><label>테스트 구간 개수<select name="n_splits"><option value="3">3개</option><option value="4" selected>4개</option><option value="5">5개</option></select></label><label>테스트 직전 격리<select name="purge_window"><option value="10" selected>10거래일</option><option value="15">15거래일</option><option value="20">20거래일</option></select></label><label>가상 데이터 시드<select name="seed"><option value="42" selected>42 · 원본 예제</option><option value="7">7 · 다른 난수</option><option value="2026">2026 · 다른 난수</option></select></label><button type="submit" class="btn-primary">검증 시뮬레이션 실행</button></form>
        <p class="wf-context">원본 예제의 1,250거래일 가상 데이터와 4폴드·10일 격리를 기본값으로 사용합니다. 각 폴드에서 위험 기준을 <b>그때의 학습 데이터만으로</b> 정하고, 미래 10일을 모르는 마지막 행은 빼서 데이터 누수를 방지합니다. 가상 특징은 난수이므로 좋은 예측 성능을 기대하는 실습은 아닙니다.</p>
        <div class="wf-status" id="wfStatus" role="status">기본 설정으로 실행해 보세요.</div><div id="wfResults"></div>
      </section>`;
    const form = element.querySelector('#wfForm');
    const status = element.querySelector('#wfStatus');
    const result = element.querySelector('#wfResults');
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
