(() => {
  const init = () => {
    const lesson = [...document.querySelectorAll('.lesson')]
      .find((item) => item.querySelector('h2')?.textContent.trim().startsWith('블랙 스완:'));
    const body = lesson?.querySelector('.lesson-body');
    if (!body || document.getElementById('blackSwanEventTrigger')) return;

    const events = [
      {
        id: 'volmageddon', year: '2018', title: '변동성 급등', subtitle: 'Volmageddon',
        index: '미국 S&P 500', start: '2018.01.26', lowDate: '2018.02.08', drawdown: -10.16,
        after30: 96.87, color: '#7c3aed',
        values: [100, 96.15, 91.18, 95.10, 96.75, 96.87],
        description: '낮은 변동성에 베팅하던 상품과 포지션이 한꺼번에 흔들리며 주식시장의 하락이 빠르게 커진 사례입니다.',
      },
      {
        id: 'covid', year: '2020', title: '코로나19 팬데믹', subtitle: '세계 경제 봉쇄 충격',
        index: '미국 S&P 500', start: '2020.02.19', lowDate: '2020.03.23', drawdown: -33.92,
        after30: 72.96, color: '#dc2626',
        values: [100, 92.03, 92.44, 80.96, 70.82, 72.96],
        description: '감염 확산과 이동 제한으로 경제활동이 갑자기 멈출 수 있다는 공포가 전 세계 주식시장에 동시에 반영된 사례입니다.',
      },
      {
        id: 'ukraine', year: '2022', title: '러시아의 우크라이나 침공', subtitle: '지정학·에너지 충격',
        index: 'EURO STOXX 50', start: '2022.02.16', lowDate: '2022.03.08', drawdown: -15.27,
        after30: 95.70, color: '#e08a00',
        values: [100, 96.04, 92.35, 91.03, 94.02, 95.70],
        description: '전쟁, 제재, 에너지 공급 불안이 유럽 기업의 비용과 경기 전망에 빠르게 반영된 사례입니다.',
      },
      {
        id: 'carry', year: '2024', title: '엔 캐리 청산 충격', subtitle: '금리·환율·포지션 되감기',
        index: '일본 Nikkei 225', start: '2024.07.11', lowDate: '2024.08.05', drawdown: -25.50,
        after30: 90.26, color: '#16805a',
        values: [100, 94.88, 89.21, 85.05, 82.95, 90.26],
        description: '엔화와 금리 환경이 급변하자 빌린 엔화로 위험자산을 사던 포지션이 빠르게 정리되며 일본 증시가 크게 흔들린 사례입니다.',
      },
    ];
    const checkpoints = ['충격 전', '5일', '10일', '15일', '20일', '30일'];

    body.insertAdjacentHTML('beforeend', `
      <p class="lesson-video-cta">
        <button type="button" class="lesson-video-link" id="blackSwanEventTrigger"><i class="fa-solid fa-chart-line"></i> 최근 10년 블랙 스완 후보 비교</button>
        <small>2018·2020·2022·2024년 충격 전 지수를 100으로 맞춰 주가 낙폭과 회복 흐름을 비교해 보세요.</small>
      </p>`);

    document.head.insertAdjacentHTML('beforeend', `<style id="blackSwanEventStyle">
      .black-swan-event-dialog{box-sizing:border-box;display:flex;flex-direction:column;width:96vw!important;height:96vh!important;max-width:none!important;max-height:none!important;overflow:hidden!important;padding:20px 24px}
      .black-swan-event-dialog>.glossary-modal__label{margin:0 0 2px;color:#315ff4;font-size:13.2px;font-weight:900;letter-spacing:.1em}
      .black-swan-event-dialog h2{margin:0 48px 3px 0;color:#102f68;font-size:clamp(26px,2vw,32px);line-height:1.2}
      .black-swan-event-intro{margin:3px 0 10px;color:#334c70;font-size:16.5px;font-weight:650;line-height:1.5}
      .black-swan-event-layout{display:grid;grid-template-columns:340px minmax(0,1fr);gap:12px;flex:1;min-height:0}
      .black-swan-event-sidebar{display:flex;flex-direction:column;min-height:0;padding:10px;border:1px solid #cbd9ec;border-radius:14px;background:#f5f8fe}
      .black-swan-event-sidebar h3{margin:0 0 8px;color:#173d72;font-size:17px}
      .black-swan-event-cards{display:grid;grid-template-columns:1fr;gap:6px;margin:0}
      .black-swan-event-card{display:grid;grid-template-columns:minmax(0,1fr) auto;column-gap:8px;padding:7px 10px;border:2px solid #d9e3f2;border-radius:10px;background:#fff;color:#203a60;font:inherit;text-align:left;cursor:pointer;transition:.15s ease}
      .black-swan-event-card:hover,.black-swan-event-card[aria-pressed="true"]{border-color:var(--event-color);background:#f7faff;box-shadow:0 6px 16px #173d7217;transform:translateY(-1px)}
      .black-swan-event-card span{grid-column:1;color:#60738e;font-size:13.2px;font-weight:750;line-height:1.3}.black-swan-event-card small{grid-column:1/-1;color:#60738e;font-size:13.2px;font-weight:750;line-height:1.3}
      .black-swan-event-card b{grid-column:1;display:block;margin:2px 0;color:#17345f;font-size:16.5px;line-height:1.25}
      .black-swan-event-card strong{grid-column:2;grid-row:1/3;align-self:center;color:var(--event-color);font-size:20px}
      .black-swan-event-main{display:grid;grid-template-rows:minmax(250px,1fr) auto;gap:8px;min-width:0;min-height:0}
      .black-swan-event-workbench{display:grid;grid-template-columns:minmax(0,1fr) 270px;gap:10px;min-height:0;align-items:stretch}
      .black-swan-event-chart{display:block;width:100%;height:100%;min-height:250px;border:1px solid #d5e0ef;border-radius:12px;background:#fbfdff}
      .black-swan-event-sim{box-sizing:border-box;min-height:0;padding:13px;border:1px solid #cbdaf0;border-radius:12px;background:linear-gradient(145deg,#eef4ff,#f8fbff)}
      .black-swan-event-sim h3{margin:0 0 4px;color:#173d72;font-size:17px}.black-swan-event-sim p{margin:0 0 9px;color:#526783;font-size:14.3px;line-height:1.45}
      .black-swan-event-sim label{display:block;color:#304867;font-size:15.4px;font-weight:800}.black-swan-event-sim input{width:100%;margin:9px 0;accent-color:#315ff4}
      .black-swan-event-amount{display:block;color:#174ea6;font-size:18px;font-weight:900;text-align:right}
      .black-swan-event-result{margin-top:9px;padding:9px 10px;border-radius:9px;background:#fff;border-left:4px solid var(--selected-color,#315ff4)}
      .black-swan-event-result span,.black-swan-event-result small{display:block;color:#60738e;font-size:13.2px}.black-swan-event-result strong{display:block;margin:2px 0;color:#b42318;font-size:19px}.black-swan-event-result b{color:#173d72}
      .black-swan-event-description{margin:8px 0 0!important;padding:8px 9px;border-radius:8px;background:#fff;color:#405572!important;font-size:13.75px!important;line-height:1.4!important}
      .black-swan-event-lower{min-width:0}.black-swan-event-legend{display:flex;flex-wrap:wrap;gap:4px 10px;margin:0 0 5px}.black-swan-event-legend button{display:inline-flex;align-items:center;gap:5px;padding:2px 6px;border:0;border-radius:999px;background:transparent;color:#314866;font-family:inherit;font-size:13.2px;font-weight:800;cursor:pointer}.black-swan-event-legend button[aria-pressed="true"]{background:#eaf1ff}.black-swan-event-legend i{width:9px;height:9px;border-radius:50%}
      .black-swan-event-table-wrap{overflow:hidden}.black-swan-event-table{width:100%;border-collapse:collapse;font-size:13.2px}.black-swan-event-table th,.black-swan-event-table td{padding:4px 7px;border:1px solid #dbe4f1;text-align:right;line-height:1.3}.black-swan-event-table th:first-child,.black-swan-event-table td:first-child{text-align:left}.black-swan-event-table thead th{background:#eaf1ff;color:#173d72}.black-swan-event-table tbody tr.is-selected{background:#f5f8ff;font-weight:800}
      .black-swan-event-note{margin:auto 0 0;padding-top:9px;color:#405572;font-size:13.2px;line-height:1.45}.black-swan-event-note a{color:#315ff4}
      @media(max-width:900px){.black-swan-event-dialog{height:calc(100vh - 16px)!important;overflow:auto!important;padding:20px 14px}.black-swan-event-layout{grid-template-columns:1fr}.black-swan-event-cards{grid-template-columns:repeat(2,1fr)}.black-swan-event-main{display:block}.black-swan-event-workbench{grid-template-columns:1fr}.black-swan-event-chart{height:280px}.black-swan-event-sim{margin-top:9px}.black-swan-event-lower{margin-top:9px}}
      @media(max-width:520px){.black-swan-event-dialog h2{font-size:23px}.black-swan-event-cards{grid-template-columns:1fr}.black-swan-event-table-wrap{overflow-x:auto}.black-swan-event-table{min-width:720px;font-size:13.2px}}
    </style>`);

    document.body.insertAdjacentHTML('beforeend', `
      <div class="glossary-modal" id="blackSwanEventModal" hidden>
        <div class="glossary-modal__backdrop" data-black-swan-event-close></div>
        <section class="glossary-modal__dialog black-swan-event-dialog" role="dialog" aria-modal="true" aria-labelledby="blackSwanEventTitle">
          <button class="glossary-modal__close" type="button" aria-label="닫기" data-black-swan-event-close>×</button>
          <p class="glossary-modal__label">EVENT SHOCK LAB · 최근 10년 · 교육용</p>
          <h2 id="blackSwanEventTitle">블랙 스완 후보 사건과 주가 충격 비교</h2>
          <p class="black-swan-event-intro">각 사건의 충격 직전 종가를 <b>100</b>으로 맞췄습니다. 지수의 원래 숫자가 달라도 하락 속도와 회복 정도를 같은 눈금에서 비교할 수 있습니다.</p>
          <div class="black-swan-event-layout">
            <aside class="black-swan-event-sidebar">
              <h3>사건 선택</h3>
              <div class="black-swan-event-cards" id="blackSwanEventCards"></div>
              <p class="black-swan-event-note"><b>주의:</b> ‘블랙 스완’ 여부는 당시 예측 가능성을 어떻게 보느냐에 따라 달라집니다. 여기서는 뜻밖의 충격이 시장에 전달되는 모습을 비교합니다. 종가는 Yahoo Finance 자료를 사용했으며, 2020년 수치는 <a href="https://www.spglobal.com/en/research-insights/market-insights/spiva-u-s-year-end-2020" target="_blank" rel="noopener noreferrer">S&amp;P 자료</a>와 대조했습니다.</p>
            </aside>
            <div class="black-swan-event-main">
              <div class="black-swan-event-workbench">
                <svg class="black-swan-event-chart" id="blackSwanEventChart" viewBox="0 0 820 330" role="img" aria-label="최근 10년 네 가지 시장 충격 후보의 대표 주가지수 변화 비교"></svg>
                <aside class="black-swan-event-sim">
                  <h3>내 투자금으로 체감하기</h3>
                  <p>선택한 지수를 충격 직전에 샀다고 가정하고 저점의 평가금액을 계산합니다.</p>
                  <label for="blackSwanEventAmount">가상 투자금</label>
                  <input id="blackSwanEventAmount" type="range" min="1000000" max="100000000" step="1000000" value="10000000" />
                  <output class="black-swan-event-amount" id="blackSwanEventAmountOutput">1,000만 원</output>
                  <div class="black-swan-event-result" id="blackSwanEventResult"></div>
                  <p class="black-swan-event-description" id="blackSwanEventDescription"></p>
                </aside>
              </div>
              <div class="black-swan-event-lower">
                <div class="black-swan-event-legend" id="blackSwanEventLegend"></div>
                <div class="black-swan-event-table-wrap"><table class="black-swan-event-table"><thead><tr><th>사건 후보</th><th>대표 지수</th><th>기준일</th><th>기간 내 저점</th><th>최대낙폭</th><th>30거래일 후</th></tr></thead><tbody id="blackSwanEventTableBody"></tbody></table></div>
              </div>
            </div>
          </div>
        </section>
      </div>`);

    const modal = document.getElementById('blackSwanEventModal');
    const trigger = document.getElementById('blackSwanEventTrigger');
    const chart = document.getElementById('blackSwanEventChart');
    const cards = document.getElementById('blackSwanEventCards');
    const legend = document.getElementById('blackSwanEventLegend');
    const tableBody = document.getElementById('blackSwanEventTableBody');
    const amountInput = document.getElementById('blackSwanEventAmount');
    const amountOutput = document.getElementById('blackSwanEventAmountOutput');
    const result = document.getElementById('blackSwanEventResult');
    const description = document.getElementById('blackSwanEventDescription');
    let selected = events[1];

    const formatWon = (value) => `${Math.round(value).toLocaleString('ko-KR')}원`;
    const formatCompactWon = (value) => value >= 100000000
      ? `${(value / 100000000).toFixed(value % 100000000 ? 1 : 0)}억 원`
      : `${Math.round(value / 10000).toLocaleString('ko-KR')}만 원`;
    const x = (index) => 64 + index * 142;
    const y = (value) => 25 + (110 - value) * 5.05;

    const renderChart = () => {
      const gridValues = [60, 70, 80, 90, 100, 110];
      const grid = gridValues.map((value) => `<line x1="64" x2="774" y1="${y(value)}" y2="${y(value)}" stroke="${value === 100 ? '#9eb3d2' : '#e1e8f2'}" stroke-dasharray="${value === 100 ? '0' : '4 4'}"/><text x="48" y="${y(value) + 5}" text-anchor="end" fill="#63708a" font-size="14.3" font-weight="700">${value}</text>`).join('');
      const lines = events.map((event) => {
        const active = event.id === selected.id;
        const points = event.values.map((value, index) => `${x(index)},${y(value)}`).join(' ');
        const circles = event.values.map((value, index) => `<circle cx="${x(index)}" cy="${y(value)}" r="${active ? 4.5 : 3}" fill="${event.color}"/>`).join('');
        return `<g opacity="${active ? 1 : .36}"><polyline points="${points}" fill="none" stroke="${event.color}" stroke-width="${active ? 5 : 3}" stroke-linecap="round" stroke-linejoin="round"/>${circles}</g>`;
      }).join('');
      const labels = checkpoints.map((label, index) => `<text x="${x(index)}" y="314" text-anchor="middle" fill="#526783" font-size="14.3" font-weight="750">${label}</text>`).join('');
      chart.innerHTML = `${grid}<text x="64" y="17" fill="#173d72" font-size="15.4" font-weight="850">충격 직전 = 100</text>${lines}${labels}`;
    };

    const renderSelection = () => {
      cards.querySelectorAll('button').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.eventId === selected.id)));
      legend.querySelectorAll('button').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.eventId === selected.id)));
      tableBody.querySelectorAll('tr').forEach((row) => row.classList.toggle('is-selected', row.dataset.eventId === selected.id));
      const amount = Number(amountInput.value);
      const lowValue = amount * (1 + selected.drawdown / 100);
      const loss = amount - lowValue;
      amountOutput.value = formatCompactWon(amount);
      result.style.setProperty('--selected-color', selected.color);
      result.innerHTML = `<span>${selected.year}년 ${selected.title} 저점 가정</span><strong>${formatWon(lowValue)}</strong><small>평가손실 <b>−${formatWon(loss)}</b> · ${selected.drawdown.toFixed(1)}%</small>`;
      description.textContent = selected.description;
      renderChart();
    };

    cards.innerHTML = events.map((event) => `<button type="button" class="black-swan-event-card" data-event-id="${event.id}" aria-pressed="false" style="--event-color:${event.color}"><span>${event.year} · ${event.subtitle}</span><b>${event.title}</b><strong>${event.drawdown.toFixed(1)}%</strong><small>${event.index} · 저점 ${event.lowDate}</small></button>`).join('');
    legend.innerHTML = events.map((event) => `<button type="button" data-event-id="${event.id}" aria-pressed="false"><i style="background:${event.color}"></i>${event.year} ${event.title}</button>`).join('');
    tableBody.innerHTML = events.map((event) => `<tr data-event-id="${event.id}"><td>${event.year} ${event.title}</td><td>${event.index}</td><td>${event.start}</td><td>${event.lowDate}</td><td>${event.drawdown.toFixed(1)}%</td><td>${event.after30.toFixed(1)}</td></tr>`).join('');

    const selectEvent = (id) => {
      selected = events.find((event) => event.id === id) || selected;
      renderSelection();
    };
    cards.addEventListener('click', (event) => { const button = event.target.closest('[data-event-id]'); if (button) selectEvent(button.dataset.eventId); });
    legend.addEventListener('click', (event) => { const button = event.target.closest('[data-event-id]'); if (button) selectEvent(button.dataset.eventId); });
    amountInput.addEventListener('input', renderSelection);
    const close = () => { modal.hidden = true; trigger.focus(); };
    trigger.addEventListener('click', () => { renderSelection(); modal.hidden = false; modal.querySelector('.glossary-modal__close')?.focus(); });
    modal.querySelectorAll('[data-black-swan-event-close]').forEach((element) => element.addEventListener('click', close));
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !modal.hidden) close(); });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
