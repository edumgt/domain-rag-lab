/**
 * Domain RAG AI Agent — Vanilla JS Frontend
 * Handles: domain selection, file upload, text ingest, chat, references
 */

(function () {
  'use strict';

  /* ── State ─────────────────────────────────────────────────── */
  const state = {
    domain: 'medical',
    sessionId: crypto.randomUUID(),
    topK: 4,
    loading: false,
    chatHistory: [],   // { role, content, chunks }
  };

  const DOMAIN_META = {
    medical: { label: '🏥 의학 전문', badge: 'medical', examples: [
      '고혈압의 1차 치료 원칙은 무엇인가요?',
      '당뇨병 진단 기준을 설명해 주세요.',
      '심근경색의 주요 증상은 무엇인가요?',
      'ACE 억제제의 작용 기전은?',
    ]},
    english: { label: '📖 고교 영어', badge: 'english', examples: [
      'What is the difference between "since" and "for"?',
      '관계대명사 that과 which의 차이를 설명해 주세요.',
      'Subjunctive mood examples for high school.',
      '수능 영어 빈칸 추론 전략을 알려주세요.',
    ]},
    general: { label: '🌐 일반', badge: 'general', examples: [
      '이 시스템은 어떻게 동작하나요?',
      '등록된 문서 목록을 보여주세요.',
      'RAG란 무엇인가요?',
    ]},
  };

  /* ── DOM refs ───────────────────────────────────────────────── */
  const $messages       = document.getElementById('messages');
  const $questionInput  = document.getElementById('questionInput');
  const $sendBtn        = document.getElementById('sendBtn');
  const $domainBadge    = document.getElementById('domainBadge');
  const $currentLabel   = document.getElementById('currentDomainLabel');
  const $topKLabel      = document.getElementById('topKLabel');
  const $refList        = document.getElementById('refList');
  const $uploadArea     = document.getElementById('uploadArea');
  const $fileInput      = document.getElementById('fileInput');
  const $uploadTrigger  = document.getElementById('uploadTrigger');
  const $uploadStatus   = document.getElementById('uploadStatus');
  const $ingestTextBtn  = document.getElementById('ingestTextBtn');
  const $textDocId      = document.getElementById('textDocId');
  const $textTitle      = document.getElementById('textTitle');
  const $textContent    = document.getElementById('textContent');
  const $clearChatBtn   = document.getElementById('clearChatBtn');
  const $quickExamples  = document.getElementById('quickExamples');

  /* ── Domain switcher ────────────────────────────────────────── */
  document.querySelectorAll('.domain-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.domain-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.domain = btn.dataset.domain;
      updateDomainUI();
    });
  });

  function updateDomainUI() {
    const meta = DOMAIN_META[state.domain];
    $domainBadge.textContent  = meta.label;
    $domainBadge.className    = `domain-badge ${meta.badge === 'medical' ? '' : meta.badge}`;
    $currentLabel.textContent = meta.label.replace(/^.{2}/, '').trim();

    // Refresh quick examples
    $quickExamples.innerHTML = `<p class="examples-label">빠른 예시:</p>` +
      meta.examples.map(q =>
        `<button class="example-chip" data-q="${escHtml(q)}">${escHtml(q)}</button>`
      ).join('');
    $quickExamples.querySelectorAll('.example-chip').forEach(chip => {
      chip.addEventListener('click', () => sendQuestion(chip.dataset.q));
    });
  }

  /* ── Clear chat ─────────────────────────────────────────────── */
  $clearChatBtn.addEventListener('click', () => {
    state.chatHistory = [];
    state.sessionId   = crypto.randomUUID();
    $messages.innerHTML = '';
    $refList.innerHTML  = '<p class="ref-empty">질문 후 참고 문서가 여기에 표시됩니다.</p>';
    showWelcome();
  });

  function showWelcome() {
    const meta = DOMAIN_META[state.domain];
    const html = `
      <div class="welcome-msg">
        <div class="welcome-icon"><i class="fa-solid fa-robot"></i></div>
        <h2>도메인 특화 RAG AI 에이전트</h2>
        <p>왼쪽에서 도메인을 선택하고 문서를 등록한 뒤 질문해 보세요.</p>
        <div class="quick-examples" id="quickExamples">
          <p class="examples-label">빠른 예시</p>
          ${meta.examples.map(q => `<button class="example-chip" data-q="${escHtml(q)}">${escHtml(q)}</button>`).join('')}
        </div>
      </div>`;
    $messages.innerHTML = html;
    $messages.querySelectorAll('.example-chip').forEach(chip => {
      chip.addEventListener('click', () => sendQuestion(chip.dataset.q));
    });
  }

  /* ── Chat input ─────────────────────────────────────────────── */
  $questionInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      triggerSend();
    }
  });
  $questionInput.addEventListener('input', () => {
    $questionInput.style.height = 'auto';
    $questionInput.style.height = Math.min($questionInput.scrollHeight, 120) + 'px';
  });
  $sendBtn.addEventListener('click', triggerSend);

  function triggerSend() {
    const q = $questionInput.value.trim();
    if (!q || state.loading) return;
    $questionInput.value = '';
    $questionInput.style.height = 'auto';
    sendQuestion(q);
  }

  async function sendQuestion(question) {
    if (state.loading) return;
    clearWelcome();

    appendMessage('user', question);
    const typingId = appendTyping();

    state.loading = true;
    setInputDisabled(true);

    try {
      const res = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          domain: state.domain,
          top_k: state.topK,
          session_id: state.sessionId,
        }),
      });

      removeTyping(typingId);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        appendMessage('bot', `⚠️ 오류: ${err.detail || res.statusText}`);
        return;
      }

      const data = await res.json();
      appendMessage('bot', data.answer, data.references || []);
      updateRefPanel(data.references || []);
    } catch (err) {
      removeTyping(typingId);
      appendMessage('bot', `⚠️ 네트워크 오류: ${err.message}`);
    } finally {
      state.loading = false;
      setInputDisabled(false);
      $questionInput.focus();
    }
  }

  /* ── Message rendering ──────────────────────────────────────── */
  function appendMessage(role, content, chunks = []) {
    const isUser = role === 'user';
    const id = 'msg-' + Date.now();
    const time = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

    const refBtnHtml = (!isUser && chunks.length)
      ? `<button class="ref-btn" data-msgid="${id}"><i class="fa-solid fa-paperclip"></i> 참고 ${chunks.length}건</button>`
      : '';

    const html = `
      <div class="msg ${role}" id="${id}">
        <div class="msg-avatar">${isUser ? '<i class="fa-solid fa-user"></i>' : '<i class="fa-solid fa-robot"></i>'}</div>
        <div>
          <div class="msg-bubble">${formatContent(content)}</div>
          <div class="msg-meta">
            <span>${time}</span>
            ${refBtnHtml}
          </div>
        </div>
      </div>`;

    $messages.insertAdjacentHTML('beforeend', html);

    if (chunks.length) {
      const btn = document.getElementById(id).querySelector('.ref-btn');
      btn && btn.addEventListener('click', () => updateRefPanel(chunks));
    }

    scrollToBottom();

    state.chatHistory.push({ role, content, chunks });
  }

  function appendTyping() {
    const id = 'typing-' + Date.now();
    const html = `
      <div class="msg bot" id="${id}">
        <div class="msg-avatar"><i class="fa-solid fa-robot"></i></div>
        <div class="msg-bubble">
          <div class="typing-dots"><span></span><span></span><span></span></div>
        </div>
      </div>`;
    $messages.insertAdjacentHTML('beforeend', html);
    scrollToBottom();
    return id;
  }

  function removeTyping(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  function clearWelcome() {
    const welcome = $messages.querySelector('.welcome-msg');
    if (welcome) welcome.remove();
  }

  function formatContent(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
  }

  function scrollToBottom() {
    $messages.scrollTop = $messages.scrollHeight;
  }

  /* ── Reference panel ────────────────────────────────────────── */
  function updateRefPanel(chunks) {
    if (!chunks || !chunks.length) {
      $refList.innerHTML = '<p class="ref-empty">참고 문서가 없습니다.</p>';
      return;
    }

    $refList.innerHTML = chunks.map((c, i) => `
      <div class="ref-card">
        <div class="ref-card-title">${i + 1}. ${escHtml(c.title || '제목 없음')}</div>
        <span class="ref-card-score">유사도 ${(c.score * 100).toFixed(1)}%</span>
        <div class="ref-card-content">${escHtml(c.content || '')}</div>
      </div>`).join('');
  }

  /* ── File upload ────────────────────────────────────────────── */
  $uploadTrigger.addEventListener('click', () => $fileInput.click());
  $uploadArea.addEventListener('click', (e) => {
    if (e.target === $uploadArea || e.target.classList.contains('upload-icon')) $fileInput.click();
  });
  $uploadArea.addEventListener('dragover', e => { e.preventDefault(); $uploadArea.classList.add('drag-over'); });
  $uploadArea.addEventListener('dragleave', () => $uploadArea.classList.remove('drag-over'));
  $uploadArea.addEventListener('drop', e => {
    e.preventDefault();
    $uploadArea.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  });
  $fileInput.addEventListener('change', () => {
    if ($fileInput.files[0]) handleFileUpload($fileInput.files[0]);
    $fileInput.value = '';
  });

  async function handleFileUpload(file) {
    const allowed = file.name.toLowerCase().endsWith('.txt') || file.name.toLowerCase().endsWith('.pdf');
    if (!allowed) {
      showUploadStatus('error', '⚠️ TXT 또는 PDF 파일만 지원합니다.');
      return;
    }

    showUploadStatus('loading', `⏳ "${escHtml(file.name)}" 업로드 중…`);

    const form = new FormData();
    form.append('file', file);
    form.append('domain', state.domain);

    try {
      const res = await fetch('/ingest/file', { method: 'POST', body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showUploadStatus('error', `❌ 오류: ${err.detail || res.statusText}`);
        return;
      }
      const data = await res.json();
      showUploadStatus('success',
        `✅ "${escHtml(data.title)}" 등록 완료 (${data.chunks}개 청크, 도메인: ${data.domain})`
      );
    } catch (err) {
      showUploadStatus('error', `❌ 네트워크 오류: ${err.message}`);
    }
  }

  /* ── Text ingest ────────────────────────────────────────────── */
  $ingestTextBtn.addEventListener('click', async () => {
    const docId   = $textDocId.value.trim();
    const title   = $textTitle.value.trim();
    const content = $textContent.value.trim();

    if (!docId || !title || !content) {
      showUploadStatus('error', '⚠️ 문서 ID, 제목, 내용을 모두 입력하세요.');
      return;
    }

    $ingestTextBtn.disabled = true;
    showUploadStatus('loading', '⏳ 등록 중…');

    try {
      const res = await fetch('/ingest/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id: docId, title, content, domain: state.domain }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showUploadStatus('error', `❌ 오류: ${err.detail || res.statusText}`);
        return;
      }

      const data = await res.json();
      showUploadStatus('success', `✅ "${escHtml(data.document_id)}" 등록 완료 (${data.chunks}개 청크)`);
      $textDocId.value = $textTitle.value = $textContent.value = '';
    } catch (err) {
      showUploadStatus('error', `❌ 네트워크 오류: ${err.message}`);
    } finally {
      $ingestTextBtn.disabled = false;
    }
  });

  /* ── Helpers ────────────────────────────────────────────────── */
  function showUploadStatus(type, msg) {
    $uploadStatus.className = `upload-status ${type}`;
    $uploadStatus.innerHTML = msg;
    $uploadStatus.classList.remove('hidden');
    if (type === 'success') setTimeout(() => $uploadStatus.classList.add('hidden'), 5000);
  }

  function setInputDisabled(disabled) {
    $sendBtn.disabled        = disabled;
    $questionInput.disabled  = disabled;
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ── Init ───────────────────────────────────────────────────── */
  updateDomainUI();
  $topKLabel.textContent = state.topK;

})();
