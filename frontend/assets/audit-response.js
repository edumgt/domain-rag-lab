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
    rfp:{title:'RFP',description:'제안요청서 초안 · 로보어드바이저와 인디케이터 기능을 발주 요구사항으로 정리했습니다. 공통 관리 항목은 Day 4의 산출물·진행 도구를 연결합니다.',columns:['RFP ID','요구사항 ID','구분','요청 기능·수행 범위','제출 산출물','인수·검증 기준(안)','참고 기술·진행 도구'],row:r=>[r.rfp,r.id,r.category,r.name,r.artifact,r.acceptance,r.tool]},
    requirements:{title:'요구사항 정의서',description:'기능별 정의·인수 기준·산출물을 관리합니다. 우선순위는 필수(초안)이며 담당자와 승인 여부는 과업 협의 후 확정합니다.',columns:['요구사항 ID','RFP ID','구분','요구사항 정의','인수 기준(안)','우선순위','담당·승인','관련 산출물'],row:r=>[r.id,r.rfp,r.category,r.name,r.acceptance,'필수(초안)','미지정 · 승인 대기',r.artifact]},
    traceability:{title:'요구사항 추적표',description:'RFP → 요구사항 → 설계 → 구현 → 시험 → 인수의 연결표입니다. 설계·시험 ID는 관리용 예정 ID이며 실제 파일·커밋·시험 결과가 등록되기 전까지 증빙 및 검증 대기로 표시합니다.',columns:['요구사항 ID','RFP ID','구분','요구사항','설계 ID(예정)','구현 증빙','시험 ID(예정)','검증 기준','시험 결과·인수','관리 도구'],row:r=>[r.id,r.rfp,r.category,r.name,'DES-'+r.id,'파일·커밋 미등록','TC-'+r.id,r.acceptance,'검증 대기 · 인수 미확정',r.tool]},
    proposal:{title:'제안서 요약',description:'RFP 기능군별 제안 접근법과 제출 산출물 요약입니다. 원문 기술스택은 참고안이며 구현 완료·기술 선정 확정을 의미하지 않습니다.',columns:['제안 ID','연계 요구사항','구분','수행 제안·핵심 범위','수행 방법·참고 도구','제출 산출물','검수·진행 상태'],row:r=>[r.id,r.links,r.category,r.name,r.tool,r.artifact,'제안 초안 · 검증 대기']}
  };
  let data,active='rfp',sortIndex=-1,ascending=true,visible=[];
  function proposals(rows){
    const result=[];
    ['로보어드바이저','인디케이터','공통 관리'].forEach(category=>{
      const group=rows.filter(r=>r.category===category);
      const slices=category==='로보어드바이저'?[5,3,3,3,1]:category==='인디케이터'?[3,3,3,3,3,1]:group.map(()=>1);
      let offset=0;
      slices.forEach(size=>{const selected=group.slice(offset,offset+size);offset+=size;if(!selected.length)return;
        result.push({id:'PROP-'+String(result.length+1).padStart(3,'0'),links:selected.map(r=>r.id).join(' · '),category,name:selected.map(r=>r.name).join(' / '),tool:[...new Set(selected.map(r=>r.tool))].join(' / '),artifact:[...new Set(selected.map(r=>r.artifact))].join(' / ')});
      });
    });return result;
  }
  function render(){
    const cfg=configs[active],query=search.value.trim().toLocaleLowerCase('ko');
    const source=active==='proposal'?proposals(data.requirements):data.requirements;
    visible=source.filter(r=>(!scope.value||r.category===scope.value)&&(!query||cfg.row(r).join(' ').toLocaleLowerCase('ko').includes(query))).map(cfg.row);
    if(sortIndex>=0)visible.sort((a,b)=>String(a[sortIndex]).localeCompare(String(b[sortIndex]),'ko',{numeric:true})*(ascending?1:-1));
    document.getElementById('documentTitle').textContent=cfg.title;document.getElementById('documentDescription').textContent=cfg.description;
    document.getElementById('auditCaption').textContent=cfg.title+' · Day 4 기반 문서 초안 · 열 제목을 눌러 정렬';
    document.querySelectorAll('.wf-lnb a').forEach(a=>{if(a.hash==='#'+active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    const header=node('tr','');cfg.columns.forEach((label,i)=>{const th=node('th','');th.scope='col';th.setAttribute('aria-sort',sortIndex===i?(ascending?'ascending':'descending'):'none');const btn=node('button',label+(sortIndex===i?(ascending?' ↑':' ↓'):''));btn.type='button';btn.addEventListener('click',()=>{ascending=sortIndex===i?!ascending:true;sortIndex=i;render();});th.append(btn);header.append(th);});table.tHead.replaceChildren(header);
    const body=table.tBodies[0];body.replaceChildren();visible.forEach(row=>{const tr=node('tr','');row.forEach(value=>tr.append(node('td',value)));body.append(tr);});
    if(!visible.length){const tr=node('tr',''),td=node('td','검색 조건에 맞는 항목이 없습니다.');td.colSpan=cfg.columns.length;tr.append(td);body.append(tr);}
    status.textContent='전체 '+source.length+'건 중 '+visible.length+'건 표시 · 문서 기준: Day 4 · 모든 구현·시험 증빙은 확인 대기';
  }
  function select(){active=Object.hasOwn(configs,location.hash.slice(1))?location.hash.slice(1):'rfp';sortIndex=-1;ascending=true;search.value='';scope.value='';if(data)render();}
  window.addEventListener('hashchange',select);search.addEventListener('input',render);scope.addEventListener('change',render);
  document.getElementById('auditExport').addEventListener('click',()=>{if(!data)return;const cell=value=>'"'+String(value).replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"';const csv='\ufeff'+[configs[active].columns,...visible].map(row=>row.map(cell).join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='감리대응-'+configs[active].title+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  try{const res=await fetch('/static/assets/audit-response-data.json?v=20261021',{cache:'no-store'});if(!res.ok)throw Error('문서 데이터 응답 '+res.status);data=await res.json();select();}catch(error){status.textContent='문서를 불러오지 못했습니다. 새로고침해주세요. '+error.message;document.getElementById('auditExport').disabled=true;}
})();
