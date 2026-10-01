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
    const missing = Object.entries(eda.missing).filter(([, count]) => count > 0);
    root.innerHTML = `
      <div class="ql-source"><strong>${escapeHtml(data.source)}</strong><span>${data.sample ? '고정 시드로 생성한 가상 데이터 · 실제 시세 아님' : settings.source === 'stored' ? '이 저장소의 PostgreSQL 적재 일봉 · 분석 결과는 저장하지 않음' : '사용자 CSV · 서버에 저장하지 않음'}</span></div>
      <section class="ql-section" aria-labelledby="qlEdaTitle">
        <div class="ql-section-head"><div><span>STEP 01 · EDA</span><h3 id="qlEdaTitle">데이터를 먼저 살펴보기</h3></div><p>${escapeHtml(eda.start)} ~ ${escapeHtml(eda.end)} · ${eda.rows.toLocaleString()}거래일</p></div>
        <div class="ql-metrics">
          <article><span>기간 가격 변화</span><strong>${signed(eda.price_change_pct)}</strong></article>
          <article><span>평균 일간 수익률</span><strong>${signed(eda.mean_return_pct)}</strong></article>
          <article><span>일간 변동성</span><strong>${eda.daily_volatility_pct}%</strong></article>
          <article><span>최대 낙폭</span><strong>${eda.max_drawdown_pct}%</strong></article>
          <article><span>상승 거래일 비율</span><strong>${eda.positive_days_pct}%</strong></article>
        </div>
        <div class="ql-charts ql-eda-charts"><figure><figcaption>종가 추이 <small>표본 최대 121개 지점</small></figcaption><div id="qlPriceChart"></div></figure><figure><figcaption>일간 수익률 분포 <small>12개 구간</small></figcaption><div id="qlHistChart"></div></figure><figure><figcaption>거래량 추이 <small>표본 거래일</small></figcaption><div id="qlVolumeChart"></div></figure></div>
        <p class="ql-note">결측값: ${missing.length ? missing.map(([name, count]) => `${escapeHtml(name)} ${count}건`).join(' · ') + ' (해당 행 제외)' : '없음'} · 가격은 수정주가가 아닌 입력 데이터의 종가입니다. EDA 수치는 전체 입력 기간을 요약합니다.</p>
      </section>
      <section class="ql-section" aria-labelledby="qlModelTitle">
        <div class="ql-section-head"><div><span>STEP 02 · LIGHTGBM</span><h3 id="qlModelTitle">다음 거래일 장중 상승 여부 테스트</h3></div><p>학습 ${model.train_rows}건 · 테스트 ${model.test_rows}건</p></div>
        <p class="ql-note">${escapeHtml(model.train_end)}까지 학습하고 경계의 1일을 제외한 뒤 ${escapeHtml(model.test_start)}부터 테스트했습니다. 특징은 신호일 종가·거래량까지 사용하며, 다음 거래일 시가에서 종가까지의 수익률을 예측합니다.</p>
        <div class="ql-metrics">
          <article><span>정확도</span><strong>${model.accuracy_pct}%</strong></article>
          <article><span>학습 다수 클래스 기준</span><strong>${model.majority_baseline_pct}%</strong></article>
          <article><span>모의 전략 수익률</span><strong>${signed(model.strategy_return_pct)}</strong></article>
          <article><span>매일 장중 보유 수익률</span><strong>${signed(model.benchmark_return_pct)}</strong></article>
          <article><span>모의 전략 MDD</span><strong>${model.strategy_mdd_pct}%</strong></article>
          <article><span>모의 체결 건수</span><strong>${model.trade_count}회</strong></article>
        </div>
        <div class="ql-charts"><figure><figcaption>테스트 구간의 가상 자산 <small>시작값 100 · 편도 비용 ${settings.cost_bps}bp</small></figcaption><div id="qlEquityChart"></div></figure><figure><figcaption>특징 중요도 <small>LightGBM gain 비율</small></figcaption><div id="qlImportanceChart"></div></figure></div>
        <div class="ql-table-wrap"><table><caption>최근 테스트 예측 8건</caption><thead><tr><th>결과 날짜</th><th>상승 확률</th><th>선택</th><th>실제</th></tr></thead><tbody>${model.points.slice(-8).reverse().map(point => `<tr><td>${escapeHtml(point.date)}</td><td>${(point.probability * 100).toFixed(1)}%</td><td>${point.signal ? '보유' : '현금'}</td><td>${point.actual ? '상승' : '비상승'}</td></tr>`).join('')}</tbody></table></div>
        <p class="ql-note">상승 확률이 ${Math.round(settings.threshold * 100)}% 이상이면 다음 거래일 시가에 매수하고 종가에 매도한다고 가정합니다. 전략과 매일 장중 보유 비교군 모두 매수·매도 각각 ${settings.cost_bps}bp를 차감합니다. 배당·세금·슬리피지·공매도는 반영하지 않습니다. 이 결과는 투자 신호나 미래 성과 예측이 아닙니다.</p>
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
        <div class="ql-header"><div><span>QUANT DATA LAB · 교육용 테스트</span><h2 id="quantLabTitle">EDA × LightGBM 실습</h2><p>OHLCV 데이터의 분포를 확인하고, 과거 구간으로 학습한 모델을 이후 구간에서 시험해 보세요.</p></div><i class="fa-solid fa-chart-line" aria-hidden="true"></i></div>
        <form class="ql-form" id="quantLabForm">
          <label>데이터 <select name="source" id="qlSource"><option value="sample">가상 OHLCV 예제</option><option value="stored">저장된 종목 OHLCV</option><option value="csv">내 CSV 업로드</option></select></label>
          <div class="ql-stored" id="qlStoredWrap" hidden><label>종목 코드 <input type="text" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" placeholder="예: 005930" id="qlTicker" /></label><label>시장 <select id="qlMarket"><option value="KOSPI">KOSPI</option><option value="KOSDAQ">KOSDAQ</option></select></label><small>이 저장소의 PostgreSQL에 적재된 일봉을 사용합니다. 최소 180거래일이 필요합니다.</small></div>
          <label class="ql-file" id="qlFileWrap" hidden>CSV 파일 <input type="file" name="file" accept=".csv,text/csv" id="qlFile" /><small>date, open, high, low, close, volume · UTF-8 · 최대 1MB · 최소 180행</small></label>
          <label>학습 비율 <select name="train_pct"><option value="60">60%</option><option value="70">70%</option><option value="75" selected>75%</option><option value="80">80%</option><option value="85">85%</option></select></label>
          <label>매수 확률 기준 <select name="threshold"><option value="0.45">45%</option><option value="0.5" selected>50%</option><option value="0.55">55%</option><option value="0.6">60%</option><option value="0.65">65%</option></select></label>
          <label>학습 반복 <select name="rounds"><option value="40">40회</option><option value="80" selected>80회</option><option value="120">120회</option><option value="160">160회</option></select></label>
          <label>편도 거래비용 <select name="cost_bps"><option value="0">0bp</option><option value="10" selected>10bp</option><option value="25">25bp</option><option value="50">50bp</option></select></label>
          <button type="submit" class="btn-primary" id="qlRun"><i class="fa-solid fa-play"></i> EDA · 모델 테스트 실행</button>
        </form>
        <p class="ql-help">CSV는 날짜별 1행으로 입력합니다. 이 실습은 다음 날 시가 대비 종가의 상승 여부를 분류하며 시간순으로 학습과 테스트를 분리합니다.</p>
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
      if (source.value === 'sample') body.delete('file');
      button.disabled = true;
      status.textContent = '데이터를 확인하고 LightGBM을 학습하고 있습니다…';
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
