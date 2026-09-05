(() => {
  "use strict";

  const selector = ".glossary-modal__dialog, .glossary-dialog, .auth-dialog, .atlas-magazine-sheet";
  const firstStepHints = {
    returnSimModal: "← 투자자 구분을 먼저 선택해 보세요",
    marginFlowModal: "← 초기 증거금을 먼저 입력해 보세요",
    dailySettlementModal: "← 정산 주체를 먼저 선택해 보세요",
    optionSettlementModal: "← 사례 선택을 먼저 해 보세요",
    futuresSettlementModal: "← 거래 대상을 먼저 선택해 보세요",
    orderMatchModal: "← 거래 대상을 먼저 선택해 보세요",
    inavSimModal: "← 시장가격 슬라이더를 먼저 움직여 보세요",
    gapTrackingSimModal: "← 현재 NAV와 시장가격을 먼저 입력해 보세요",
    fundManagerSimModal: "← 투자 원금을 먼저 입력해 보세요",
    lifeCycleSavingsModal: "← 생애주기 목표를 먼저 선택해 보세요",
    fundEtfCompareModal: "← 시작 금액을 먼저 입력해 보세요",
    etfCatalogModal: "← 브랜드 또는 ETF 이름을 먼저 선택·검색해 보세요",
    hedgeDiversificationModal: "← 시장 변동 슬라이더를 먼저 움직여 보세요",
    leverageDailySimModal: "← 첫째 날 기초지수 변동을 먼저 움직여 보세요",
    correlationSimModal: "← 상관계수 슬라이더를 먼저 움직여 보세요",
    bondDurationSimModal: "← 현재 채권 가격을 먼저 입력해 보세요",
    futuresPnlSimModal: "← 거래승수를 먼저 선택해 보세요",
    sharpeSimModal: "← 무위험수익률을 먼저 입력해 보세요",
    alphaBetaSimModal: "← 예시 시나리오를 먼저 선택해 보세요",
    pairTradingSimModal: "← 예시 시나리오를 먼저 선택해 보세요",
    koreanPairSimModal: "← 비교 페어를 먼저 선택해 보세요",
    hmmSimModal: "← 최근 수익률을 먼저 조절해 보세요",
  };

  function addFirstStepHints() {
    document.querySelectorAll(".glossary-modal__dialog, .glossary-dialog").forEach((dialog) => {
      if (dialog.dataset.firstStepHintReady === "true") return;
      const title = dialog.querySelector("h2");
      const hintText = firstStepHints[dialog.parentElement?.id];
      if (!title || !hintText) return;
      const hint = document.createElement("span");
      hint.className = "simulation-first-step";
      hint.textContent = hintText;
      const existingRow = title.closest(".return-sim-title-row, .simulation-title-row");
      if (existingRow) {
        existingRow.append(hint);
      } else {
        const row = document.createElement("div");
        row.className = "simulation-title-row";
        title.before(row);
        row.append(title, hint);
      }
      dialog.dataset.firstStepHintReady = "true";
    });
  }

  const hintStyle = document.createElement("style");
  hintStyle.textContent = `
    .simulation-title-row { display:flex; align-items:baseline; flex-wrap:wrap; gap:8px 14px; margin:0 48px 16px 0; }
    .simulation-title-row h2 { margin:0 !important; }
    .simulation-first-step { color:#dc2626; font:800 13px/1.45 inherit; white-space:nowrap; }
    .return-sim-title-row .simulation-first-step { color:#dc2626; font:800 13px/1.45 inherit; white-space:nowrap; }
    @media (max-width: 680px) { .simulation-title-row { align-items:flex-start; margin-right:38px; } .simulation-first-step { width:100%; white-space:normal; } }
  `;
  document.head.append(hintStyle);

  function fit(dialog) {
    if (dialog.closest("[hidden]")) return;
    dialog.style.setProperty("--modal-fit-scale", "1");
  }

  function schedule() {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      addFirstStepHints();
      document.querySelectorAll(selector).forEach(fit);
    }));
  }

  document.addEventListener("DOMContentLoaded", () => {
    schedule();
    new MutationObserver(schedule).observe(document.body, {
      attributes: true,
      attributeFilter: ["hidden", "class", "aria-hidden"],
      childList: true,
      subtree: true,
    });
    window.addEventListener("resize", schedule);
  });
})();
