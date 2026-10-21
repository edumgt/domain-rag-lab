/* Anticipated review items, not observed defects or completed actions. */
window.buildAuditGapRows = (requirements,example) => {
  const profiles={
    SFR:{risk:'업무 실행·승인·오류 복구 흐름의 설계와 실제 동작이 다를 가능성',impact:'업무 미완결 또는 잘못된 도구 실행',action:'정상·실패·중단·재시도 및 권한별 실행 시나리오를 작성하고 단계별 입출력·실행 로그를 대조합니다.',owner:'서비스 개발 · 업무 담당(지정 필요)',gate:'기능 통합시험 전',evidence:'업무 시나리오 · 실행 로그 · 화면 기록'},
    SIR:{risk:'시스템 간 인증·데이터 계약·오류 처리가 일치하지 않을 가능성',impact:'연계 실패 · 데이터 불일치 · 권한 우회',action:'API 요청·응답·인증 계약과 매핑을 확정하고 타임아웃·권한 오류·중복 요청을 포함한 연계시험을 수행합니다.',owner:'연계 개발 · 시스템 담당(지정 필요)',gate:'연계시험 전',evidence:'인터페이스 명세 · 요청/응답 기록 · 연계시험 결과'},
    DAR:{risk:'적재·갱신·보존·색인 규칙과 원천 데이터의 대응이 누락될 가능성',impact:'오래된 정보 제공 · 조회 근거 추적 불가',action:'원천→적재→색인 경로와 갱신·보존 정책을 정의하고 결측·중복·갱신 실패를 검증합니다.',owner:'데이터 담당(지정 필요)',gate:'데이터 검증 전',evidence:'데이터 매핑 · 품질 점검표 · 적재/색인 이력'},
    TER:{risk:'평가 입력·기대 결과·판정 기준 또는 반복 실행 증빙이 부족할 가능성',impact:'인수 판정의 재현성과 객관성 부족',action:'골든셋과 기대 결과·판정 기준을 확정하고 독립 실행 환경에서 반복 시험 및 결함 재시험 결과를 보존합니다.',owner:'시험 담당 · 업무 검수자(지정 필요)',gate:'인수시험 착수 전',evidence:'시험 계획/사양서 · 골든셋 · 실행 결과 · 재시험 기록'},
    SER:{risk:'권한·개인정보·실행 승인·인젝션 방어 조건에 누락이 있을 가능성',impact:'정보 노출 · 비인가 실행 · 검수 기준 미충족',action:'원문 보안 조건별 공격·권한 경계 사례를 정의하고 서버 측 차단·승인·감사 로그를 검증합니다.',owner:'보안 담당 · 개발 담당(지정 필요)',gate:'인수시험 전 우선 확인',evidence:'보안 설계 · 권한 매트릭스 · 차단 시험/감사 로그'},
    QUR:{risk:'품질·사용량·비용·성능 지표의 수집 및 측정 조건이 불명확할 가능성',impact:'운영 품질과 비용·성능 기준의 충족 여부 판정 불가',action:'원문 지표·부하·측정 기간·산식을 확정하고 관측 지표와 시험 결과를 함께 제출합니다.',owner:'품질 · 운영 담당(지정 필요)',gate:'성능·품질 검수 전',evidence:'측정 계획 · 모니터링 지표 · 성능/비용 보고서'},
    PMR:{risk:'범위·변경·인력·산출물 및 소스 이관의 승인 근거가 부족할 가능성',impact:'책임·진척·인수 범위 추적 불가',action:'담당 역할과 변경 승인 기준을 정하고 산출물·형상·이관 목록에 버전 및 승인 이력을 연결합니다.',owner:'PM · 형상관리 담당(지정 필요)',gate:'단계 검토 및 인수 전',evidence:'수행계획 · 변경대장 · 검토/승인 기록 · 이관 확인서'},
    PSR:{risk:'교육·지원·유지관리·라이선스 인수 조건이 누락될 가능성',impact:'운영 이관 지연 · 사용권/지원 범위 분쟁',action:'교육·지원 절차와 라이선스·사용권·유지관리 범위를 명시하고 인수 체크리스트로 확인합니다.',owner:'운영지원 · 계약 담당(지정 필요)',gate:'운영 이관 전',evidence:'매뉴얼 · 교육 기록 · 지원 계획 · 라이선스 명세'},
    WEB:{risk:'페이지·CMS·연계 기능과 접근성·운영 이관 검증 범위가 달라질 가능성',impact:'사용자 업무 중단 · 접근성/공개 기준 미충족',action:'화면·CMS·콘텐츠·신청 흐름별 인수 항목을 확정하고 접근성·호환성·연계·공개 절차를 시험합니다.',owner:'웹 개발 · 콘텐츠/운영 담당(지정 필요)',gate:'홈페이지 검수 및 공개 전',evidence:'화면/CMS 명세 · 접근성/호환성 결과 · 공개 체크리스트'}
  };
  const finance={
    data:{risk:'원천·갱신 시점·전처리와 계산 입력의 재현 근거가 누락될 가능성',impact:'오래된 데이터나 잘못된 입력으로 결과 왜곡',action:'데이터 출처·기준 시각·결측/중복 처리와 계산 파라미터를 기록하고 동일 입력의 결과를 재현합니다.',owner:'데이터 · 지표 개발 담당(지정 필요)',gate:'전략 검증 전',evidence:'데이터 스냅샷 · 처리 규칙 · 계산 단위시험 결과'},
    trade:{risk:'모의 주문·포트폴리오·리밸런싱의 경계 및 중복 실행 방어가 누락될 가능성',impact:'중복 주문 · 잔고/비중 불일치 · 위험 한도 초과',action:'시간·이탈률·입출금·중복 요청·비상 정지 경계를 시험하고 주문·체결·잔고 원장을 대조합니다.',owner:'거래/포트폴리오 개발 · 시험 담당(지정 필요)',gate:'모의운용 검수 전',evidence:'시나리오 · 주문/체결/잔고 대조표 · 위험관리 시험 결과'},
    test:{risk:'비용·데이터 기간·체결 가정·미래 참조 방지 조건이 결과와 불일치할 가능성',impact:'성과 과대평가 · 검증 결과 재현 실패',action:'동일 데이터·기간·수수료·슬리피지·체결 가정을 고정하고 미사용 기간 및 교차 엔진 결과를 대조합니다.',owner:'전략 개발 · 검증 담당(지정 필요)',gate:'성과 검수 전',evidence:'실행 설정 · 백테스트 결과 · 원장 · 교차 검증 보고서'},
    explain:{risk:'추천·신호·설명에 근거 데이터 또는 판단 조건 연결이 부족할 가능성',impact:'추천 이유 추적 불가 · 근거 없는 의사결정',action:'질문·신호·설명별 원천과 판단 규칙을 연결하고 근거 부족·미지원 입력에 대한 응답을 시험합니다.',owner:'AI/서비스 개발 · 업무 검수자(지정 필요)',gate:'기능 인수시험 전',evidence:'근거 문서/출처 · 규칙 명세 · 응답/신호 시험 결과'},
    ui:{risk:'화면 입력·결과·오류 상태와 인수 시나리오가 일치하지 않을 가능성',impact:'기능 누락 · 사용자 오판 · 작업 흐름 단절',action:'화면 명세와 사용자 시나리오를 대조하고 입력 검증·빈값·오류·모바일 상태를 시험합니다.',owner:'FE · UX · 시험 담당(지정 필요)',gate:'사용자 인수시험 전',evidence:'화면 명세 · 사용자 시나리오 · 브라우저 시험 기록'}
  };
  return requirements.map(r=>{
    let p;
    if(example==='pnu')p=profiles[r.id.split('-')[0]];
    else if(r.category==='공통 관리')p=/요구사항|일정|착수|형상/.test(r.name)?profiles.PMR:/데이터/.test(r.name)?profiles.DAR:/인터페이스/.test(r.name)?profiles.SIR:/시험/.test(r.name)?profiles.TER:/배포|운영/.test(r.name)?profiles.PSR:finance.ui;
    else p=/중복 주문|모의 주문|리밸런싱|현금흐름|포지션|계좌·시세/.test(r.name)?finance.trade:/백테스트|성과지표|미래 데이터|Strategy Tester|결과를 비교|슬리피지/.test(r.name)?finance.test:/용어|RAG|XAI|의견으로|신뢰도/.test(r.name)?finance.explain:/투자성향|전략 설정 ·/.test(r.name)?finance.ui:finance.data;
    const prefix=example.toUpperCase(),gap='GAP-'+prefix+'-'+r.id,action='ACT-'+prefix+'-'+r.id;
    return {...r,gap,action,expected:r.definition||r.name,current:'현황·구현·시험 증빙 미확인',risk:p.risk,impact:p.impact,priority:/SER|SIR/.test(r.id)||p===finance.trade?'높음(검토안)':'보통(검토안)',plan:p.action,owner:p.owner,gate:p.gate,evidence:p.evidence,test:'TC-'+prefix+'-'+r.id,gapState:'예상 GAP · 사실 확인 전',actionState:'조치 계획안 · 미착수',closure:'요구사항의 검증 기준 충족 + 증빙 제출 + 독립 재시험 + 검수자 승인',verification:r.acceptance||'원문 세부내용 및 산출정보와 항목별 대조'};
  });
};
