(() => {
  const list = document.querySelector('#documentList');
  const search = document.querySelector('#documentSearch');
  const count = document.querySelector('#documentCount');
  const title = document.querySelector('#documentTitle');
  const meta = document.querySelector('#documentMeta');
  const content = document.querySelector('#documentContent');
  let documents = [];
  let selectedFilename = '';

  function escapeHtml(value) {
    return value.replace(/[&<>'"]/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
    })[character]);
  }

  function renderList() {
    const query = search.value.trim().toLowerCase();
    const visible = documents.filter(document => (
      `${document.title} ${document.filename}`.toLowerCase().includes(query)
    ));
    count.textContent = `총 ${documents.length}개 중 ${visible.length}개 문서`;
    list.innerHTML = visible.map(document => `
      <button class="document-link${document.filename === selectedFilename ? ' active' : ''}" type="button" data-filename="${escapeHtml(document.filename)}">
        <strong>${escapeHtml(document.title)}</strong>
        <small>${escapeHtml(document.filename)}</small>
      </button>
    `).join('') || '<p class="no-results">검색 결과가 없습니다.</p>';
    list.querySelectorAll('[data-filename]').forEach(button => {
      button.addEventListener('click', () => selectDocument(button.dataset.filename));
    });
  }

  async function selectDocument(filename) {
    selectedFilename = filename;
    renderList();
    title.textContent = '학습 문서를 불러오는 중입니다.';
    meta.textContent = filename;
    content.innerHTML = '<p class="empty-state">원본 TXT 전체를 HTML 화면으로 불러오는 중입니다.</p>';
    history.replaceState(null, '', `?doc=${encodeURIComponent(filename)}`);

    try {
      const response = await fetch(`/learning/documents/${encodeURIComponent(filename)}`);
      if (!response.ok) throw new Error('문서를 불러오지 못했습니다.');
      const document = await response.json();
      title.textContent = document.title;
      meta.textContent = `${document.filename} · 원본 TXT 전체 표시`;
      // pre-wrap keeps every line, table, code sample, and Markdown marker from the source visible.
      content.innerHTML = `<pre>${escapeHtml(document.content)}</pre>`;
      document.title = `${document.title} | 전체 학습 자료`;
    } catch (error) {
      title.textContent = '문서를 불러오지 못했습니다.';
      content.innerHTML = `<p class="error-state">${escapeHtml(error.message)} 페이지를 새로고침한 뒤 다시 시도하세요.</p>`;
    }
  }

  async function init() {
    try {
      const response = await fetch('/learning/documents');
      if (!response.ok) throw new Error('문서 목록을 불러오지 못했습니다.');
      documents = await response.json();
      const requested = new URLSearchParams(location.search).get('doc');
      const initial = documents.find(document => document.filename === requested) || documents[0];
      renderList();
      if (initial) await selectDocument(initial.filename);
      else content.innerHTML = '<p class="empty-state">등록된 TXT 학습 자료가 없습니다.</p>';
    } catch (error) {
      count.textContent = '문서 목록을 불러오지 못했습니다.';
      content.innerHTML = `<p class="error-state">${escapeHtml(error.message)}</p>`;
    }
  }

  search.addEventListener('input', renderList);
  init();
})();
