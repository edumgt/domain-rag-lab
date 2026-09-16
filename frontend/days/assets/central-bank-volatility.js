(() => {
  const root = document.getElementById("centralBankVolatilitySimulator");
  if (!root) return;

  const meetings = {
    fed: [
      ["2024-01-31", "동결 · 5.25~5.50%"], ["2024-03-20", "동결 · 5.25~5.50%"],
      ["2024-05-01", "동결 · 5.25~5.50%"], ["2024-06-12", "동결 · 5.25~5.50%"],
      ["2024-07-31", "동결 · 5.25~5.50%"], ["2024-09-18", "0.50%p 인하 · 4.75~5.00%"],
      ["2024-11-07", "0.25%p 인하 · 4.50~4.75%"], ["2024-12-18", "0.25%p 인하 · 4.25~4.50%"],
    ],
    ecb: [
      ["2024-01-25", "동결 · 예금금리 4.00%"], ["2024-03-07", "동결 · 예금금리 4.00%"],
      ["2024-04-11", "동결 · 예금금리 4.00%"], ["2024-06-06", "0.25%p 인하 · 예금금리 3.75%"],
      ["2024-07-18", "동결 · 예금금리 3.75%"], ["2024-09-12", "0.25%p 인하 · 예금금리 3.50%"],
      ["2024-10-17", "0.25%p 인하 · 예금금리 3.25%"], ["2024-12-12", "0.25%p 인하 · 예금금리 3.00%"],
    ],
    boj: [
      ["2024-01-23", "동결 · 단기금리 -0.10%"], ["2024-03-19", "인상 · 0~0.10% 유도"],
      ["2024-04-26", "동결 · 0~0.10% 유도"], ["2024-06-14", "동결 · 0~0.10% 유도"],
      ["2024-07-31", "인상 · 0.25% 정도"], ["2024-09-20", "동결 · 0.25% 정도"],
      ["2024-10-31", "동결 · 0.25% 정도"], ["2024-12-19", "동결 · 0.25% 정도"],
    ],
    bok: [
      ["2024-01-11", "동결 · 3.50%"], ["2024-02-22", "동결 · 3.50%"],
      ["2024-04-12", "동결 · 3.50%"], ["2024-05-23", "동결 · 3.50%"],
      ["2024-07-11", "동결 · 3.50%"], ["2024-08-22", "동결 · 3.50%"],
      ["2024-10-11", "0.25%p 인하 · 3.25%"], ["2024-11-28", "0.25%p 인하 · 3.00%"],
    ],
  };
  const bankNames = { fed: "연방준비제도(Fed)", ecb: "유럽중앙은행(ECB)", boj: "일본은행(BOJ)", bok: "한국은행(BOK)" };
  const meetingSelect = document.getElementById("cbvMeeting");
  const windowSelect = document.getElementById("cbvWindow");
  const capitalInput = document.getElementById("cbvCapital");
  const status = document.getElementById("cbvStatus");
  let selectedBank = "fed";
  let chart;
  let requestController;
  let currentPayload;

  const signed = (value) => `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(2)}%`;
  const won = (value) => `${Math.round(value).toLocaleString("ko-KR")}원`;
  const dailyReturns = (values) => values.slice(1).map((value, index) => value / values[index] - 1);
  const annualizedVolatility = (values) => {
    const returns = dailyReturns(values);
    if (returns.length < 2) return 0;
    const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
    const variance = returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (returns.length - 1);
    return Math.sqrt(variance) * Math.sqrt(252) * 100;
  };
  const dayDistance = (left, right) => Math.abs(new Date(`${left}T00:00:00Z`) - new Date(`${right}T00:00:00Z`));
  const setMovementClass = (element, value) => {
    element.classList.remove("is-up", "is-down");
    if (value > 0) element.classList.add("is-up");
    if (value < 0) element.classList.add("is-down");
  };

  function fillMeetings() {
    meetingSelect.innerHTML = meetings[selectedBank]
      .map(([date, decision]) => `<option value="${date}">${date.replaceAll("-", ".")} · ${decision}</option>`)
      .join("");
  }

  function updateDisplay(payload) {
    const windowSize = Number(windowSelect.value);
    const bars = payload.benchmark.bars;
    let anchorIndex = 0;
    bars.forEach((bar, index) => {
      if (dayDistance(bar.date, payload.meeting_date) < dayDistance(bars[anchorIndex].date, payload.meeting_date)) anchorIndex = index;
    });
    const start = anchorIndex - windowSize;
    const end = anchorIndex + windowSize;
    if (start < 0 || end >= bars.length) throw new Error("선택한 구간의 거래일 데이터가 부족합니다.");

    const sample = bars.slice(start, end + 1);
    const closes = sample.map((bar) => bar.close);
    const anchor = closes[windowSize];
    const normalized = closes.map((close) => Number((close / anchor * 100).toFixed(3)));
    const beforeVol = annualizedVolatility(closes.slice(0, windowSize + 1));
    const afterVol = annualizedVolatility(closes.slice(windowSize));
    const afterReturn = (closes.at(-1) / anchor - 1) * 100;
    const capital = Math.min(10000000000, Math.max(100000, Number(capitalInput.value) || 10000000));
    const finalValue = capital * (1 + afterReturn / 100);
    const decision = meetings[selectedBank].find(([date]) => date === payload.meeting_date)?.[1] || "정책 결정";
    const labels = sample.map((bar, index) => {
      const relativeDay = index - windowSize;
      return relativeDay === 0 ? "회의일" : `D${relativeDay > 0 ? "+" : ""}${relativeDay}`;
    });

    document.getElementById("cbvBeforeVol").textContent = `${beforeVol.toFixed(2)}%`;
    document.getElementById("cbvAfterVol").textContent = `${afterVol.toFixed(2)}%`;
    const volChange = document.getElementById("cbvVolChange");
    volChange.textContent = `회의 전보다 ${signed(afterVol - beforeVol)}`;
    setMovementClass(volChange, afterVol - beforeVol);
    const returnEl = document.getElementById("cbvAfterReturn");
    returnEl.textContent = signed(afterReturn);
    setMovementClass(returnEl, afterReturn);
    document.getElementById("cbvDecision").textContent = decision;
    document.getElementById("cbvFinalValue").textContent = won(finalValue);
    const profitEl = document.getElementById("cbvProfit");
    profitEl.textContent = `손익 ${afterReturn >= 0 ? "+" : "−"}${won(Math.abs(finalValue - capital))}`;
    setMovementClass(profitEl, afterReturn);
    document.getElementById("cbvBenchmark").textContent = `${payload.benchmark.name} (${payload.benchmark.symbol})`;
    document.getElementById("cbvRangeLabel").textContent = `${sample[0].date} — ${sample.at(-1).date}`;

    const options = {
      chart: { type: "area", height: 300, toolbar: { show: false }, animations: { enabled: true }, fontFamily: "inherit" },
      series: [{ name: `${payload.benchmark.name} 지수`, data: normalized }],
      colors: ["#2563eb"],
      stroke: { width: 3, curve: "smooth" },
      fill: { type: "gradient", gradient: { shadeIntensity: .2, opacityFrom: .32, opacityTo: .03, stops: [0, 95] } },
      markers: { size: 3, strokeWidth: 2, discrete: [{ seriesIndex: 0, dataPointIndex: windowSize, fillColor: "#0f9f79", strokeColor: "#fff", size: 7 }] },
      xaxis: { categories: labels, labels: { style: { colors: "#77859a", fontSize: "11px" }, hideOverlappingLabels: true }, axisBorder: { color: "#dfe7f2" }, axisTicks: { show: false } },
      yaxis: { labels: { formatter: (value) => value.toFixed(1), style: { colors: "#77859a" } } },
      dataLabels: { enabled: false },
      grid: { borderColor: "#e5ebf3", strokeDashArray: 4, padding: { left: 4, right: 10 } },
      tooltip: { custom: ({ series, seriesIndex, dataPointIndex }) => `<div style="padding:9px 11px"><b>${labels[dataPointIndex]}</b><br>${sample[dataPointIndex].date}<br>기준값 ${series[seriesIndex][dataPointIndex].toFixed(2)}</div>` },
      annotations: { xaxis: [{ x: "회의일", borderColor: "#0f9f79", strokeDashArray: 4, label: { text: "금리 결정", borderColor: "#0f9f79", style: { background: "#0f9f79", color: "#fff", fontSize: "10px" } } }] },
      legend: { show: false },
    };
    if (chart) chart.updateOptions(options, true, true);
    else if (window.ApexCharts) { chart = new ApexCharts(document.getElementById("cbvChart"), options); chart.render(); }
  }

  async function loadHistory() {
    requestController?.abort();
    requestController = new AbortController();
    status.className = "cbv-status";
    status.textContent = "시세 불러오는 중";
    const params = new URLSearchParams({ bank: selectedBank, meeting_date: meetingSelect.value, window: windowSelect.value });
    try {
      const response = await fetch(`/market/central-bank-event-history?${params}`, { signal: requestController.signal });
      if (!response.ok) throw new Error("과거 시세를 불러오지 못했습니다.");
      currentPayload = await response.json();
      updateDisplay(currentPayload);
      status.className = "cbv-status is-ready";
      status.textContent = "과거 시세 반영";
    } catch (error) {
      if (error.name === "AbortError") return;
      status.className = "cbv-status is-error";
      status.textContent = error.message;
    }
  }

  document.querySelectorAll("[data-cbv-bank]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedBank = button.dataset.cbvBank;
      document.querySelectorAll("[data-cbv-bank]").forEach((item) => item.setAttribute("aria-selected", String(item === button)));
      root.setAttribute("aria-label", `${bankNames[selectedBank]} 금리회의 변동성 시뮬레이터`);
      fillMeetings();
      loadHistory();
    });
  });
  meetingSelect.addEventListener("change", loadHistory);
  windowSelect.addEventListener("change", loadHistory);
  capitalInput.addEventListener("input", () => { if (currentPayload) updateDisplay(currentPayload); });
  fillMeetings();
  loadHistory();
})();
