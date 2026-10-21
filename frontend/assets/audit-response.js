(async () => {
  'use strict';
  const status=document.getElementById('auditStatus');
  const search=document.getElementById('auditSearch'), scope=document.getElementById('auditScope');
  const table=document.getElementById('auditGrid');
  const node=(tag,text)=>{const el=document.createElement(tag);el.textContent=text;return el;};
  // Reuse the established learning offcanvas without coupling it to the presentation forms.
  const panel=document.getElementById('learningPanel'), open=document.getElementById('openLeftPanel'),close=document.getElementById('closeLeftPanel'),backdrop=document.getElementById('offcanvasBackdrop');
  const toggle=visible=>{panel.inert=!visible;document.body.classList.toggle('left-panel-open',visible);backdrop.classList.toggle('visible',visible);backdrop.setAttribute('aria-hidden',String(!visible));open.setAttribute('aria-expanded',String(visible));(visible?close:open).focus();};
  open.setAttribute('aria-expanded','false');open.addEventListener('click',()=>toggle(true));close.addEventListener('click',()=>toggle(false));backdrop.addEventListener('click',()=>toggle(false));
  document.addEventListener('keydown',e=>{if(!document.body.classList.contains('left-panel-open'))return;if(e.key==='Escape')toggle(false);if(e.key==='Tab'){const all=[...panel.querySelectorAll('a,button')],first=all[0],last=all[all.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
  const configs={
    rfp:{title:'RFP',columns:['요구사항 번호','분류','요구사항 명칭','정의(원문)','세부내용(원문)','산출정보(원문)','원문 위치'],widths:[155,180,300,380,540,320,280],row:r=>[r.id,r.category,r.name,r.definition,r.details,r.artifact,r.source]},
    proposal:{title:'제안서 요약',columns:['제안 ID','연계 요구사항','구분','수행 제안·핵심 범위','수행 방법·참고 도구','제출 산출물','진행 상태'],widths:[190,270,180,450,330,340,200],row:r=>[r.id,r.links,r.category,r.name,r.tool,r.artifact,'작성 예시 · 검증 대기']},
    requirements:{title:'요구사항 정의서',columns:['요구사항 ID','근거 ID','구분','요구사항 정의','인수·검증 기준(안)','우선순위','담당·승인','관련 산출물'],widths:[155,170,180,430,400,150,190,340],row:r=>[r.id,r.basis||'SPEC-'+r.id,r.category,r.name+(r.definition?'\n'+r.definition:''),r.acceptance,'필수(검토안)','미지정 · 승인 대기',r.artifact]},
    traceability:{title:'요구사항 추적표',columns:['요구사항 ID','근거 ID','구분','요구사항','설계 ID(예정)','구현 증빙','시험 ID(예정)','검증 기준','시험 결과·인수','관리 도구'],widths:[155,175,180,400,190,200,190,400,230,320],row:r=>[r.id,r.basis||'SPEC-'+r.id,r.category,r.name,'DES-'+example.toUpperCase()+'-'+r.id,'파일·커밋 미등록','TC-'+example.toUpperCase()+'-'+r.id,r.acceptance,'검증 대기 · 인수 미확정',r.tool]}
  };
  configs.diagram={title:'RTM Diagram'};
  const rtm=new window.AuditRtm(document.getElementById('auditRtm'));
  const examples={finance:{title:'로보어드바이저 · 인디케이터',description:'이 저장소의 투자 서비스 기능 정의와 프로젝트 산출물·진행 도구를 기반으로 구성한 예시입니다.'},pnu:{title:'부산대 교육혁신본부',description:'AI 에이전트 플랫폼 RFP의 58개 요구사항을 기반으로 구성한 예시입니다. 원문 번호를 정의서·추적표에 연결하며, 제안 접근법과 검증 계획은 작성 예시입니다.'}};
  let data,active='rfp',example='finance',sortIndex=-1,ascending=true,visible=[];
  function financeProposals(){
    const result=[];
    ['로보어드바이저','인디케이터','공통 관리'].forEach(category=>{
      const group=data.requirements.filter(r=>r.category===category),sizes=category==='로보어드바이저'?[5,3,3,3,1]:category==='인디케이터'?[3,3,3,3,3,1]:group.map(()=>1);let offset=0;
      sizes.forEach(size=>{const selected=group.slice(offset,offset+size);offset+=size;if(!selected.length)return;result.push({id:'FIN-PROP-'+String(result.length+1).padStart(3,'0'),links:selected.map(r=>r.id).join(' · '),category,name:selected.map(r=>r.name).join(' / '),tool:[...new Set(selected.map(r=>r.tool))].join(' / '),artifact:[...new Set(selected.map(r=>r.artifact))].join(' / ')});});
    });return result;
  }
  function records(){if(active==='rfp')return example==='pnu'?data.rfp.requirements:data.requirements.map(r=>({id:r.rfp,category:r.category,name:r.name,definition:r.name,details:r.acceptance,artifact:r.artifact,source:'기능 정의 '+r.id}));if(example==='pnu')return active==='proposal'?data.pnu.proposals:data.pnu.requirements;return active==='proposal'?financeProposals():data.requirements;}
  function render(){
    const diagram=active==='diagram';document.getElementById('auditRtm').hidden=!diagram;document.querySelector('.audit-table-wrap').hidden=diagram;document.querySelector('.audit-scroll-hint').hidden=diagram;document.getElementById('auditExport').textContent=diagram?'PNG 다운로드':'CSV 다운로드';
    if(diagram){const query=search.value.trim().toLocaleLowerCase('ko'),source=example==='pnu'?data.pnu.requirements:data.requirements;const rows=source.filter(r=>(!scope.value||r.category===scope.value)&&(!query||[r.id,r.name,r.category,r.acceptance].join(' ').toLocaleLowerCase('ko').includes(query)));document.getElementById('documentTitle').textContent=examples[example].title+' · RTM Diagram';document.getElementById('documentDescription').textContent='왼쪽 RFP 카드를 Canvas에 놓아 연결 문서를 배치합니다.';status.textContent='전체 '+source.length+'개 요구사항 중 '+rows.length+'개 RFP 카드 · 문서 예시 / 시험 미실행';rtm.setData({rows,allRows:source,proposals:example==='pnu'?data.pnu.proposals:financeProposals(),example,title:examples[example].title});return;}

    const cfg=active==='rfp'&&example==='finance'?{...configs.rfp,columns:['RFP 번호','구분','요청 기능·범위','기능 정의','인수·검증 기준(안)','제출 산출물','근거 기능 ID']}:configs[active],source=records(),query=search.value.trim().toLocaleLowerCase('ko');
    table.querySelector('colgroup')?.remove();const cols=document.createElement('colgroup');cfg.widths.forEach(width=>{const col=document.createElement('col');col.style.width=width+'px';cols.append(col);});table.insertBefore(cols,table.tHead);table.style.setProperty('--grid-width',cfg.widths.reduce((a,b)=>a+b,0)+'px');
    visible=source.filter(r=>(!scope.value||r.category===scope.value)&&(!query||cfg.row(r).join(' ').toLocaleLowerCase('ko').includes(query))).map(cfg.row);
    if(sortIndex>=0)visible.sort((a,b)=>String(a[sortIndex]).localeCompare(String(b[sortIndex]),'ko',{numeric:true})*(ascending?1:-1));
    document.getElementById('documentTitle').textContent=examples[example].title+' · '+cfg.title;
    document.getElementById('documentDescription').textContent=active==='rfp'?(example==='pnu'?'지정하신 제안요청서의 9개 분류·58개 요구사항을 원문 기준으로 제공합니다.':'로보어드바이저·인디케이터 기능 정의 기반의 제안요청서 예시입니다. 요청 기능·제출 산출물·인수 기준은 검토안입니다.'):active==='proposal'?'기능군별 수행 접근법과 제출 산출물의 제안 예시입니다.':active==='requirements'?'요구사항별 정의·인수 기준·산출물 예시입니다. 담당·우선순위·승인은 검토가 필요합니다.':'요구사항 → 설계 → 구현 → 시험 → 인수 연결 예시입니다. 설계·시험 ID는 예정이며 증빙과 결과는 미등록 상태입니다.';
    document.getElementById('auditCaption').textContent=document.getElementById('documentTitle').textContent+' · 열 제목을 눌러 정렬';
    const header=node('tr','');cfg.columns.forEach((label,i)=>{const th=node('th','');th.scope='col';th.setAttribute('aria-sort',sortIndex===i?(ascending?'ascending':'descending'):'none');const btn=node('button',label+(sortIndex===i?(ascending?' ↑':' ↓'):' ↕'));btn.type='button';btn.addEventListener('click',()=>{ascending=sortIndex===i?!ascending:true;sortIndex=i;render();});th.append(btn);header.append(th);});table.tHead.replaceChildren(header);
    const body=table.tBodies[0];body.replaceChildren();visible.forEach(row=>{const tr=node('tr','');row.forEach(value=>{const td=node('td','');if(String(value).length>240){const details=node('details',''),summary=node('summary',String(value).slice(0,80)+'… 전문 보기');details.append(summary,node('div',value));td.append(details);}else td.textContent=value;tr.append(td);});body.append(tr);});
    if(!visible.length){const tr=node('tr',''),td=node('td','검색 조건에 맞는 항목이 없습니다.');td.colSpan=cfg.columns.length;tr.append(td);body.append(tr);}
    status.textContent='전체 '+source.length+'건 중 '+visible.length+'건 표시 · '+(active==='rfp'?(example==='pnu'?'부산대 제안요청서 원문':'로보어드바이저 · 인디케이터 RFP 예시'):examples[example].title+' 예시 · 구현·시험 증빙 확인 대기');
  }
  function select(){
    const hash=location.hash.slice(1),match=/^(finance|pnu)-(rfp|proposal|requirements|traceability|diagram)$/.exec(hash);
    if(match){example=match[1];active=match[2];}else{active=Object.hasOwn(configs,hash)?hash:'rfp';example=hash==='rfp'?'pnu':'finance';}
    sortIndex=-1;ascending=true;search.value='';
    document.querySelectorAll('[data-example]').forEach(a=>{if(a.dataset.example===example)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    document.querySelector('.audit-document-tabs').hidden=false;
    document.querySelectorAll('[data-document]').forEach(a=>{a.href='#'+example+'-'+a.dataset.document;if(a.dataset.document===active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    document.getElementById('auditRfpSource').hidden=active!=='rfp'||example!=='pnu';
    if(data){scope.replaceChildren(new Option('전체',''),...[...new Set(records().map(r=>r.category))].map(c=>new Option(c,c)));render();document.querySelector('.audit-table-wrap').scrollTo(0,0);}
  }
  window.addEventListener('hashchange',select);search.addEventListener('input',()=>{if(data)render();});scope.addEventListener('change',()=>{if(data)render();});
  document.getElementById('auditExport').addEventListener('click',()=>{if(!data)return;if(active==='diagram'){rtm.download();return;}const cell=value=>'"'+String(value).replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"';const csv='\ufeff'+[Array.from(table.tHead.querySelectorAll('button'),b=>b.textContent.replace(/ [↕↑↓]$/,'')),...visible].map(row=>row.map(cell).join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='감리대응-'+(examples[example].title+'-'+configs[active].title)+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  try{const [existing,rfp]=await Promise.all(['/static/assets/audit-response-data.json?v=examples2','/static/assets/audit-rfp-data.json?v=examples2'].map(async url=>{const res=await fetch(url,{cache:'no-store'});if(!res.ok)throw Error('문서 데이터 응답 '+res.status);return res.json();}));data={...existing,rfp};select();}catch(error){status.textContent='문서를 불러오지 못했습니다. 새로고침해주세요. '+error.message;document.getElementById('auditExport').disabled=true;}
})();
