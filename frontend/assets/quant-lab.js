(function () {
  'use strict';

  let charts = [];
  const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const signed = value => `${value > 0 ? '+' : ''}${value}%`;

  function clearCharts() {
    charts.forEach(chart => chart.destroy());
    charts = [];
  }

  function drawChart(element, options) {
    if (!element || !window.ApexCharts) {
      if (element) element.textContent = '차트 라이브러리를 불러오지 못했습니다. 아래 수치 결과를 확인해 주세요.';
      return;
    }
    const { chart: chartOptions = {}, tooltip: tooltipOptions = {}, ...chartData } = options;
    const chart = new window.ApexCharts(element, {
      chart: { height: 260, toolbar: { show: false }, animations: { enabled: false }, fontFamily: 'inherit', ...chartOptions },
      colors: ['#2563eb', '#16a34a'], grid: { borderColor: '#e5eaf2' },
      dataLabels: { enabled: false }, stroke: { width: 2.5, curve: 'straight' },
      tooltip: { shared: true, intersect: false, ...tooltipOptions }, legend: { position: 'top' }, ...chartData,
    });
    charts.push(chart);
    try {
      const rendering = chart.render();
      if (rendering && typeof rendering.catch === 'function') {
        rendering.catch(() => { element.textContent = '차트를 표시하지 못했습니다. 위 수치 결과를 확인해 주세요.'; });
      }
    } catch (error) {
      charts.pop();
      element.textContent = '차트를 표시하지 못했습니다. 위 수치 결과를 확인해 주세요.';
    }
  }

  function renderResult(root, data, settings) {
    const eda = data.eda;
    const model = data.model;
    const exampleProbability = Math.round((settings.threshold + 0.1) * 100);
    const missing = Object.entries(eda.missing).filter(([, count]) => count > 0);
    const fetchedAt = data.fetched_at ? new Date(data.fetched_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) : '';
    const sourceNote = data.sample
      ? '고정 시드로 생성한 가상 데이터 · 실제 시세 아님'
      : settings.source === 'samsung'
        ? `Yahoo Finance 일봉 · yfinance 조회 ${fetchedAt} · 30분 캐시`
        : settings.source === 'stored'
          ? '이 저장소의 PostgreSQL 적재 일봉 · 분석 결과는 저장하지 않음'
          : '사용자 CSV · 서버에 저장하지 않음';
    root.innerHTML = `
      <div class="ql-source"><strong>${escapeHtml(data.source)}</strong><span>${escapeHtml(sourceNote)}</span></div>
      <section class="ql-section" aria-labelledby="qlEdaTitle">
        <div class="ql-section-head"><div><span>STEP 01 · EDA</span><h3 id="qlEdaTitle">데이터를 먼저 살펴보기</h3></div><p>${escapeHtml(eda.start)} ~ ${escapeHtml(eda.end)} · ${eda.rows.toLocaleString()}거래일</p></div>
        <p class="ql-explain">EDA는 <b>자료를 먼저 눈으로 확인하는 단계</b>입니다. 가격 흐름과 하루 등락을 보고, 빈칸이나 큰 하락이 있는지 살펴봅니다.</p>
        <div class="ql-metrics">
          <article><span>처음부터 끝까지 가격 변화</span><strong>${signed(eda.price_change_pct)}</strong><small>예: 첫날 100원 → 마지막 날 110원이면 +10%</small></article>
          <article><span>하루 수익률의 평균</span><strong>${signed(eda.mean_return_pct)}</strong><small>매일 오른 비율과 내린 비율을 평균한 값</small></article>
          <article><span>하루 등락의 흔들림</span><strong>${eda.daily_volatility_pct}%</strong><small>값이 클수록 하루 가격 변화가 들쭉날쭉함</small></article>
          <article><span>가장 컸던 하락 폭</span><strong>${eda.max_drawdown_pct}%</strong><small>예: 고점 100원 → 저점 80원이면 −20%</small></article>
          <article><span>가격이 오른 날의 비율</span><strong>${eda.positive_days_pct}%</strong><small>예: 10일 중 6일 올랐다면 60%</small></article>
        </div>
        <div class="ql-charts ql-eda-charts"><figure><figcaption>종가 추이 <small>표본 최대 121개 지점</small></figcaption><div id="qlPriceChart"></div></figure><figure><figcaption>일간 수익률 분포 <small>12개 구간</small></figcaption><div id="qlHistChart"></div></figure><figure><figcaption>거래량 추이 <small>표본 거래일</small></figcaption><div id="qlVolumeChart"></div></figure></div>
        <p class="ql-note">빈칸이 있는 데이터: ${missing.length ? missing.map(([name, count]) => `${escapeHtml(name)} ${count}건`).join(' · ') + ' (그 날짜는 계산에서 제외)' : '없음'}${eda.excluded_rows ? ` · 가격 범위가 맞지 않아 제외한 원본 행 ${eda.excluded_rows}건` : ''} · 앱에서 가격을 추가로 조정하지 않습니다. 실제 데이터의 배당·주식 분할 반영 방식은 원천 자료를 따릅니다.</p>
      </section>
      <section class="ql-section" aria-labelledby="qlModelTitle">
        <div class="ql-section-head"><div><span>STEP 02 · LIGHTGBM</span><h3 id="qlModelTitle">다음 날 가격이 오를지 맞혀보기</h3></div><p>학습 ${model.train_rows}건 · 테스트 ${model.test_rows}건</p></div>
        <p class="ql-explain">LightGBM은 <b>과거 숫자에서 규칙을 찾는 모델</b>입니다. 예: 오늘까지의 가격·거래량을 보고, 내일 <b>시가 100원 → 종가 103원</b>처럼 장중에 오를지를 예상합니다. 오래된 ${model.train_rows}건으로 배우고, 뒤의 ${model.test_rows}건에서 맞혔는지 확인했습니다.</p>
        <p class="ql-note">학습에 쓴 마지막 결과 날짜는 ${escapeHtml(model.train_end)}, 테스트 첫 결과 날짜는 ${escapeHtml(model.test_start)}입니다. 사이의 하루는 비워, 시험할 날의 정답을 학습 중에 미리 보지 않게 했습니다.</p>
        <div class="ql-metrics">
          <article><span>모델이 맞힌 비율</span><strong>${model.accuracy_pct}%</strong><small>예: 100일 중 55일 맞히면 정확도 55%</small></article>
          <article><span>단순하게 찍었을 때</span><strong>${model.majority_baseline_pct}%</strong><small>학습 때 더 많았던 답만 계속 고른 경우</small></article>
          <article><span>모델을 따른 가상 수익률</span><strong>${signed(model.strategy_return_pct)}</strong><small>예: 100만 원 → 105만 원이면 +5%</small></article>
          <article><span>매일 샀을 때 가상 수익률</span><strong>${signed(model.benchmark_return_pct)}</strong><small>매일 시가에 사서 종가에 판 비교 결과</small></article>
          <article><span>가장 컸던 가상 자산 하락</span><strong>${model.strategy_mdd_pct}%</strong><small>예: 가상 자산 100 → 80이면 −20%</small></article>
          <article><span>가상 매수·매도 횟수</span><strong>${model.trade_count}회</strong><small>한 번 사고 한 번 팔면 2회</small></article>
        </div>
        <div class="ql-charts"><figure><figcaption>가상 자산 변화 <small>시작값 100 · 한 번 거래할 때 비용 ${settings.cost_bps}bp</small></figcaption><div id="qlEquityChart"></div></figure><figure><figcaption>모델 판단에 기여한 입력값 <small>막대가 길수록 학습 중 오류를 많이 줄인 항목</small></figcaption><div id="qlImportanceChart"></div></figure></div>
        <p class="ql-chart-help">오른쪽 막대는 모델이 어떤 숫자를 활용했는지 보여 줍니다. 그 숫자가 실제 수익의 원인이라는 뜻은 아닙니다.</p>
        <div class="ql-table-wrap"><table><caption>최근 8일: 예상과 실제 비교</caption><thead><tr><th>결과 날짜</th><th>모델의 상승 예상</th><th>가상 행동</th><th>시가→종가 결과</th></tr></thead><tbody>${model.points.slice(-8).reverse().map(point => `<tr><td>${escapeHtml(point.date)}</td><td>${(point.probability * 100).toFixed(1)}%</td><td>${point.signal ? '매수' : '현금 유지'}</td><td>${point.actual ? '상승' : '비상승'}</td></tr>`).join('')}</tbody></table></div>
        <p class="ql-note">예: 모델이 상승을 ${exampleProbability}%로 예상하고 매수 기준이 ${Math.round(settings.threshold * 100)}%라면, 다음 날 시가에 샀다가 종가에 팝니다. ${settings.cost_bps}bp는 한 번 거래할 때 ${(settings.cost_bps / 100).toFixed(2)}%이며 매수·매도 비용을 모두 계산했습니다. 모델의 예상치는 추정값이며 실제 상승 확률을 보장하지 않습니다. 이 결과는 투자 권유가 아닙니다.</p>
      </section>`;

    drawChart(root.querySelector('#qlPriceChart'), {
      chart: { type: 'line' }, series: [{ name: '종가', data: eda.series.map(row => row.close) }],
      xaxis: { categories: eda.series.map(row => row.date), labels: { hideOverlappingLabels: true, maxHeight: 45 } },
      yaxis: { decimalsInFloat: 1 }, tooltip: { x: { formatter: (_, context) => eda.series[context.dataPointIndex]?.date || '' } },
    });
    drawChart(root.querySelector('#qlHistChart'), {
      chart: { type: 'bar' }, colors: ['#64748b'], series: [{ name: '거래일', data: eda.histogram.map(bin => bin.count) }],
      xaxis: { categories: eda.histogram.map(bin => bin.label), labels: { rotate: -45 } },
    });
    drawChart(root.querySelector('#qlVolumeChart'), {
      chart: { type: 'bar' }, colors: ['#0f766e'], series: [{ name: '거래량', data: eda.series.map(row => row.volume) }],
      xaxis: { categories: eda.series.map(row => row.date), labels: { hideOverlappingLabels: true } },
      tooltip: { x: { formatter: (_, context) => eda.series[context.dataPointIndex]?.date || '' } },
    });
    drawChart(root.querySelector('#qlEquityChart'), {
      chart: { type: 'line' }, series: [
        { name: 'LightGBM 모의', data: model.points.map(point => point.strategy) },
        { name: '매일 장중 보유', data: model.points.map(point => point.benchmark) },
      ], xaxis: { categories: model.points.map(point => point.date), labels: { hideOverlappingLabels: true } },
      tooltip: { x: { formatter: (_, context) => model.points[context.dataPointIndex]?.date || '' } },
    });
    drawChart(root.querySelector('#qlImportanceChart'), {
      chart: { type: 'bar' }, colors: ['#7c3aed'], plotOptions: { bar: { horizontal: true, borderRadius: 3 } },
      series: [{ name: 'gain 비율 (%)', data: model.importance.map(item => item.gain_pct) }],
      xaxis: { categories: model.importance.map(item => item.name), max: 100 },
    });
  }

  function mount(element, fetchJson) {
    clearCharts();
    element.innerHTML = `
      <section class="quant-lab" aria-labelledby="quantLabTitle">
        <div class="ql-header"><div><span>QUANT DATA LAB · 교육용 테스트</span><h2 id="quantLabTitle">EDA × LightGBM 실습</h2><p>LightGBM은 마이크로소프트가 개발해 공개한 오픈소스 머신러닝 라이브러리입니다. 주가 자료를 먼저 살펴보고, 이 도구가 다음 날의 움직임을 얼마나 잘 맞히는지 시험해 봅니다.</p></div><i class="fa-solid fa-chart-line" aria-hidden="true"></i></div>
        <ol class="ql-guide" aria-label="실습 순서">
          <li><strong>① 자료 고르기</strong><span>처음이라면 <b>가상 OHLCV 예제</b>를 그대로 쓰세요. OHLCV는 하루 가격과 거래량 기록입니다. 시가는 시작 가격, 종가는 마감 가격입니다.</span></li>
          <li><strong>② EDA: 자료 살펴보기</strong><span>가격이 올랐는지, 얼마나 자주 크게 움직였는지 봅니다. 예: 어제 종가 100원, 오늘 103원이면 하루 수익률은 +3%입니다.</span></li>
          <li><strong>③ LightGBM: 답 맞혀보기</strong><span>과거 숫자로 배운 모델이 다음 날 장중 상승을 예상합니다. 예: 내일 시가 100원, 종가 103원이면 정답은 “상승”입니다.</span></li>
        </ol>
        <form class="ql-form" id="quantLabForm">
          <label>데이터 <select name="source" id="qlSource"><option value="sample">가상 OHLCV 예제</option><option value="samsung">삼성전자 최근 2년 일봉 (yfinance)</option><option value="stored">저장된 종목 OHLCV</option><option value="csv">내 CSV 업로드</option></select></label>
          <div class="ql-stored" id="qlStoredWrap" hidden><label>종목 코드 <input type="text" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" placeholder="예: 005930" id="qlTicker" /></label><label>시장 <select id="qlMarket"><option value="KOSPI">KOSPI</option><option value="KOSDAQ">KOSDAQ</option></select></label><small>이 저장소의 PostgreSQL에 적재된 일봉을 사용합니다. 최소 180거래일이 필요합니다.</small></div>
          <label class="ql-file" id="qlFileWrap" hidden>CSV 파일 <input type="file" name="file" accept=".csv,text/csv" id="qlFile" /><small>date, open, high, low, close, volume · UTF-8 · 최대 1MB · 최소 180행</small></label>
          <label>과거 자료로 배울 비율 <select name="train_pct"><option value="60">60%</option><option value="70">70%</option><option value="75" selected>75%</option><option value="80">80%</option><option value="85">85%</option></select><small>예: 75%를 고르면 앞 75%로 배우고, 뒤 25%로 시험합니다.</small></label>
          <label>매수할 최소 상승 예상치 <select name="threshold"><option value="0.45">45%</option><option value="0.5" selected>50%</option><option value="0.55">55%</option><option value="0.6">60%</option><option value="0.65">65%</option></select><small>예: 모델이 60%로 예상했고 기준이 50%라면 매수로 표시합니다.</small></label>
          <label>모델 학습 횟수 <select name="rounds"><option value="40">40회</option><option value="80" selected>80회</option><option value="120">120회</option><option value="160">160회</option></select><small>횟수를 바꿔 결과가 어떻게 달라지는지 비교해 보세요.</small></label>
          <label>매수·매도 각각의 비용 <select name="cost_bps"><option value="0">0bp</option><option value="10" selected>10bp</option><option value="25">25bp</option><option value="50">50bp</option></select><small>예: 10bp는 한 번 거래할 때 0.1%입니다. 사고팔면 약 0.2%입니다.</small></label>
          <button type="submit" class="btn-primary" id="qlRun"><i class="fa-solid fa-play"></i> EDA · 모델 테스트 실행</button>
        </form>
        <p class="ql-help">처음에는 기본값으로 실행해 보세요. CSV를 올릴 때는 날짜별로 한 줄씩 입력합니다. 모델은 오래된 날짜로 배우고, 그보다 나중 날짜에서 실력을 확인합니다.</p>
        <div id="qlStatus" class="ql-status" role="status">설정을 고르고 실행해 보세요.</div>
        <div id="qlResults"></div>
      </section>`;
    const form = element.querySelector('#quantLabForm');
    const source = element.querySelector('#qlSource');
    const fileWrap = element.querySelector('#qlFileWrap');
    const fileInput = element.querySelector('#qlFile');
    const storedWrap = element.querySelector('#qlStoredWrap');
    const tickerInput = element.querySelector('#qlTicker');
    const marketInput = element.querySelector('#qlMarket');
    const status = element.querySelector('#qlStatus');
    const result = element.querySelector('#qlResults');
    const button = element.querySelector('#qlRun');
    source.addEventListener('change', () => {
      fileWrap.hidden = source.value !== 'csv';
      fileInput.required = source.value === 'csv';
      storedWrap.hidden = source.value !== 'stored';
      tickerInput.required = source.value === 'stored';
    });
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (source.value === 'csv' && !fileInput.files.length) {
        status.textContent = 'CSV 파일을 선택해 주세요.';
        return;
      }
      if (source.value === 'stored' && !/^[0-9]{6}$/.test(tickerInput.value.trim())) {
        status.textContent = '종목 코드는 숫자 6자리로 입력해 주세요.';
        return;
      }
      const settings = { source: source.value, threshold: Number(form.elements.threshold.value), cost_bps: Number(form.elements.cost_bps.value) };
      const body = new FormData(form);
      if (source.value !== 'csv') body.delete('file');
      button.disabled = true;
      status.textContent = source.value === 'samsung'
        ? 'Yahoo Finance에서 삼성전자 2년 일봉을 확인하고 모델을 학습하고 있습니다…'
        : '데이터를 확인하고 LightGBM을 학습하고 있습니다…';
      try {
        if (source.value === 'stored') {
          const ticker = tickerInput.value.trim();
          const market = marketInput.value;
          const history = await fetchJson(`/market/history?ticker=${ticker}&market=${market}`, value => value && Array.isArray(value.bars));
          if (history.bars.length < 180) throw new Error('저장된 일봉이 180거래일 미만입니다. 다른 종목을 고르거나 CSV를 사용해 주세요.');
          const csv = ['date,open,high,low,close,volume', ...history.bars.map(row => [row.date, row.open, row.high, row.low, row.close, row.volume].join(','))].join('\n');
          body.set('source', 'csv');
          body.set('file', new Blob([csv], { type: 'text/csv' }), `${ticker}.${market}.csv`);
        }
        const data = await fetchJson('/quant-lab/analyze', value => value && value.eda && value.model, { method: 'POST', body });
        if (!element.isConnected) return;
        clearCharts();
        renderResult(result, data, settings);
        status.textContent = `완료 · ${data.eda.rows.toLocaleString()}거래일 분석, 테스트 ${data.model.test_rows}건`;
      } catch (error) {
        if (element.isConnected) status.textContent = error.detail || error.message || '분석 중 오류가 발생했습니다.';
      } finally {
        if (element.isConnected) button.disabled = false;
      }
    });
  }

  window.QuantLab = { mount, unmount: clearCharts };
})();
