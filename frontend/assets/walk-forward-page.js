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

  window.WalkForwardLab.mount(document.getElementById('walkForwardLab'), fetchJson);
})();
