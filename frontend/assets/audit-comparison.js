/* Scope compliance: proposed coverage is distinct from verified acceptance. */
window.buildAuditComparison = (requirements,proposals,tests,example,verification) => requirements.map(r=>{
  const prefix=example.toUpperCase(),proposal=proposals.find(p=>p.links.split(' · ').includes(r.id));
  const observed=example==='finance'?(verification?.entries||[]).filter(e=>e.requirements.includes(r.id)):[];
  const failures=observed.filter(e=>e.verdict==='FAIL'),severity=failures.some(e=>e.severity==='CRITICAL')?'CRITICAL':failures.some(e=>e.severity==='HIGH')?'HIGH':'미평가';
  return {id:'CMP-'+prefix+'-'+r.id,category:r.category,rfp:example==='pnu'?r.id:r.rfp,requirement:r.id,task:r.name,proposal:proposal?.id||'제안 미연결',response:proposal?.name||'대응 계획 등록 필요',deliverables:r.artifact,design:'DES-'+prefix+'-'+r.id,tests:['TC-'+prefix+'-'+r.id,...tests.units.filter(t=>t.requirements.includes(r.id)).map(t=>t.id),...tests.integrations.filter(t=>t.requirements.includes(r.id)).map(t=>t.id)].join(' · '),observed:observed.length?observed.length+'개 개별 검증 증빙 · 실패 '+failures.length+'건\n'+observed.map(e=>e.id+' ['+e.verdict+'] '+e.detail).join('\n'):'실제 구현·실행 증빙 미등록',gap:'GAP-'+prefix+'-'+r.id+' → ACT-'+prefix+'-'+r.id,severity,assessment:failures.length?'차이/오류 확인 · 조치·재검증 및 인수 대기':observed.length?'부분 확인 · 과업 전체 충족/인수 미확정':'대응 계획 예시 · 이행/검수 미확인'};
});
