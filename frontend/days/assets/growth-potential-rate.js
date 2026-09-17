(() => {
  const modal = document.getElementById("bokRateTrendModal");
  const trigger = document.getElementById("bokRateTrendTrigger");
  const chartEl = document.getElementById("rateMarketOverviewChart");
  if (!modal || !trigger || !chartEl) return;

  let chart;
  let loaded = false;
  const rateChanges = [
    ["2024-09-05", 3.5],
    ["2024-10-11", 3.25],
    ["2024-11-28", 3.0],
    ["2025-02-25", 2.75],
    ["2025-05-29", 2.5],
    ["2026-07-16", 2.75],
    ["2026-08-27", 3.0],
  ].map(([date, value]) => ({ time: new Date(`${date}T00:00:00+09:00`).getTime(), value }));

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
  const renderChart = (data) => {
    if (!window.ApexCharts) return;
    const options = {
      chart: { type: "line", height: "100%", toolbar: { show: false }, animations: { enabled: false }, fontFamily: "inherit" },
      series: [
        { name: "한국은행 기준금리", data: baseRateSeries(data.kospi.bars) },
        { name: "KOSPI 20일 실현변동성", data: realizedVolatility(data.kospi.bars) },
        { name: "국고채10년 ETF 가격지수", data: priceIndex(data.bond_etf.bars) },
      ],
      colors: ["#2563eb", "#ef7d32", "#16805a"],
      stroke: { width: [3, 2.5, 2.5], curve: "straight" },
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
    };
    if (chart) chart.updateOptions(options, false, true);
    else {
      chart = new window.ApexCharts(chartEl, options);
      chart.render();
    }
  };
  const loadChart = async () => {
    if (loaded) return;
    chartEl.textContent = "차트 데이터를 불러오는 중입니다.";
    try {
      const response = await fetch("/market/rate-market-history?start=2024-09-05&end=2026-09-06");
      if (!response.ok) throw new Error("market history unavailable");
      renderChart(await response.json());
      loaded = true;
    } catch (_) {
      chartEl.textContent = "시세 데이터를 불러오지 못했습니다. 잠시 후 다시 열어 주세요.";
    }
  };
  const open = () => {
    modal.hidden = false;
    loadChart();
    modal.querySelector(".glossary-modal__close")?.focus();
  };
  const close = () => {
    if (modal.hidden) return;
    modal.hidden = true;
    trigger.focus();
  };
  trigger.addEventListener("click", open);
  modal.querySelectorAll("[data-bok-rate-close]").forEach((element) => element.addEventListener("click", close));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });
})();
