(() => {
  const panel = document.getElementById('theoryPanel');
  const open = document.getElementById('openTheoryPanel');
  const close = document.getElementById('closeTheoryPanel');
  const backdrop = (document.getElementById('offcanvasBackdrop') || document.getElementById('dayBackdrop'));
  const leftOpen = (document.getElementById('openLeftPanel') || document.getElementById('dayMenuButton'));
  const leftClose = (document.getElementById('closeLeftPanel') || document.getElementById('dayMenuClose'));
  function toggle(visible, restore = true) {
    if (visible && (document.body.classList.contains('left-panel-open') || document.getElementById('dayOffcanvas')?.classList.contains('is-open'))) leftClose.click();
    panel.inert = !visible;
    document.body.classList.toggle('right-panel-open', visible);
    backdrop.classList.toggle('visible', visible);
    backdrop.classList.toggle('theory-backdrop-open', visible);
    backdrop.setAttribute('aria-hidden', String(!visible));
    open.setAttribute('aria-expanded', String(visible));
    if (visible) close.focus();
    else if (restore) open.focus();
  }
  open.addEventListener('click', () => toggle(true));
  close.addEventListener('click', () => toggle(false));
  // Capture closes the right panel before the existing left-panel handler runs.
  leftOpen.addEventListener('click', () => {
    if (!panel.inert) toggle(false, false);
  }, true);
  backdrop.addEventListener('click', () => { if (!panel.inert) toggle(false); });
  document.addEventListener('keydown', event => {
    if (panel.inert) return;
    if (event.key === 'Escape') toggle(false);
    if (event.key === 'Tab') {
      const items = [...panel.querySelectorAll('a,button')];
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
})();
