(function () {
  'use strict';

  // 학습용 목록입니다. 실시간 시세·투자의견·매수 추천이 아닙니다.
  const rows = {
    1: `KOSPI|삼성전자|반도체\nKOSPI|SK하이닉스|반도체\nKOSPI|LG전자|전자·가전\nKOSPI|삼성SDI|배터리\nKOSPI|LG에너지솔루션|배터리\nKOSPI|현대차|자동차\nKOSPI|기아|자동차\nKOSPI|HD현대|산업재\nKOSPI|현대모비스|자동차부품\nKOSPI|POSCO홀딩스|소재\nKOSPI|LG화학|소재\nKOSPI|롯데케미칼|소재\nKOSPI|한화솔루션|에너지·소재\nKOSPI|두산에너빌리티|전력·원전\nKOSPI|삼성바이오로직스|바이오\nKOSPI|셀트리온|바이오\nKOSPI|KB금융|금융\nKOSPI|신한지주|금융\nKOSPI|하나금융지주|금융\nKOSDAQ|HK이노엔|바이오\nKOSDAQ|알테오젠|바이오\nKOSDAQ|HLB|바이오\nKOSDAQ|에코프로비엠|배터리소재\nKOSDAQ|에코프로|배터리소재\nKOSDAQ|리가켐바이오|바이오\nKOSDAQ|펩트론|바이오\nKOSDAQ|삼천당제약|바이오\nKOSDAQ|휴젤|미용·바이오\nKOSDAQ|클래시스|미용의료기기\nKOSDAQ|파마리서치|미용·바이오\nKOSDAQ|JYP Ent.|엔터테인먼트\nKOSDAQ|에스엠|엔터테인먼트\nKOSDAQ|스튜디오드래곤|콘텐츠\nKOSDAQ|카카오게임즈|게임\nKOSDAQ|펄어비스|게임\nKOSDAQ|SOOP|플랫폼\nKOSPI|더존비즈온|소프트웨어\nKOSDAQ|코난테크놀로지|AI소프트웨어\nKOSDAQ|루닛|의료AI\nKOSDAQ|레인보우로보틱스|로봇`,
    2: `KOSPI|삼성전기|전자부품\nKOSPI|LG이노텍|전자부품\nKOSPI|한미반도체|반도체장비\nKOSPI|두산|산업재\nKOSPI|한화에어로스페이스|방산\nKOSPI|현대로템|방산·철도\nKOSPI|LIG넥스원|방산\nKOSPI|한국항공우주|방산·항공\nKOSPI|삼성중공업|조선\nKOSPI|한화오션|조선\nKOSPI|HD한국조선해양|조선\nKOSPI|HD현대미포|조선\nKOSPI|LS ELECTRIC|전력기기\nKOSPI|효성중공업|전력기기\nKOSPI|HD현대일렉트릭|전력기기\nKOSPI|대한전선|전력기기\nKOSPI|일진전기|전력기기\nKOSPI|OCI홀딩스|태양광·소재\nKOSPI|고려아연|비철금속\nKOSPI|풍산|방산·소재\nKOSDAQ|원익IPS|반도체장비\nKOSDAQ|주성엔지니어링|반도체장비\nKOSDAQ|동진쎄미켐|반도체소재\nKOSDAQ|솔브레인|반도체소재\nKOSDAQ|하나머티리얼즈|반도체소재\nKOSDAQ|ISC|반도체부품\nKOSDAQ|HPSP|반도체장비\nKOSDAQ|티씨케이|반도체소재\nKOSDAQ|피에스케이홀딩스|반도체장비\nKOSDAQ|SFA반도체|반도체후공정\nKOSDAQ|서울반도체|LED·부품\nKOSDAQ|덕산네오룩스|디스플레이소재\nKOSDAQ|리노공업|반도체부품\nKOSDAQ|이오테크닉스|반도체장비\nKOSDAQ|인텍플러스|검사장비\nKOSDAQ|테크윙|반도체장비\nKOSDAQ|유진테크|반도체장비\nKOSDAQ|대주전자재료|전자소재\nKOSDAQ|천보|배터리소재\nKOSDAQ|원텍|미용의료기기`,
    3: `KOSPI|SK이노베이션|에너지\nKOSPI|S-Oil|에너지\nKOSPI|GS|지주·에너지\nKOSPI|SK|지주\nKOSPI|CJ|지주·소비\nKOSPI|KT|통신\nKOSPI|LG유플러스|통신\nKOSPI|NAVER|플랫폼\nKOSPI|카카오|플랫폼\nKOSPI|넷마블|게임\nKOSPI|엔씨소프트|게임\nKOSPI|크래프톤|게임\nKOSPI|F&F|소비재\nKOSPI|아모레퍼시픽|화장품\nKOSPI|LG생활건강|화장품\nKOSPI|신세계|유통\nKOSPI|이마트|유통\nKOSPI|호텔신라|면세·여행\nKOSPI|오리온|식품\nKOSPI|농심|식품\nKOSDAQ|실리콘투|화장품유통\nKOSDAQ|브이티|화장품·소재\nKOSDAQ|코스메카코리아|화장품ODM\nKOSDAQ|클리오|화장품\nKOSDAQ|메디톡스|바이오\nKOSDAQ|바이오니아|바이오\nKOSDAQ|씨젠|진단\nKOSDAQ|오상헬스케어|진단\nKOSDAQ|지아이이노베이션|바이오\nKOSDAQ|에이비엘바이오|바이오\nKOSDAQ|보로노이|바이오\nKOSDAQ|앱클론|바이오\nKOSDAQ|오스코텍|바이오\nKOSDAQ|큐로셀|바이오\nKOSDAQ|차바이오텍|바이오\nKOSDAQ|동국제약|제약\nKOSDAQ|메디포스트|바이오\nKOSDAQ|제넥신|바이오\nKOSDAQ|유바이오로직스|백신\nKOSDAQ|에스티팜|바이오CDMO`,
    4: `KOSPI|삼성물산|건설·지주\nKOSPI|현대건설|건설\nKOSPI|DL이앤씨|건설\nKOSPI|GS건설|건설\nKOSPI|대우건설|건설\nKOSPI|한전기술|원전\nKOSPI|한국전력|유틸리티\nKOSPI|KT&G|소비재\nKOSPI|SK텔레콤|통신\nKOSPI|삼성화재|보험\nKOSPI|삼성생명|보험\nKOSPI|현대해상|보험\nKOSPI|DB손해보험|보험\nKOSPI|미래에셋증권|증권\nKOSPI|한국금융지주|증권·금융\nKOSPI|키움증권|증권\nKOSPI|삼성증권|증권\nKOSPI|NH투자증권|증권\nKOSPI|메리츠금융지주|금융\nKOSPI|한화생명|보험\nKOSDAQ|성일하이텍|배터리재활용\nKOSDAQ|코윈테크|자동화장비\nKOSDAQ|윤성에프앤씨|배터리장비\nKOSDAQ|에코앤드림|배터리소재\nKOSDAQ|나노신소재|전자소재\nKOSDAQ|엠플러스|배터리장비\nKOSDAQ|원준|배터리장비\nKOSDAQ|대보마그네틱|배터리장비\nKOSDAQ|상아프론테크|소재\nKOSDAQ|하나기술|배터리장비\nKOSDAQ|에코프로에이치엔|환경\nKOSDAQ|민테크|배터리진단\nKOSDAQ|서진시스템|전자부품\nKOSDAQ|비츠로셀|전지\nKOSDAQ|피엔티|배터리장비\nKOSDAQ|엔켐|전해액\nKOSDAQ|이녹스첨단소재|디스플레이소재\nKOSDAQ|제룡전기|전력기기\nKOSDAQ|LS머트리얼즈|전력·부품\nKOSDAQ|알멕|자동차부품`,
    5: `KOSPI|롯데쇼핑|유통\nKOSPI|현대백화점|유통\nKOSPI|BGF리테일|편의점\nKOSPI|GS리테일|편의점\nKOSPI|대한항공|항공\nKOSPI|아시아나항공|항공\nKOSPI|HMM|해운\nKOSPI|팬오션|해운\nKOSPI|동원산업|식품·해운\nKOSPI|하이트진로|식품\nKOSPI|대상|식품\nKOSPI|삼양식품|식품\nKOSPI|롯데웰푸드|식품\nKOSPI|빙그레|식품\nKOSPI|한국콜마|화장품ODM\nKOSPI|코웨이|렌탈\nKOSPI|효성티앤씨|소재\nKOSPI|한섬|의류\nKOSPI|영원무역|의류\nKOSPI|한세실업|의류\nKOSDAQ|CJ ENM|콘텐츠\nKOSDAQ|파크시스템스|정밀장비\nKOSDAQ|고영|검사장비\nKOSDAQ|로보티즈|로봇\nKOSDAQ|뉴로메카|로봇\nKOSDAQ|로보스타|로봇\nKOSDAQ|유진로봇|로봇\nKOSDAQ|에스피지|로봇부품\nKOSDAQ|티로보틱스|로봇\nKOSDAQ|알에스오토메이션|자동화\nKOSDAQ|휴림로봇|로봇\nKOSDAQ|제이엘케이|의료AI\nKOSDAQ|뷰노|의료AI\nKOSDAQ|딥노이드|의료AI\nKOSDAQ|마크로젠|유전체\nKOSDAQ|디어유|플랫폼\nKOSDAQ|위메이드|게임\nKOSDAQ|컴투스|게임\nKOSDAQ|넥슨게임즈|게임\nKOSDAQ|웹젠|게임`,
  };

  const day = Number(document.body.dataset.day || 0);
  if (!rows[day]) return;
  const companies = rows[day].split('\n').map((row) => row.split('|'));
  const counts = companies.reduce((acc, [market]) => ({ ...acc, [market]: (acc[market] || 0) + 1 }), {});
  const article = document.querySelector('article');
  if (!article || document.querySelector('.company-atlas')) return;

  article.insertAdjacentHTML('beforeend', `<section class="company-atlas" aria-label="${day}일차 종목 아틀라스"><header class="atlas-header"><p>${String(day).padStart(2, '0')} · COMPANY ATLAS</p><h2>국내 상장사 <em>${companies.length}개</em>를<br>산업과 시장으로 읽기</h2><span>특정 종목의 매수·매도를 권유하지 않는 학습용 목록입니다. 사업보고서와 공시 원문으로 사업 구조·핵심 변수·위험을 확인하세요.</span></header><div class="atlas-toolbar"><b>${companies.length} COMPANIES</b><div><button class="active" data-atlas-filter="all">전체 ${companies.length}</button><button data-atlas-filter="KOSPI">KOSPI ${counts.KOSPI || 0}</button><button data-atlas-filter="KOSDAQ">KOSDAQ ${counts.KOSDAQ || 0}</button></div></div><p class="atlas-guide">시장 → 산업 → 사업보고서의 매출 구성·현금흐름·위험요인 순으로 살펴보세요.</p><div class="atlas-grid">${companies.map(([market, name, sector], index) => `<article class="atlas-card" data-atlas-market="${market}"><span>${market} · ${String(index + 1).padStart(2, '0')}</span><h3>${name}</h3><p>${sector}</p></article>`).join('')}</div></section>`);

  const atlas = article.querySelector('.company-atlas');
  atlas.querySelectorAll('[data-atlas-filter]').forEach((button) => button.addEventListener('click', () => {
    const filter = button.dataset.atlasFilter;
    atlas.querySelectorAll('[data-atlas-filter]').forEach((item) => item.classList.toggle('active', item === button));
    atlas.querySelectorAll('.atlas-card').forEach((card) => { card.hidden = filter !== 'all' && card.dataset.atlasMarket !== filter; });
  }));
}());
