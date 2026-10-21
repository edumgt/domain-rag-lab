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
      if (target.getClientRects().length && target.getBoundingClientRect().top <= top + 80) current = link;
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
  let assignments = [];
  const labels = ['팀1', '팀2', '김정', 'CKS', 'OTH', 'LSH(이상하)', 'KIJ', 'LSH(이세현)'];
  function element(tag, text, className) {
    const node = document.createElement(tag);
    node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  async function request(path, options) {
    const response = await fetch('/presentation/' + path, {cache: 'no-store', ...options});
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(typeof data.detail === 'string' ? data.detail : '요청에 실패했습니다. 잠시 후 다시 시도해주세요.');
    }
    return response.json();
  }
  let orderLocked = false;
  async function loadOrder(randomize = false) {
    const status = document.getElementById('orderStatus');
    const button = document.getElementById('reloadOrder');
    button.disabled = true;
    if (randomize) status.textContent = '발표 순서를 새로 추첨하는 중입니다.';
    try {
      const data = await request(randomize ? 'order/randomize' : 'order', randomize ? {method: 'POST'} : undefined);
      orderLocked = data.locked;
      button.textContent = orderLocked ? '최종 확정 (3/3)' : '랜덤 (' + data.clicks + '/3 · 남은 ' + data.remaining + '회)';
      assignments = [...data.assignments].sort((a, b) => a.order - b.order);
      const cards = document.getElementById('presenterCards');
      cards.replaceChildren();
      assignments.forEach(person => {
        const card = element('article', '', 'presenter-card');
        card.append(element('span', '발표 순서', 'video-note'), element('strong', String(person.order).padStart(2, '0'), 'order-number'), element('h3', person.label));
        cards.append(card);
      });
      status.textContent = (orderLocked ? '최종 확정 · ' : '추첨 ' + data.clicks + '/3회 · ') + '진행 순서: ' + [...assignments].sort((a, b) => a.order - b.order).map(p => p.order + '. ' + p.label).join(' → ');
    } catch (error) {
      if (randomize) await loadOrder(false);
      status.textContent = (randomize ? status.textContent + ' · ' : '') + error.message;
    }
    finally { button.disabled = orderLocked; }
  }
  document.getElementById('reloadOrder').addEventListener('click', () => loadOrder(true));
  const identityWarning = document.getElementById('identityWarning');
  let identityFocusTarget;
  identityWarning.addEventListener('close', () => { if (identityFocusTarget) identityFocusTarget.focus(); });
  function validateIdentity(form) {
    const team = form.elements.presenter_id;
    const author = form.elements.author;
    const missingTeam = !team.value;
    const missingAuthor = !author.value.trim();
    if (!missingTeam && !missingAuthor) return true;
    identityFocusTarget = missingTeam ? team : author;
    const nameLabel = form.id === 'surveyForm' ? '평가자 이름' : '작성자 이름';
    document.getElementById('identityWarningText').textContent = missingTeam && missingAuthor
      ? '팀을 선택하고 ' + nameLabel + '을 입력한 후 진행해주세요.'
      : missingTeam ? '팀을 선택한 후 진행해주세요.' : nameLabel + '을 입력한 후 진행해주세요.';
    if (!identityWarning.open) identityWarning.showModal();
    return false;
  }
  const surveySelect = document.getElementById('surveyPresenter');
  labels.forEach((label, i) => surveySelect.add(new Option(label, String(i + 1))));
  let surveyBuilt = false;
  let surveyRequestId = 0;
  async function loadSurvey() {
    const requestId = ++surveyRequestId;
    const status = document.getElementById('surveyStatus');
    const summary = document.getElementById('surveySummary');
    summary.textContent = '집계를 불러오는 중입니다.';
    try {
      const data = await request('survey?presenter_id=' + (surveySelect.value || '1'));
      if (requestId !== surveyRequestId) return;
      if (!surveyBuilt) {
        const questions = document.getElementById('surveyQuestions');
        questions.replaceChildren();
        data.questions.forEach(question => {
          const fieldset = element('fieldset', '', 'survey-question');
          fieldset.append(element('legend', question.id + '. ' + question.category));
          const columns = element('div', '', 'survey-question-columns');
          const copy = element('div', '', 'survey-question-copy');
          copy.append(element('p', question.text));
          const guide = element('div', '', 'survey-rubric');
          guide.id = 'rubric-q' + question.id;
          guide.append(element('p', '무엇을 보나요? ' + question.guidance, 'rubric-guidance'), element('p', '쉬운 예시: ' + question.example, 'rubric-example'));
          const standards = element('ol', '', 'rubric-ratings');
          question.ratings.forEach((description, i) => {
            const item = document.createElement('li');
            item.append(element('strong', (i + 1) + '점 · ' + data.scale[i] + ': '), document.createTextNode(description));
            standards.append(item);
          });
          guide.append(standards); copy.append(guide);
          const options = element('div', '', 'survey-options');
          [4,3,2,1,0].forEach(index => {
            const label = data.scale[index];
            const choice = document.createElement('label');
            const input = document.createElement('input');
            input.setAttribute('aria-describedby', guide.id);
            input.type = 'radio'; input.name = 'q' + question.id; input.value = String(index + 1); input.required = true;
            choice.append(input, element('span', (index + 1) + '. ' + label));
            options.append(choice);
          });
          const answerColumn = element('div', '', 'survey-answer-column');
          answerColumn.append(element('h4', '평가 점수 선택'), options);
          columns.append(copy, answerColumn); fieldset.append(columns); questions.append(fieldset);
        });
        surveyBuilt = true;
        document.getElementById('submitSurvey').disabled = false;
      }
      if (!surveySelect.value) { summary.textContent = '팀을 선택하면 해당 팀의 집계를 확인할 수 있습니다.'; return; }
      summary.replaceChildren();
      summary.append(element('p', labels[data.presenter_id - 1] + ' · 응답 ' + data.count + '건 · 전체 평균 ' + (data.overall_mean === null ? '응답 없음' : data.overall_mean.toFixed(2) + ' / 5 (높을수록 우수)')));
      data.questions.forEach((question, i) => {
        const row = element('div', '', 'survey-summary-row');
        row.append(element('span', question.id + '. ' + question.category), element('strong', data.means[i] === null ? '—' : data.means[i].toFixed(2) + ' / 5'));
        summary.append(row);
      });
    } catch (error) {
      if (requestId !== surveyRequestId) return;
      status.textContent = '설문·집계를 불러오지 못했습니다. ' + error.message;
      summary.textContent = '집계 확인 불가 · 새로고침해주세요.';
    }
  }
  const surveyQuestions = document.getElementById('surveyQuestions');
  surveyQuestions.addEventListener('click', event => {
    if (!validateIdentity(document.getElementById('surveyForm'))) event.preventDefault();
  });
  surveyQuestions.addEventListener('keydown', event => {
    if ([' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key) && !validateIdentity(document.getElementById('surveyForm'))) event.preventDefault();
  });
  surveySelect.addEventListener('change', () => {
    document.querySelectorAll('#surveyQuestions input').forEach(input => { input.checked = false; });
    document.querySelector('#surveyForm [name=evidence]').value = '';
    document.getElementById('surveyStatus').textContent = '';
    loadSurvey();
  });
  document.getElementById('reloadSurvey').addEventListener('click', loadSurvey);
  document.getElementById('surveyForm').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget, button = document.getElementById('submitSurvey');
    if (!validateIdentity(form) || !form.reportValidity()) return;
    const fields = new FormData(form), status = document.getElementById('surveyStatus');
    const payload = {presenter_id: Number(fields.get('presenter_id')), author: fields.get('author'), evidence: fields.get('evidence'), scores: Array.from({length:10}, (_, i) => Number(fields.get('q' + (i + 1))))};
    button.disabled = true; surveySelect.disabled = true;
    try {
      await request('survey', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
      document.querySelectorAll('#surveyQuestions input').forEach(input => { input.checked = false; });
      form.elements.evidence.value = '';
      status.textContent = '10문항 평가와 주관식 의견이 함께 저장되었습니다.';
      await loadSurvey();
      await loadEvaluations();
    } catch (error) { status.textContent = error.message; }
    finally { button.disabled = false; surveySelect.disabled = false; }
  });
  let evaluationData;
  const metricSelect = document.getElementById('evaluationMetric');
  const teamSelect = document.getElementById('evaluationPresenter');
  labels.forEach((label, i) => teamSelect.add(new Option(label, String(i + 1))));
  const pieColors = ['#fb7185', '#fbbf24', '#818cf8', '#38bdf8', '#10b981'];
  function pieChart(label, mean, distribution, count) {
    const total = distribution.reduce((sum, value) => sum + value, 0);
    const card = element('article', '', 'evaluation-pie-card');
    card.append(element('h4', label));
    const visual = element('div', '', 'pie-visual');
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 128 128'); svg.setAttribute('class', 'evaluation-pie');
    svg.setAttribute('role', 'group'); svg.setAttribute('aria-label', label + ' · 1~5단계 응답 비율');
    const track = document.createElementNS(ns, 'circle');
    [['cx','64'],['cy','64'],['r','46'],['fill','none'],['stroke','var(--border)'],['stroke-width','18']].forEach(([key,value]) => track.setAttribute(key,value));
    svg.append(track);
    const center = element('div', '', 'pie-center');
    const centerValue = element('strong', mean === null ? '—' : mean.toFixed(2));
    const centerLabel = element('span', total ? '평균 / 5' : '평가 없음');
    center.append(centerValue, centerLabel);
    const reset = () => { centerValue.textContent = mean === null ? '—' : mean.toFixed(2); centerLabel.textContent = total ? '평균 / 5' : '평가 없음'; };
    const details = element('details', '', 'pie-details'); details.append(element('summary', '응답 분포 · ' + total + '개'));
    const list = element('ul', '', 'pie-distribution');
    let offset = 0;
    distribution.forEach((value, i) => {
      const percentage = total ? value / total * 100 : 0;
      const text = (i+1) + '. ' + evaluationData.scale[i] + ' · ' + value + '개' + (total ? ' (' + percentage.toFixed(1) + '%)' : '');
      const item = element('li', text); item.style.setProperty('--slice-color', pieColors[i]); list.append(item);
      if (!value) return;
      const circle = document.createElementNS(ns, 'circle');
      const circumference = 2 * Math.PI * 46, length = value / total * circumference;
      [['cx','64'],['cy','64'],['r','46'],['fill','none'],['stroke',pieColors[i]],['stroke-width','18'],['stroke-dasharray',length + ' ' + (circumference-length)],['stroke-dashoffset',String(-offset)],['transform','rotate(-90 64 64)'],['tabindex','0'],['role','img'],['aria-label',text],['class','pie-slice']].forEach(([key,val]) => circle.setAttribute(key,val));
      const title = document.createElementNS(ns,'title');title.textContent = text;circle.append(title);
      const highlight = () => { centerValue.textContent = percentage.toFixed(1) + '%'; centerLabel.textContent = (i+1) + '. ' + evaluationData.scale[i]; };
      circle.addEventListener('mouseenter',highlight);circle.addEventListener('focus',highlight);
      circle.addEventListener('mouseleave',reset);circle.addEventListener('blur',reset);
      circle.addEventListener('click', () => { details.open = true; highlight(); });
      circle.addEventListener('keydown',event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); details.open = !details.open; } });
      svg.append(circle);offset += length;
    });
    details.append(list);
    visual.append(svg,center);card.append(visual,element('p', '평가 ' + count + '건' + (total ? ' · 응답 ' + total + '개' : ''), 'pie-caption'),details);
    return card;
  }
  function renderEvaluations() {
    if (!evaluationData) return;
    const teamChart = document.getElementById('teamEvaluationChart');
    const questionChart = document.getElementById('questionEvaluationChart');
    teamChart.replaceChildren(); questionChart.replaceChildren();
    evaluationData.teams.forEach(team => {
      const overall = metricSelect.value === 'overall';
      const distribution = overall ? team.distribution.reduce((sum,row) => sum.map((value,i) => value + row[i]), [0,0,0,0,0]) : team.distribution[Number(metricSelect.value)];
      teamChart.append(pieChart(team.label, overall ? team.overall_mean : team.means[Number(metricSelect.value)], distribution, team.count));
    });
    const selected = evaluationData.teams.find(team => team.presenter_id === Number(teamSelect.value));
    evaluationData.questions.forEach((question, i) => questionChart.append(pieChart(question.id + '. ' + question.category, selected.means[i], selected.distribution[i], selected.count)));
    const ranking = document.getElementById('teamRankingBody');ranking.replaceChildren();
    evaluationData.ranking.forEach(team => {
      const row = document.createElement('tr');
      if (team.rank !== null && team.rank <= 3) row.className = 'ranking-top ranking-place-' + team.rank;
      row.append(element('td',team.rank === null ? '미평가' : team.rank + '위'), element('th',team.label), element('td',team.overall_mean === null ? '—' : team.overall_mean.toFixed(2)), element('td',team.count + '건'));
      row.querySelector('th').scope = 'row';ranking.append(row);
    });
    renderTeamComments();
  }
  const commentTeamFilter = document.getElementById('commentTeamFilter');
  const commentSearch = document.getElementById('commentSearch');
  labels.forEach((label, i) => commentTeamFilter.add(new Option(label, String(i + 1))));
  function renderTeamComments() {
    if (!evaluationData) return;
    const comments = document.getElementById('evaluationComments'); comments.replaceChildren();
    const search = commentSearch.value.trim().toLocaleLowerCase();
    const teams = evaluationData.teams.filter(team => commentTeamFilter.value === 'all' || String(team.presenter_id) === commentTeamFilter.value);
    let matches = 0;
    teams.forEach(team => {
      const entries = team.comments.filter(comment => !search || [team.label, comment.author, comment.content].some(text => text.toLocaleLowerCase().includes(search)));
      if (search && !entries.length) return;
      matches += entries.length;
      const section = element('section', '', 'team-comment-section');
      section.append(element('h4', team.label + ' · 주관식 의견 ' + team.comment_count + '건', 'team-comment-title'), element('p', '평가 응답 ' + team.count + '건 · 설문 의견 미작성 ' + team.evidence_missing_count + '건', 'video-note'));
      section.append(element('h5', '객관식 설문 집계', 'team-result-subtitle'));
      const tableWrap = element('div', '', 'team-result-table-wrap');
      const table = document.createElement('table'); table.className = 'team-result-table';
      table.append(element('caption', team.label + ' · 10문항 · 높을수록 우수'));
      const thead = document.createElement('thead'), headRow = document.createElement('tr');
      ['문항', '평균', ...evaluationData.scale.map((label,i) => (i+1) + ' ' + label)].forEach(label => { const th=element('th',label);th.scope='col';headRow.append(th); });
      thead.append(headRow);table.append(thead);
      const tbody = document.createElement('tbody');
      evaluationData.questions.forEach((q,i) => {
        const row=document.createElement('tr'), heading=element('th',q.id + '. ' + q.category);heading.scope='row';row.append(heading);
        row.append(element('td',team.means[i]===null ? '평가 없음' : team.means[i].toFixed(2)));
        team.distribution[i].forEach(count => row.append(element('td',team.count ? count + '건 (' + (count/team.count*100).toFixed(1) + '%)' : '—')));
        tbody.append(row);
      });
      table.append(tbody);tableWrap.append(table);section.append(tableWrap,element('h5','주관식 상세 의견','team-result-subtitle'));
      if (!entries.length) section.append(element('p', '등록된 주관식 의견이 없습니다.', 'video-note'));
      entries.forEach((comment, i) => {
        const card = element('article', '', 'evaluation-comment');
        const header = element('div', '', 'evaluation-comment-header');
        header.append(element('h5', (i + 1) + '. 평가자: ' + comment.author), element('span', comment.source, 'evaluation-comment-source'));
        const timestamp = document.createElement('time');timestamp.dateTime = comment.created_at;
        timestamp.textContent = '작성 시각: ' + new Date(comment.created_at).toLocaleString('ko-KR', {timeZone:'Asia/Seoul'}) + ' KST';
        card.append(header, timestamp, element('p', comment.content, 'evaluation-comment-content'));
        section.append(card);
      });
      comments.append(section);
    });
    if (search && !matches) comments.append(element('p', '검색 조건에 맞는 의견이 없습니다.', 'video-note'));
  }
  commentTeamFilter.addEventListener('change', renderTeamComments);
  commentSearch.addEventListener('input', renderTeamComments);

  async function loadEvaluations() {
    const status = document.getElementById('evaluationStatus');
    const button = document.getElementById('reloadEvaluations'); button.disabled = true;
    status.textContent = '평가 결과를 불러오는 중입니다.';
    try {
      evaluationData = await request('evaluations');
      if (metricSelect.options.length === 1) evaluationData.questions.forEach((q, i) => metricSelect.add(new Option(q.category, String(i))));
      status.textContent = '총 평가 ' + evaluationData.count + '건 · 8팀 · 조회 ' + new Date(evaluationData.updated_at).toLocaleString('ko-KR', {timeZone:'Asia/Seoul'}) + ' KST';
      renderEvaluations();
    } catch (error) { status.textContent = '평가 결과를 불러오지 못했습니다. ' + error.message; }
    finally { button.disabled = false; }
  }
  metricSelect.addEventListener('change', renderEvaluations);
  teamSelect.addEventListener('change', renderEvaluations);
  document.getElementById('reloadEvaluations').addEventListener('click', loadEvaluations);
  document.getElementById('downloadEvaluationReport').addEventListener('click', async () => {
    const button = document.getElementById('downloadEvaluationReport');
    const status = document.getElementById('evaluationStatus');
    button.disabled = true; button.textContent = 'PDF 생성 중…';
    try {
      const response = await fetch('/presentation/evaluations/report.pdf', {cache:'no-store'});
      if (!response.ok) throw new Error('보고서 생성에 실패했습니다. 잠시 후 다시 시도해주세요.');
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a'); link.href = url;
      link.download = '프로젝트_수행결과_평가보고서_20261001-20261021.pdf';
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      status.textContent = 'PDF 보고서를 다운로드했습니다. 보고서에는 다운로드 시점의 집계가 반영됩니다.';
    } catch (error) { status.textContent = error.message; }
    finally { button.disabled = false; button.textContent = 'PDF 다운로드'; }
  });
  loadEvaluations();
  loadSurvey();
  if (links.some(link => link.hash === location.hash)) {
    document.querySelector(location.hash).scrollIntoView({ block: 'start' });
  }
  loadOrder();
})();
