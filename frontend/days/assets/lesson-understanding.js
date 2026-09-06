(() => {
  if (document.body.dataset.day !== '1') return;

  const STORAGE_KEY = 'finance-rag:day-01-understanding:v1';
  const lessons = [...document.querySelectorAll('.lesson-list > .lesson')];
  if (!lessons.length) return;

  const loadScores = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
    } catch {
      return {};
    }
  };

  const scores = loadScores();
  const controls = new Map();

  const saveScores = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
    } catch {
      // 저장 공간이 차단된 환경에서도 체크 기능 자체는 계속 동작합니다.
    }
  };

  const update = (key, score) => {
    const control = controls.get(key);
    if (!control) return;
    control.buttons.forEach((button, index) => {
      const filled = index < score;
      button.classList.toggle('is-filled', filled);
      button.setAttribute('aria-pressed', String(filled));
      button.textContent = filled ? '✓' : '';
    });
    control.score.textContent = `${score}/5`;
    control.root.setAttribute('aria-label', `이해도 ${score}점, 5점 만점`);
  };

  lessons.forEach((lesson, index) => {
    const heading = lesson.querySelector(':scope > .lesson-content > h2');
    if (!heading) return;

    const sectionNumber = lesson.querySelector(':scope > span')?.textContent.trim() || String(index + 1);
    const title = heading.textContent.trim();
    const key = `${sectionNumber}:${title}`;
    const savedScore = Math.max(0, Math.min(5, Number(scores[key]) || 0));
    scores[key] = savedScore;

    const titleRow = document.createElement('div');
    titleRow.className = 'lesson-title-row';
    heading.before(titleRow);
    titleRow.append(heading);

    const root = document.createElement('div');
    root.className = 'lesson-understanding';
    root.setAttribute('role', 'group');

    const label = document.createElement('span');
    label.className = 'lesson-understanding__label';
    label.textContent = '이해도';
    root.append(label);

    const buttons = Array.from({ length: 5 }, (_, buttonIndex) => {
      const value = buttonIndex + 1;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'lesson-understanding__cell';
      button.setAttribute('aria-label', `${title} 이해도 ${value}점 선택`);
      button.title = `${value}점까지 체크`;
      button.addEventListener('click', () => {
        const nextScore = Number(scores[key]) === value ? 0 : value;
        scores[key] = nextScore;
        update(key, nextScore);
        saveScores();
      });
      root.append(button);
      return button;
    });

    const score = document.createElement('span');
    score.className = 'lesson-understanding__score';
    root.append(score);
    titleRow.append(root);
    controls.set(key, { root, buttons, score });
    update(key, savedScore);
  });

  saveScores();

  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return;
    const latest = loadScores();
    controls.forEach((_, key) => {
      const score = Math.max(0, Math.min(5, Number(latest[key]) || 0));
      scores[key] = score;
      update(key, score);
    });
  });
})();
