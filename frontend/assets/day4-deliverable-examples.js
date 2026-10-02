(() => {
  'use strict';
  const schedule = document.getElementById('day4ProjectSchedule');
  if (!schedule) return;
  const sources = {
  "charter": {
    "title": "프로젝트 헌장 문서",
    "source": "https://www.atlassian.com/software/confluence/templates/project-charter",
    "original": "https://images.ctfassets.net/xjcz23wx147q/5VQXNNMz1Ia1r8lenWQTfn/b5d5907e6b94baf1c50dbc98f08d0712/3_Project_Charter_Template.png",
    "file": "charter.png"
  },
  "timeline": {
    "title": "WBS·일정 계획",
    "source": "https://www.atlassian.com/software/jira/templates/project-management-templates",
    "original": "https://images.ctfassets.net/xjcz23wx147q/3T5jipSx3VFu9ampiEXu5Y/8700fb24af9b761d1d7dccafbcb95af8/Project_20management_20-_20Timeline_20view_2x.png",
    "file": "timeline.png"
  },
  "board": {
    "title": "칸반·백로그·결함 관리",
    "source": "https://www.atlassian.com/software/jira/templates/project-management-templates",
    "original": "https://images.ctfassets.net/xjcz23wx147q/4scmnWZGlEx8aaBptzGNWL/98eb515524b10740c70be4a78c8ef3b1/Screen_Board.png",
    "file": "board.png"
  },
  "backtest": {
    "title": "백테스트·성과 대시보드",
    "source": "https://www.quantconnect.com/docs/v2/local-platform/backtesting/results",
    "original": "https://cdn.quantconnect.com/i/tu/backtest-result-page-top.png",
    "file": "backtest.png"
  },
  "metrics": {
    "title": "성과지표·검증 결과",
    "source": "https://www.quantconnect.com/docs/v2/local-platform/backtesting/results",
    "original": "https://cdn.quantconnect.com/i/tu/run-time-statistics-2023.png",
    "file": "metrics.png"
  },
  "code": {
    "title": "전략·분석 코드",
    "source": "https://www.quantconnect.com/docs/v2/local-platform/backtesting/results",
    "original": "https://cdn.quantconnect.com/i/tu/backtest-results-project-files.png",
    "file": "code.png"
  },
  "ci": {
    "title": "CI/CD 실행 흐름",
    "source": "https://docs.github.com/en/actions/about-github-actions/understanding-github-actions",
    "original": "https://docs.github.com/assets/cb-25535/images/help/actions/overview-actions-simple.png",
    "file": "ci.png"
  },
  "api": {
    "title": "Swagger API 명세",
    "source": "https://fastapi.tiangolo.com/tutorial/first-steps/",
    "original": "https://raw.githubusercontent.com/fastapi/fastapi/master/docs/en/docs/img/index/index-01-swagger-ui-simple.png",
    "file": "api.png"
  },
  "architecture": {
    "title": "AI 서비스 아키텍처",
    "source": "https://medium.com/@shmilysyg/deploy-ai-services-with-a-rest-api-combining-local-llms-and-openai-services-a35fb7f3779e",
    "original": "https://miro.medium.com/v2/1%2AFhJjbsn_mE-HeXTaWfSRlQ.png",
    "file": "architecture.png"
  },
  "requirements": {
    "title": "요구사항 정의서",
    "source": "https://www.atlassian.com/software/confluence/templates/product-requirements",
    "original": "https://images.ctfassets.net/xjcz23wx147q/4qzDGNX0ulu03UndfHrBRc/c6a4e30b952097cb29e10c0e6e4f3956/product-requirements-preview-en.png",
    "file": "requirements.png"
  },
  "report": {
    "title": "실험·검증 보고서",
    "source": "https://www.atlassian.com/software/confluence/templates/experiment-plan-and-results",
    "original": "https://images.ctfassets.net/xjcz23wx147q/4U279wYTAlaVEZkzWsU04Y/02218b416deb6aa8c7033da136ae4e46/experiment-plan-and-results-preview-en.png",
    "file": "report.png"
  },
  "design": {
    "title": "화면 설계·디자인 시스템",
    "source": "https://www.atlassian.com/software/confluence/templates/design-system",
    "original": "https://images.ctfassets.net/xjcz23wx147q/2yDXBqzm7hIjiQqAQdInFs/02a14eaaae47f298d066ff3954372d32/design-system-preview-en.png",
    "file": "design.png"
  },
  "shap": {
    "title": "SHAP 설명 차트",
    "source": "https://shap.readthedocs.io/en/stable/example_notebooks/api_examples/plots/beeswarm.html",
    "original": "https://shap.readthedocs.io/en/stable/_images/example_notebooks_api_examples_plots_beeswarm_3_0.png",
    "file": "shap.png"
  }
};
  const assetRoot = new URL('deliverable-examples/', document.currentScript.src);
  // Match the deliverable itself, rather than the task or project title.
  const rules = [
    [/SHAP|XAI|説明|설명 가능성/, 'shap'],
    [/WBS|작업계획|일정|스프린트 계획/, 'timeline'],
    [/백로그|칸반|결함|리스크|의사결정/, 'board'],
    [/CI|CD|릴리스 빌드|배포본|운영 배포|복구|런북/, 'ci'],
    [/아키텍처|구성도|ERD|스키마|인덱스|파이프라인|데이터마트/, 'architecture'],
    [/API|어댑터|서비스|엔진|연동본/, 'api'],
    [/성과지표|계산서|대사표|KPI/, 'metrics'],
    [/차트|대시보드|패턴 시각화|성과 비교|리밸런싱 UI|배분 UI|리포트|관제 화면|모의.*화면/, 'backtest'],
    [/와이어프레임|IA|UI|화면|사용자 스토리|사용성/, 'design'],
    [/코드|모듈|스캐폴드|빌드|모델$|재현 패키지/, 'code'],
    [/시험|테스트|검증|보고서|결과|평가셋|실험|벤치마크|최적화/, 'report'],
    [/요구사항|명세|규격|사전|목록|인벤토리|기준|규칙|정책|체크리스트|분류체계|가드레일|SLA/, 'requirements']
  ];
  const chooseExample = (name) => sources[(rules.find(([pattern]) => pattern.test(name)) || [null, 'charter'])[1]];
  const dialog = document.createElement('dialog');
  dialog.className = 'deliverable-example-dialog';
  dialog.setAttribute('aria-labelledby', 'deliverableExampleTitle');
  dialog.innerHTML = `<header class="deliverable-example-header"><div><p class="deliverable-example-context"></p><h2 id="deliverableExampleTitle"></h2></div><button type="button" class="deliverable-example-close" aria-label="산출물 예시 닫기" autofocus>닫기 ×</button></header><div class="deliverable-example-body"><p class="deliverable-example-description"></p><figure><img alt=""><figcaption></figcaption></figure><p class="deliverable-example-error" role="status" hidden>이미지를 불러오지 못했습니다. 아래 원문 출처에서 예시를 확인해 주세요.</p><nav class="deliverable-example-links" aria-label="예시 이미지 참고 링크"><a class="deliverable-example-source" target="_blank" rel="noopener noreferrer">원문 출처 ↗</a><a class="deliverable-example-google" target="_blank" rel="noopener noreferrer">이 산출물 구글 이미지 검색 ↗</a></nav></div>`;
  document.body.append(dialog);
  const image = dialog.querySelector('img');
  const error = dialog.querySelector('.deliverable-example-error');
  let opener;
  let previousOverflow;
  image.addEventListener('error', () => { image.hidden = true; error.hidden = false; });
  dialog.querySelector('.deliverable-example-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.style.overflow = previousOverflow;
    opener?.focus({ preventScroll: true });
  });
  schedule.addEventListener('click', (event) => {
    const button = event.target.closest('[data-deliverable-example]');
    if (!button) return;
    const name = button.dataset.deliverableExample;
    const example = chooseExample(name);
    const row = button.closest('tr');
    const column = [...button.closest('td').parentElement.children].indexOf(button.closest('td'));
    const role = button.closest('table').querySelectorAll('thead th')[column].textContent;
    dialog.querySelector('h2').textContent = name + ' · 예시 이미지';
    dialog.querySelector('.deliverable-example-context').textContent = row.querySelector('th b').textContent + ' / ' + row.children[1].querySelector('b').textContent + ' / ' + role;
    dialog.querySelector('.deliverable-example-description').textContent = '참고 유형: ' + example.title + '. 공개된 유사 산출물의 형식 예시입니다. 실제 제출 시에는 현재 프로젝트의 요구사항·데이터·검증 결과로 작성하세요.';
    image.hidden = false;
    error.hidden = true;
    image.alt = name + ' 작성에 참고할 ' + example.title + ' 예시';
    image.src = new URL(example.file, assetRoot).href;
    dialog.querySelector('figcaption').textContent = example.title + ' · 출처: ' + new URL(example.source).hostname + ' · 이미지 권리는 원저작자에게 있습니다.';
    dialog.querySelector('.deliverable-example-source').href = example.source;
    dialog.querySelector('.deliverable-example-google').href = 'https://www.google.com/search?tbm=isch&q=' + encodeURIComponent(name + ' 예시 example');
    opener = button;
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
  });
  schedule.querySelectorAll('tbody td small').forEach((cell) => {
    if (!cell.textContent.startsWith('산출물 · ')) return;
    const names = cell.textContent.slice('산출물 · '.length).split('·').map((name) => name.trim()).filter(Boolean);
    cell.replaceChildren(document.createTextNode('산출물 · '));
    names.forEach((name, index) => {
      if (index) cell.append(document.createTextNode(' · '));
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'deliverable-example-button';
      button.dataset.deliverableExample = name;
      button.setAttribute('aria-haspopup', 'dialog');
      button.setAttribute('aria-label', name + ' 예시 이미지 보기');
      button.textContent = name;
      cell.append(button);
    });
  });
  const hint = document.createElement('p');
  hint.className = 'deliverable-example-hint';
  hint.textContent = '산출물 이름을 클릭하면 유형별 예시 이미지가 열립니다. 모달에서 원문 출처와 해당 산출물의 구글 이미지 검색도 확인할 수 있습니다.';
  schedule.querySelector('.project-schedule-role-guide').before(hint);
})();
