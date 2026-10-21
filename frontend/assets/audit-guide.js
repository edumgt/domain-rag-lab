/* Source-based form review. These rows are not formal auditor approvals. */
window.AuditGuide={
 sources:{preparation:'한국지능정보사회진흥원 · SW 사업자를 위한 정보시스템 감리 준비 및 대응 가이드(2023.2)',intelligent:'한국지능정보사회진흥원 · 지능정보기술 감리 실무 가이드(2023.2)'},
 controls:[
  ['B01','요구정의','계약 기준선과 과업 누락 비교','preparation','6, 9','RFP·제안서·기술협상서·사업수행계획서·요구정의의 대응 및 변경 근거를 확인','과업대비표에 기술협상/수행계획 근거와 발주자 확인이 없었음','대비표 근거 열 추가. 미제공 문서는 미제공으로 표시','comparison','RFP · 기술협상서 · 수행계획/WBS · 발주자 확인'],
  ['B02','요구정의','요구사항 명세의 출처·제약·수용','preparation','9','명칭·기능/비기능·설명·출처·제약·중요도·수용/해결방안·검수기준을 확인','출처·제약·수용 및 발주자 확인 필드 부족','요구정의 필수 필드·미확정 상태 추가','requirements','요구사항명세 · 출처 · 수용/제외 승인'],
  ['B03','설계','분석→설계→구현→시험 추적','preparation','10','요건부터 유스케이스·화면·컴포넌트/프로그램·단위/통합시험까지 추적','기존 RTM은 DES와 TC 중심이고 세부 설계/UT/IT 열 부족','유스케이스·UI/PRG/IF/DB·UT/IT 연결 추가','traceability','분석/설계/구현/시험의 버전별 추적표'],
  ['B04','설계','기능 검사기준의 객관성','preparation','10','요구사항·세부 화면/프로그램 검사항목·재현 가능한 검사기준을 확인','예상 사양만 있으며 별도 검사기준서가 없었음','기능/비기능 검사기준서 추가. 미확정 fixture/허용오차를 표시','inspection','입력/기대값 · 화면/프로그램 · TC · 승인 기준'],
  ['B05','설계','비기능 검사기준과 산출물','preparation','10','성능·보안·품질은 측정 조건과 목표 또는 이행 산출물로 점검','비기능을 화면·프로그램 예시와 구분하는 기준 부족','비기능 검사방법·정량목표 미확정 상태 구분','inspection','성능/보안 계획 · 목표 · 측정/검토 결과'],
  ['B06','종료','과업 이행과 감리 판정 구분','preparation','11, 17','완료 여부·기준·증빙을 기록하며 적합/부적합 판정과 점검제외 근거를 구분','자체 PASS/FAIL과 정식 감리 판정을 명시적으로 구분할 필요','검사기준서에 자체 관측/감리판정/점검제외 근거 분리','inspection','완료 현황 · 결과 증빙 · 정식 판정/제외 승인'],
  ['B07','변경','회의·CR와 승인 기준선','preparation','9, 16','요구 변경의 근거·발주자 확인·공식 변경 여부와 적용 버전을 확인','가상 회의/CR는 구분되지만 승인 근거·기준선 버전 열 부족','CR에 기준선/변경 버전·발주자 확인·변경 적용 여부 추가','changes','회의록 · CR · 승인/심의 · 변경 기준선'],
  ['B08','필수점검','기술적용 계획·결과 비교','preparation','12','표준별 계획/결과·부분/미적용 사유·변경 근거를 확인','전용 기술적용계획/결과 증빙 목록 없음','증빙대장에 계획/결과와 사유 필드 추가','evidence','기술적용계획표 · 결과표 · 예외 사유'],
  ['B09','필수점검','SW 보안약점 진단·제거','preparation','12','개발보안 교육·진단 대상/도구/결과·결함 조치와 재진단 증빙을 확인','금지 산식 테스트만으로 전체 보안 진단을 대체할 위험','전체 보안진단 증빙 미등록으로 명시','evidence','교육 · 소스/도구 버전 · 진단 · 제거/재진단'],
  ['B10','필수점검','DB 표준·구조·값·메타데이터','preparation','13','기관/공통 표준 적용·구조/값 진단·메타데이터 현행화를 확인','가상 테이블만으로 DB 표준화 이행을 주장할 수 없음','DB 표준/검증/메타데이터 증빙 항목 추가','evidence','표준사전 · ERD · 구조/값 진단 · 메타데이터'],
  ['B11','감리대응','예비조사·요청자료·담당 역할','preparation','15, 16','개발 산출물·자체점검 결과·면담 담당·추가 자료 요청/제출 이력을 준비','가상 업무 회의 외 실제 요청자료 관리대장 없음','증빙대장에 요청/제출·담당·접근권한·공유 상태 추가','evidence','요청자료 관리대장 · 담당/면담 · 제출 이력'],
  ['B12','시정조치','개선유형·시점·계획·예정일','preparation','18','필수/협의/권고, 단기/장기, 상세계획·담당·예정일·발주자 확인을 기록','역할·단계만 있고 개선유형/시점·예정일 필드 부족','계획·처리표 보강. 확정되지 않은 담당/일자는 미정 표시','actions','조치계획 · 개선유형/시점 · 담당/기한 · 확인'],
  ['B13','시정조치','조치 결과·불가 사유·재확인','preparation','19','조치완료/조치중/반영불가를 결과 증빙과 함께 확인. 반영불가는 발주자 확인 필요','계획과 실제 결과를 구분한 결과서/재확인 필드 부족','시정조치결과 탭 추가. 미조치·미확인 상태 유지','corrections','변경 전후 · 결과서 · 재시험 · 반영불가 확인 · 재확인'],
  ['D01','데이터 분석','분석 목표·범위·품질 목표','intelligent','6, 7, 10','데이터 수집·정제·분석·시각화 목표와 성능·품질 요건을 도출','일반 기능/시나리오만으로 데이터 품질 목표 확인 불가','데이터/모델 증빙 범주와 검사 대상 추가','evidence','분석목표 · 범위 · 데이터/품질 목표'],
  ['D02','데이터 설계','수집목록·개인정보·정제/적재','intelligent','12, 14, 20, 21','원천/담당/형식·갱신주기·정제·개인정보 처리·ETL과 생애주기를 확인','목록/변환/보존의 실제 문서 미제공','수집·품질·생애주기 문서 증빙 미제공으로 등록','evidence','원천목록 · ETL · 품질 규칙 · 개인정보/보존 정책'],
  ['D03','분석모델','모델·알고리즘·도메인 타당성','intelligent','12, 16','분석대상별 모델·알고리즘과 도메인 검토를 확인','백테스트/산식 실행만으로 모델 타당성 전체를 확정할 수 없음','모델 설계/검토·데이터/버전·평가 증빙 항목 추가','evidence','모델/알고리즘 설계 · 데이터/버전 · 전문가 검토'],
  ['D04','구축·운영','시각화·분석 로그·거버넌스','intelligent','22, 23','설계 대비 시각화와 분석/활용 로그·품질/보안/운영 역할을 확인','일부 화면 증빙은 전체 이력·운영 거버넌스 증빙과 다름','부분 확인과 운영 문서 미등록을 분리','evidence','시각화 명세/결과 · 분석 로그 · 운영 역할/절차'],
  ['C01','클라우드','적용 범위·공급자/기관 책임','intelligent','47, 54','서비스 유형과 거버넌스·역할/책임을 사업별로 확정','도구 이름만으로 서비스 유형·계약·책임분담 확정 불가','클라우드 적용성/책임분담 증빙 추가','evidence','적용성 검토 · 아키텍처 · 계약/책임분담'],
  ['C02','클라우드','SLA·사용량·객관적 지표','intelligent','55, 64','측정 도구·지표·목표·주기·위반 시 조치 및 합의를 확인','API 단회 성공만으로 SLA 충족을 주장할 수 없음','SLA/측정계획·보고서 미등록 항목 추가','evidence','SLA · 목표/측정주기 · 모니터링/위반 조치'],
  ['C03','클라우드','업무연속성·출구전략·이관','intelligent','50, 72','중단·계약 종료 시 데이터 이관/검증·삭제·복구를 확인','배포 성공과 백업·복구/이관 검증은 별개','연속성·출구전략·복구시험 증빙 추가','evidence','백업/복구 · 출구전략 · 이관/삭제 확인'],
  ['O01','운영','변경·구성·배포·복구','intelligent','55, 78, 105, 106','변경 접수/승인·형상·배포·롤백과 운영 반영 이력을 확인','가상 CR/설계 ID만으로 운영 변경 증빙 대체 불가','운영 변경/배포 증빙과 가상 기록 구분','evidence','형상/변경대장 · 릴리즈/복구 · 승인/반영 이력'],
  ['O02','운영','테스트 지원·장애·문제관리','intelligent','79, 80','시험 환경·장애 통보/조치/복구·원인/재발 방지를 확인','현재 실제 결함은 확인됐으나 개선/재검증 미실시','실제 fd 결함을 시정조치결과에 미해결로 연결','corrections','시험 환경 · 장애/원인 · 재발방지 · 재시험']
 ],
 registry:[
  ['BASE','계약·기술협상·사업수행/WBS','preparation','6, 9, 16','계약 범위·승인 버전·예외/변경·단계 일정'],
  ['REQ','요구사항 명세·발주자 확인','preparation','9','출처·제약·수용·중요도·검수 기준·확인 기록'],
  ['DES','분석·설계·구현·시험 추적','preparation','10','유스케이스/UI/프로그램/인터페이스/DB·구현·UT/IT'],
  ['INS','기능/비기능 검사기준·자체 결과','preparation','10, 11, 17','대상·입력·기대값·환경·판정·결과 링크'],
  ['TECH','기술적용계획·결과·예외사유','preparation','12','표준항목·계획/결과·부분/미적용 사유'],
  ['SEC','개발보안 교육·진단·제거/재진단','preparation','12','대상 소스/도구 버전·전체 결과·조치·재진단'],
  ['DBS','DB 표준·구조/값 진단·메타데이터','preparation','13','표준사전·ERD·값 규칙·메타 현행화'],
  ['DATA','원천목록·정제·보존·개인정보','intelligent','12, 14, 20, 21','원천/담당/형식·주기·정제·품질·삭제'],
  ['MODEL','모델·알고리즘·데이터/평가 버전','intelligent','12, 16','분석대상·산식/모델·데이터/설정·전문가 검토'],
  ['LOG','시각화·분석 이력·운영 거버넌스','intelligent','22, 23','화면/근거·분석 로그·역할·운영 절차'],
  ['CLOUD','클라우드 적용성·계약·책임분담','intelligent','47, 54','서비스 모델·CSP/MSP/기관 역할·계약 조건'],
  ['SLA','서비스 수준·성능/사용량 측정','intelligent','55, 64','합의 목표·도구·주기·실측·위반 조치'],
  ['BCP','백업·복구·출구전략·이관/삭제','intelligent','50, 72','복구 목표/실측·이관 전후·삭제 확인'],
  ['OPS','형상·변경·배포·장애·지원','intelligent','55, 78, 79, 80, 105, 106','승인·형상·릴리즈·복구·장애/재발방지'],
  ['CR','회의·변경 심의·승인 기준선','preparation','9, 16','회의/CR·발주자 확인·공식 변경·개정 버전'],
  ['FIX','시정조치 계획·결과·재확인','preparation','18, 19','개선유형/시점·담당/기한·증빙·반영불가 확인'],
  ['LIVE','개별 실행 검증 증빙','preparation','11, 17','대상·환경·기대값·실측·실행시점·한계']
 ]
};
window.auditRequirementKind = r => /^(MGT|SER|QUR|PMR|PSR|TER|DAR)-/.test(r.id)?'비기능/관리(분류안)':'기능/연계(분류안 · 비기능 분리 검토 필요)';
window.buildAuditGuideRows = (kind,requirements,tests,example,verification) => {
 const prefix=example.toUpperCase(),guide=window.AuditGuide;
 const ref=(source,pages)=>guide.sources[source]+' · PDF 파일 페이지 '+pages+' (인쇄쪽수와 구분)';
 const base=r=>({requirement:r.id,category:r.category,ref:ref('preparation','9, 10, 11, 18, 19'),spec:'TC-'+prefix+'-'+r.id});
 if(kind==='guide')return guide.controls.map(([id,phase,title,source,pages,criterion,before,change,tab,evidence])=>({id:'GUIDE-'+prefix+'-'+id,category:source==='preparation'?'감리 준비·대응':'지능정보·운영',phase,title,criterion,before,change,tab,evidence,ref:ref(source,pages),applicability:source==='preparation'?'공공사업 가이드 권장사례 기준 · 계약/사업 특성에 맞게 조정':'데이터/클라우드/운영 영역별 적용성·범위 확인 필요',state:'문서 구조 보완 · 실제 제출/승인/이행은 미확인'}));
 if(kind==='evidence')return guide.registry.map(([code,title,source,pages,fields])=>{const actual=example==='finance'&&code==='LIVE';return{id:'EV-'+prefix+'-'+code,category:source==='preparation'?'감리 준비·대응':'지능정보·운영',title,fields,owner:'담당자 미지정 · 제출 책임 확정 필요',version:actual?'실행시점/범위는 기존 검증 요약 참조':'문서 버전 미등록 · 승인 기준선 미확정',request:'요청/접수 일시·요청자 미등록',submission:'제출 일시·제출자·발주자 공유 기록 미등록',location:actual?'공개 비식별 검증 요약: /static/assets/audit-evidence/fd-verification.json':'실제 자료·증빙 위치 미등록',review:'접근권한·검토자·발주자 확인 기록 미등록',state:actual?'개별 실행 증빙 일부 있음 · 정식 감리 제출/검수 아님':'제출 필요 예시 · 증빙 미등록',ref:ref(source,pages)};});
 if(kind==='inspection')return requirements.map(r=>{const units=tests.units.filter(t=>t.requirements.includes(r.id)),it=tests.integrations.filter(t=>t.requirements.includes(r.id)),observed=example==='finance'?(verification?.entries||[]).filter(e=>e.requirements.includes(r.id)):[],failed=observed.filter(e=>e.verdict==='FAIL');return{...base(r),id:'CHK-'+prefix+'-'+r.id,name:r.name,kind:window.auditRequirementKind(r),target:'UI-'+prefix+'-'+r.id+' / PRG-'+prefix+'-'+r.id+' · 비기능은 이행 산출물 확인',criteria:r.acceptance,inputs:'구체 입력 fixture·기대값·허용오차 또는 정량목표 미확정. 사전 합의 필요.',tests:[...units.map(t=>t.id),...it.map(t=>t.id)].join(' · '),evidence:observed.length?observed.map(e=>e.id+' '+e.verdict).join(' · '):'실행/이행 증빙 미등록',self:failed.length?'자체검증 실패 있음 · 수정/재검증 대기':observed.length?'일부 자체검증 통과 · 과업 전체 미확인':'미점검 · 이행 미확인',formal:'정식 감리 적합/부적합 판정 미등록',exclusion:'점검제외 결정/사유/발주자 확인 없음 · 미점검을 점검제외로 간주하지 않음',approval:'검사기준 승인자·버전 미등록 · 발주자 확인 미확인'};});
 if(kind==='corrections')return requirements.map(r=>{const observed=example==='finance'?(verification?.entries||[]).filter(e=>e.requirements.includes(r.id)&&e.verdict==='FAIL'):[];return{...base(r),id:'FIX-'+prefix+'-'+r.id,name:r.name,action:'ACT-'+prefix+'-'+r.id,gap:'GAP-'+prefix+'-'+r.id,basis:observed.length?'자체 발견 결함: '+observed.map(e=>e.id).join(' · '):'예상 GAP · 정식 개선권고/접수 보고서 없음',type:'필수/협의/권고 미확정 · 감리/발주자 검토 필요',timing:'단기/장기 미확정 · 다음 단계 전 확인 필요',status:observed.length?'실제 결함 미해결 · 수정/결과 미등록':'조치 결과 미등록',before:observed.length?observed.map(e=>e.detail).join('\n'):'현황/문제점 미확인',after:'수정 내역·커밋·산출물 개정 버전 미등록',evidence:'결과 증빙 미등록 · 자체 테스트 PASS만으로 조치 완료 처리 금지',retest:'재시험 미실시 · '+base(r).spec,deadline:'조치 예정일/완료일 미정 · 담당자 확정 필요',exception:'반영불가 결정 없음 · 결정 시 사유와 발주자 확인 문서 필요',confirmation:'사업자 결과 제출·발주자 확인·감리 재확인 모두 미등록'};});
 return [];
};
