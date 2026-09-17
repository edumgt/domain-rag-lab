(() => {
  const numberFrom = (element, fallback = 0) => {
    const parsed = Number(element?.value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const boundedValue = (element, minimum, maximum, fallback = minimum) => Math.min(maximum, Math.max(minimum, numberFrom(element, fallback)));
  const money = (amount) => `${Math.round(amount).toLocaleString("ko-KR")}원`;
  const signedMoney = (amount) => `${amount >= 0 ? "+" : "−"}${money(Math.abs(amount))}`;
  const signedPercent = (amount) => `${amount >= 0 ? "+" : "−"}${Math.abs(amount).toFixed(2)}%`;
  const chartRange = (change) => Math.max(2, Math.ceil(Math.abs(change) * 2) / 2);
  const chartPoints = (range) => {
    const step = range / 8;
    return Array.from({ length: 17 }, (_, index) => -range + index * step);
  };

  function bindValidatedInputs(definitions, render) {
    definitions.forEach(({ input, minimum, maximum, fallback = minimum, integer = false }) => {
      if (!input) return;
      input.addEventListener("input", render);
      const normalize = () => {
        let normalized = boundedValue(input, minimum, maximum, fallback);
        if (integer) normalized = Math.round(normalized);
        input.value = String(normalized);
        render();
      };
      input.addEventListener("change", normalize);
      input.addEventListener("blur", normalize);
    });
  }

  function modalController(modal, triggerSelector, closeSelector, render) {
    const triggers = document.querySelectorAll(triggerSelector);
    if (!modal || !triggers.length) return;
    let activeTrigger = triggers[0];
    const open = (trigger) => {
      activeTrigger = trigger;
      modal.hidden = false;
      render();
      modal.querySelector(".glossary-modal__close")?.focus();
    };
    const close = () => {
      if (modal.hidden) return;
      modal.hidden = true;
      activeTrigger?.focus();
    };
    triggers.forEach((trigger) => trigger.addEventListener("click", () => open(trigger)));
    modal.querySelectorAll(closeSelector).forEach((element) => element.addEventListener("click", close));
    document.addEventListener("keydown", (event) => { if (event.key === "Escape") close(); });
  }

  (() => {
    const modal = document.getElementById("mbsDurationSimModal");
    if (!modal) return;
    const priceInput = document.getElementById("mbsSimPrice");
    const durationInput = document.getElementById("mbsSimDuration");
    const prepayInput = document.getElementById("mbsSimPrepay");
    const changeInput = document.getElementById("mbsSimRateChange");
    const linearPriceEl = document.getElementById("mbsSimLinearPrice");
    const curvedPriceEl = document.getElementById("mbsSimCurvedPrice");
    const correctionEl = document.getElementById("mbsSimCorrection");
    const convexityEl = document.getElementById("mbsSimConvexity");
    const linearChangeEl = document.getElementById("mbsSimLinearChange");
    const curvedChangeEl = document.getElementById("mbsSimCurvedChange");
    const chartElement = document.getElementById("mbsDurationChart");
    let chart;

    function renderChart(price, duration, convexity, selectedChange) {
      if (!window.ApexCharts || !chartElement) return;
      const range = chartRange(selectedChange);
      const changes = chartPoints(range);
      const priceAt = (change, includeConvexity) => {
        const decimalChange = change / 100;
        return price * (1 - duration * decimalChange + (includeConvexity ? 0.5 * convexity * decimalChange ** 2 : 0));
      };
      const selectedPrice = priceAt(selectedChange, true);
      const options = {
        chart: { type: "line", height: 300, toolbar: { show: false }, animations: { enabled: false }, fontFamily: "inherit" },
        series: [
          { name: "듀레이션 반영 가치", data: changes.map((change) => ({ x: change, y: priceAt(change, false) })) },
          { name: "조기상환·음의 컨벡시티 반영", data: changes.map((change) => ({ x: change, y: priceAt(change, true) })) },
        ],
        colors: ["#64748b", "#d05a8c"],
        stroke: { width: [2, 3], dashArray: [6, 0], curve: "smooth" },
        markers: { size: 0 },
        xaxis: { type: "numeric", min: -range, max: range, tickAmount: 4, title: { text: "금리 변화폭 (%p) · 시간축 아님", style: { fontSize: "12px" } }, labels: { formatter: (value) => `${Number(value).toFixed(1)}%p` } },
        yaxis: { title: { text: "대출채권 반영 가치 (원)", style: { fontSize: "12px" } }, labels: { formatter: (value) => `${Math.round(value / 10000).toLocaleString("ko-KR")}만` } },
        grid: { borderColor: "#e2e8f0" },
        legend: { position: "top", horizontalAlign: "left", fontSize: "12px" },
        tooltip: { x: { formatter: (value) => `금리 ${Number(value).toFixed(2)}%p` }, y: { formatter: money } },
        annotations: { points: [{ x: selectedChange, y: selectedPrice, marker: { size: 5, fillColor: "#d05a8c", strokeColor: "#fff" }, label: { text: "음의 컨벡시티 반영", borderColor: "#d05a8c", style: { color: "#fff", background: "#d05a8c", fontSize: "11px" } } }] },
      };
      if (chart) chart.updateOptions(options, false, true);
      else { chart = new ApexCharts(chartElement, options); chart.render(); }
    }

    function render() {
      const price = boundedValue(priceInput, 1000, 1000000000, 10000000);
      const duration = boundedValue(durationInput, 0.1, 30, 4.5);
      const prepaySensitivity = boundedValue(prepayInput, 0, 3, 1.5);
      const rateChange = boundedValue(changeInput, -10, 10, -1);
      const convexity = -duration * (duration + 1) * prepaySensitivity;
      const decimalChange = rateChange / 100;
      const linearPrice = price * (1 - duration * decimalChange);
      const curvedPrice = price * (1 - duration * decimalChange + 0.5 * convexity * decimalChange ** 2);
      linearPriceEl.textContent = money(linearPrice);
      curvedPriceEl.textContent = money(curvedPrice);
      correctionEl.textContent = signedMoney(curvedPrice - linearPrice);
      convexityEl.textContent = convexity.toFixed(2).replace("-", "−");
      linearChangeEl.textContent = `가치 변화 ${signedPercent((linearPrice / price - 1) * 100)}`;
      curvedChangeEl.textContent = `가치 변화 ${signedPercent((curvedPrice / price - 1) * 100)}`;
      renderChart(price, duration, convexity, rateChange);
    }

    bindValidatedInputs([
      { input: priceInput, minimum: 1000, maximum: 1000000000, fallback: 10000000 },
      { input: durationInput, minimum: 0.1, maximum: 30, fallback: 4.5 },
      { input: prepayInput, minimum: 0, maximum: 3, fallback: 1.5 },
      { input: changeInput, minimum: -10, maximum: 10, fallback: -1 },
    ], render);
    modalController(modal, "[data-mbs-duration-trigger]", "[data-mbs-duration-close]", render);
  })();

  (() => {
    const modal = document.getElementById("liabilityDurationSimModal");
    if (!modal) return;
    const paymentInput = document.getElementById("liabilitySimPayment");
    const yearsInput = document.getElementById("liabilitySimYears");
    const changeInput = document.getElementById("liabilitySimRateChange");
    const currentPvEl = document.getElementById("liabilitySimCurrentPv");
    const durationEl = document.getElementById("liabilitySimDuration");
    const linearPvEl = document.getElementById("liabilitySimLinearPv");
    const convexPvEl = document.getElementById("liabilitySimConvexPv");
    const exactPvEl = document.getElementById("liabilitySimExactPv");
    const chartElement = document.getElementById("liabilityDurationChart");
    let chart;

    function liabilityStats(payment, years, ratePercent) {
      const rate = ratePercent / 100;
      if (1 + rate <= 0) return null;
      let presentValue = 0;
      let durationNumerator = 0;
      let convexityNumerator = 0;
      for (let year = 1; year <= years; year += 1) {
        const discountedPayment = payment / (1 + rate) ** year;
        presentValue += discountedPayment;
        durationNumerator += year * payment / (1 + rate) ** (year + 1);
        convexityNumerator += year * (year + 1) * payment / (1 + rate) ** (year + 2);
      }
      return {
        presentValue,
        duration: durationNumerator / presentValue,
        convexity: convexityNumerator / presentValue,
      };
    }

    function renderChart(payment, years, baseRate, stats, selectedChange) {
      if (!window.ApexCharts || !chartElement) return;
      const range = chartRange(selectedChange);
      const changes = chartPoints(range);
      const approximatePrice = (change, includeConvexity) => {
        const decimalChange = change / 100;
        return stats.presentValue * (1 - stats.duration * decimalChange + (includeConvexity ? 0.5 * stats.convexity * decimalChange ** 2 : 0));
      };
      const exactPrice = (change) => liabilityStats(payment, years, baseRate + change)?.presentValue ?? null;
      const selectedPrice = approximatePrice(selectedChange, true);
      const options = {
        chart: { type: "line", height: 300, toolbar: { show: false }, animations: { enabled: false }, fontFamily: "inherit" },
        series: [
          { name: "듀레이션 직선", data: changes.map((change) => ({ x: change, y: approximatePrice(change, false) })) },
          { name: "컨벡시티 보정", data: changes.map((change) => ({ x: change, y: approximatePrice(change, true) })) },
          { name: "현금흐름 재계산", data: changes.map((change) => ({ x: change, y: exactPrice(change) })) },
        ],
        colors: ["#64748b", "#7c3aed", "#0b9b72"],
        stroke: { width: [2, 3, 2], dashArray: [6, 0, 3], curve: "smooth" },
        markers: { size: 0 },
        xaxis: { type: "numeric", min: -range, max: range, tickAmount: 4, title: { text: "할인율 변화폭 (%p) · 시간축 아님", style: { fontSize: "12px" } }, labels: { formatter: (value) => `${Number(value).toFixed(1)}%p` } },
        yaxis: { title: { text: "부채 현재가치 (원)", style: { fontSize: "12px" } }, labels: { formatter: (value) => `${Math.round(value / 10000).toLocaleString("ko-KR")}만` } },
        grid: { borderColor: "#e2e8f0" },
        legend: { position: "top", horizontalAlign: "left", fontSize: "12px" },
        tooltip: { x: { formatter: (value) => `할인율 ${Number(value).toFixed(2)}%p 변화` }, y: { formatter: money } },
        annotations: { points: [{ x: selectedChange, y: selectedPrice, marker: { size: 5, fillColor: "#7c3aed", strokeColor: "#fff" }, label: { text: "컨벡시티 반영 가치", borderColor: "#7c3aed", style: { color: "#fff", background: "#7c3aed", fontSize: "11px" } } }] },
      };
      if (chart) chart.updateOptions(options, false, true);
      else { chart = new ApexCharts(chartElement, options); chart.render(); }
    }

    function render() {
      const payment = boundedValue(paymentInput, 1000, 1000000000, 12000000);
      const years = Math.round(boundedValue(yearsInput, 1, 80, 20));
      const baseRate = 3;
      const rateChange = boundedValue(changeInput, -10, 10, 1);
      const stats = liabilityStats(payment, years, baseRate);
      if (!stats) return;
      const decimalChange = rateChange / 100;
      const linearValue = stats.presentValue * (1 - stats.duration * decimalChange);
      const convexValue = stats.presentValue * (1 - stats.duration * decimalChange + 0.5 * stats.convexity * decimalChange ** 2);
      const exactValue = liabilityStats(payment, years, baseRate + rateChange)?.presentValue;
      currentPvEl.textContent = money(stats.presentValue);
      durationEl.textContent = `${stats.duration.toFixed(2)}년`;
      linearPvEl.textContent = money(linearValue);
      convexPvEl.textContent = money(convexValue);
      exactPvEl.textContent = exactValue == null ? "변경 할인율이 −100% 이하라 재계산 불가" : `현금흐름 재계산 ${money(exactValue)} · 컨벡시티 ${stats.convexity.toFixed(2)}`;
      renderChart(payment, years, baseRate, stats, rateChange);
    }

    bindValidatedInputs([
      { input: paymentInput, minimum: 1000, maximum: 1000000000, fallback: 12000000 },
      { input: yearsInput, minimum: 1, maximum: 80, fallback: 20, integer: true },
      { input: changeInput, minimum: -10, maximum: 10, fallback: 1 },
    ], render);
    modalController(modal, "[data-liability-duration-trigger]", "[data-liability-duration-close]", render);
  })();
})();
