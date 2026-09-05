(() => {
  "use strict";

  const storageKey = "domain-rag-click-history";
  const maxEntries = 1000;
  const maxTextLength = 160;

  const compactText = (value) => String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxTextLength);

  function describeTarget(target) {
    const element = target instanceof Element ? target : target?.parentElement;
    if (!element) return null;
    const actionable = element.closest("button, a, input, select, textarea, summary, [role='button'], [data-action], [data-lesson-toggle]") || element;
    const href = actionable instanceof HTMLAnchorElement ? actionable.href : "";
    return {
      tag: actionable.tagName.toLowerCase(),
      id: actionable.id || "",
      name: actionable.getAttribute("name") || "",
      role: actionable.getAttribute("role") || "",
      action: actionable.dataset.action || "",
      label: actionable.getAttribute("aria-label") || "",
      text: compactText(actionable.textContent),
      href,
    };
  }

  document.addEventListener("click", (event) => {
    if (!event.isTrusted) return;
    const target = describeTarget(event.target);
    if (!target) return;
    try {
      const history = JSON.parse(localStorage.getItem(storageKey) || "[]");
      const entries = Array.isArray(history) ? history : [];
      entries.push({
        timestamp: new Date().toISOString(),
        page: `${location.pathname}${location.search}`,
        target,
      });
      localStorage.setItem(storageKey, JSON.stringify(entries.slice(-maxEntries)));
    } catch (_) {
      // Storage can be disabled or full; clicking must continue to work.
    }
  }, true);
})();
