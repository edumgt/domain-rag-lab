(() => {
  'use strict';
  const schedule = document.getElementById('day4ProjectSchedule');
  if (!schedule) return;
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const sample = window.Day4DeliverableSamples;
  if (!sample) return;
  const references = {"charter": {"title": "프로젝트 헌장 문서", "source": "https://www.atlassian.com/software/confluence/templates/project-charter", "original": "https://images.ctfassets.net/xjcz23wx147q/5VQXNNMz1Ia1r8lenWQTfn/b5d5907e6b94baf1c50dbc98f08d0712/3_Project_Charter_Template.png", "file": "charter.png"}, "timeline": {"title": "WBS·일정 계획", "source": "https://www.atlassian.com/software/jira/templates/project-management-templates", "original": "https://images.ctfassets.net/xjcz23wx147q/3T5jipSx3VFu9ampiEXu5Y/8700fb24af9b761d1d7dccafbcb95af8/Project_20management_20-_20Timeline_20view_2x.png", "file": "timeline.png"}, "board": {"title": "칸반·백로그·결함 관리", "source": "https://www.atlassian.com/software/jira/templates/project-management-templates", "original": "https://images.ctfassets.net/xjcz23wx147q/4scmnWZGlEx8aaBptzGNWL/98eb515524b10740c70be4a78c8ef3b1/Screen_Board.png", "file": "board.png"}, "backtest": {"title": "백테스트·성과 대시보드", "source": "https://www.quantconnect.com/docs/v2/local-platform/backtesting/results", "original": "https://cdn.quantconnect.com/i/tu/backtest-result-page-top.png", "file": "backtest.png"}, "metrics": {"title": "성과지표·검증 결과", "source": "https://www.quantconnect.com/docs/v2/local-platform/backtesting/results", "original": "https://cdn.quantconnect.com/i/tu/run-time-statistics-2023.png", "file": "metrics.png"}, "code": {"title": "전략·분석 코드", "source": "https://www.quantconnect.com/docs/v2/local-platform/backtesting/results", "original": "https://cdn.quantconnect.com/i/tu/backtest-results-project-files.png", "file": "code.png"}, "ci": {"title": "CI/CD 실행 흐름", "source": "https://docs.github.com/en/actions/about-github-actions/understanding-github-actions", "original": "https://docs.github.com/assets/cb-25535/images/help/actions/overview-actions-simple.png", "file": "ci.png"}, "api": {"title": "Swagger API 명세", "source": "https://fastapi.tiangolo.com/tutorial/first-steps/", "original": "https://raw.githubusercontent.com/fastapi/fastapi/master/docs/en/docs/img/index/index-01-swagger-ui-simple.png", "file": "api.png"}, "architecture": {"title": "AI 서비스 아키텍처", "source": "https://medium.com/@shmilysyg/deploy-ai-services-with-a-rest-api-combining-local-llms-and-openai-services-a35fb7f3779e", "original": "https://miro.medium.com/v2/1%2AFhJjbsn_mE-HeXTaWfSRlQ.png", "file": "architecture.png"}, "requirements": {"title": "요구사항 정의서", "source": "https://www.atlassian.com/software/confluence/templates/product-requirements", "original": "https://images.ctfassets.net/xjcz23wx147q/4qzDGNX0ulu03UndfHrBRc/c6a4e30b952097cb29e10c0e6e4f3956/product-requirements-preview-en.png", "file": "requirements.png"}, "report": {"title": "실험·검증 보고서", "source": "https://www.atlassian.com/software/confluence/templates/experiment-plan-and-results", "original": "https://images.ctfassets.net/xjcz23wx147q/4U279wYTAlaVEZkzWsU04Y/02218b416deb6aa8c7033da136ae4e46/experiment-plan-and-results-preview-en.png", "file": "report.png"}, "design": {"title": "화면 설계·디자인 시스템", "source": "https://www.atlassian.com/software/confluence/templates/design-system", "original": "https://images.ctfassets.net/xjcz23wx147q/2yDXBqzm7hIjiQqAQdInFs/02a14eaaae47f298d066ff3954372d32/design-system-preview-en.png", "file": "design.png"}, "shap": {"title": "SHAP 설명 차트", "source": "https://shap.readthedocs.io/en/stable/example_notebooks/api_examples/plots/beeswarm.html", "original": "https://shap.readthedocs.io/en/stable/_images/example_notebooks_api_examples_plots_beeswarm_3_0.png", "file": "shap.png"}, "risk": {"title": "위험대장 템플릿", "source": "https://www.atlassian.com/software/confluence/templates/risk-register", "original": "https://images.ctfassets.net/xjcz23wx147q/5hsDNmsyia3N0QD2zKJq3R/f0bd899cf69d909335580910064940d9/AT12EHFZ.webp", "file": "risk.webp"}, "adr": {"title": "의사결정 기록 문서", "source": "https://www.atlassian.com/software/confluence/templates/decision", "original": "https://images.ctfassets.net/xjcz23wx147q/5qHaieKlIzrm51Cb8fK2bj/a385b4c4441a5b9668a62fae6e02c40b/decision-preview-en.png", "file": "adr.png"}, "erd": {"title": "테이블·키·관계가 표시된 ERD", "source": "https://medium.com/@macaulaymercy1/how-to-create-an-erd-diagram-using-draw-io-a5267c85d788", "original": "https://miro.medium.com/v2/resize:fit:1200/1*h9rWto8jh7cR8Qu2OYGrhA.png", "file": "erd.png"}, "test": {"title": "JUnit 시험 결과 보고서", "source": "https://www.tutorialspoint.com/testng/testng_junit_reports.htm", "original": "https://www.tutorialspoint.com/testng/images/junit_reports.png", "file": "test.png"}};
  const referenceRoot = new URL('deliverable-examples/', document.currentScript.src);
  const referenceRules = [
    [/위험대장|리스크/, 'risk'], [/의사결정|ADR/, 'adr'],
    [/ERD|스키마|데이터 사전/, 'erd'], [/SHAP|XAI/, 'shap'],
    [/WBS|작업계획|스프린트|계획서/, 'timeline'],
    [/결함|백로그|칸반/, 'board'],
    [/구현 코드|코드|모듈|스캐폴드|재현 패키지|모델$|빌드/, 'code'],
    [/CI|CD|릴리스|배포/, 'ci'], [/API|어댑터|Webhook/, 'api'],
    [/성과지표|계산서|대사표|KPI/, 'metrics'],
    [/백테스트|최적화|강건성|성과보고서/, 'backtest'],
    [/시험|테스트|검증|QA|평가 결과/, 'test'],
    [/아키텍처|구성도|파이프라인|VectorDB|인덱스|데이터마트/, 'architecture'],
    [/UI|화면|차트|대시보드|와이어프레임|IA|스토리/, 'design'],
    [/보고서|분석서|평가셋|실험/, 'report'],
    [/헌장|과업|인수|완료보고|매뉴얼/, 'charter'],
    [/요구사항|정책|기준|규칙|사전|목록|인벤토리|규격|명세|표준|DoD/, 'requirements']
  ];
  const referenceFor = name => references[(referenceRules.find(([pattern])=>pattern.test(name)) || [null,'requirements'])[1]];
  function illustration(c, d) {
    const lines = (value, width) => {
      const result=[]; let line='', units=0;
      for (const char of String(value)) {
        const size = char.charCodeAt(0) > 255 ? 1 : 0.55;
        if (char === '\n' || units + size > width) {result.push(line); line=''; units=0; if(char==='\n') continue;}
        line+=char; units+=size;
      }
      result.push(line); return result;
    };
    const text = (value,x,y,size=17,width=52,color='#334155') => `<text x="${x}" y="${y}" font-size="${size}" fill="${color}">${lines(value,width).map((line,i)=>`<tspan x="${x}" dy="${i?size*1.5:0}">${esc(line)}</tspan>`).join('')}</text>`;
    const count=d.headers.length, colWidth=900/count;
    let y=210;
    let body=d.headers.map((h,i)=>`<rect x="${40+i*colWidth}" y="${y}" width="${colWidth}" height="48" fill="#e0e7ff" stroke="#cbd5e1"/>${text(h,50+i*colWidth,y+30,17,(colWidth-24)/17)}`).join('');
    y+=48;
    d.rows.forEach((row,j)=>{
      const height=Math.max(...row.map(v=>lines(v,(colWidth-24)/16).length))*24+30;
      row.forEach((v,i)=>{body+=`<rect x="${40+i*colWidth}" y="${y}" width="${colWidth}" height="${height}" fill="${j%2?'#f8fafc':'#fff'}" stroke="#cbd5e1"/>${text(v,50+i*colWidth,y+28,16,(colWidth-24)/16)}`;});
      y+=height;
    });
    if(d.code){y+=34; body+=text('첨부 코드 / demo source',40,y,18); y+=26; const codeHeight=lines(d.code,78).length*24+28;body+=`<rect x="40" y="${y-18}" width="900" height="${codeHeight}" fill="#eef2ff"/>${text(d.code,56,y+8,16,78)}`;y+=codeHeight;}
    d.notes.forEach(note=>{y+=36;body+=text(note,40,y,16,56);y+=Math.max(0,lines(note,56).length-1)*24;});
    const height=y+85;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="980" height="${height}" viewBox="0 0 980 ${height}"><rect width="980" height="${height}" rx="12" fill="#fff"/><g font-family="sans-serif">${text('작성 완료 SAMPLE / '+d.id,40,40,17,58,'#4f46e5')}${text(c.name,40,84,27,32,'#0f172a')}${text(c.project+' / '+d.summary,40,132,17,52)}${text('작성: '+c.role+' / 버전: v0.1',40,182,16,56,'#64748b')}${body}${text('교육용 작성 예시 / 실제 시험·승인·운영 실적이 아닙니다.',40,height-28,16,56,'#64748b')}</g></svg>`;
  }
  const dialog = document.createElement('dialog');
  dialog.className = 'deliverable-example-dialog';
  dialog.setAttribute('aria-labelledby', 'deliverableExampleTitle');
  dialog.innerHTML = '<header class="deliverable-example-header"><div><p class="deliverable-example-context"></p><h2 id="deliverableExampleTitle"></h2></div><button type="button" class="deliverable-example-close" aria-label="산출물 예시 닫기" autofocus>닫기 ×</button></header><div class="deliverable-example-body"><p class="deliverable-example-description"></p><section class="deliverable-reference-card" aria-labelledby="deliverableReferenceTitle"><h3 id="deliverableReferenceTitle">유사 산출물 이미지</h3><a class="deliverable-reference-original" target="_blank" rel="noopener noreferrer"><img class="deliverable-reference-image" width="400" height="400" alt=""></a><p class="deliverable-reference-status" role="status" hidden>이미지를 불러오지 못했습니다. 원문 출처에서 확인해 주세요.</p><p class="deliverable-reference-caption"></p><a class="deliverable-reference-source" target="_blank" rel="noopener noreferrer">원문 출처 ↗</a> · <a class="deliverable-reference-search" target="_blank" rel="noopener noreferrer">구글 이미지 검색 ↗</a></section><article class="deliverable-example-document"><header class="deliverable-document-cover"><span class="deliverable-document-label">산출물 샘플 · 내용이 채워진 작성본</span><h3 class="deliverable-document-title"></h3><p class="deliverable-document-meta"></p><small>모든 데이터·실행 결과·승인 기록은 교육용 가상 예시입니다.</small></header><div class="deliverable-example-document-content"></div></article><details class="deliverable-example-image-preview"><summary>샘플 이미지 보기</summary><figure><img alt=""><figcaption></figcaption></figure></details><nav class="deliverable-example-links" aria-label="산출물 참고 링크"><a class="deliverable-example-markdown" download>문서 샘플 저장 (.md) ↓</a><a class="deliverable-example-download" download>예시 이미지 저장 (.svg) ↓</a><a class="deliverable-example-google" target="_blank" rel="noopener noreferrer">관련 이미지 검색 ↗</a></nav></div>';
  document.body.append(dialog);
  const referenceImage = dialog.querySelector('.deliverable-reference-image');
  referenceImage.addEventListener('error',()=>{referenceImage.hidden=true;dialog.querySelector('.deliverable-reference-status').hidden=false;});
  let opener, previousOverflow;
  dialog.querySelector('.deliverable-example-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const r = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => { document.body.style.overflow = previousOverflow; opener?.focus({preventScroll:true}); });
  schedule.addEventListener('click', event => {
    const button = event.target.closest('[data-deliverable-example]');
    if (!button) return;
    const cell = button.closest('td'), row = cell.parentElement;
    const column = [...row.children].indexOf(cell);
    const c = {role:button.closest('table').querySelectorAll('thead th')[column].textContent, name:button.dataset.deliverableExample, task:cell.querySelector('b').textContent, phase:row.children[1].querySelector('b').textContent, project:button.closest('.project-schedule-sheet').querySelector('.project-schedule-sheet-head span').textContent.replace('나만의 ', '').replace(' 개발 및 성과 검증 프로젝트', ''), slot:[...row.querySelector('th').children].map(node=>node.textContent).join(' / ')};
    const d = sample.build(c);
    dialog.querySelector('h2').textContent = c.name + ' · 산출물 샘플';
    dialog.querySelector('.deliverable-example-context').textContent = c.project+' / '+row.querySelector('th b').textContent+' / '+c.phase+' / '+button.closest('table').querySelectorAll('thead th')[column].textContent;
    dialog.querySelector('.deliverable-example-description').textContent = d.summary+' — '+d.rows[0].join(' / ');
    const reference = referenceFor(c.name);
    referenceImage.hidden = false;
    dialog.querySelector('.deliverable-reference-status').hidden = true;
    referenceImage.alt = c.name+'의 형식과 비교할 '+reference.title+' 참고 이미지';
    referenceImage.src = new URL(reference.file, referenceRoot).href;
    dialog.querySelector('.deliverable-reference-original').href = new URL(reference.file, referenceRoot).href;
    dialog.querySelector('.deliverable-reference-source').href = reference.source;
    dialog.querySelector('.deliverable-reference-search').href = 'https://www.google.com/search?tbm=isch&q='+encodeURIComponent(c.name+' 산출물 예시');
    dialog.querySelector('.deliverable-reference-caption').textContent = reference.title+' · 출처: '+new URL(reference.source).hostname+' · 외부 유사 자료로, 아래 프로젝트 샘플과 별개입니다. 이미지 권리는 원저작자에게 있습니다.';
    dialog.querySelector('.deliverable-document-title').textContent = c.name;
    dialog.querySelector('.deliverable-document-meta').textContent = '문서 ID: '+d.id+' | 일정: '+c.slot+' | 담당: '+c.role+' | 버전: v0.1';
    const image = dialog.querySelector('.deliverable-example-image-preview img');
    image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(illustration(c,d));
    image.alt = c.name+' 작성본: '+d.summary+' / '+d.rows.map(r=>r.join(' / ')).join('; ');
    dialog.querySelector('figcaption').textContent = d.id+' / '+d.summary+' / 자체 제작한 가상 작성본';
    const content = dialog.querySelector('.deliverable-example-document-content');
    content.innerHTML = '<p>'+esc(d.summary)+'</p><div class="deliverable-document-table-wrap"><table><thead><tr>'+d.headers.map(h=>'<th scope="col">'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+d.rows.map(row=>'<tr>'+row.map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>'+(d.code?'<pre><code>'+esc(d.code)+'</code></pre>':'')+d.notes.map(note=>'<p>'+esc(note)+'</p>').join('');
    dialog.querySelector('.deliverable-example-image-preview').open = false;
    const markdown = '# '+c.name+'\n\n'+d.summary+'\n\n> 교육용 가상 작성본\n\n일정: '+c.slot+'\n담당: '+c.role+'\n\n| '+d.headers.join(' | ')+' |\n| '+d.headers.map(()=>'---').join(' | ')+' |\n'+d.rows.map(row=>'| '+row.map(v=>String(v).replace(/\|/g,'\\|')).join(' | ')+' |').join('\n')+(d.code?'\n\n```\n'+d.code+'\n```':'')+'\n\n'+d.notes.join('\n\n');
    const mdLink = dialog.querySelector('.deliverable-example-markdown');
    mdLink.href = 'data:text/markdown;charset=utf-8,'+encodeURIComponent(markdown);
    mdLink.download = c.name.replace(/[\\/:*?"<>|]/g,'-')+'-샘플.md';
    const download = dialog.querySelector('.deliverable-example-download');
    download.href = image.src; download.download = c.project+'-'+c.name.replace(/[\\/:*?"<>|]/g,'-')+'-예시.svg';
    dialog.querySelector('.deliverable-example-google').href = 'https://www.google.com/search?tbm=isch&q='+encodeURIComponent(c.name+' '+c.phase+' 예시');
    opener=button; previousOverflow=document.body.style.overflow; document.body.style.overflow='hidden'; dialog.showModal();
  });
  schedule.querySelectorAll('tbody td small').forEach(cell => {
    if (!cell.textContent.startsWith('산출물 · ')) return;
    const names = sample.split(cell.textContent.slice('산출물 · '.length));
    cell.replaceChildren(document.createTextNode('산출물 · '));
    names.forEach((name,i) => {
      if(i) cell.append(document.createTextNode(' '));
      const button=document.createElement('button'); button.type='button'; button.className='deliverable-example-button'; button.dataset.deliverableExample=name; button.setAttribute('aria-haspopup','dialog'); button.textContent=name; cell.append(button);
    });
  });
  const hint=document.createElement('p'); hint.className='deliverable-example-hint'; hint.textContent='산출물 이름을 클릭하면 날짜별 담당자의 산출물 샘플 문서가 바로 열립니다. 표·코드·시험 결과를 확인하거나 문서 및 이미지로 저장할 수 있습니다. 예시는 학습용이며 SVG 파일로 저장할 수 있습니다.';
  schedule.querySelector('.project-schedule-role-guide').before(hint);
})();
