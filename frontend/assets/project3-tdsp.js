(() => {
  'use strict';
  const esc = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const sources = {
    overview:'https://github.com/Azure/Microsoft-TDSP/blob/master/Docs/README.md',
    lifecycle:'https://github.com/Azure/Microsoft-TDSP/blob/master/Docs/lifecycle-detail.md',
    template:'https://github.com/Azure/Azure-TDSP-ProjectTemplate'
  };
  const stages = [
    ['사업 이해','Business Understanding','문제·성공 지표·데이터 소스를 합의하고, 프로젝트 헌장을 계속 갱신합니다.','프로젝트 헌장 · 데이터 소스 · 데이터 사전'],
    ['데이터 수집·이해','Data Acquisition and Understanding','수집·정제·탐색으로 품질과 문제 해결 가능성을 확인하고 데이터 파이프라인을 설계합니다.','데이터 품질 보고서 · 파이프라인 구조'],
    ['모델링','Modeling','피처와 기준 모델을 만들고 실험·검증을 반복해 사용할 모델을 선택합니다.','모델 보고서 · 실험 조건 · 평가 결과'],
    ['배포','Deployment','선정한 모델과 데이터 처리 코드를 사용 가능한 서비스에 연결합니다.','배포 코드 · 서비스 연동 · 운영 설명'],
    ['고객 인수','Customer Acceptance','사용자 관점에서 목표 달성과 인수 조건을 검토하고 결과·학습 내용을 정리합니다.','인수 확인 · 프로젝트 종료 보고서']
  ];
  const officialTree = `Azure-TDSP-ProjectTemplate/
├── Code/
│   ├── Data_Acquisition_and_Understanding/
│   ├── Modeling/
│   └── Deployment/
├── Docs/
│   ├── Project/
│   │   ├── Charter.md
│   │   └── Exit Report.md
│   ├── Data_Dictionaries/
│   ├── Data_Report/
│   │   └── DataSummaryReport.md
│   └── Model/
│       ├── Baseline/
│       └── FinalReport.md
├── Sample_Data/
│   ├── Raw/
│   ├── Processed/
│   └── For_Modeling/
└── README.md`;
  const adaptedTree = `project3-indicator/                 # 프로젝트3 적용 예시
├── Code/
│   ├── Data_Acquisition_and_Understanding/
│   │   ├── ingest_dart.py          # 공시 수집
│   │   └── validate_prices.py      # 결측·중복·시점 검사
│   ├── Modeling/
│   │   ├── indicators.py          # 지표·신호 계산
│   │   ├── backtest.py            # 비용 반영 백테스트
│   │   └── walk_forward.py        # 구간별 검증
│   ├── Deployment/
│   │   └── api.py                 # 지표 조회 API
│   └── tests/                     # 예시 확장
├── Docs/
│   ├── Project/
│   │   ├── Charter.md             # 목표·범위·역할·KPI
│   │   ├── wbs.md                 # 작업·일정·담당 (확장)
│   │   └── Exit Report.md         # 결과·인수·회고
│   ├── Data_Dictionaries/
│   │   └── schema.md              # 컬럼·단위·기준 시각
│   ├── Data_Report/
│   │   └── DataSummaryReport.md   # 품질·정제·탐색
│   └── Model/
│       ├── Baseline/
│       └── FinalReport.md         # 전략·비용·성과·한계
├── Sample_Data/
│   ├── Raw/                      # 소량 예제 입력
│   ├── Processed/                # 정제 예제
│   └── For_Modeling/              # 검증용 예제
└── README.md                     # 재현·실행 방법`;
  let current;
  document.addEventListener('click', event => {
    const trigger=event.target.closest('[data-project3-tdsp]');
    if(!trigger || current)return;
    const wbs=window.Day4ProjectSchedule.getProject3Wbs();
    const mappings=[
      ['사업 이해',['착수·범위','요구사항','일정·분담'],'수익률만이 아니라 비용·MDD·재현성 등 평가 기준과 목표 사용자를 먼저 합의합니다.'],
      ['데이터 수집·이해',['데이터·화면 설계','시장 데이터 엔진','데이터 품질'],'시세·재무 자료의 출처·시점·단위와 수집 실패·정합성 검사 결과를 남깁니다.'],
      ['모델링',['기본 전략','커스텀 지표','백테스트','전략 최적화','Pine 교차검증','백테스트 대사','강건성 검증'],'투자 지표·전략을 분석 대상으로 삼고, 기준 전략·기간 분할·비용 가정을 기록합니다. ML을 쓰지 않는 항목은 적용 방식 또는 해당 없음을 명시합니다.'],
      ['배포',['AWS 배포'],'실행 환경·지표 버전·API·관제·복구 방법을 함께 인계합니다.'],
      ['고객 인수',['UAT·파일럿','인수·지식이전'],'사용자 시나리오·기준 충족 여부·남은 이슈·재현 패키지를 종료 보고서로 연결합니다.']
    ];
    const dialog=document.createElement('dialog');current=dialog;dialog.id='project3TdspDialog';dialog.setAttribute('aria-labelledby','project3TdspTitle');
    dialog.innerHTML=`<header class="tdsp-header"><div><span>MICROSOFT · TEAM DATA SCIENCE PROCESS</span><h2 id="project3TdspTitle">TDSP · 팀 데이터 과학 프로세스</h2></div><button type="button" data-tdsp-close aria-label="TDSP 닫기">닫기 ×</button></header>
      <div class="tdsp-tabs" role="tablist" aria-label="TDSP 안내"><button id="tdspTab-process" role="tab" aria-controls="tdspPanel-process" aria-selected="true" data-tdsp-tab="process">MS 제안 내용</button><button id="tdspTab-folders" role="tab" aria-controls="tdspPanel-folders" aria-selected="false" tabindex="-1" data-tdsp-tab="folders">폴더 구조</button><button id="tdspTab-project" role="tab" aria-controls="tdspPanel-project" aria-selected="false" tabindex="-1" data-tdsp-tab="project">프로젝트3 적용 예시</button></div>
      <div class="tdsp-content"><section id="tdspPanel-process" role="tabpanel" aria-labelledby="tdspTab-process"><p class="tdsp-intro">TDSP는 팀이 데이터 기반 문제를 해결하면서 가설·데이터·모델을 반복 검증하도록 정리한 방법론입니다. Microsoft 공개 문서의 핵심을 요약했습니다. <a href="${sources.overview}" target="_blank" rel="noopener">공식 개요 ↗</a></p>
      <h3>Microsoft가 제안하는 4가지 구성</h3><div class="tdsp-pillars">${[['생명주기','사업 목표에서 인수까지의 흐름을 공유합니다.'],['표준 프로젝트 구조','코드·문서·예제 데이터의 위치를 통일하고 버전 관리합니다.'],['분석 인프라·자원','데이터·연산 환경을 공유해 분석을 재현할 수 있게 합니다.'],['도구·유틸리티','반복 작업을 자동화하고 팀의 분석 도구를 함께 활용합니다.']].map(([title,text],i)=>`<article><b>0${i+1} · ${title}</b><p>${text}</p></article>`).join('')}</div>
      <h3>반복적으로 수행하는 5단계</h3><div class="tdsp-stages">${stages.map(([title,en,goal,output],i)=>`<article><span>0${i+1}</span><div><h4>${title} <small>${en}</small></h4><p>${goal}</p><p class="tdsp-output">산출물 · ${output}</p></div></article>`).join('')}</div><p class="tdsp-note">품질이나 목표 달성이 부족하면 앞 단계로 돌아가 보완합니다. 아래 프로젝트3 매핑은 교육용 적용 예시이며 Microsoft의 공식 프로젝트 일정이 아닙니다. <a href="${sources.lifecycle}" target="_blank" rel="noopener">공식 생명주기 설명 ↗</a></p></section>
      <section id="tdspPanel-folders" role="tabpanel" aria-labelledby="tdspTab-folders" hidden><h3>Microsoft 공식 템플릿의 기본 골격</h3><p>공식 저장소의 주요 경로를 추린 구조입니다. 문서와 실행 코드를 분리하고, 예제 데이터의 처리 단계를 구분합니다. <a href="${sources.template}" target="_blank" rel="noopener">공식 템플릿 전체 보기 ↗</a></p><pre tabindex="0" aria-label="Microsoft TDSP 공식 폴더 구조"><code>${esc(officialTree)}</code></pre><div class="tdsp-folder-notes"><p><b>Code/</b> · 수집·탐색, 모델링, 배포 코드</p><p><b>Docs/</b> · 목표·범위, 데이터 사전·품질, 모델·종료 보고</p><p><b>Sample_Data/</b> · 원시 → 정제 → 모델링 예제 데이터</p></div><p class="tdsp-note">구조와 템플릿은 팀에 맞게 조정합니다. 이 예시에서는 비밀값·개인정보와 대용량 원본 데이터를 Git에 포함하지 않고 별도 저장소 참조를 문서화합니다.</p></section>
      <section id="tdspPanel-project" role="tabpanel" aria-labelledby="tdspTab-project" hidden><h3>현재 프로젝트3 일정에 연결하기</h3><p>기존 WBS와 같은 작업 데이터를 읽어 연결했습니다. SDLC는 전체 소프트웨어 개발 흐름, TDSP는 데이터·분석 실험의 목표와 재현 근거를 정리하는 관점으로 함께 활용합니다.</p><div class="tdsp-map">${mappings.map(([title,phases,text])=>`<article><h4>${title}</h4><p>${text}</p><ul>${wbs.tasks.filter(t=>phases.includes(t.phase)).map(t=>`<li><b>${esc(t.id)}</b> ${esc(t.date)} ${esc(t.period)} · ${esc(t.phase)}</li>`).join('')}</ul></article>`).join('')}</div><h3>투자 인디케이터 프로젝트 폴더 예시</h3><p>공식 골격에 프로젝트용 파일과 <b>tests/·wbs.md</b> 등을 추가한 예시입니다. 아래 파일을 현재 저장소에 생성하는 기능은 아닙니다.</p><pre tabindex="0" aria-label="프로젝트3 TDSP 적용 폴더 예시"><code>${esc(adaptedTree)}</code></pre></section></div>
      <div class="tdsp-sources" role="note">출처: <a href="${sources.overview}" target="_blank" rel="noopener">Microsoft TDSP 개요</a> · <a href="${sources.lifecycle}" target="_blank" rel="noopener">5단계 생명주기</a> · <a href="${sources.template}" target="_blank" rel="noopener">프로젝트 템플릿</a><small>Microsoft Azure 공식 공개 보관 저장소 기준 · 2023-10-12 보관 · 자료 확인 2026-10-22</small></div>`;
    document.body.append(dialog);
    const tabs=[...dialog.querySelectorAll('[data-tdsp-tab]')];
    function select(button){tabs.forEach(tab=>{const active=tab===button;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;document.getElementById('tdspPanel-'+tab.dataset.tdspTab).hidden=!active;});dialog.querySelector('.tdsp-content').scrollTop=0;}
    tabs.forEach((button,index)=>{button.addEventListener('click',()=>select(button));button.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(index+(e.key==='ArrowRight'?1:tabs.length-1))%tabs.length;tabs[next].focus();select(tabs[next]);});});
    dialog.addEventListener('click',e=>{if(e.target.closest('[data-tdsp-close]'))dialog.close();if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
    dialog.addEventListener('close',()=>{dialog.remove();current=null;trigger.focus();},{once:true});dialog.showModal();
  });
})();
