/* Fictional, completed deliverables for the Day 4 workshop. Not production evidence. */
window.Day4DeliverableSamples = (() => {
  // Split artifact bundles, retaining the shared document noun in each label.
  const split = label => {
    const bundles = {
      '기술·데이터 인벤토리':['기술 인벤토리','데이터 인벤토리'],
      '보안·데이터 정책':['보안 정책','데이터 정책'],
      'ERD·데이터 사전':['ERD','데이터 사전'],
      '피처·지표 사전':['피처 사전','지표 사전'],
      'IA·와이어프레임':['IA','와이어프레임'],
      '개발 표준·DoD':['개발 표준','DoD'],
      'UI 골격·CI 파이프라인':['UI 골격','CI 파이프라인'],
      '수집·전처리 파이프라인':['수집 파이프라인','전처리 파이프라인'],
      '용어·문서 분류체계':['용어 분류체계','문서 분류체계'],
      '프롬프트·평가 결과':['프롬프트 템플릿','답변 평가 결과'],
      '프로필·포트폴리오 API':['프로필 API','포트폴리오 API'],
      '성향진단·배분 UI':['성향진단 UI','자산배분 UI'],
      '학습 모델·검증 보고서':['학습 모델','모델 검증 보고서'],
      'XAI API·스키마':['XAI API 명세','XAI 데이터 스키마'],
      '커스텀 지표·테스트':['커스텀 지표 코드','커스텀 지표 테스트 결과'],
      '계좌·시세·주문 어댑터':['계좌 어댑터','시세 어댑터','주문 어댑터'],
      '보안·성능 시험서':['보안 시험서','성능 시험서'],
      '성능·비용 보고서':['성능 보고서','비용 보고서'],
      '운영·DR 계획서':['운영 계획서','DR 계획서'],
      'UAT 결과·결함대장':['UAT 결과서','결함대장'],
      '완료보고서·인수확인서':['완료보고서','인수확인서'],
      '모델 카드·성과보고서':['모델 카드','성과보고서'],
      '재현 패키지·성과보고서':['재현 패키지','성과보고서'],
      '릴리스 빌드·CI/CD':['릴리스 빌드','CI 파이프라인','CD 파이프라인'],
      '릴리스 빌드·관제 화면':['릴리스 빌드','관제 화면'],
      '배포본·운영 런북':['배포 패키지','운영 런북'],
      '사용자 매뉴얼·릴리스 노트':['사용자 매뉴얼','릴리스 노트']
    };
    return label.split(' · ').flatMap(part => {
      if (bundles[part]) return bundles[part];
      const pm = part.match(/^(.*) WBS·리스크·의사결정 기록$/);
      if (pm) return [pm[1]+' WBS',pm[1]+' 위험대장',pm[1]+' 의사결정 기록'];
      const po = part.match(/^(.*) 제품 백로그·업무 승인기준$/);
      if (po) return [po[1]+' 제품 백로그',po[1]+' 업무 승인기준'];
      const api = part.match(/^(.*API) 명세·구현$/);
      if (api) return [api[1]+' 명세',api[1]+' 구현 코드'];
      if (!part.includes('·')) return [part];
      const pieces=part.split('·').map(x=>x.trim());
      const last=pieces[pieces.length-1];
      const suffix=last.match(/ (정책|규칙서|사전|분류체계|인벤토리|구성도|대시보드|API|UI|어댑터|시험서|보고서|계획서|기준|아키텍처)$/)?.[1];
      return pieces.map((piece,index)=>index<pieces.length-1 && suffix && !/(코드|모델|보고서|계획서|명세|헌장|WBS|ERD|API|UI|결과)$/.test(piece) ? piece+' '+suffix : piece);
    }).filter(Boolean);
  };
  const build = c => {
    const n = c.name;
    const rag = /RAG|검색|지식|프롬프트|Vector/.test(n+' '+c.phase);
    const order = /주문|모의|증권|계좌|매매/.test(n+' '+c.phase);
    const allocation = /성향|배분|리밸런싱|포트폴리오/.test(n+' '+c.phase);
    const subject = rag ? '금융 문서 검색' : order ? '모의 주문' : allocation ? '자산배분' : '이동평균 전략';
    const endpoint = rag ? '/api/rag/query' : order ? '/api/paper/orders' : allocation ? '/api/portfolios/rebalance' : '/api/backtests';
    const input = rag ? '{"question":"ETF의 분산 효과는?","top_k":3}' : order ? '{"symbol":"005930","side":"buy","qty":10,"mode":"paper"}' : allocation ? '{"profile":"balanced","weights":{"stock":0.6,"bond":0.4}}' : '{"symbol":"005930","fast":5,"slow":20,"fee_bps":10}';
    const output = rag ? '{"answer":"여러 자산에 투자해 개별 위험을 낮춥니다.","sources":["DOC-003#p2"]}' : order ? '{"order_id":"P-001","status":"accepted","mode":"paper"}' : allocation ? '{"stock":0.6,"bond":0.4,"turnover":0.08}' : '{"run_id":"BT-001","return":0.1,"mdd":-0.1}';
    const d = {title:n, id:'EX-'+(rag?'RAG':order?'ORD':allocation?'ALC':'QNT')+'-001', summary:'', headers:[], rows:[], notes:[], code:''};
    const table = (summary, headers, rows, notes=[]) => Object.assign(d,{summary,headers,rows,notes});
    if (/업무 승인기준|DoD/.test(n)) return table(subject+' 업무 승인 및 완료 기준', ['조건 ID','필수 조건','검수 증거','승인'], [['AC-01','정상 입력 fixture 처리 성공','TC-01 PASS','PO 1번 / 적합'],['AC-02','잘못된 입력 오류 처리','TC-02 PASS','PO 1번 / 적합'],['AC-03','결과 원천·버전 추적 가능','run_id BT-001 / v0.1','PM 2번 / 적합']], ['필수 3개 모두 적합 시 완료 / 미해결 치명 결함 0건']);
    if (/기술 인벤토리/.test(n)) return table('TECH-01 / 보유 기술·도구 조사표', ['도구','버전','사용 범위','상태'], [['Python','3.12','API·계산 코드','샘플 실행 확인'],['PostgreSQL','16','문서·결과 저장','테이블 fixture 준비'],['Qdrant','1.15','벡터 검색','컬렉션 finance_docs 준비']], ['조사 담당: PM 2번 / 조사 기준일: 2026-10-01']);
    if (/결함대장/.test(n)) return table('시험 회차 QA-02의 결함 등록 및 조치 기록', ['ID·증상','심각도·재현','담당','조치·상태'], [
      ['BUG-001 / 빈 종목 조회 시 500','높음 / symbol=""','개발 4번','입력 검증 추가 / 종료'],
      ['BUG-002 / 주문 버튼 중복 요청','높음 / 연속 2회 클릭','개발 4번','request_id 멱등 처리 / 재시험 통과'],
      ['BUG-003 / 출처 링크 미표시','중간 / 근거 0건','데이터 3번','응답 필드 보완 / 검토 중']], ['재시험: QA-03 / 종료 2건, 미종료 1건 / 인수 전 BUG-003 해소 필요']);
    if (/위험대장/.test(n)) return table('착수 회의에서 등록한 프로젝트 위험', ['위험 ID','가능성·영향','대응·담당','잔여 상태'], [
      ['R-01 / 시세 API 호출 제한','높음·중간','캐시 60초 / 개발 4번','대응 중'],['R-02 / 검증 구간 데이터 부족','중간·높음','구간 확대 / 퀀트 3번','재검토 10/12'],['R-03 / 인증서 갱신 실패','낮음·높음','만료 30일 전 알림 / PM 2번','관제 등록']], ['위험 검토일: 2026-10-12 / 실주문은 프로젝트 범위에서 제외']);
    if (/칸반|백로그/.test(n)) return table(subject+' 스프린트 1 백로그 스냅샷', ['카드','우선순위','담당·추정','진행 상태'], [
      ['ST-01 / '+subject+' 입력 검증','P0','개발 4번 / 4h','완료'],['ST-02 / '+subject+' 결과 저장','P0','개발 4번 / 4h','진행 중'],['ST-03 / 실패 응답 회귀시험','P1','퀀트 3번 / 2h','검토 대기']], ['스프린트 목표: 입력부터 결과 조회까지 1개 수직 흐름 완성']);
    if (/WBS|작업계획|스프린트/.test(n)) return table(subject+' 작업분해 및 담당 확정본', ['WBS·작업','기간·공수','담당·선행','완료 산출물'], [
      ['1.1 / 입력 계약 확정','10/01 오전 / 4h','PM 2번 / 없음','API 계약 v0.1'],['1.2 / '+subject+' 구현','10/01 오후 / 4h','개발 4번 / 1.1','실행 패키지 v0.1'],['1.3 / 정상·오류 시험','10/02 오전 / 4h','퀀트 3번 / 1.2','TC-01~03 결과'],['1.4 / 검수','10/02 오후 / 2h','PO 1번 / 1.3','인수확인서']], ['예시 일정 기준: 각 작업 공수는 담당자 개인 기준 / 병렬 작업 제외']);
    if (/ERD|스키마|데이터 사전/.test(n)) return table('PostgreSQL 논리 데이터 모델 v0.1', ['테이블·필드','자료형','키·제약','예시 값'], rag ? [
      ['document.document_id','uuid','PK / NOT NULL','doc-003'],['document.source_url','text','NOT NULL','https://example.org/etf'],['chunk.document_id','uuid','FK → document','doc-003'],['chunk.content','text','NOT NULL','ETF는 여러 자산에…']] : [
      ['instrument.symbol','varchar(12)','PK','005930'],['price_bar.symbol','varchar(12)','FK → instrument','005930'],['price_bar.ts','timestamptz','복합 PK: symbol, ts','2026-10-01 09:00+09'],['price_bar.close','numeric(18,4)','CHECK(close > 0)','70000.0000']], [rag?'관계: document 1:N chunk / 문서 삭제 시 청크도 삭제':'관계: instrument 1:N price_bar / 인덱스: (symbol, ts DESC)', '예시 ID는 설명용 약식 표기']);
    if (/ADR|의사결정/.test(n)) return table('ADR-003 / 시계열 결과 저장소 선정 / 상태: 승인', ['대안','판단 근거','운영 비용','결정'], [
      ['PostgreSQL','트랜잭션·SQL 대사 지원','기존 DB 운영 재사용','채택'],['CSV 파일','동시 기록·검색 제약','초기 비용 낮음','실험 내보내기 전용'],['별도 시계열 DB','집계는 유리, 운영 추가','신규 관제 필요','보류']], ['결정일: 2026-10-02 / 결정자: PM 2번 / 재검토: 일 100만 건 초과']);
    if (/API 구현 코드/.test(n)) {
      table(subject+' API 구현 샘플 / demo_api.py', ['파일','내용'], [['demo_api.py','요청 입력 검사와 응답 반환'],['fixture.json',input],['response.json',output]], ['외부 API 호출 없이 fixture를 반환하는 교육용 코드']);
      d.code='import json\n\ndef handle(payload):\n    if not payload:\n        raise ValueError("EMPTY_INPUT")\n    return json.loads('+JSON.stringify(output)+')\n\nassert isinstance(handle({"demo": True}), dict)';
      return d;
    }
    if (/프롬프트 템플릿/.test(n)) return table('PROMPT-01 / 금융 RAG 답변 프롬프트', ['구분','프롬프트 본문'], [['시스템','제공된 근거 문서에만 기반해 답변한다.'],['근거','[DOC-003] ETF는 여러 자산에 분산 투자한다.'],['질문','ETF의 분산 효과는?'],['출력','답변 뒤에 [DOC-003]을 표시한다. 근거가 없으면 답변을 보류한다.']], ['프롬프트 버전 v0.1 / 교육용 fixture']);
    if (/API|어댑터|Webhook/.test(n)) {
      table('POST '+endpoint+' / 계약 버전 v0.1', ['항목','정의','실제 예시'], [
        ['인증','Bearer 토큰 필요','Authorization: Bearer <DEMO>'],['요청','Content-Type: application/json',input],['성공','HTTP 200 또는 비동기 202',output],['오류','잘못된 입력: 422','{"code":"INVALID_INPUT","field":"symbol"}']], ['타임아웃: 10초 / 동일 request_id는 동일 응답 / 외부 API 호출은 스텁 사용']);
      return d;
    }
    if (/모델 카드/.test(n)) return table('MODEL-MA-01 / 모델 카드 / 검토 상태: 교육용 승인', ['항목','기록 값'], [
      ['모델·버전','MA 교차 신호 / v0.1 / fast=5, slow=20'],['학습·선정 구간','2024-01~2024-12 / 파라미터 탐색 전용'],['검증 구간','2025-01~2025-06 / 선정 후 1회 평가'],['용도·제한','모의투자 학습 / 실주문·수익 보장 금지'],['관제','결측 비율 > 1%이면 신호 생성 중지']], ['예시 승인자: PO 1번 / 검토일: 2026-10-15']);
    if (/성과지표|성과 대사표|계산서|계산 검증표|KPI/.test(n)) return table('BT-001 / 성과 산식 및 대사 계산서', ['지표','입력·산식','결과','판정'], [
      ['누적수익률','100 → 110 / 110÷100−1','10.00%','기준값과 일치'],['최대낙폭','고점 100 → 저점 90','−10.00%','오차 0.00%p'],['승률','수익 거래 6 / 전체 10','60.00%','기준값과 일치'],['거래비용','매수 100 + 매도 110 / 10bps','0.21','양방향 반영']], ['가상 자산가치·거래 데이터 / 비용 차감 전 수익률과 거래비용을 별도 표기']);
    if (/SHAP|XAI/.test(n)) return table('XAI-001 / 자산배분 추천 설명 기록', ['피처','입력 값','기여값','설명'], [
      ['투자기간','5년','+0.12','장기 투자 여력'],['손실 허용도','10%','−0.08','위험 비중 축소'],['비상자금','6개월','+0.04','유동성 제약 완화'],['추천 출력','주식 60% / 채권 40%','기준 0.50 + 합계 0.08','모형 출력 0.58']], ['설명용 선형 모형의 가상 기여값 / SHAP 실측값 아님 / 추천은 모의 예시']);
    if (/성능|비용|목표서/.test(n)) return table('PERF-01 / '+subject+' 부하·비용 평가', ['측정 항목','시험 조건','관측 값','목표·판정'], [['API 응답 p95','동시 사용자 10 / 100회','1.4초','2초 이하 / PASS'],['처리량','동시 작업 4 / 60초','120건/분','100건/분 이상 / PASS'],['오류율','요청 100건','1건 / 1.0%','0.5% 이하 / FAIL'],['실험 비용','가상 단가 0.01원 × 100건','1원','회당 2원 이하 / PASS']], ['측정 환경: demo / cold start 제외 / 가상 측정 기록 / 오류 1건 원인 조사']);
    if (/최적화|강건성|스트레스|백테스트 결과/.test(n)) return table('EXP-01 / '+subject+' 구간 비교 보고서', ['실험·조건','수익률','MDD','판정'], [['기준 / MA(5,20)','+10.0%','−10.0%','검증 구간 기준'],['수수료 10 → 20bps','+8.2%','−10.8%','비용 증가 시 성과 감소'],['검증 구간 / 2025-01~06','+4.1%','−8.0%','선정 구간보다 성과 하락'],['충격 / 가격 일괄 −20%','−18.5%','−22.0%','손실한도 15% 초과']], ['가상 실험 결과 / 선정 구간: 2024년 / 검증 구간 재탐색 없음', '결론: 충격 시 손실한도를 초과하므로 해당 설정은 승인 보류']);
    if (/배포 계획|이관/.test(n)) return table('CUT-01 / 모의환경 전환 계획', ['시각·단계','실행 대상','담당','완료·중단 조건'], [['13:00 / 백업','demo DB snapshot DEMO-01','PM 2번','백업 파일 확인'],['13:20 / 이관','이미지 demo:0.1.0 / 스키마 v2','개발 4번','마이그레이션 성공'],['13:40 / 검수','조회·모의주문 TC-01~03','퀀트 3번','필수 3건 모두 통과'],['14:00 / 승인','사용자 접근 전환','PO 1번','실패 시 demo:0.0.9 복원']], ['예시 전환일: 2026-10-16 / 점검 시간 60분 / 실계좌 접근 차단']);
    if (/실험계획|시험.*계획|시나리오|평가셋/.test(n)) return table(subject+' 평가계획 EP-01 / 실행 전 확정본', ['사례 ID','입력·조건','기대값','통과 기준'], rag ? [
      ['RAG-01','ETF 분산 효과 질문','DOC-003 인용 포함','출처 ID 정확 일치'],['RAG-02','문서에 없는 수익 보장 질문','답변 보류','근거 없는 수치 0건'],['RAG-03','빈 질문','422 응답','검색 호출 0회']] : [
      ['TC-01','가격 [100,101,102], window=2','평균 [100.5,101.5]','오차 < 1e−8'],['TC-02','가격 데이터 0건','EMPTY_DATA 오류','주문 생성 0건'],['TC-03','같은 request_id 2회','결과 ID 동일','중복 저장 0건']], ['환경: Python 3.12 / 고정 seed=42 / fixture=demo-v1']);
    if (/보안|권한|개인정보/.test(n)) return table('SEC-01 / 보안 통제 기준 및 점검 기록', ['통제 ID','적용 기준','점검 결과','상태'], [['SEC-01','미인증 요청 401','토큰 없음 → 401','통과'],['SEC-02','로그에 토큰 원문 금지','로그 100행 / 토큰 노출 0건','통과'],['SEC-03','일반 사용자 타 계좌 접근 금지','DEMO-002 조회 → 403','통과']], ['점검일: 2026-10-15 / 예시 대상: demo 환경']);
    if (/복구.*결과|복구.*시험/.test(n)) return table('DR-TEST-01 / 백업 복구 시험 결과', ['시험','기대값','관측값','판정'], [['백업 파일 검사','압축 무결성 정상','checksum 일치','PASS'],['DB 복원','fixture 252행','252행 / 누락 0건','PASS'],['서비스 재접속','/health 200','HTTP 200 / status=ok','PASS'],['복구 소요','RTO 30분 이내','18분 20초','PASS']], ['가상 시험 환경: demo / 백업: DEMO-01 / 시험일: 2026-10-15']);
    if (/시험|테스트|검증|QA|보고서|결과|분석서|벤치마크|리포트/.test(n)) return table(subject+' 검증 결과 / 실행 ID DEMO-20261015-01', ['시험 ID·조건','기대 결과','관측 결과','판정·증거'], rag ? [
      ['RAG-01 / ETF 질문','DOC-003 인용','DOC-003#p2 반환','PASS / rag-01.json'],['RAG-02 / 근거 없음','답변 보류','근거 부족 응답','PASS / rag-02.json'],['RAG-03 / 빈 질문','HTTP 422','HTTP 500','FAIL / bug-001.log']] : order ? [
      ['ORD-01 / 모의 매수 10주','모의 주문 1건','P-001 / 10주','PASS / ord-01.json'],['ORD-02 / 동일 요청 2회','주문 1건 유지','P-001 재반환','PASS / ord-02.json'],['ORD-03 / 음수 수량','422 / 주문 0건','422 / 주문 0건','PASS / ord-03.json']] : [
      ['MA-01 / [100,102,104], n=2','[101,103]','[101,103]','PASS / ma-01.json'],['MA-02 / 결측 포함','결측 오류','EMPTY_VALUE','PASS / ma-02.json'],['MA-03 / n=0','입력 오류','0 반환','FAIL / bug-002.log']], ['위 기록은 작성 예시용 가상 실행 결과 / FAIL 항목은 수정 후 재시험 대상']);
    if (/런북|인수인계|운영·DR|복구/.test(n)) {
      table('RUN-001 / API 장애 대응 / 담당: PM 2번', ['단계','실행 내용','관측 예시','다음 조치'], [
        ['1 / 장애 확인','curl -f http://api:8000/health','HTTP 503','API 로그 점검'],['2 / 로그 확인','docker compose logs --tail=50 api','DB connection timeout','DB 연결 확인'],['3 / 복원','docker compose restart api','api started','헬스 재확인'],['4 / 종료','curl -f http://api:8000/health','200 / status=ok','장애 기록 종료']], ['예시 RTO: 30분 / RPO: 24시간 / 데이터 복원은 백업 담당 승인 후 시행']); return d;
    }
    if (/CI|CD|릴리스|배포본|운영 배포/.test(n)) {
      table('REL-0.1 / 모의환경 배포 기록', ['항목','확정 값'], [['이미지','demo/finance-portal:0.1.0'],['배포 환경','demo / 모의 주문만 허용'],['시험','단위 12/12, 통합 3/3 통과'],['헬스 확인','GET /health → 200 / status=ok'],['롤백 대상','demo/finance-portal:0.0.9']], ['배포일: 2026-10-16 14:00 KST / 승인: PO 1번 / 가상 배포 기록']);
      d.code='name: demo-ci\non: [push]\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-python@v5\n        with: {python-version: "3.12"}\n      - run: pip install -r requirements.txt\n      - run: python -m pytest -q'; return d;
    }
    if (/아키텍처|구성도|파이프라인|인덱스|데이터마트/.test(n)) return table('ARCH-01 / '+subject+' 구성 명세 v0.1', ['컴포넌트','접속·입출력','저장·관계','운영 설정'], rag ? [
      ['문서 수집','PDF → document_id','PostgreSQL.document','UTF-8 / 원문 URL 저장'],['청크 처리','document_id → chunk_id','문서 1:N 청크','500자 / overlap 50자'],['벡터 색인','chunk_id → embedding','Qdrant.finance_docs','cosine / 384차원'],['질의 API',endpoint,'상위 3청크 → 답변','출처 없는 답변 보류']] : [
      ['시세 수집','OHLCV / 일봉','price_bar','Asia/Seoul / 일 1회'],['지표 계산','종가 → MA(5), MA(20)','indicator_value','시점 이전 데이터만 입력'],['백테스트','신호 → 모의 체결','backtest_run / trade','거래비용 10bps'],['조회 API',endpoint,'run_id → 결과','응답 캐시 60초']], ['논리 연결: 수집 → 저장 → 계산 → 결과 조회 / 구성 변경 승인: PM 2번']);
    if (/코드|모듈|스캐폴드|빌드|모델$|재현 패키지|서비스|엔진|연동본|저장소|도구/.test(n)) {
      table(subject+' 구현 패키지 v0.1', ['파일','내용·실행 예시'], [['src/demo.py','입력 검증 및 '+subject+' 샘플 처리'],['tests/test_demo.py','정상 1건·오류 1건 fixture'],['fixtures/demo.json',input],['README.md','python -m pytest / 외부 API는 스텁']], ['기술 스택: Python 3.12 / 표준 라이브러리 / 학습용 최소 구현']);
      d.code=rag ? 'def retrieve(question, documents):\n    if not question.strip():\n        raise ValueError("EMPTY_QUESTION")\n    return [d for d in documents if question in d["text"]][:3]\n\nassert retrieve("ETF", [{"id":"DOC-003", "text":"ETF 분산"}])[0]["id"] == "DOC-003"' : order ? 'def paper_order(symbol, qty):\n    if qty <= 0:\n        raise ValueError("INVALID_QTY")\n    return {"mode": "paper", "symbol": symbol, "qty": qty}\n\nassert paper_order("005930", 10)["mode"] == "paper"' : allocation ? 'def rebalance(current, target):\n    if abs(sum(target.values()) - 1) > 1e-8:\n        raise ValueError("INVALID_WEIGHTS")\n    return {k: target[k] - current.get(k, 0) for k in target}\n\nassert rebalance({"stock":0.5}, {"stock":0.6,"bond":0.4})["bond"] == 0.4' : 'def moving_average(prices, window):\n    if window <= 0 or len(prices) < window:\n        raise ValueError("INVALID_WINDOW")\n    return [sum(prices[i-window:i])/window\n            for i in range(window, len(prices)+1)]\n\nassert moving_average([100, 102, 104], 2) == [101, 103]'; return d;
    }
    if (/사용자 스토리|IA|와이어프레임|화면|UI|차트|대시보드|시각화/.test(n)) return table('SCREEN-01 / '+subject+' 화면 설계서', ['화면 요소','표시 값·동작','상태 예시'], rag ? [
      ['질문 입력','ETF의 분산 효과는?','입력 완료'],['답변 카드','여러 자산에 투자해 개별 위험을 낮춥니다.','검색 완료'],['근거 목록','DOC-003 / ETF 안내 / 2쪽','출처 링크 1개'],['오류 배너','근거를 찾지 못했습니다. 질문을 바꿔 주세요.','검색 결과 0건']] : order ? [
      ['계좌 배지','DEMO-001 / 모의계좌','모의 모드'],['주문 입력','005930 / 매수 / 10주','승인 대기'],['주문 이력','P-001 / accepted / 10주','접수'],['오류 배너','수량은 1 이상이어야 합니다.','qty=0']] : [
      ['필터','005930 / 2025-01~2025-06','조회 완료'],['성과 카드','수익률 +10.0% / MDD −10.0%','가상 결과'],['전략 설정','MA fast=5 / slow=20','저장됨'],['오류 배너','선택 기간의 데이터가 없습니다.','빈 결과']], ['시안 버전: 0.1 / 화면 ID: SCREEN-01 / 검수: PO 1번']);
    if (/매뉴얼|발표/.test(n)) return table('USER-01 / '+subject+' 사용자 안내 v0.1', ['절','본문'], [['1. 시작','데모 계정으로 로그인하고 '+subject+' 메뉴를 선택한다.'],['2. 입력','예제 종목 005930, 조회 기간 2025-01~06을 선택한다.'],['3. 결과 확인','결과 표의 실행 ID와 데이터 기준일을 확인한다.'],['4. 오류 대응','EMPTY_DATA이면 기간을 확대하고 다시 조회한다.']], ['교육용 계정만 사용 / 지원 담당: PM 2번']);
    if (/헌장|과업|완료|인수확인/.test(n)) return table('PRJ-001 / '+c.project+' 프로젝트 승인 문서', ['항목','확정 내용'], [['목표',subject+'의 입력·처리·검증 결과를 재현 가능한 웹앱으로 제공'],['포함 범위','모의 데이터 조회, 결과 저장, 기준 대사'],['제외 범위','실제 계좌 주문, 투자 수익 보장'],['인수 조건','필수 요구사항 3개 통과 / 치명 결함 0건'],['승인','PO 1번 / 2026-10-16 / 조건부 승인']], ['잔여 조건: 근거 링크 결함 1건 수정 후 최종 인수']);
    // Filled specification rows, rather than instructions for writing a specification.
    if (/사전|피처|지표|규격/.test(n)) return table('FEAT-01 / 피처·지표 명세 v0.1', ['변수','정의·산식','자료형·단위','예시'], [['close','일봉 종가','float / KRW','70000'],['ma_5','최근 5개 종가 산술평균','float / KRW','69800'],['return_1d','close[t]/close[t−1]−1','float / 비율','0.012'],['signal','ma_5 > ma_20이면 1','int / {0,1}','1']], ['시간 기준: Asia/Seoul / 종가 확정 후 계산 / 미래 데이터 사용 금지']);
    if (/데이터|인벤토리|분류|목록/.test(n)) return table('DATA-01 / 원천 데이터 등록대장', ['데이터','원천·주기','보관·담당','검사 결과'], [['일봉 OHLCV','demo-prices.csv / 일 1회','price_bar / 개발 4번','252행 / 결측 0건'],['금융 문서','demo-docs/ / 주 1회','document / 데이터 3번','12건 / 중복 0건'],['실험 결과','demo-runs/ / 실행마다','backtest_run / 퀀트 3번','3건 / ID 중복 0건']], ['수집 기준일: 2026-10-01 / 모든 파일은 교육용 fixture']);
    if (/요구사항|스토리/.test(n)) return table('REQ-01 / '+subject+' 요구사항 정의서', ['요구사항 ID','요구 내용','인수 기준','우선순위'], [['FR-01',subject+' 입력값을 검증한다.','빈 입력 → 422 응답','필수'],['FR-02','실행 결과에 고유 ID를 부여한다.','중복 요청 시 같은 ID 반환','필수'],['FR-03','결과와 원천 기준일을 함께 표시한다.','조회 화면에 기준일 표시','필수'],['NFR-01','데모 조회 응답시간을 제한한다.','100회 조회 p95 < 2초','권장']], ['요청: PO 1번 / 검토: PM 2번 / 기준 버전: v0.1']);
    return table('SPEC-01 / '+n+' / 승인된 예시 기준', ['기준 ID','확정 기준','검증 사례','책임'], rag ? [
      ['RAG-01','답변마다 문서 ID 1개 이상','DOC-003 인용 답변 / 적합','PO 1번'],['RAG-02','근거 0건이면 답변 보류','검색 0건 / 보류 / 적합','퀀트 3번'],['RAG-03','문서 기준일 함께 표기','2026-10-01 표시 / 적합','개발 4번']] : order ? [
      ['ORD-01','모의계좌만 허용','mode=paper / 적합','PO 1번'],['ORD-02','수량은 양의 정수','qty=0 / 422 / 적합','개발 4번'],['ORD-03','같은 요청은 1건만 저장','P-001 재요청 / 1건 / 적합','퀀트 3번']] : allocation ? [
      ['ALC-01','전체 비중 합계 100%','주식 60% + 채권 40% / 적합','퀀트 3번'],['ALC-02','단일 자산 비중 ≤ 60%','주식 60% / 적합','PO 1번'],['ALC-03','비중 이탈 5%p 이상 조정','목표 60%, 현재 50% / 조정','개발 4번']] : [
      ['QNT-01','fast < slow','5 < 20 / 적합','퀀트 3번'],['QNT-02','결측 종가는 계산 제외','결측 1건 / 제외 / 적합','개발 4번'],['QNT-03','거래비용 양방향 10bps','매수·매도 각각 반영 / 적합','PO 1번']], ['적용 환경: 교육용 demo / 승인일: 2026-10-02 / 버전: v0.1']);
  };
  return Object.freeze({build, split});
})();
