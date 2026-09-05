(() => {
  const button = document.querySelector('#dayMenuButton');
  const panel = document.querySelector('#dayOffcanvas');
  const backdrop = document.querySelector('#dayBackdrop');
  const closeButton = document.querySelector('#dayMenuClose');
  if (!button || !panel || !backdrop || button.dataset.menuBound === 'true') return;
  button.dataset.menuBound = 'true';
  const close = () => {
    panel.classList.remove('is-open');
    backdrop.classList.remove('is-open');
    button.setAttribute('aria-expanded', 'false');
  };
  button.addEventListener('click', () => {
    const open = panel.classList.toggle('is-open');
    backdrop.classList.toggle('is-open', open);
    button.setAttribute('aria-expanded', String(open));
  });
  closeButton?.addEventListener('click', close);
  backdrop.addEventListener('click', close);
  panel.addEventListener('click', (event) => {
    if (event.target.closest('a')) close();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });
})();
