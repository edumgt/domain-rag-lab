(function () {
  'use strict';

  async function fetchJson(url, validate) {
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(typeof data.detail === 'string' ? data.detail : '검증을 실행하지 못했습니다.');
    }
    if (!validate(data)) throw new Error('검증 결과 형식이 올바르지 않습니다.');
    return data;
  }

  const root = document.getElementById('walkForwardLab');
  window.WalkForwardLab.mount(root, fetchJson);
  root.querySelector('.wf-hero').id = 'wfOverview';
  root.querySelector('.wf-setup-intro').id = 'wfSetup';
  const resultArea = document.createElement('section');
  resultArea.id = 'wfResultArea';
  resultArea.setAttribute('aria-label', '검증 실행 상태와 결과');
  const status = root.querySelector('#wfStatus');
  status.before(resultArea);
  resultArea.append(status, root.querySelector('#wfResults'));
  const empty = document.createElement('p');
  empty.className = 'wf-result-empty';
  empty.textContent = '시뮬레이션을 실행하면 폴드별 성능 지표와 위험 경보 상세 결과가 여기에 표시됩니다.';
  root.querySelector('#wfResults').append(empty);

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
  const content = document.getElementById('wfContent');
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
