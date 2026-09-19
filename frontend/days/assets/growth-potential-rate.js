(() => {
  const modal = document.getElementById("bokRateTrendModal");
  const trigger = document.getElementById("bokRateTrendTrigger");
  const chartEl = document.getElementById("rateMarketOverviewChart");
  const viewButtons = [...document.querySelectorAll("[data-rate-view]")];
  const shockControl = document.getElementById("rateShockControl");
  const shockInput = document.getElementById("rateShockInput");
  const shockOutput = document.getElementById("rateShockOutput");
  const historyEvents = document.getElementById("rateHistoryEvents");
  const historyNote = document.getElementById("rateHistoryNote");
  const scenarioNote = document.getElementById("rateScenarioNote");
  if (!modal || !trigger || !chartEl || !shockControl || !shockInput || !shockOutput) return;

  let chart;
  let historyData;
  let activeView = "history";
  let loading = false;
  const rateChanges = [
    ["2024-09-05", 3.5],
    ["2024-10-11", 3.25],
    ["2024-11-28", 3.0],
    ["2025-02-25", 2.75],
    ["2025-05-29", 2.5],
    ["2026-07-16", 2.75],
    ["2026-08-27", 3.0],
  ].map(([date, value]) => ({ time: new Date(`${date}T00:00:00+09:00`).getTime(), value }));
  const assetSensitivity = [
    { name: "장기 성장주", coefficient: -12 },
    { name: "가치·배당주", coefficient: -5 },
    { name: "장기 고정금리채", coefficient: -8 },
    { name: "단기채", coefficient: -2 },
    { name: "상장 리츠", coefficient: -7 },
    { name: "금", coefficient: -3 },
    { name: "현금성 자산", coefficient: 0.8 },
  ];

  const standardDeviation = (values) => {
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length);
  };
  const realizedVolatility = (bars) => bars.map((bar, index) => {
    if (index < 20) return { x: bar.time, y: null };
    const returns = bars.slice(index - 20, index + 1).slice(1)
      .map((item, offset) => Math.log(item.close / bars[index - 20 + offset].close));
    return { x: bar.time, y: Number((standardDeviation(returns) * Math.sqrt(252) * 100).toFixed(2)) };
  });
  const baseRateSeries = (bars) => bars.map((bar) => {
    const applicable = rateChanges.filter((change) => change.time <= bar.time).at(-1) || rateChanges[0];
    return { x: bar.time, y: applicable.value };
  });
  const priceIndex = (bars) => {
    const firstClose = bars[0].close;
    return bars.map((bar) => ({ x: bar.time, y: Number((bar.close / firstClose * 100).toFixed(2)) }));
  };
  const replaceChart = (options) => {
    if (!window.ApexCharts) return;
    chart?.destroy();
    chartEl.textContent = "";
    chart = new window.ApexCharts(chartEl, options);
    chart.render();
  };
  const renderHistory = () => {
    if (!historyData) return;
    replaceChart({
      chart: { type: "line", height: "100%", toolbar: { show: true, tools: { download: true, selection: false, zoom: true, zoomin: true, zoomout: true, pan: true, reset: true } }, animations: { enabled: false }, fontFamily: "inherit" },
      series: [
        { name: "한국은행 기준금리", data: baseRateSeries(historyData.kospi.bars) },
        { name: "KOSPI 20일 실현변동성", data: realizedVolatility(historyData.kospi.bars) },
        { name: "국고채10년 ETF 가격지수", data: priceIndex(historyData.bond_etf.bars) },
      ],
      colors: ["#2563eb", "#ef7d32", "#16805a"],
      stroke: { width: [3, 2.5, 2.5], curve: "straight" },
      markers: { size: 0, hover: { size: 4 } },
      xaxis: { type: "datetime", labels: { datetimeUTC: false, format: "yy.MM" } },
      yaxis: [
        { seriesName: "한국은행 기준금리", min: 2.25, max: 3.75, tickAmount: 3, title: { text: "기준금리 (%)" }, labels: { formatter: (value) => `${value.toFixed(2)}%` } },
        { seriesName: "KOSPI 20일 실현변동성", opposite: true, title: { text: "변동성 (%)" }, labels: { formatter: (value) => `${value.toFixed(0)}%` } },
        { seriesName: "국고채10년 ETF 가격지수", opposite: true, offsetX: 50, title: { text: "가격지수" }, labels: { formatter: (value) => value.toFixed(0) } },
      ],
      tooltip: { shared: true, x: { format: "yyyy.MM.dd" }, y: { formatter: (value, { seriesIndex }) => value == null ? "—" : seriesIndex < 2 ? `${value.toFixed(2)}%` : value.toFixed(2) } },
      legend: { position: "top", horizontalAlign: "left", fontSize: "12px" },
      grid: { borderColor: "#dbe4f2", padding: { right: 58 } },
      noData: { text: "차트 데이터를 불러오는 중입니다." },
    });
    chartEl.parentElement?.setAttribute("aria-label", "최근 2년의 한국은행 기준금리, KOSPI 실현변동성, 국고채10년 ETF 가격지수 비교 차트");
  };
  const renderScenario = () => {
    const shock = Number(shockInput.value);
    shockOutput.value = `${shock > 0 ? "+" : ""}${shock.toFixed(2)}%p`;
    const data = assetSensitivity.map(({ name, coefficient }) => {
      const value = Number((coefficient * shock).toFixed(2));
      return { x: name, y: value, fillColor: value >= 0 ? "#16805a" : "#d94c4c" };
    });
    const largestMove = Math.max(...data.map(({ y }) => Math.abs(y)));
    const axisBound = Math.max(5, Math.ceil((largestMove + 1) / 5) * 5);
    replaceChart({
      chart: { type: "bar", height: "100%", toolbar: { show: false }, animations: { enabled: false }, fontFamily: "inherit", foreColor: "#526783", parentHeightOffset: 0 },
      series: [{ name: "가정 가치 변화", data }],
      plotOptions: { bar: { horizontal: true, distributed: true, borderRadius: 5, barHeight: "58%", dataLabels: { position: "center" } } },
      dataLabels: {
        enabled: true,
        formatter: (value) => `${value > 0 ? "+" : ""}${value.toFixed(1)}%`,
        style: { fontSize: "12px", fontWeight: 800, colors: ["#17345f"] },
        background: { enabled: true, foreColor: "#17345f", borderRadius: 4, padding: 4, opacity: 0.94, borderWidth: 1, borderColor: "#d8e2f0" },
      },
      xaxis: {
        min: -axisBound,
        max: axisBound,
        tickAmount: 4,
        title: { text: "금리 충격만 반영한 교육용 가치 변화 가정 (%)", style: { color: "#344c70", fontSize: "12px", fontWeight: 700 } },
        labels: { formatter: (value) => `${value.toFixed(0)}%`, style: { fontSize: "11px" } },
        axisBorder: { color: "#cdd9e9" },
        axisTicks: { color: "#cdd9e9" },
      },
      yaxis: { labels: { minWidth: 100, maxWidth: 150, style: { colors: "#203d68", fontSize: "13px", fontWeight: 700 } } },
      annotations: { xaxis: [{ x: 0, borderColor: "#64748b", strokeDashArray: 0 }] },
      tooltip: { y: { formatter: (value) => `${value > 0 ? "+" : ""}${value.toFixed(2)}% (가정)` } },
      legend: { show: false },
      grid: { borderColor: "#dbe4f2", strokeDashArray: 3, padding: { left: 12, right: 24, top: 4, bottom: 0 } },
    });
    chartEl.parentElement?.setAttribute("aria-label", `기준금리 ${shockOutput.value} 충격에 따른 자산별 교육용 민감도 시뮬레이션 차트`);
  };
  const loadHistory = async () => {
    if (historyData || loading) {
      if (historyData && activeView === "history") renderHistory();
      return;
    }
    loading = true;
    chartEl.textContent = "차트 데이터를 불러오는 중입니다.";
    try {
      const response = await fetch("/market/rate-market-history?start=2024-09-05&end=2026-09-06");
      if (!response.ok) throw new Error("market history unavailable");
      historyData = await response.json();
      if (activeView === "history") renderHistory();
    } catch (_) {
      if (activeView === "history") chartEl.textContent = "시세 데이터를 불러오지 못했습니다. 잠시 후 다시 열어 주세요.";
    } finally {
      loading = false;
    }
  };
  const setView = (view) => {
    activeView = view;
    viewButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.rateView === view)));
    shockControl.hidden = view !== "scenario";
    if (historyEvents) historyEvents.hidden = view !== "history";
    if (historyNote) historyNote.hidden = view !== "history";
    if (scenarioNote) scenarioNote.hidden = view !== "scenario";
    if (view === "scenario") renderScenario();
    else loadHistory();
  };
  const open = () => {
    modal.hidden = false;
    setView(activeView);
    modal.querySelector(".glossary-modal__close")?.focus();
  };
  const close = () => {
    if (modal.hidden) return;
    modal.hidden = true;
    trigger.focus();
  };

  viewButtons.forEach((button) => button.addEventListener("click", () => setView(button.dataset.rateView)));
  shockInput.addEventListener("input", () => {
    if (activeView === "scenario") renderScenario();
  });
  trigger.addEventListener("click", open);
  modal.querySelectorAll("[data-bok-rate-close]").forEach((element) => element.addEventListener("click", close));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });
})();
