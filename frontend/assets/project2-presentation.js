(function () {
  'use strict';
  const panel = document.getElementById('learningPanel');
  const open = document.getElementById('openLeftPanel');
  const close = document.getElementById('closeLeftPanel');
  const backdrop = document.getElementById('offcanvasBackdrop');
  open.setAttribute('aria-expanded', 'false');
  function togglePanel(visible) {
    panel.inert = !visible;
    document.body.classList.toggle('left-panel-open', visible);
    backdrop.classList.toggle('visible', visible);
    backdrop.setAttribute('aria-hidden', String(!visible));
    open.setAttribute('aria-expanded', String(visible));
    (visible ? close : open).focus();
  }
  open.addEventListener('click', () => togglePanel(true));
  close.addEventListener('click', () => togglePanel(false));
  backdrop.addEventListener('click', () => togglePanel(false));
  document.addEventListener('keydown', event => {
    if (!document.body.classList.contains('left-panel-open')) return;
    if (event.key === 'Escape') togglePanel(false);
    if (event.key === 'Tab') {
      const items = [...panel.querySelectorAll('a, button')];
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });

  const links = [...document.querySelectorAll('.wf-lnb a')];
  const content = document.getElementById('presentationContent');
  function updateNavigation() {
    const top = content.getBoundingClientRect().top;
    let current = links[0];
    for (const link of links) {
      const target = document.querySelector(link.hash);
      if (target.getBoundingClientRect().top <= top + 80) current = link;
    }
    links.forEach(link => {
      if (link === current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  content.addEventListener('scroll', updateNavigation, { passive: true });
  links.forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    const target = document.querySelector(link.hash);
    target.setAttribute('tabindex', '-1');
    target.scrollIntoView({ block: 'start' });
    target.focus({ preventScroll: true });
    history.replaceState(null, '', link.hash);
  }));
  if (links.some(link => link.hash === location.hash)) {
    document.querySelector(location.hash).scrollIntoView({ block: 'start' });
  }
})();
