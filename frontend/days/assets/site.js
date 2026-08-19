(function () {
  'use strict';

  const lessons = window.THEORY_DAYS || [];
  const day = Number(document.body.dataset.day || 0);
  const $app = document.getElementById('app');
  const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
  const fileFor = (number) => `${String(number).padStart(2, '0')}.html`;
  const nav = (active) => `<nav aria-label="5일 학습 목차"><a class="brand" href="index.html">5일 금융 이론</a><div class="day-nav">${lessons.map((item) => `<a class="${active === item.day ? 'active' : ''}" href="${fileFor(item.day)}"><b>${String(item.day).padStart(2, '0')}</b><span>${escapeHtml(item.title)}</span></a>`).join('')}</div></nav>`;
  const footer = '<footer>금융 교육용 콘텐츠입니다. 특정 상품의 매수·매도를 권유하지 않습니다.</footer>';

  function renderIndex() {
    $app.innerHTML = `${nav(0)}<section class="hero"><p class="eyebrow">5일 금융 이론</p><h1>상품 이해·<em>자산배분 설계</em></h1><p>하루 한 주제씩, 금융상품의 구조와 위험을 읽고 내 기준으로 비교하는 5일 학습입니다.</p></section><section class="curriculum">${lessons.map((item) => `<a class="day-card" href="${fileFor(item.day)}"><p>${String(item.day).padStart(2, '0')}</p><h2>${escapeHtml(item.title)}</h2><span>${escapeHtml(item.subtitle)}</span><strong>학습 시작 →</strong></a>`).join('')}</section>${footer}`;
  }

  function renderDay(lesson) {
    if (!lesson) { renderIndex(); return; }
    const next = lessons.find((item) => item.day === lesson.day + 1);
    const previous = lessons.find((item) => item.day === lesson.day - 1);
    $app.innerHTML = `${nav(lesson.day)}<article><header class="lesson-head"><p class="eyebrow">${String(lesson.day).padStart(2, '0')} / 05</p><h1>${escapeHtml(lesson.title)}</h1><p>${escapeHtml(lesson.subtitle)}</p></header><section class="goal"><p>오늘의 학습 목표</p><strong>${escapeHtml(lesson.goal)}</strong></section><section class="keywords"><p>핵심 단어</p><div>${lesson.keywords.map((word) => `<span>${escapeHtml(word)}</span>`).join('')}</div></section><section class="lesson-list">${lesson.lessons.map(([heading, paragraphs, visual], index) => `<section class="lesson"><span>${String(index + 1).padStart(2, '0')}</span><div class="lesson-content"><h2>${escapeHtml(heading)}</h2><div class="lesson-body">${paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}${visual ? `<figure class="lesson-visual"><img src="${escapeHtml(visual.src)}" alt="${escapeHtml(visual.alt)}" loading="lazy"><figcaption>${escapeHtml(visual.caption)} <a href="${escapeHtml(visual.sourceHref)}" target="_blank" rel="noopener noreferrer">공식 화면 도움말 보기</a></figcaption></figure>` : ''}</div></div><button class="lesson-toggle" type="button" data-lesson-toggle aria-expanded="true" aria-label="${escapeHtml(heading)} 내용 접기" title="내용 접기"><span aria-hidden="true">⌃</span></button></section>`).join('')}</section><aside class="check"><p>오늘의 확인</p><strong>${escapeHtml(lesson.check)}</strong></aside><div class="pager">${previous ? `<a href="${fileFor(previous.day)}">← ${String(previous.day).padStart(2, '0')}</a>` : '<span></span>'}${next ? `<a href="${fileFor(next.day)}">${String(next.day).padStart(2, '0')} →</a>` : '<a href="index.html">목차로 돌아가기 →</a>'}</div></article>${footer}`;
    $app.querySelectorAll('[data-lesson-toggle]').forEach((button) => {
      button.addEventListener('click', () => {
        const section = button.closest('.lesson');
        const collapsed = section.classList.toggle('is-collapsed');
        button.setAttribute('aria-expanded', String(!collapsed));
        button.setAttribute('aria-label', collapsed ? '내용 펼치기' : '내용 접기');
        button.title = collapsed ? '내용 펼치기' : '내용 접기';
      });
    });
  }

  day ? renderDay(lessons.find((item) => item.day === day)) : renderIndex();
}());
