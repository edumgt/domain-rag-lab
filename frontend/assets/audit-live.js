/* Keep executed evidence separate from incomplete illustrative scenarios. */
window.mergeAuditLiveResults = (planned,verification) => {
  if(!verification)return planned;
  const ranking={CRITICAL:3,HIGH:2,MEDIUM:1,INFO:0};
  const rows=planned.map(row=>{const checks=verification.entries.filter(e=>e.planned?.includes(row.test));if(!checks.length)return {...row,origin:'예상 계획',severity:'미평가'};const failures=checks.filter(e=>e.verdict==='FAIL');const severity=failures.reduce((s,e)=>(ranking[e.severity]||0)>(ranking[s]||0)?e.severity:s,'INFO');return {...row,origin:'예상 계획의 부분 검증',severity,actual:checks.map(e=>e.id+' '+e.verdict+' · '+e.detail).join('\n'),verdict:failures.length?'실패 확인 · 잔여 미검증':'부분 확인 · 전체 미판정',evidence:'연계 운영 검증 '+checks.map(e=>e.id).join(' · '),state:'일부 조건만 실제 실행 · 계획 전체 완료 아님'};});
  const actual=verification.entries.map(e=>({id:'RES-'+e.id,test:e.id,title:e.name,category:e.origin,origin:'실제 검증',severity:e.verdict==='FAIL'?e.severity:'INFO',level:e.origin,requirements:e.requirements.join(' · '),specs:e.requirements.map(id=>'TC-FINANCE-'+id).join(' · '),expected:e.planned?.length?'연계 계획: '+e.planned.join(' · '):'증빙 항목: '+e.name,forecast:'관측값을 명시한 단일 실행 항목 · 전체 기능 통과 의미 아님',actual:e.detail,verdict:e.verdict==='PASS'?'통과':e.verdict==='FAIL'?'실패':'진행 불가',evidence:e.source+'\n'+e.timestamp,followup:e.requirements.map(id=>'GAP-FINANCE-'+id+' → ACT-FINANCE-'+id).join('\n'),state:e.origin+' · 실행 완료',executed:true}));
  actual.sort((a,b)=>(ranking[b.severity]||0)-(ranking[a.severity]||0));return [...actual,...rows];
};
