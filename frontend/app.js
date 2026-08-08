(function () {
  'use strict';

  const state = {
    domain: 'finance',
    sessionId: crypto.randomUUID(),
    topK: 4,
    loading: false,
    chatHistory: [],
    activeView: 'home',
    activeTheoryDay: 1,
    quizIndex: 0,
    quizAnswers: [],
    activeScenario: 'equity',
    savedSimulation: null,
    currentSimulation: null,
  };

  const QUIZ_QUESTIONS = [
    {
      category: '금융상품',
      question: 'ETF를 일반펀드와 비교할 때, 장중 실시간으로 거래되는 특성과 가장 직접적으로 연결되는 항목은 무엇인가요?',
      choices: ['기준가가 하루 한 번만 산정된다', '호가 스프레드와 거래 유동성을 확인한다', '만기까지 중도 환매가 불가능하다', '예금자보호 한도가 적용된다'],
      answer: 1,
      explanation: 'ETF는 거래소에서 실시간으로 매매되므로 거래대금, 호가 스프레드, 괴리율을 함께 점검해야 합니다.',
    },
    {
      category: '성과·위험',
      question: '최대낙폭(MDD)이 특히 잘 보여 주는 정보는 무엇인가요?',
      choices: ['특정 기간의 최고점 대비 가장 큰 하락 폭', '매년 평균 수익률', '무위험수익률 대비 초과수익', '자산 간 상관관계'],
      answer: 0,
      explanation: 'MDD는 고점에서 저점까지의 가장 큰 하락 폭으로, 투자자가 견뎌야 할 손실 구간을 파악하는 데 쓰입니다.',
    },
    {
      category: '자산배분',
      question: 'Risk Parity 접근의 핵심 목표로 가장 알맞은 것은 무엇인가요?',
      choices: ['모든 자산에 동일한 금액을 투자한다', '기대수익률이 가장 큰 자산만 편입한다', '각 자산의 위험기여도를 균형 있게 조정한다', '매월 가장 많이 오른 자산으로 교체한다'],
      answer: 2,
      explanation: 'Risk Parity는 자본 비중이 아니라 포트폴리오 위험에 각 자산이 기여하는 정도를 균형 있게 보는 방식입니다.',
    },
    {
      category: '포트폴리오 이론',
      question: '분산투자 효과를 설명할 때 자산 간 상관관계가 중요한 이유는 무엇인가요?',
      choices: ['상관관계가 낮으면 함께 움직일 가능성이 낮아 전체 변동성을 낮출 수 있다', '상관관계는 수익률 계산에만 쓰이고 위험과는 무관하다', '상관관계가 높을수록 항상 분산 효과가 커진다', '상관관계는 채권에만 적용된다'],
      answer: 0,
      explanation: '같은 방향으로 덜 움직이는 자산을 결합하면 개별 자산의 변동성이 포트폴리오에서 일부 상쇄될 수 있습니다.',
    },
    {
      category: '자산배분',
      question: '블랙-리터만 모델은 평균-분산 최적화의 어떤 문제를 완화하는 데 유용한가요?',
      choices: ['입력값 변화에 따라 최적 비중이 과도하게 흔들리는 문제', 'ETF의 거래소 상장 문제', '채권의 이자 지급 문제', '현금의 유동성 문제'],
      answer: 0,
      explanation: '시장 균형수익률과 투자자의 전망을 결합해 기대수익률 추정의 불안정성을 낮추려는 접근입니다.',
    },
  ];

  const PRODUCT_EXPLAINERS = [
    {
      icon: 'fa-piggy-bank', title: '예금·적금',
      oneLine: '은행에 돈을 맡기고 약속한 이자를 받는 가장 기본적인 금융상품입니다.',
      analogy: '안전한 저금통에 돈을 넣고, 기다린 시간에 따라 작은 보상을 받는 방식이에요.',
      check: '이자율, 만기, 중도해지 시 받는 이자, 예금자보호 여부를 확인하세요.',
    },
    {
      icon: 'fa-building-columns', title: '채권',
      oneLine: '정부나 기업에 돈을 빌려주고 이자와 원금을 받기로 한 ‘차용증’입니다.',
      analogy: '친구에게 돈을 빌려주고 “언제, 얼마를 돌려줄지” 적은 약속장과 비슷해요.',
      check: '금리가 오르면 채권 가격은 내려갈 수 있고, 기업 채권은 돈을 못 돌려받을 위험도 있습니다.',
    },
    {
      icon: 'fa-chart-line', title: '주식',
      oneLine: '기업의 아주 작은 주인이 되는 증서로, 기업 성과에 따라 가격과 배당이 달라집니다.',
      analogy: '좋아하는 가게의 지분을 조금 갖고 가게가 잘되면 함께 성장하는 것과 같아요.',
      check: '가격이 크게 오르내릴 수 있으며, 한 기업에만 투자하면 위험이 커집니다.',
    },
    {
      icon: 'fa-boxes-stacked', title: 'ETF',
      oneLine: '여러 주식이나 채권을 한 바구니에 담아 거래소에서 사고파는 상품입니다.',
      analogy: '과일을 하나씩 고르기보다 여러 과일이 담긴 선물 세트를 사는 것과 비슷해요.',
      check: '무엇을 담는 ETF인지, 총보수·거래량·추적오차·괴리율을 함께 살펴보세요.',
    },
    {
      icon: 'fa-folder-tree', title: '펀드',
      oneLine: '투자자들의 돈을 모아 전문 운용사가 정한 기준에 따라 투자하는 상품입니다.',
      analogy: '반 친구들이 회비를 모아 대표가 정한 여행 계획을 함께 실행하는 모습과 같아요.',
      check: '운용 전략, 비용, 환매 가능 시점, 과거 성과가 미래를 보장하지 않는다는 점을 확인하세요.',
    },
    {
      icon: 'fa-shield-halved', title: '파생상품',
      oneLine: '주식·금리·환율 등의 가격 변화를 바탕으로 약속을 사고파는 고난도 상품입니다.',
      analogy: '비가 올 때를 대비해 우산을 미리 준비하는 ‘보험’처럼 위험을 줄이는 데 쓸 수 있어요.',
      check: '손실이 빠르게 커질 수 있어 구조와 최대 손실을 충분히 이해하기 전에는 접근하지 마세요.',
    },
  ];

  const THEORY_DAYS = [
    {
      day: 1,
      icon: 'fa-compass',
      title: '금융상품과 투자 기초',
      subtitle: '돈을 쓰는 목적과 위험의 크기를 먼저 정하면 상품 선택이 쉬워집니다.',
      goal: '저축과 투자의 차이, 수익률·위험·유동성의 의미를 설명할 수 있어요.',
      keywords: ['원금', '수익률', '위험', '유동성', '분산투자', '증권사'],
      lessons: [
        ['저축과 투자는 무엇이 다른가요?', ['저축은 가까운 미래에 쓸 돈을 비교적 안전하게 보관하는 데 알맞습니다. 예금·적금이 대표적입니다.', '투자는 시간이 지나며 자산을 키우기 위해 가격 변동을 감수하는 선택입니다. 주식, 채권, 펀드, ETF 등이 여기에 해당합니다.', '둘 중 하나만 고르는 문제가 아닙니다. 생활비와 비상금은 먼저 확보하고, 남는 돈의 기간과 목표에 맞춰 투자 여부를 판단합니다.']],
        ['상품을 고를 때 보는 세 가지', ['수익률은 돈이 얼마나 늘어날 가능성이 있는지, 위험은 예상과 다르게 줄어들 수 있는 정도를 뜻합니다.', '유동성은 필요할 때 현금으로 바꾸기 쉬운 정도입니다. 수익률이 높아 보여도 급하게 돈이 필요할 때 팔기 어렵다면 내 상황에는 맞지 않을 수 있습니다.', '“높은 수익률, 낮은 위험, 높은 유동성”을 동시에 모두 얻기는 어렵다는 점을 기억하세요.']],
        ['기본 금융상품 지도', ['예금·적금은 안정성과 목적자금 관리에, 주식은 기업 성장에 참여하는 데 쓰입니다.', '채권은 정부나 기업에 돈을 빌려주고 이자와 원금을 받는 구조입니다. ETF·펀드는 여러 자산을 한 상품에 담아 분산투자를 쉽게 합니다.', '상품 이름보다 “무엇에 투자하는지, 비용은 얼마인지, 어떤 위험이 있는지”를 먼저 확인하세요.']],
        ['한국 투자자가 만나는 기관들', ['한국의 개인 투자자는 은행의 예·적금과 채권 상품, 증권사의 주식·ETF·채권·파생상품 계좌, 자산운용사의 펀드·ETF를 주로 이용합니다. 삼성증권·미래에셋증권·NH투자증권·KB증권·키움증권 등은 거래 서비스를 제공하는 증권사 예시이며, 실제 지원 계좌·수수료·상품은 회사와 계좌 유형별로 다릅니다.', '자산운용사는 투자 상품을 설계·운용하고, 증권사는 그 상품의 매매를 중개하는 역할이 기본입니다. 같은 ETF라도 운용사는 상품설명서와 운용을 맡고, 앱에서 주문을 받는 곳은 증권사라는 점을 구분해 보세요.', '처음 계좌를 고를 때는 “어느 앱이 유명한가?”보다 내가 필요한 시장(국내주식·해외주식·채권·연금·파생상품)을 지원하는지, 비용표와 위험고지를 읽기 쉬운지부터 확인하는 편이 좋습니다.']],
      ],
      check: '내가 1년 안에 꼭 써야 하는 돈과 5년 이상 기다릴 수 있는 돈을 나누어 적어 보세요.',
      ragPrompt: '한국 투자자가 은행·증권사·자산운용사를 통해 만나는 금융상품을 예로 들어, 저축과 투자 및 수익률·위험·유동성의 관계를 설명해줘.',
    },
    {
      day: 2,
      icon: 'fa-chart-line',
      title: '주식 · ETF · 펀드',
      subtitle: '기업 한 곳에 투자할지, 여러 자산을 묶은 바구니를 고를지 이해합니다.',
      goal: '주식, ETF, 펀드의 구조와 확인할 비용·유동성 항목을 구분할 수 있어요.',
      keywords: ['주주', '배당', 'ETF', '총보수', '괴리율', 'KOSPI 200'],
      lessons: [
        ['주식은 기업의 작은 주인이 되는 증서', ['주식을 사면 그 기업의 지분 일부를 갖게 됩니다. 기업의 성과와 기대에 따라 가격이 오르내리고, 일부 기업은 이익을 배당으로 나눕니다.', '좋은 회사라고 해서 언제나 좋은 투자 결과를 주는 것은 아닙니다. 이미 비싼 가격에 거래되고 있거나 산업 환경이 바뀔 수 있기 때문입니다.', '한 기업에만 돈이 몰리면 그 기업의 문제에 크게 흔들릴 수 있습니다.']],
        ['ETF와 펀드는 왜 바구니라고 부르나요?', ['ETF와 펀드는 여러 주식·채권 등을 한데 묶어 투자할 수 있게 합니다. 하나의 상품만 사도 여러 자산에 나누어 투자하는 효과를 기대할 수 있습니다.', 'ETF는 거래소에서 주식처럼 장중에 사고팔 수 있고, 펀드는 보통 하루 한 번 기준가격으로 가입·환매가 처리됩니다.', '바구니라고 해서 위험이 사라지는 것은 아닙니다. 특정 국가·산업에만 담긴 ETF는 여전히 크게 움직일 수 있습니다.']],
        ['구매 전 확인표', ['ETF는 무엇을 추종하는지, 총보수, 거래량, 호가 차이(스프레드), 시장가격과 순자산가치의 차이(괴리율)를 봅니다.', '펀드는 운용 전략, 보수, 환매에 걸리는 시간, 편입 자산을 살핍니다.', '과거 수익률은 참고 자료일 뿐 미래 성과를 보장하지 않습니다.']],
        ['한국 주식·ETF로 보는 실제 사례', ['한국 대표 지수인 KOSPI 200은 시장대표성·업종대표성·유동성을 고려해 고른 200개 종목으로 구성됩니다. 삼성전자, SK하이닉스, 현대차, KB금융, NAVER처럼 대형주가 지수에 큰 영향을 줄 수 있으므로, 지수 ETF를 사도 특정 기업·산업에 대한 노출이 완전히 사라지는 것은 아닙니다.', '국내에서는 KODEX(삼성자산운용), TIGER(미래에셋자산운용), RISE(KB자산운용), ACE(한국투자신탁운용), PLUS(한화자산운용), SOL(신한자산운용), KOSEF(키움투자자산운용) 등 여러 ETF 브랜드를 만날 수 있습니다. 같은 “200 ETF”라도 추적 지수, 총보수, 규모, 거래량, 분배 방식이 다를 수 있습니다.', '예를 들어 KODEX 200·TIGER 200·RISE 200·ACE 200처럼 KOSPI 200을 추종하는 상품을 비교할 때는 이름만 보지 말고 종목코드, 기초지수, 운용사, 총보수, 순자산가치(NAV), 호가 스프레드와 괴리율을 함께 확인하세요. ETF와 ETN은 법적 구조도 다르므로 ETN은 발행 증권사의 신용위험도 추가로 살펴야 합니다.']],
        ['MARKET FILE 01 · AI 반도체: 삼성전자와 SK하이닉스', ['삼성전자는 메모리 반도체·파운드리·스마트폰·가전 등 사업 포트폴리오가 넓은 기업입니다. SK하이닉스는 D램·낸드 등 메모리 사업의 비중이 큰 편입니다. 두 기업 모두 AI 데이터센터에서 쓰이는 고대역폭메모리(HBM), 서버 D램, 기업용 SSD 수요가 중요한 관찰 대상입니다.', '2026년에는 삼성전자가 HBM4 양산 출하를 발표했고, SK하이닉스는 차세대 HBM4E 샘플을 주요 고객에게 공급했다고 알렸습니다. 이것은 기술·제품 개발의 사례이지, 미래 실적이 확정됐다는 뜻은 아닙니다.', '읽을 때는 ① AI 서버 투자와 메모리 가격 사이클 ② 고객 인증과 제품 믹스 ③ 수율·설비투자 ④ 파운드리 경쟁 ⑤ 환율을 함께 보세요. 반도체 ETF를 선택할 때도 두 기업의 편입 비중이 얼마나 되는지 꼭 확인해야 합니다.']],
        ['MARKET FILE 02 · 자동차·조선·방산: 수주와 인도 사이', ['현대차는 내연기관·하이브리드·전기차를 함께 판매하는 완성차 기업입니다. 차종 판매 구성, 미국·유럽 등 지역별 판매, 환율, 재고와 인센티브, 전동화 투자 속도가 실적을 읽는 핵심입니다. 현대차는 2026년에도 하이브리드·전기차 라인업 확대와 관련한 자료를 공개하고 있습니다.', 'HD현대중공업은 상선·특수선·엔진·해양 분야를, 한화에어로스페이스는 항공엔진·방산·우주 관련 사업을 주요 축으로 봅니다. 이 업종은 계약 뉴스만으로 판단하기보다 수주 잔고가 실제 매출과 이익으로 전환되는 시점, 원가, 납기, 환율을 함께 봐야 합니다.', '산업 전망을 볼 때는 “수주가 늘었다”와 “올해 이익이 바로 늘어난다”를 구분하세요. 조선·방산은 계약 기간이 길고, 국가별 승인·예산·조달 일정의 영향을 받기 때문에 공시의 계약 조건과 회사 IR 자료를 함께 읽는 습관이 필요합니다.']],
        ['MARKET FILE 03 · 플랫폼·바이오: 숫자 외에 봐야 할 것', ['NAVER는 검색·광고·커머스·콘텐츠·클라우드와 AI 서비스를 연결하는 플랫폼 기업입니다. 이용자 수나 화제성만 보기보다 광고 매출, 커머스 거래액, 콘텐츠 비용, AI 서비스의 수익화, 해외 사업의 성과를 분리해서 읽는 편이 좋습니다. 카카오도 광고·커머스·콘텐츠·모빌리티 등 여러 사업이 연결돼 있어 사업부별 지표를 나눠 볼 필요가 있습니다.', '셀트리온은 바이오시밀러의 개발·생산·판매가 핵심인 기업입니다. 2026년에는 해외 규제 변화와 피하주사(SC) 제형 개발, 제품 포트폴리오 확대가 회사가 제시한 주요 이슈입니다. 바이오 기업은 허가·임상·출시 시점과 경쟁약 가격을 함께 확인해야 합니다.', '플랫폼과 바이오는 “성장 산업”이라는 한 단어로 묶기 어렵습니다. 플랫폼은 경쟁과 수익화, 바이오는 규제·임상·특허·판매망이 핵심이므로, 매출 성장률 하나보다 사업별 비용과 실행 일정을 함께 읽어야 합니다.']],
        ['MARKET FILE 04 · 금융·소재: 금리와 자본의 언어', ['KB금융·신한지주·하나금융지주·우리금융지주 같은 금융지주는 은행뿐 아니라 증권·보험·카드·자산운용 계열사의 성과를 함께 봅니다. 기준금리와 예대금리차, 대손비용, 부동산·기업대출 건전성, 비이자 수수료, 보통주자본비율(CET1), 배당·자사주 정책이 주요 지표입니다.', 'KB금융은 2026년 상반기 실적 발표에서 은행·비은행 포트폴리오와 주주환원 계획을 함께 제시했습니다. 금융주는 배당만 보지 말고, 배당을 계속할 수 있는 자본 여력과 경기 악화 때 대손충당금이 어떻게 변하는지도 확인해야 합니다.', 'LG에너지솔루션은 전기차·에너지저장장치용 배터리, POSCO홀딩스는 철강과 이차전지 소재 관련 사업을 함께 살펴볼 수 있는 사례입니다. 이들 기업은 전기차 수요·원재료 가격·고객사 주문·공장 가동률·투자 규모가 복합적으로 작용하므로, “친환경 테마”라는 말만으로 같은 위험이라고 보기는 어렵습니다.']],
        ['MARKET FILE 05 · 투자자처럼 읽는 기업 노트', ['기업 하나를 고를 때는 먼저 “무엇을 팔아 돈을 버는가?”를 한 문장으로 써 보세요. 다음으로 매출을 움직이는 가격·물량·환율·금리·원재료·규제 중 세 가지를 골라 분기 실적 발표 때마다 확인합니다.', '회사 홈페이지의 IR 자료, 사업보고서, 한국거래소 KIND 공시에서는 실적자료·주요 계약·유상증자·자사주·배당 관련 정보를 확인할 수 있습니다. 뉴스 제목은 출발점일 뿐이며, 숫자와 가정은 원문 공시로 되돌아가 확인해야 합니다.', '아래 기업들은 모두 학습 사례일 뿐 추천 목록이 아닙니다. 삼성전자, SK하이닉스, 현대차, HD현대중공업, 한화에어로스페이스, NAVER, 카카오, 셀트리온, KB금융, 신한지주, LG에너지솔루션, POSCO홀딩스 중 하나를 골라 “사업·성장 동력·위험·확인할 공시” 네 칸으로 정리해 보세요.']],
      ],
      check: '관심 있는 ETF 하나를 골라 “무엇을 담는지”와 “연간 총보수”를 찾아 보세요.',
      ragPrompt: 'KOSPI 200과 국내 ETF 브랜드·상품을 예로 들어 주식, ETF, 펀드의 차이와 ETF 확인 항목을 설명해줘. 특정 상품 매수 추천은 하지 마.',
    },
    {
      day: 3,
      icon: 'fa-landmark',
      title: '채권 · 금리 · 파생상품',
      subtitle: '빌려준 돈의 약속과 가격 변동, 그리고 위험을 줄이기 위한 도구를 살펴봅니다.',
      goal: '채권 가격과 금리의 관계, 파생상품의 헤지 목적과 위험을 설명할 수 있어요.',
      keywords: ['만기', '이자', '금리', '신용위험', '헤지', '증거금'],
      lessons: [
        ['채권은 돈을 빌려준 약속장', ['채권을 산다는 것은 정부나 기업에 돈을 빌려주고 정해진 이자와 만기 원금을 받기로 하는 것입니다.', '국채는 정부가 발행하고, 회사채는 기업이 발행합니다. 발행자가 약속한 돈을 갚지 못할 가능성은 신용위험이라고 합니다.', '만기가 길수록 금리 변화에 가격이 더 민감해지는 경향이 있습니다. 이를 설명할 때 듀레이션이라는 지표를 사용합니다.']],
        ['금리가 오르면 채권 가격은 왜 내려갈까요?', ['새로 나온 채권의 이자가 더 높아지면, 기존의 낮은 이자를 주는 채권은 같은 가격으로는 매력이 줄어듭니다. 그래서 기존 채권 가격이 조정될 수 있습니다.', '반대로 금리가 내려가면 기존에 높은 이자를 약속한 채권의 매력이 커져 가격이 오를 수 있습니다.', '채권도 중간에 팔면 손익이 생길 수 있으므로 “항상 안전하다”고 단정할 수는 없습니다.']],
        ['한국 금리·채권시장 사례', ['한국은행 기준금리는 2026년 7월 16일 기준 연 2.75%입니다. 기준금리 변화는 예·적금 금리, 대출금리, 국고채 수익률과 채권 ETF 가격에 영향을 줄 수 있지만, 각각이 같은 폭·같은 시점에 움직이지는 않습니다.', '개인 투자자가 한국 채권시장을 접하는 방법에는 국채·회사채 직접 매매, 개인투자용 국채 청약, 채권형 펀드·ETF 등이 있습니다. 국채는 정부가 발행하고, 회사채는 삼성전자·현대자동차 같은 기업을 포함한 다양한 기업이 발행할 수 있습니다. 발행 주체가 다르면 신용위험과 수익률도 달라집니다.', '금리 방향을 맞히려 하기보다 만기와 듀레이션을 먼저 확인하세요. 특히 장기 국채·장기채 ETF는 금리 변화에 가격이 더 민감할 수 있고, “국채”라는 이름만으로 중도 매매 가격 위험이 사라지는 것은 아닙니다.']],
        ['파생상품은 보험처럼도 쓰입니다', ['선물·옵션 같은 파생상품은 주가, 금리, 환율 등의 움직임을 바탕으로 한 계약입니다. 국내에서는 KOSPI 200 선물·옵션, 해외에서는 나스닥 100 지수·원유·금 등을 기초자산으로 한 선물이 예시입니다.', '가격 하락이 걱정될 때 손실을 일부 줄이는 헤지에 활용할 수 있지만, 구조가 복잡하고 손실이 빠르게 커질 수도 있습니다.', '학습 단계에서는 “어떤 위험을 줄이려는 계약인지, 최대 손실은 얼마인지”를 먼저 묻는 습관이 중요합니다.']],
        ['KRX에서 실제로 거래되는 파생상품', ['한국거래소(KRX)에는 KOSPI 200·미니 KOSPI 200·KOSDAQ 150 선물과 옵션, 미국달러선물, 3년·10년 국채선물, 금선물 등이 있습니다. KOSPI 200 선물은 지수의 현물을 주고받는 대신 만기에 현금으로 결제하는 구조입니다.', 'KOSPI 200 선물의 거래승수는 25만 원이고, 미니 KOSPI 200 선물은 이를 5만 원으로 낮춘 상품입니다. “미니”라는 이름은 1계약의 금액이 더 작다는 뜻일 뿐, 레버리지와 증거금 위험이 없다는 뜻은 아닙니다.', 'KRX는 ETF 자체를 기초자산으로 하는 ETF선물도 운영합니다. 상품 목록과 거래시간·결제월·증거금은 바뀔 수 있으므로, 실제 주문 전에는 KRX 상품명세와 이용 증권사의 주문 화면을 함께 확인하세요.']],
        ['주식 앱으로도 거래할 수 있나요?', ['많은 증권사 MTS·HTS는 한 앱 안에서 주식과 선물·옵션 메뉴를 함께 제공합니다. 하지만 주식 계좌만으로 바로 거래하는 것은 아닙니다. 일반 위탁계좌와 별도로 파생상품 거래가 가능한 계좌를 열고 거래 권한을 받아야 합니다.', '국내에서는 KOSPI 200·KOSDAQ 150 지수 선물·옵션, 통화·금속 선물 등을 볼 수 있습니다. 해외에서는 나스닥 100 지수, 원유, 금 등 다양한 선물이 있지만, 증권사에 따라 별도 해외선물 앱·계좌·메뉴가 필요할 수 있습니다.', '앱에 “선물/옵션” 메뉴가 보여도 거래가 허용됐다는 뜻은 아닙니다. 계좌 개설, 투자자 정보, 교육·모의거래, 예탁금, 거래 가능 단계가 모두 완료됐는지 차례로 확인해야 합니다.']],
        ['거래를 시작하기 전의 준비', ['주식 거래용 위탁계좌와 별도로 파생상품 거래가 가능한 계좌를 개설해야 합니다. 이용 중인 증권사 앱에서 계좌를 추가하고, 해당 증권사가 제공하는 국내·해외 파생상품 메뉴와 지원 범위를 확인합니다.', '일반 개인이 국내 장내 파생상품을 처음 거래할 때는 투자성향·거래경험 확인, 사전교육과 모의거래 이수, 기본예탁금 요건이 적용됩니다. 현재 최소 기준은 사전교육 1시간, 모의거래 3시간이며, 처음에는 선물(변동성지수선물 제외)과 옵션 매수부터 단계적으로 거래할 수 있습니다.', '예탁금과 가능한 상품 범위는 단계와 증권사 내부 기준에 따라 달라집니다. 예를 들어 일반 개인의 1단계 최소 기본예탁금은 1,000만 원, 전체 선물·옵션 거래는 2,000만 원이며 미결제약정 10거래일 이상 보유 경험도 필요합니다. 실제 신청 전에는 증권사의 최신 안내를 반드시 확인하세요.']],
        ['사전교육 신청: KIFIN에서 무엇을 하나요?', ['첫 단계는 금융투자교육원(KIFIN, kifin.or.kr)에서의 온라인 사전교육입니다. PC에서 회원가입·로그인한 뒤 이러닝의 과정 안내 및 신청 메뉴에서 “국내외 파생상품거래 사전교육”을 검색합니다.', '증권사가 투자성향과 과거 거래경험을 바탕으로 안내한 과정 시간을 선택합니다. 일반적으로 1시간·3시간·10시간 과정이 제공되며, 임의로 짧은 과정을 고르기보다 내가 거래할 증권사의 안내에 맞춰 신청해야 합니다. 신청 후 수강료 결제와 학습 시작 절차를 진행합니다.', '각 차시를 끝까지 수강해 진도율 100%를 채우면 수료 처리됩니다. My KIFIN의 수강이력·수료증 메뉴에서 수료증과 수료(이수)번호를 확인해 저장합니다. 계좌 명의와 교육 수강자 명의가 일치하는지도 확인하세요.']],
        ['모의거래 신청: KRX 또는 증권사 시스템', ['두 번째 단계는 실제 돈을 쓰지 않는 모의거래입니다. KRX 파생상품 모의거래 인증시스템(trn.krx.co.kr)에 가입해 전용 모의거래 프로그램을 이용하거나, 증권사가 제공하는 “파생상품 이수용 모의거래” 메뉴를 이용할 수 있습니다.', 'KRX 시스템을 쓸 때는 회원가입 후 사용 안내에 따라 모의 HTS를 설치·로그인하고, 운영 시간에 맞춰 선물·옵션 주문과 체결을 연습합니다. 증권사 모의투자는 이수 결과가 해당 증권사 계좌와 자동 연동될 수 있지만, 모든 일반 모의투자가 이수용인 것은 아니므로 “이수 인정용”인지 먼저 확인해야 합니다.', '모의거래는 최소 3시간 이상이 기본이지만 증권사와 투자자 유형에 따라 더 긴 시간이 적용될 수 있습니다. 단순 접속 시간만으로 인정되는지, 실제 주문·체결 참여가 필요한지, 이수시간 집계 기준이 무엇인지는 선택한 시스템의 최신 안내를 따릅니다.']],
        ['이수증 등록과 계좌 활성화', ['교육과 모의거래를 마쳤다면 거래하려는 증권사 MTS 또는 HTS에서 “파생상품 적격투자자 등록”, “사전교육·모의거래 이수 등록” 등의 메뉴를 찾습니다. 메뉴 명칭은 증권사마다 다를 수 있습니다.', 'KIFIN 사전교육 수료번호와 KRX 또는 증권사 모의거래 이수번호를 각각 입력하거나, 증권사가 안내한 방식으로 제출합니다. 등록 상태가 승인되었는지 확인하고, 파생상품 전용 계좌가 정상 개설됐는지와 허용된 거래 단계를 함께 확인합니다.', '마지막으로 해당 단계의 기본예탁금을 계좌에 예탁하고, 주문 전 계약 단위·위탁증거금·거래 가능 상품을 점검합니다. 수료증만 있어도 예탁금이나 투자자 정보 요건이 충족되지 않으면 주문할 수 없다는 점을 기억하세요.']],
        ['신청 전·후 체크리스트', ['신청 전에는 ① 거래하려는 대상이 국내 장내 파생상품인지, 해외선물인지 ② 증권사가 요구한 교육·모의거래 시간은 얼마인지 ③ 계좌 개설과 기본예탁금 요건은 무엇인지 확인합니다. 해외선물은 별도 계좌·교육·위험관리 기준이 적용될 수 있습니다.', '이수 중에는 수료증 번호와 이수증 번호를 저장하고, 계좌 명의·휴대전화 정보가 증권사 정보와 일치하는지 확인합니다. 이수 뒤에는 앱의 등록 완료 화면, 거래 가능 단계, 주문증거금·유지증거금 기준을 다시 확인합니다.', '일부 자격 보유자·금융투자업계 경력자·전문투자자 등은 교육 또는 모의거래가 면제될 수 있습니다. 다만 면제 대상과 인정 서류는 증권사 심사에 따라 달라질 수 있으므로, 스스로 면제라고 판단하지 말고 거래 증권사에 먼저 확인하세요.']],
        ['거래 단계와 옵션 매도 요건', ['일반 개인의 국내 장내 파생상품 거래는 단계적으로 열립니다. 1단계에서는 변동성지수선물을 제외한 선물과 옵션 매수가 가능하며 최소 기본예탁금은 1,000만 원입니다. 2단계에서는 옵션 매도와 변동성지수선물을 포함한 전체 선물·옵션 거래가 가능하며 최소 기본예탁금은 2,000만 원입니다.', '2단계로 올라가려면 계좌 개설 뒤 미결제약정을 10거래일 이상 보유한 경험과 기본예탁금 요건이 필요합니다. 증권사는 투자성향·거래경험·내부 위험관리 기준에 따라 더 엄격한 조건을 적용하거나 주문을 제한할 수 있습니다.', '옵션 매수자는 프리미엄을 내고 권리를 사므로 최대 손실이 보통 그 프리미엄으로 제한됩니다. 반면 옵션 매도자는 프리미엄을 받고 의무를 지므로 큰 손실 위험을 집니다. 특히 콜옵션 매도는 이론상 손실 상한이 없고, 풋옵션 매도도 기초자산 가격 하락 때 매우 큰 손실이 날 수 있습니다.']],
        ['증거금은 “계약 보증금”입니다', ['주식은 보통 사려는 금액 전체를 내지만, 선물·옵션은 계약 금액의 일부인 증거금으로 거래를 시작합니다. 적은 돈으로 큰 계약을 움직일 수 있는 이유이자, 손익이 빠르게 커지는 이유입니다.', '계약 총금액은 대략 “가격 또는 지수 × 거래승수”로 생각할 수 있습니다. 위탁증거금은 처음 포지션을 열 때 필요한 보증금이고, 유지증거금은 포지션을 계속 보유하기 위해 계좌에 남아 있어야 하는 최소 금액입니다.', '증거금률과 거래승수는 상품과 시장 상황에 따라 달라집니다. 따라서 주문 화면에서 보이는 필요 증거금과 계약 단위를 매번 확인해야 하며, 기본예탁금과 실제 주문에 필요한 위탁증거금은 서로 다른 개념임을 구분해야 합니다.']],
        ['마진콜은 어떻게 발생할까요?', ['예를 들어 계좌에 1,600만 원이 있고 어떤 선물 1계약을 사는 데 위탁증거금 1,575만 원이 필요하다고 가정해 보세요. 거래는 가능하지만 남는 여유 자금은 매우 작습니다.', '이후 가격이 내려 평가손실이 600만 원 발생하면 계좌 평가금액은 1,000만 원이 됩니다. 이 금액이 유지증거금보다 낮아지면 증권사는 추가증거금 납부를 요구할 수 있습니다. 이것이 흔히 말하는 마진콜입니다.', '정해진 기한까지 돈을 채우지 못하면 증권사가 포지션을 반대매매로 강제 청산할 수 있습니다. 필요한 추가 금액, 납부 기한, 청산 방식은 상품·증권사별로 다르므로 알림과 거래설명서를 반드시 확인해야 합니다.']],
        ['반대매매를 피하기 위한 초보자 원칙', ['필요 증거금에 딱 맞춰 최대 계약 수량을 거래하면 작은 가격 변동에도 위험해집니다. 처음에는 계약 수량을 아주 작게 잡고, 증거금과 별도로 손실을 견딜 여유 현금을 남겨 두는 것이 중요합니다.', '주문을 내기 전에 “이 가격까지 불리하게 움직이면 정리한다”는 손실 한도를 정하세요. 일부 MTS·HTS의 조건주문·자동감시주문을 활용할 수 있지만, 급변동 때는 지정한 가격과 실제 체결 가격이 달라질 수 있습니다.', '장 마감 뒤나 해외 시장이 움직이는 동안에도 가격은 크게 변할 수 있습니다. 초보자는 밤새 포지션을 보유하는 위험을 특히 조심하고, 손실 한도·계약 수량·추가증거금 대응 가능 여부를 먼저 점검해야 합니다.']],
        ['증거금·만기·강제청산을 먼저 이해하세요', ['파생상품은 계약 금액 전부가 아니라 증거금으로 거래해 레버리지가 커집니다. 기본예탁금은 거래 자격을 위한 최소 잔고이고, 실제 주문을 내면 포지션별 위탁증거금이 사용 가능 금액에서 반영됩니다.', '가격이 불리하게 움직여 계좌가 유지증거금 기준에 미달하면 추가증거금 납부를 요구받을 수 있습니다. 정해진 기한 안에 채우지 못하면 증권사가 반대매매로 포지션을 강제 청산할 수 있으며, 이때 손실이 예치금보다 커질 가능성도 있습니다.', '선물과 옵션에는 만기일도 있으므로, 만기 전 청산하거나 다음 만기로 이월(롤오버)할지 계획해야 합니다. 주문 전에는 계약 단위, 증거금·수수료, 만기일, 최악의 손실 시나리오를 확인하세요. 이해하지 못한 구조의 파생상품은 거래하지 않는 것이 원칙입니다.']],
      ],
      check: '금리가 오를 때 기존 채권 가격이 왜 달라질 수 있는지, 파생상품 거래 전 어떤 요건과 위험을 확인해야 하는지 자신의 말로 적어 보세요.',
      ragPrompt: '한국은행 기준금리, 국채·회사채, KOSPI 200 선물·옵션을 예로 들어 채권 가격과 금리, 듀레이션, 파생상품 거래 전 확인할 요건·위험을 쉬운 말로 설명해줘. 특정 매매를 권유하지 마.',
    },
    {
      day: 4,
      icon: 'fa-chart-column',
      title: '포트폴리오와 위험 지표',
      subtitle: '한 종목의 성과보다 여러 자산을 함께 봐야 하는 이유를 배웁니다.',
      goal: '분산투자, 상관관계, 변동성, MDD, 샤프 비율의 역할을 말할 수 있어요.',
      keywords: ['상관관계', '변동성', 'MDD', '샤프 비율', '위험기여도', '집중위험'],
      lessons: [
        ['분산투자는 왜 필요한가요?', ['서로 다른 방식으로 움직이는 자산을 섞으면 한 자산의 하락이 전체 포트폴리오에 미치는 충격을 줄일 수 있습니다.', '이를 판단할 때 상관관계를 봅니다. 상관관계가 낮다는 것은 두 자산이 같은 방향으로만 움직이지 않을 가능성이 있다는 뜻입니다.', '자산을 많이 담는 것만으로는 충분하지 않습니다. 비슷한 산업·국가에 몰려 있으면 실제로는 한 방향으로 움직일 수 있습니다.']],
        ['위험을 읽는 네 가지 숫자', ['변동성은 수익률이 평소에 얼마나 크게 흔들렸는지 보여 줍니다. 숫자가 크면 오르내림도 큰 편입니다.', 'MDD(최대낙폭)는 최고점에서 가장 크게 떨어진 폭입니다. 내가 실제로 견딜 수 있는 손실을 생각하는 데 도움이 됩니다.', '샤프 비율은 감수한 변동성에 비해 수익이 어느 정도였는지 비교하는 지표입니다. 하나의 숫자만으로 투자 결정을 내리면 안 됩니다.']],
        ['수익률보다 먼저 물어볼 질문', ['“얼마나 벌었나?”와 함께 “얼마나 크게, 얼마나 오래 손실을 견뎠나?”를 봐야 합니다.', '같은 수익률이라도 손실 폭이 작고 회복 과정이 안정적인 포트폴리오가 어떤 사람에게는 더 적합할 수 있습니다.', '내 투자 기간, 목표, 손실 허용 범위가 위험 지표를 해석하는 기준입니다.']],
        ['한국 ETF 시장에서 위험을 읽는 법', ['KRX ETP 시장에는 2026년 기준 1,000개가 넘는 ETF와 여러 운용사의 상품이 상장되어 있습니다. 상품이 많다는 것은 선택지가 많다는 뜻이지, 비슷한 이름의 ETF를 여러 개 사면 자동으로 분산된다는 뜻은 아닙니다.', '예를 들어 반도체·2차전지·방산·조선·금융처럼 특정 산업을 담은 ETF는 관련 업황과 몇 개 대형 종목에 함께 흔들릴 수 있습니다. 단일종목 레버리지·인버스 ETF는 일간 수익률을 목표 배수로 추적하므로 장기 보유 때 기초자산의 단순 누적 수익률과 차이가 커질 수 있습니다.', '실제 매수 전에는 KRX ETF/ETN 정보에서 기초자산, 추적배수, 운용사, NAV·iNAV, 거래량과 괴리율을 확인하세요. 괴리율이 양수면 시장가격이 순자산가치보다 높게 거래될 수 있다는 뜻이며, 특히 장 마감 무렵이나 해외자산 ETF에서는 주의가 필요합니다.']],
      ],
      check: '수익률이 같다면 변동성과 MDD가 더 작은 포트폴리오를 선호할 이유를 생각해 보세요.',
      ragPrompt: '국내 시장대표·섹터·레버리지 ETF를 예로 들어 분산투자, 상관관계, 변동성, MDD, 샤프 비율과 집중위험을 설명해줘. 특정 상품 매수 추천은 하지 마.',
    },
    {
      day: 5,
      icon: 'fa-scale-balanced',
      title: '자산배분과 리밸런싱',
      subtitle: '목표와 위험 수준에 맞게 비중을 정하고, 흔들리지 않도록 규칙을 세웁니다.',
      goal: '자산배분의 의미와 리밸런싱 원칙을 자신의 투자 계획에 적용할 수 있어요.',
      keywords: ['자산배분', '리밸런싱', '목표수익률', '위험허용도', '투자기간', '연금계좌'],
      lessons: [
        ['자산배분은 비중을 정하는 일', ['자산배분은 주식, 채권, 현금성 자산 등 어디에 얼마씩 나눌지 정하는 과정입니다.', '정답 비중은 사람마다 다릅니다. 투자 기간이 길고 가격 변동을 견딜 수 있는지, 언제 돈을 써야 하는지가 기준이 됩니다.', '평균분산, 블랙-리터만, Risk Parity 같은 모델은 생각을 돕는 도구입니다. 미래를 정확히 맞히는 기계는 아닙니다.']],
        ['리밸런싱은 원래 계획으로 돌아오는 규칙', ['시간이 지나면 많이 오른 자산의 비중이 커져 처음 계획보다 위험이 커질 수 있습니다.', '리밸런싱은 일정 기간마다 또는 목표 비중에서 일정 폭 벗어났을 때 비중을 조정하는 방법입니다.', '매일 자주 바꾸기보다, 미리 정한 규칙과 거래비용·세금을 함께 고려하는 것이 좋습니다.']],
        ['나만의 한 장 투자 원칙', ['목표: 언제 어떤 목적으로 돈을 쓸지 적습니다.', '범위: 감당할 수 있는 최대 손실과 각 자산의 목표 비중을 정합니다.', '점검: 분기 또는 반기처럼 점검 시점과 리밸런싱 조건을 미리 기록합니다.']],
        ['한국시장으로 만드는 가상 포트폴리오', ['학습용으로는 “국내 주식시장 전체를 따르는 ETF”, “국고채 또는 우량채 중심 ETF”, “현금성 자산”처럼 역할이 다른 자산군을 먼저 구분해 볼 수 있습니다. 그 뒤 KODEX·TIGER·RISE·ACE 등에서 비슷한 기초지수를 추종하는 실제 상품의 설명서와 비용을 비교해 보세요.', '국내 주식 ETF 안에서도 KOSPI 200 같은 시장대표형, 고배당·금융·반도체·방산 같은 섹터형, 코리아 밸류업 지수처럼 규칙 기반 지수형은 역할이 다릅니다. “국내 ETF를 여러 개 샀다”보다 각 ETF가 어떤 종목과 산업에 겹쳐 있는지가 더 중요합니다.', '연금저축·IRP 계좌는 장기 자산배분을 생각해 볼 수 있는 한국의 대표적 제도권 계좌입니다. 다만 투자 가능 상품, 위험자산 한도, 수수료, 세제 적용은 계좌·금융회사·개인 상황에 따라 달라질 수 있으므로 실제 가입 전에는 해당 금융회사와 국세청·금융감독원 안내를 확인하세요.']],
        ['리밸런싱 실습: 한국 ETF 비교표 만들기', ['관심 있는 시장대표 ETF 하나, 채권 ETF 하나, 섹터 ETF 하나를 골라 표를 만들어 보세요. 표에는 종목명·종목코드·운용사·기초지수·총보수·상위 편입종목·최근 괴리율·거래량을 적습니다.', '예를 들어 시장대표형 ETF와 반도체 테마 ETF를 함께 담는다면 두 상품에 삼성전자·SK하이닉스가 얼마나 겹치는지 확인합니다. 채권 ETF는 만기구조와 듀레이션을 확인해 금리 변화에 어느 정도 민감한지도 써 봅니다.', '목표 비중에서 5%포인트 이상 벗어났을 때만 점검하는 식으로 가상 규칙을 정해 보세요. 이 실습의 목적은 특정 상품을 고르는 것이 아니라, 실제 상품의 구성·비용·집중위험을 근거로 내 비중을 설명하는 것입니다.']],
      ],
      check: '목표, 투자기간, 손실 허용 범위, 점검 주기 네 줄로 나만의 가상 투자 원칙을 작성해 보세요.',
      ragPrompt: '한국 ETF의 기초지수·운용사·상위 편입종목·비용을 비교하는 방법을 포함해, 자산배분과 리밸런싱 및 평균분산·블랙-리터만·Risk Parity를 학습용으로 설명해줘.',
    },
  ];

  const GLOSSARY = [
    { terms: ['분산투자'], korean: '분산투자', hanja: '分散投資', abbr: '—', english: 'Diversification', summary: '서로 다른 자산에 나누어 투자해 한 곳의 손실이 전체에 미치는 영향을 줄이려는 방법입니다.', detail: '종목 수를 많이 늘리는 것만으로 충분하지는 않습니다. 산업·국가·자산 종류가 서로 비슷하면 함께 움직일 수 있으므로, 자산 간 움직임도 함께 살펴야 합니다.' },
    { terms: ['상관관계'], korean: '상관관계', hanja: '相關關係', abbr: 'ρ (rho)', english: 'Correlation', summary: '두 자산이 같은 방향으로 움직이는 정도를 나타내는 수치입니다.', detail: '1에 가까우면 함께 움직이는 경향이 크고, -1에 가까우면 반대 방향으로 움직이는 경향이 있습니다. 낮은 상관관계는 분산투자 효과를 기대하게 하지만, 미래에도 항상 같지는 않습니다.' },
    { terms: ['변동성'], korean: '변동성', hanja: '變動性', abbr: 'σ (sigma)', english: 'Volatility', summary: '가격이나 수익률이 평균 주변에서 얼마나 크게 오르내렸는지 보여 주는 지표입니다.', detail: '변동성이 크면 단기간의 오르내림 폭도 클 수 있습니다. 변동성이 낮다고 손실 가능성이 없는 것은 아니며, 투자 기간과 감당 가능한 손실을 함께 고려해야 합니다.' },
    { terms: ['최대낙폭', 'MDD'], korean: '최대낙폭', hanja: '最大落幅', abbr: 'MDD', english: 'Maximum Drawdown', summary: '특정 기간의 최고점에서 가장 크게 하락한 폭입니다.', detail: '예를 들어 100에서 70까지 내려갔다면 최대낙폭은 -30%입니다. 평균 수익률만으로 보이지 않는 실제 손실 구간을 보여 주므로, 투자자가 버틸 수 있는 위험을 판단할 때 유용합니다.' },
    { terms: ['샤프 비율', '샤프비율'], korean: '샤프 비율', hanja: '危險調整收益率', abbr: 'SR', english: 'Sharpe Ratio', summary: '감수한 변동성 대비 초과수익을 비교하는 위험조정 성과 지표입니다.', detail: '일반적으로 값이 높을수록 같은 변동성에서 더 나은 성과로 해석할 수 있습니다. 다만 과거 자료와 계산 기간에 따라 달라지며, 손실의 모양이나 미래 성과를 모두 설명하지는 못합니다.' },
    { terms: ['자산배분'], korean: '자산배분', hanja: '資産配分', abbr: 'AA', english: 'Asset Allocation', summary: '주식·채권·현금성 자산 등에 얼마씩 나눌지 정하는 과정입니다.', detail: '목표, 투자 기간, 손실 허용 범위에 따라 비중이 달라집니다. 특정 자산의 미래를 맞히기보다 전체 위험을 관리하는 관점에서 사용합니다.' },
    { terms: ['리밸런싱'], korean: '리밸런싱', hanja: '資産再配分', abbr: 'RB', english: 'Rebalancing', summary: '변한 자산 비중을 처음 정한 목표 비중에 맞추어 조정하는 일입니다.', detail: '많이 오른 자산의 비중이 커지면 포트폴리오 위험도 달라질 수 있습니다. 일정 주기 또는 허용 범위를 정해 점검하되 거래비용과 세금도 고려해야 합니다.' },
    { terms: ['수익률'], korean: '수익률', hanja: '收益率', abbr: 'R', english: 'Rate of Return', summary: '투자한 금액 대비 얼마가 늘거나 줄었는지를 비율로 나타낸 값입니다.', detail: '높은 과거 수익률이 미래 수익을 보장하지는 않습니다. 수익률은 변동성, 최대낙폭, 비용과 함께 해석하는 것이 좋습니다.' },
    { terms: ['위험'], korean: '위험', hanja: '危險', abbr: 'Risk', english: 'Investment Risk', summary: '예상과 다른 결과가 나와 손실을 볼 수 있는 가능성과 그 크기입니다.', detail: '투자에서 위험은 단순히 나쁜 일이 아니라 결과가 흔들릴 수 있다는 뜻입니다. 가격 변동, 신용, 유동성 등 여러 종류의 위험을 나누어 살펴야 합니다.' },
    { terms: ['유동성'], korean: '유동성', hanja: '流動性', abbr: '—', english: 'Liquidity', summary: '필요한 때 큰 가격 손해 없이 현금으로 바꾸기 쉬운 정도입니다.', detail: '거래량이 적거나 매수·매도 호가 차이가 큰 상품은 원하는 가격에 거래하기 어려울 수 있습니다. 가까운 시일에 쓸 돈일수록 유동성이 중요합니다.' },
    { terms: ['포트폴리오'], korean: '포트폴리오', hanja: '資産構成', abbr: 'PF', english: 'Portfolio', summary: '한 사람이 보유한 여러 투자자산의 전체 구성입니다.', detail: '한 종목의 성과보다 자산 전체가 어떻게 함께 움직이는지가 중요합니다. 목표와 위험 허용 범위에 맞춰 주식·채권·현금성 자산 등을 조합합니다.' },
    { terms: ['채권'], korean: '채권', hanja: '債券', abbr: 'Bond', english: 'Bond', summary: '정부나 기업에 돈을 빌려주고 이자와 원금을 받기로 한 증서입니다.', detail: '금리 변화, 발행자의 상환 능력, 만기에 따라 가격과 위험이 달라집니다. 중간에 팔면 손익이 생길 수 있으므로 원금이 항상 보장되는 것은 아닙니다.' },
    { terms: ['금리'], korean: '금리', hanja: '金利', abbr: 'IR', english: 'Interest Rate', summary: '돈을 빌리거나 맡길 때 붙는 이자의 비율입니다.', detail: '시장금리가 오르면 기존 채권의 가격은 내려갈 수 있고, 반대로 금리가 내려가면 기존 채권 가격이 오를 수 있습니다. 다만 만기와 신용위험에 따라 영향은 다릅니다.' },
    { terms: ['듀레이션'], korean: '듀레이션', hanja: '—', abbr: 'Dur.', english: 'Duration', summary: '채권 가격이 금리 변화에 얼마나 민감한지 가늠하는 지표입니다.', detail: '일반적으로 듀레이션이 길수록 금리 변화에 따른 가격 움직임이 커지는 경향이 있습니다. 실제 가격 변화는 금리 수준과 채권의 구조에도 영향을 받습니다.' },
    { terms: ['신용위험'], korean: '신용위험', hanja: '信用危險', abbr: 'CR', english: 'Credit Risk', summary: '돈을 빌린 주체가 이자나 원금을 약속대로 갚지 못할 위험입니다.', detail: '국채와 회사채, 기업별 채권은 상환 능력에 차이가 있을 수 있습니다. 높은 이자는 더 큰 신용위험에 대한 보상일 수 있으므로 발행자와 신용등급을 확인해야 합니다.' },
    { terms: ['파생상품'], korean: '파생상품', hanja: '派生商品', abbr: '—', english: 'Derivatives', summary: '주가·금리·환율 등 기초자산의 가격에서 가치가 파생되는 계약입니다.', detail: '선물과 옵션 등이 대표적입니다. 가격 위험을 줄이는 헤지에 쓸 수 있지만 구조가 복잡하고 손실이 커질 수 있어 계약 조건과 최대 손실을 먼저 이해해야 합니다.' },
    { terms: ['헤지'], korean: '헤지', hanja: '危險回避', abbr: 'Hedge', english: 'Hedging', summary: '예상하지 못한 가격 변동으로 생길 손실을 줄이려는 위험관리 방법입니다.', detail: '보험료를 내고 위험을 줄이는 것처럼, 헤지는 수익 가능성 일부를 포기하는 대가로 손실을 완화할 수 있습니다. 완전한 손실 방지를 뜻하지는 않습니다.' },
    { terms: ['평균분산'], korean: '평균분산', hanja: '平均分散', abbr: 'MVO', english: 'Mean-Variance Optimization', summary: '기대수익률과 변동성을 함께 고려해 자산 비중을 찾는 자산배분 방법입니다.', detail: '입력한 기대수익률과 상관관계가 조금만 달라져도 결과 비중이 크게 바뀔 수 있습니다. 따라서 하나의 정답으로 보기보다 가정을 점검하는 도구로 활용합니다.' },
    { terms: ['블랙-리터만', '블랙 리터만'], korean: '블랙-리터만 모형', hanja: '—', abbr: 'BL', english: 'Black-Litterman Model', summary: '시장 균형수익률과 투자자의 전망을 결합해 자산배분 입력값을 만드는 모형입니다.', detail: '평균분산 최적화에서 기대수익률 추정에 지나치게 민감한 문제를 완화하려는 목적이 있습니다. 전망의 신뢰도를 어떻게 설정하는지가 결과에 영향을 줍니다.' },
    { terms: ['Risk Parity', '리스크 패리티'], korean: '리스크 패리티', hanja: '危險均衡', abbr: 'RP', english: 'Risk Parity', summary: '투입 금액보다 각 자산이 전체 위험에 기여하는 정도를 균형 있게 보려는 자산배분 방식입니다.', detail: '변동성이 큰 자산은 같은 금액을 담아도 위험 기여도가 커질 수 있습니다. 레버리지와 금리 환경 등 실제 운용 조건에 따라 결과가 달라질 수 있습니다.' },
    { terms: ['ETF'], korean: '상장지수펀드', hanja: '上場指數펀드', abbr: 'ETF', english: 'Exchange-Traded Fund', summary: '여러 자산을 담은 펀드를 거래소에서 주식처럼 사고팔 수 있게 만든 상품입니다.', detail: '무엇을 추종하는지, 총보수, 거래량, 호가 차이, 시장가격과 순자산가치의 차이(괴리율)를 함께 확인해야 합니다.' },
    { terms: ['주식'], korean: '주식', hanja: '株式', abbr: 'Stock', english: 'Stock / Equity', summary: '기업의 지분 일부를 나타내는 증서로, 보유자는 기업 성과에 따른 가격 변동과 배당에 참여할 수 있습니다.', detail: '기업이 잘될 가능성뿐 아니라 산업 변화, 경쟁, 가격 수준에 따라 손실도 생길 수 있습니다. 한 기업에 집중하면 개별 기업 위험이 커집니다.' },
    { terms: ['펀드'], korean: '투자신탁', hanja: '投資信託', abbr: 'Fund', english: 'Investment Fund', summary: '여러 투자자의 돈을 모아 정한 운용 전략에 따라 자산에 투자하는 상품입니다.', detail: '운용 방식, 비용, 환매 시점, 편입 자산이 상품마다 다릅니다. 과거 수익률만 보지 말고 설명서와 위험등급도 확인해야 합니다.' },
    { terms: ['괴리율'], korean: '괴리율', hanja: '乖離率', abbr: 'Premium / Discount', english: 'Premium/Discount to NAV', summary: 'ETF의 시장 거래가격과 순자산가치(NAV)가 얼마나 차이 나는지 보여 주는 비율입니다.', detail: '괴리율이 크면 실제 담긴 자산 가치와 다른 가격에 사고팔 수 있습니다. 거래량과 호가 차이도 함께 확인하는 것이 좋습니다.' },
    { terms: ['추적오차'], korean: '추적오차', hanja: '追跡誤差', abbr: 'TE', english: 'Tracking Error', summary: 'ETF나 인덱스 펀드의 수익률이 목표 지수의 수익률과 얼마나 다르게 움직였는지 나타냅니다.', detail: '보수, 거래비용, 편입 방식, 현금 보유 등으로 차이가 생길 수 있습니다. 작다고 항상 좋은 것은 아니며 상품의 목표와 비교해야 합니다.' },
    { terms: ['배당'], korean: '배당', hanja: '配當', abbr: 'Div.', english: 'Dividend', summary: '기업이 이익 일부를 주주에게 나누어 주는 금액입니다.', detail: '배당 지급 여부와 규모는 기업이 결정하며 보장되지 않습니다. 배당만 보지 말고 기업의 이익, 재무상태, 배당정책을 함께 살펴야 합니다.' },
    { terms: ['기대수익률'], korean: '기대수익률', hanja: '期待收益率', abbr: 'E[R]', english: 'Expected Return', summary: '앞으로 기대하는 평균적인 수익 수준을 가정한 값입니다.', detail: '미래를 확정하는 숫자가 아니라 분석을 위한 가정입니다. 자산배분 모형은 기대수익률 가정에 민감할 수 있으므로 여러 시나리오를 비교하는 것이 좋습니다.' },
    { terms: ['CAGR'], korean: '연평균성장률', hanja: '年平均成長率', abbr: 'CAGR', english: 'Compound Annual Growth Rate', summary: '여러 해 동안의 누적 성과를 매년 같은 비율로 성장한 것처럼 환산한 수익률입니다.', detail: '중간의 큰 하락과 회복 과정은 가려질 수 있습니다. 따라서 CAGR은 변동성, 최대낙폭과 함께 보는 것이 좋습니다.' },
    { terms: ['옵션'], korean: '선택권', hanja: '選擇權', abbr: 'Option', english: 'Option', summary: '정해진 조건으로 자산을 사고팔 수 있는 권리를 거래하는 파생상품입니다.', detail: '매수자와 매도자의 손익 구조가 다르고, 만기와 행사가격에 따라 가치가 변합니다. 복잡한 구조와 손실 가능성을 충분히 이해해야 합니다.' },
    { terms: ['선물'], korean: '선물', hanja: '先物', abbr: 'Futures', english: 'Futures Contract', summary: '미래의 특정 시점에 정한 가격으로 자산을 사고팔기로 하는 계약입니다.', detail: '가격 변동 위험을 관리하는 데 쓸 수 있지만 증거금과 일일 정산 때문에 손익이 빠르게 변할 수 있습니다.' },
  ];

  const MODEL_META = {
    mean_variance: {
      label: '평균분산',
      returnBoost: 0.004,
      volMultiplier: 1.02,
      note: '기대수익률과 공분산을 바탕으로 효율적 투자선을 찾는 접근입니다.',
    },
    black_litterman: {
      label: '블랙-리터만',
      returnBoost: 0.002,
      volMultiplier: 0.95,
      note: '시장 균형수익률에 전망을 섞어 평균분산의 입력 민감도를 완화합니다.',
    },
    risk_parity: {
      label: 'Risk-Parity',
      returnBoost: -0.001,
      volMultiplier: 0.88,
      note: '자본 비중보다 위험기여도를 고르게 맞추는 접근입니다.',
    },
  };

  // 학습용 시뮬레이션 가정치: 무위험수익률, 헤지 비용/완충 효과, 스트레스 손실 보정치
  const SIMULATION_ASSUMPTIONS = {
    riskFreeRate: 0.02,
    diversificationBonusScale: 0.004,
    hedgeCostPerUnit: 0.01,
    hedgeVolatilityReduction: 0.35,
    stressVolatilityMultiplier: 1.55,
    equityStressPenalty: 0.08,
    hedgeStressOffset: 0.025,
    expectedReturns: [0.082, 0.038, 0.052],
    annualVolatility: [0.19, 0.065, 0.11],
    correlationMatrix: [
      [1.0, 0.18, 0.42],
      [0.18, 1.0, 0.10],
      [0.42, 0.10, 1.0],
    ],
  };

  const $messages = document.getElementById('messages');
  const $questionInput = document.getElementById('questionInput');
  const $sendBtn = document.getElementById('sendBtn');
  const $topKLabel = document.getElementById('topKLabel');
  const $refList = document.getElementById('refList');
  const $fileInput = document.getElementById('fileInput');
  const $uploadTrigger = document.getElementById('uploadTrigger');
  const $uploadArea = document.getElementById('uploadArea');
  const $uploadStatus = document.getElementById('uploadStatus');
  const $ingestTextBtn = document.getElementById('ingestTextBtn');
  const $textTitle = document.getElementById('textTitle');
  const $textContent = document.getElementById('textContent');
  const $clearChatBtn = document.getElementById('clearChatBtn');
  const $closeRefBtn = document.getElementById('closeRefBtn');
  const $theoryDayButtons = Array.from(document.querySelectorAll('[data-theory-day]'));
  const $modelSelect = document.getElementById('modelSelect');
  const $stockWeight = document.getElementById('stockWeight');
  const $bondWeight = document.getElementById('bondWeight');
  const $altWeight = document.getElementById('altWeight');
  const $hedgeRatio = document.getElementById('hedgeRatio');
  const $stockWeightLabel = document.getElementById('stockWeightLabel');
  const $bondWeightLabel = document.getElementById('bondWeightLabel');
  const $altWeightLabel = document.getElementById('altWeightLabel');
  const $hedgeRatioLabel = document.getElementById('hedgeRatioLabel');
  const $simReturn = document.getElementById('simReturn');
  const $simVolatility = document.getElementById('simVolatility');
  const $simSharpe = document.getElementById('simSharpe');
  const $simDrawdown = document.getElementById('simDrawdown');
  const $simPromptBtn = document.getElementById('simPromptBtn');
  const $simAllocation = document.getElementById('simAllocation');
  const $simNarrative = document.getElementById('simNarrative');
  const $simCompare = document.getElementById('simCompare');
  const $simScenarioResult = document.getElementById('simScenarioResult');
  const $simDonut = document.getElementById('simDonut');
  const $simRiskBars = document.getElementById('simRiskBars');
  const $simSaveBtn = document.getElementById('simSaveBtn');
  const $simScenarioButtons = Array.from(document.querySelectorAll('.sim-scenario'));
  const $chatInputArea = document.querySelector('.chat-input-area');
  const $viewButtons = Array.from(document.querySelectorAll('.brand-nav-btn'));
  const $offcanvasBackdrop = document.getElementById('offcanvasBackdrop');
  const $openLeftPanel = document.getElementById('openLeftPanel');
  const $openRightPanel = document.getElementById('openRightPanel');
  const $referencePanel = document.getElementById('referencePanel');
  const $closeLeftPanel = document.getElementById('closeLeftPanel');
  const $learningPanel = document.getElementById('learningPanel');
  const $ragPanel = document.getElementById('ragPanel');
  const $simulationPanel = document.getElementById('simulationPanel');
  const $openSimulationPanel = document.getElementById('openSimulationPanel');
  const $glossaryModal = document.getElementById('glossaryModal');
  const $glossaryTitle = document.getElementById('glossaryTitle');
  const $glossaryNames = document.getElementById('glossaryNames');
  const $glossarySummary = document.getElementById('glossarySummary');
  const $glossaryDetail = document.getElementById('glossaryDetail');

  // 좌측은 학습 메뉴, 우측은 RAG 자료와 참고 문서에만 집중합니다.
  $referencePanel.insertBefore($ragPanel, $refList);

  document.querySelectorAll('.sim-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      $stockWeight.value = btn.dataset.stock;
      $bondWeight.value = btn.dataset.bond;
      $altWeight.value = btn.dataset.alt;
      $hedgeRatio.value = btn.dataset.hedge;
      updateSimulation();
    });
  });

  $theoryDayButtons.forEach(btn => {
    btn.addEventListener('click', () => openTheoryDay(Number(btn.dataset.theoryDay)));
  });

  $viewButtons.forEach(btn => {
    btn.addEventListener('click', () => setView(btn.dataset.view));
  });

  $openLeftPanel.addEventListener('click', () => togglePanel('left'));
  $openRightPanel.addEventListener('click', () => togglePanel('right'));
  $openSimulationPanel.addEventListener('click', () => {
    setView('simulation');
  });
  $closeLeftPanel.addEventListener('click', () => setPanel('left', false));
  $offcanvasBackdrop.addEventListener('click', () => closePanels());
  $messages.addEventListener('click', event => {
    const term = event.target.closest('[data-glossary-term]');
    if (term) openGlossary(Number(term.dataset.glossaryTerm));
  });
  $glossaryModal.addEventListener('click', event => {
    if (event.target.closest('[data-glossary-close]')) closeGlossary();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closePanels();
    if (event.key === 'Escape') closeGlossary();
  });

  $questionInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      triggerSend();
    }
  });

  $questionInput.addEventListener('input', resizeInput);
  $sendBtn.addEventListener('click', triggerSend);

  $clearChatBtn.addEventListener('click', () => {
    state.chatHistory = [];
    state.sessionId = crypto.randomUUID();
    $messages.innerHTML = '';
    updateRefPanel([]);
    showWelcome();
  });

  $closeRefBtn.addEventListener('click', () => setPanel('right', false));

  $uploadTrigger.addEventListener('click', () => $fileInput.click());
  $uploadArea.addEventListener('click', (e) => {
    if (e.target === $uploadArea || e.target.classList.contains('upload-icon')) {
      $fileInput.click();
    }
  });
  $uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    $uploadArea.classList.add('drag-over');
  });
  $uploadArea.addEventListener('dragleave', () => $uploadArea.classList.remove('drag-over'));
  $uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    $uploadArea.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  });
  $fileInput.addEventListener('change', () => {
    if ($fileInput.files[0]) handleFileUpload($fileInput.files[0]);
    $fileInput.value = '';
  });

  $ingestTextBtn.addEventListener('click', ingestText);

  [$modelSelect, $stockWeight, $bondWeight, $altWeight, $hedgeRatio].forEach(input => {
    input.addEventListener('input', updateSimulation);
  });

  $simScenarioButtons.forEach(button => {
    button.addEventListener('click', () => {
      state.activeScenario = button.dataset.scenario;
      $simScenarioButtons.forEach(item => item.classList.toggle('active', item === button));
      updateSimulation();
    });
  });

  $simSaveBtn.addEventListener('click', () => {
    if (!state.currentSimulation) return;
    state.savedSimulation = { ...state.currentSimulation };
    updateSimulation();
  });

  $simPromptBtn.addEventListener('click', () => {
    setView('learn');
    $questionInput.value = buildSimulationPrompt();
    resizeInput();
    $questionInput.focus();
  });

  function setView(view) {
    state.activeView = view;
    $viewButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.view === view));
    $chatInputArea.classList.toggle('hidden', view !== 'learn');
    $clearChatBtn.classList.toggle('hidden', view !== 'learn');

    if (view === 'home') renderHome();
    if (view === 'learn') showWelcome();
    if (view === 'theory') renderTheoryIndex();
    if (view === 'quiz') renderQuiz();
    if (view === 'simulation') {
      renderSimulationGuide();
      closePanels();
      requestAnimationFrame(() => $simulationPanel.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  }

  function togglePanel(panel) {
    const isOpen = document.body.classList.contains(`${panel}-panel-open`);
    setPanel(panel, !isOpen);
  }

  function setPanel(panel, isOpen) {
    const otherPanel = panel === 'left' ? 'right' : 'left';
    document.body.classList.toggle(`${panel}-panel-open`, isOpen);
    if (isOpen) document.body.classList.remove(`${otherPanel}-panel-open`);
    $offcanvasBackdrop.classList.toggle('visible', isOpen);
    $offcanvasBackdrop.setAttribute('aria-hidden', String(!isOpen));
    $openLeftPanel.setAttribute('aria-expanded', String(panel === 'left' && isOpen));
    $openRightPanel.setAttribute('aria-expanded', String(panel === 'right' && isOpen));
  }

  function closePanels() {
    document.body.classList.remove('left-panel-open', 'right-panel-open');
    $offcanvasBackdrop.classList.remove('visible');
    $offcanvasBackdrop.setAttribute('aria-hidden', 'true');
    $openLeftPanel.setAttribute('aria-expanded', 'false');
    $openRightPanel.setAttribute('aria-expanded', 'false');
  }

  function annotateGlossary(node) {
    const root = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    if (!root || root.closest?.('.glossary-term, .glossary-modal')) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(textNode) {
        const parent = textNode.parentElement;
        if (!textNode.nodeValue.trim() || parent?.closest('.glossary-term, .glossary-modal, button, textarea, script, style')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(textNode => {
      const matches = [];
      GLOSSARY.forEach((entry, index) => entry.terms.forEach(term => matches.push({ term, index })));
      matches.sort((a, b) => b.term.length - a.term.length);
      const pattern = new RegExp(matches.map(item => escapeRegex(item.term)).join('|'), 'g');
      if (!pattern.test(textNode.nodeValue)) return;
      pattern.lastIndex = 0;
      const fragment = document.createDocumentFragment();
      let cursor = 0;
      textNode.nodeValue.replace(pattern, (match, offset) => {
        fragment.append(document.createTextNode(textNode.nodeValue.slice(cursor, offset)));
        const item = matches.find(candidate => candidate.term === match);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'glossary-term';
        button.dataset.glossaryTerm = String(item.index);
        button.textContent = match;
        button.setAttribute('aria-label', `${match} 용어 설명 보기`);
        fragment.append(button);
        cursor = offset + match.length;
        return match;
      });
      fragment.append(document.createTextNode(textNode.nodeValue.slice(cursor)));
      textNode.replaceWith(fragment);
    });
  }

  function openGlossary(index) {
    const entry = GLOSSARY[index];
    if (!entry) return;
    $glossaryTitle.textContent = entry.korean;
    $glossaryNames.innerHTML = `
      <span><b>한자</b>${escHtml(entry.hanja)}</span>
      <span><b>약자</b>${escHtml(entry.abbr)}</span>
      <span><b>영문</b>${escHtml(entry.english)}</span>`;
    $glossarySummary.textContent = entry.summary;
    $glossaryDetail.textContent = entry.detail;
    $glossaryModal.classList.add('open');
    $glossaryModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    $glossaryModal.querySelector('.glossary-close').focus();
  }

  function closeGlossary() {
    $glossaryModal.classList.remove('open');
    $glossaryModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }

  function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) annotateGlossary(node);
    }));
  }).observe($messages, { childList: true, subtree: true });

  function renderHome() {
    const modules = [
      ['5일 이론 학습', '금융상품부터 자산배분·리밸런싱까지 하루 한 주제씩 읽습니다.', 'fa-calendar-days', 'theory'],
      ['개념 퀴즈', 'ETF, 채권, 분산투자와 위험 지표의 핵심을 확인합니다.', 'fa-circle-question', 'quiz'],
      ['자산배분 실습', '평균분산·블랙-리터만·Risk Parity를 같은 포트폴리오에 적용합니다.', 'fa-sliders', 'simulation'],
    ].map(([title, copy, icon, target]) => `
      <button class="home-module" data-go="${target}">
        <i class="fa-solid ${icon}"></i><strong>${title}</strong><span>${copy}</span><em>학습 시작 <i class="fa-solid fa-arrow-right"></i></em>
      </button>`).join('');
    const explainers = PRODUCT_EXPLAINERS.map(item => `
      <article class="product-explainer">
        <i class="fa-solid ${item.icon}"></i>
        <h3>${item.title}</h3>
        <p>${item.oneLine}</p>
        <div><strong>쉽게 말하면</strong><span>${item.analogy}</span></div>
        <div><strong>확인할 점</strong><span>${item.check}</span></div>
      </article>`).join('');

    $messages.innerHTML = `
      <article class="content-page home-page">
        <div class="content-kicker">FINANCE LEARNING LAB · RAG 기반 학습</div>
        <h1>금융상품을 이해하고,<br><mark>나만의 자산배분 원칙</mark>을 설계합니다.</h1>
        <p class="content-lead">교재형 콘텐츠, 개념 퀴즈, 학습용 포트폴리오 시뮬레이션과 근거 문서 기반 RAG를 한 흐름으로 제공합니다.</p>
        <div class="home-actions">
          <button class="content-cta" data-go="theory"><i class="fa-solid fa-calendar-days"></i> 5일 이론 학습 시작</button>
          <button class="content-cta" data-go="learn"><i class="fa-solid fa-comments"></i> RAG에게 질문하기</button>
          <button class="content-secondary" data-go="quiz"><i class="fa-solid fa-circle-question"></i> 5문제 퀴즈 풀기</button>
        </div>
        <section class="home-stats">
          <div><strong>3</strong><span>학습 방식<br>콘텐츠 · 퀴즈 · 실습</span></div>
          <div><strong>5</strong><span>핵심 지표<br>CAGR · 변동성 · MDD 등</span></div>
          <div><strong>3</strong><span>배분 모델<br>MVO · BL · RP</span></div>
        </section>
        <section class="learning-map" aria-label="학습 흐름 인포그래픽"><div class="map-heading"><span>LEARNING FLOW</span><strong>읽고 → 확인하고 → 직접 비교합니다</strong></div><div class="map-steps"><div><i class="fa-solid fa-book-open"></i><b>이론</b><small>상품과 시장 구조</small></div><i class="fa-solid fa-arrow-right"></i><div><i class="fa-solid fa-circle-question"></i><b>퀴즈</b><small>핵심 개념 점검</small></div><i class="fa-solid fa-arrow-right"></i><div><i class="fa-solid fa-chart-pie"></i><b>실습</b><small>비중과 위험 비교</small></div><i class="fa-solid fa-arrow-right"></i><div><i class="fa-solid fa-comments"></i><b>RAG</b><small>문서 근거로 확장</small></div></div></section>
        <section class="content-section"><div class="section-heading"><span>01</span><h2>학습 메뉴</h2></div><div class="home-module-grid">${modules}</div></section>
        <section class="content-section"><div class="section-heading"><span>02</span><h2>금융상품, 쉽게 시작하기</h2></div><p class="section-intro">투자는 ‘얼마나 많이 버는가’보다 <strong>내 돈이 어디에 쓰이고 어떤 상황에서 줄어들 수 있는가</strong>를 이해하는 일에서 시작합니다.</p><div class="product-explainer-grid">${explainers}</div></section>
        <section class="markdown-card">
          <p class="markdown-label">LEARNING NOTE</p>
          <h2>좋은 포트폴리오는 ‘정답’보다<br>위험을 감당할 수 있는 구조에 가깝습니다.</h2>
          <blockquote>수익률만으로 상품을 비교하지 말고 비용, 유동성, 상관관계와 최대낙폭을 함께 검토하세요.</blockquote>
          <div class="markdown-columns"><div><h3>상품을 볼 때</h3><ul><li>무엇에 투자하는가</li><li>총비용과 거래비용은 얼마인가</li><li>유동성·추적오차·신용위험은 어떤가</li></ul></div><div><h3>배분을 볼 때</h3><ul><li>투자기간과 손실 허용 범위는 어떤가</li><li>자산 간 상관관계가 낮은가</li><li>리밸런싱 규칙이 있는가</li></ul></div></div>
        </section>
        <p class="content-disclaimer">학습용 서비스이며 특정 투자상품의 매수·매도를 권유하지 않습니다. 투자 판단과 책임은 투자자 본인에게 있습니다.</p>
      </article>`;
    bindViewLinks();
  }

  function renderQuiz() {
    const question = QUIZ_QUESTIONS[state.quizIndex];
    const complete = state.quizIndex >= QUIZ_QUESTIONS.length;
    if (complete) {
      const score = state.quizAnswers.filter((answer, i) => answer === QUIZ_QUESTIONS[i].answer).length;
      const saved = JSON.parse(localStorage.getItem('finance-rag-quiz-results') || '[]');
      if (!state.quizAnswers.saved) {
        saved.unshift({ score, total: QUIZ_QUESTIONS.length, completedAt: new Date().toISOString() });
        localStorage.setItem('finance-rag-quiz-results', JSON.stringify(saved.slice(0, 10)));
        state.quizAnswers.saved = true;
      }
      $messages.innerHTML = `<article class="content-page quiz-page quiz-result"><div class="content-kicker">QUIZ RESULT</div><div class="result-ring"><strong>${score}</strong><span>/ ${QUIZ_QUESTIONS.length}</span></div><h1>${score >= 4 ? '훌륭합니다. 핵심 개념을 잘 이해하고 있어요.' : '풀이를 바탕으로 핵심 개념을 다시 연결해 보세요.'}</h1><p class="content-lead">정답과 해설을 복습한 뒤 시뮬레이션에서 자산 비중을 바꿔 보세요.</p><section class="quiz-skill-map" aria-label="영역별 퀴즈 결과">${QUIZ_QUESTIONS.map((item, i) => `<div class="${state.quizAnswers[i] === item.answer ? 'good' : 'needs'}"><span>${item.category}</span><i style="width:${state.quizAnswers[i] === item.answer ? 100 : 38}%"></i><b>${state.quizAnswers[i] === item.answer ? '이해 완료' : '복습 추천'}</b></div>`).join('')}</section><div class="quiz-review">${QUIZ_QUESTIONS.map((item, i) => `<div class="review-row ${state.quizAnswers[i] === item.answer ? 'correct' : 'incorrect'}"><span>${i + 1}</span><div><strong>${state.quizAnswers[i] === item.answer ? '정답' : '복습 필요'} · ${item.category}</strong><p>${item.explanation}</p></div></div>`).join('')}</div><div class="home-actions"><button class="content-cta" data-reset-quiz><i class="fa-solid fa-rotate-right"></i> 다시 풀기</button><button class="content-secondary" data-go="simulation">시뮬레이션으로 이동</button></div></article>`;
      $messages.querySelector('[data-reset-quiz]').addEventListener('click', () => { state.quizIndex = 0; state.quizAnswers = []; renderQuiz(); });
      bindViewLinks();
      return;
    }
    $messages.innerHTML = `<article class="content-page quiz-page"><div class="quiz-topline"><span class="content-kicker">${question.category.toUpperCase()} QUIZ</span><span>${state.quizIndex + 1} / ${QUIZ_QUESTIONS.length}</span></div><div class="quiz-progress"><i style="width:${((state.quizIndex + 1) / QUIZ_QUESTIONS.length) * 100}%"></i></div><div class="quiz-dot-map" aria-label="퀴즈 진행도">${QUIZ_QUESTIONS.map((_, index) => `<i class="${index < state.quizIndex ? 'done' : index === state.quizIndex ? 'current' : ''}"></i>`).join('')}</div><h1>${question.question}</h1><p class="content-lead">가장 적절한 답을 하나 선택하세요.</p><div class="quiz-choices">${question.choices.map((choice, index) => `<button class="quiz-choice" data-answer="${index}"><span>${String.fromCharCode(65 + index)}</span>${choice}</button>`).join('')}</div><div id="quizFeedback"></div></article>`;
    $messages.querySelectorAll('[data-answer]').forEach(button => button.addEventListener('click', () => answerQuiz(Number(button.dataset.answer))));
  }

  function answerQuiz(answer) {
    const question = QUIZ_QUESTIONS[state.quizIndex];
    const correct = answer === question.answer;
    state.quizAnswers[state.quizIndex] = answer;
    $messages.querySelectorAll('.quiz-choice').forEach(button => {
      const value = Number(button.dataset.answer);
      button.disabled = true;
      if (value === question.answer) button.classList.add('correct');
      if (value === answer && !correct) button.classList.add('incorrect');
    });
    document.getElementById('quizFeedback').innerHTML = `<div class="quiz-feedback ${correct ? 'correct' : 'incorrect'}"><strong>${correct ? '정답입니다.' : '다시 확인해 보세요.'}</strong><p>${question.explanation}</p><button class="content-cta" id="nextQuizBtn">${state.quizIndex + 1 === QUIZ_QUESTIONS.length ? '결과 보기' : '다음 문제'} <i class="fa-solid fa-arrow-right"></i></button></div>`;
    document.getElementById('nextQuizBtn').addEventListener('click', () => { state.quizIndex += 1; renderQuiz(); });
  }

  function renderSimulationGuide() {
    $messages.innerHTML = `<article class="content-page simulation-page"><div class="content-kicker">ALLOCATION WORKBENCH</div><h1>직접 설계하고 비교하는<br><mark>자산배분 실습</mark></h1><p class="content-lead">한 화면에서 자산 비중과 헤지를 조절하고, 모델별 결과·시장 충격·저장한 설정을 비교해 보세요.</p><div class="simulation-steps"><div><span>01</span><h3>설계</h3><p>프리셋을 출발점으로 자산 비중과 헤지 강도를 조절합니다.</p></div><div><span>02</span><h3>검증</h3><p>성과 지표와 세 가지 스트레스 시나리오를 함께 읽습니다.</p></div><div><span>03</span><h3>비교</h3><p>현재 설정을 저장하고 이전 설정과 차이를 확인합니다.</p></div></div><div class="simulation-workbench" id="simulationMount"></div></article>`;
    document.getElementById('simulationMount').appendChild($simulationPanel);
    updateSimulation();
  }

  function renderTheoryIndex() {
    const dayCards = THEORY_DAYS.map(item => `
      <button class="theory-day-card" data-theory-day-link="${item.day}">
        <span class="theory-day-number">DAY ${item.day}</span>
        <i class="fa-solid ${item.icon}"></i>
        <h2>${escHtml(item.title)}</h2>
        <p>${escHtml(item.subtitle)}</p>
        <small>학습 목표 · ${escHtml(item.goal)}</small>
        <em>내용 보기 <i class="fa-solid fa-arrow-right"></i></em>
      </button>
    `).join('');
    $messages.innerHTML = `
      <article class="content-page theory-page">
        <div class="content-kicker">5-DAY FINANCE THEORY</div>
        <h1>하루 하나씩 읽는<br><mark>금융상품·자산배분 이론</mark></h1>
        <p class="content-lead">각 일차 메뉴는 독립적으로 읽을 수 있습니다. 개념을 먼저 읽고, 궁금한 점은 RAG 학습으로 이어서 질문해 보세요.</p>
        <p class="glossary-hint"><i class="fa-solid fa-circle-info"></i> 점선 밑줄이 있는 경제 용어를 누르면 한자·영문·약자와 쉬운 설명을 볼 수 있습니다.</p>
        <section class="theory-overview">
          <div><strong>5일</strong><span>짧고 분명한 이론 학습</span></div>
          <div><strong>고등학생 수준</strong><span>어려운 용어는 쉬운 말로 풉니다</span></div>
          <div><strong>실천 질문</strong><span>매일 한 가지 확인 과제가 있습니다</span></div>
        </section>
        <section class="theory-roadmap" aria-label="5일 이론 흐름"><div class="roadmap-label"><span>CURRICULUM MAP</span><strong>상품 이해에서 포트폴리오 설계까지</strong></div><div>${THEORY_DAYS.map(item => `<button data-theory-day-link="${item.day}"><b>${String(item.day).padStart(2, '0')}</b><i class="fa-solid ${item.icon}"></i><span>${escHtml(item.title)}</span></button>`).join('')}</div></section>
        <section class="theory-index-grid">${dayCards}</section>
        <p class="content-disclaimer">학습용 콘텐츠이며 특정 상품의 매수·매도를 권유하지 않습니다.</p>
      </article>`;
    bindTheoryLinks();
  }

  function openTheoryDay(day) {
    const lesson = THEORY_DAYS.find(item => item.day === day);
    if (!lesson) return;
    state.activeTheoryDay = day;
    state.activeView = 'theory';
    $viewButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.view === 'theory'));
    $chatInputArea.classList.add('hidden');
    $clearChatBtn.classList.add('hidden');
    $theoryDayButtons.forEach(btn => btn.classList.toggle('active', Number(btn.dataset.theoryDay) === day));
    setPanel('left', false);
    renderTheoryDay(lesson);
  }

  function renderTheoryDay(lesson) {
    const lessonBlocks = lesson.lessons.map(([heading, paragraphs], index) => `
      <section class="theory-lesson">
        <span>${String(index + 1).padStart(2, '0')}</span>
        <div><h2>${escHtml(heading)}</h2>${paragraphs.map(text => `<p>${escHtml(text)}</p>`).join('')}</div>
      </section>
    `).join('');
    const magazine = renderDailyMarketMagazine(lesson.day);
    const koreaEquityExtra = lesson.day === 2 ? renderKoreaMarketMagazine() : '';
    const dayVisual = renderDayInfographic(lesson.day);
    const previous = lesson.day > 1 ? lesson.day - 1 : null;
    const next = lesson.day < THEORY_DAYS.length ? lesson.day + 1 : null;
    $messages.innerHTML = `
      <article class="content-page theory-page theory-detail-page theory-day-${lesson.day}">
        <div class="theory-detail-heading">
          <span class="theory-day-number">DAY ${lesson.day} / ${THEORY_DAYS.length}</span>
          <i class="fa-solid ${lesson.icon}"></i>
          <h1>${escHtml(lesson.title)}</h1>
          <p>${escHtml(lesson.subtitle)}</p>
        </div>
        <p class="glossary-hint"><i class="fa-solid fa-circle-info"></i> 점선 밑줄 용어를 누르면 상세 용어 설명이 열립니다.</p>
        <div class="theory-progress" aria-label="5일 학습 중 ${lesson.day}일차">${THEORY_DAYS.map(item => `<i class="${item.day <= lesson.day ? 'done' : ''}"></i>`).join('')}</div>
        <section class="theory-goal"><strong>오늘의 학습 목표</strong><p>${escHtml(lesson.goal)}</p></section>
        <section class="lesson-dashboard" aria-label="오늘의 학습 대시보드"><div><span>READ</span><strong>${lesson.lessons.length}</strong><small>개념 카드</small></div><div><span>KEYWORDS</span><strong>${lesson.keywords.length}</strong><small>핵심 용어</small></div><div><span>CHECK</span><strong><i class="fa-solid fa-pen"></i></strong><small>마무리 질문</small></div></section>
        ${dayVisual}
        ${magazine}
        ${koreaEquityExtra}
        <div class="theory-lesson-list">${lessonBlocks}</div>
        <section class="theory-check"><i class="fa-solid fa-pen-to-square"></i><div><strong>오늘의 확인</strong><p>${escHtml(lesson.check)}</p></div></section>
        <section class="theory-keywords"><strong>핵심 단어</strong><div>${lesson.keywords.map(word => `<span>${escHtml(word)}</span>`).join('')}</div></section>
        <div class="theory-actions">
          <button class="content-cta" data-theory-rag="${escHtml(lesson.ragPrompt)}"><i class="fa-solid fa-comments"></i> 이 내용 RAG에게 질문하기</button>
          ${previous ? `<button class="content-secondary" data-theory-day-link="${previous}"><i class="fa-solid fa-arrow-left"></i> ${previous}일차</button>` : '<span></span>'}
          ${next ? `<button class="content-secondary" data-theory-day-link="${next}">${next}일차 <i class="fa-solid fa-arrow-right"></i></button>` : '<button class="content-secondary" data-go="quiz">퀴즈 풀기 <i class="fa-solid fa-arrow-right"></i></button>'}
        </div>
      </article>`;
    bindViewLinks();
    bindTheoryLinks();
    $messages.querySelector('[data-theory-rag]')?.addEventListener('click', () => {
      setView('learn');
      $questionInput.value = lesson.ragPrompt;
      resizeInput();
      $questionInput.focus();
    });
  }

  function renderDayInfographic(day) {
    const visuals = {
      1: `<section class="day-infographic market-map-card"><div class="info-heading"><span>KOREA MARKET MAP</span><h2>누가 상품을 만들고, 누가 거래를 돕나요?</h2></div><div class="institution-grid"><article><i class="fa-solid fa-building-columns"></i><b>은행</b><span>예·적금 · 대출 · 일부 채권</span><small>국민·신한·하나·우리 등</small></article><article><i class="fa-solid fa-mobile-screen-button"></i><b>증권사</b><span>주식 · ETF · 채권 · 계좌</span><small>삼성·미래·NH·KB·키움 등</small></article><article><i class="fa-solid fa-layer-group"></i><b>자산운용사</b><span>ETF · 펀드의 설계와 운용</span><small>KODEX·TIGER·RISE·ACE 등</small></article></div><div class="money-flow"><span>투자자</span><i class="fa-solid fa-arrow-right"></i><span>증권사 앱</span><i class="fa-solid fa-arrow-right"></i><span>KRX 시장·펀드</span><i class="fa-solid fa-arrow-right"></i><span>주식·채권·ETF</span></div></section>`,
      2: `<section class="day-infographic company-strip"><div class="info-heading"><span>STOCKS AT A GLANCE</span><h2>한국 대표 기업을 산업별로 읽기</h2></div><div><article><b>반도체</b><span>삼성전자 · SK하이닉스</span><i style="width:88%"></i></article><article><b>자동차·산업재</b><span>현대차 · HD현대중공업 · 한화에어로스페이스</span><i style="width:72%"></i></article><article><b>플랫폼·바이오</b><span>NAVER · 카카오 · 셀트리온</span><i style="width:61%"></i></article><article><b>금융·소재</b><span>KB금융 · LG에너지솔루션 · POSCO홀딩스</span><i style="width:67%"></i></article></div></section>`,
      3: `<section class="day-infographic derivative-map"><div class="info-heading"><span>KRX PRODUCT MAP</span><h2>금리·채권·파생상품을 한 장으로</h2></div><div class="derivative-grid"><article><i class="fa-solid fa-landmark"></i><b>채권</b><span>국채 · 회사채 · 채권 ETF</span><small>금리와 만기가 핵심</small></article><article><i class="fa-solid fa-chart-line"></i><b>지수 선물·옵션</b><span>KOSPI 200 · KOSDAQ 150</span><small>증거금 · 만기 확인</small></article><article><i class="fa-solid fa-dollar-sign"></i><b>FICC</b><span>달러 · 3년·10년 국채 · 금</span><small>환율·금리·원자재 변수</small></article></div><div class="rate-meter"><span>한국은행 기준금리<br><b>2.75%</b><small>2026.07.16 기준</small></span><i><b style="width:55%"></b></i><em>금리 변화 → 채권 가격·대출·예금·환율에 영향</em></div></section>`,
      4: `<section class="day-infographic risk-radar"><div class="info-heading"><span>RISK LENS</span><h2>수익률 하나만 보지 않는 4가지 지표</h2></div><div class="risk-four"><article><i class="fa-solid fa-chart-line"></i><b>수익률</b><span>얼마나 늘었나</span></article><article><i class="fa-solid fa-wave-square"></i><b>변동성</b><span>얼마나 흔들렸나</span></article><article><i class="fa-solid fa-arrow-trend-down"></i><b>MDD</b><span>얼마나 크게 빠졌나</span></article><article><i class="fa-solid fa-scale-balanced"></i><b>샤프 비율</b><span>위험 대비 성과는?</span></article></div><div class="concentration-meter"><span>예시: 반도체 ETF + 삼성전자 직접 보유</span><i><b style="width:82%"></b></i><strong>겹치는 노출을 확인하세요</strong></div></section>`,
      5: `<section class="day-infographic allocation-map"><div class="info-heading"><span>PORTFOLIO BLUEPRINT</span><h2>자산배분은 종목 맞히기보다 역할 나누기</h2></div><div class="allocation-pyramid"><article><b>성장</b><span>국내·해외 주식 ETF</span></article><article><b>완충</b><span>국채 · 우량채 · 채권 ETF</span></article><article><b>유동성</b><span>현금성 자산 · 단기 목적자금</span></article></div><div class="rebalancing-line"><span>목표 비중 설정</span><i></i><span>정기 점검</span><i></i><span>기준 벗어나면 조정</span></div></section>`,
    };
    return visuals[day] || '';
  }

  function renderDailyMarketMagazine(day) {
    const editions = {
      1: {
        eyebrow: 'DAY 01 · MONEY & MARKET FIELD GUIDE',
        title: '내 돈은 어느 문을 통해<br><em>시장으로 들어갈까?</em>',
        deck: '투자의 첫 장면은 종목 화면이 아니라 계좌·상품·거래소의 역할을 이해하는 일입니다. 은행, 증권사, 자산운용사, 한국거래소가 맡은 일을 실제 이름과 함께 읽어 봅니다.',
        pulse: [['은행', 42], ['증권사', 76], ['운용사', 65], ['거래소', 88]],
        storyTitle: '앱 하나에서 모두 보이지만, 역할은 서로 다릅니다.',
        story: '삼성증권·미래에셋증권·NH투자증권·KB증권·키움증권 등은 투자자의 주문을 받아 시장에 연결하는 증권사입니다. KODEX·TIGER·RISE·ACE 같은 ETF 브랜드는 각각 삼성자산운용·미래에셋자산운용·KB자산운용·한국투자신탁운용이 상품을 설계하고 운용합니다.',
        note: '처음 계좌를 만들 때는 이벤트보다 내가 쓰려는 기능을 먼저 체크하세요. 국내·해외 주식, ETF, 채권, ISA·연금, 파생상품 지원 여부와 거래·환전·이체 비용이 서로 다를 수 있습니다.',
        files: [
          ['삼성전자', '반도체·스마트폰·가전', '주식은 회사의 사업 결과와 기대가 가격에 반영됩니다. 삼성전자는 메모리, 파운드리, 모바일, 가전처럼 여러 사업이 있어 “반도체만”으로 읽기 어렵습니다.', '사업보고서 → 부문별 매출·이익 / IR → 다음 분기 수요 가정'],
          ['KB금융', '은행·증권·보험·운용', '금융지주는 예금만 받는 은행이 아닙니다. 대출, 카드, 증권, 보험, 자산운용 수익이 합쳐져 금리·경기·신용위험에 복합적으로 반응합니다.', '대손비용 · CET1 · 배당·자사주 정책'],
          ['KODEX 200', 'KOSPI 200 ETF 사례', '한 종목을 고르는 대신 KOSPI 200 구성 종목을 한 바구니로 보유하는 방식입니다. 분산되지만 대형 반도체·금융주의 영향은 여전히 큽니다.', '기초지수 · 총보수 · NAV · 호가 스프레드'],
          ['국고채 ETF', '금리와 만기의 상품', '정부에 돈을 빌려주는 국채에 투자하는 ETF도 가격이 움직입니다. 특히 만기가 길수록 금리 변화에 민감해질 수 있습니다.', '듀레이션 · 만기 · 금리 민감도'],
        ],
        matrix: [['은행 상품', '원금·만기·중도해지', '예금·적금'], ['증권사 계좌', '시장·수수료·주문 방식', '주식·ETF·채권'], ['운용사 상품', '기초자산·보수·운용규칙', 'ETF·공모펀드'], ['거래소 시장', '거래시간·유동성·공시', 'KRX 상장상품']],
        checklist: ['상품 이름 대신 기초자산을 한 문장으로 쓰기', '운용사와 주문을 받는 증권사를 구분하기', '“언제 써야 하는 돈인가”를 상품보다 먼저 정하기'],
      },
      2: {
        eyebrow: 'DAY 02 · KOREAN EQUITY READING ROOM',
        title: '뜨는 테마보다 먼저,<br><em>돈 버는 구조를 읽기</em>',
        deck: 'AI 반도체, 자동차, 조선·방산, 플랫폼, 바이오, 금융, 배터리는 모두 다른 언어로 움직입니다. 대표 기업을 통해 매출을 바꾸는 변수와 확인해야 할 숫자를 연결합니다.',
        pulse: [['AI 메모리', 92], ['자동차', 67], ['조선·방산', 79], ['금융', 58]],
        storyTitle: '같은 “성장”이라도 실적을 만드는 엔진은 다릅니다.',
        story: '삼성전자와 SK하이닉스는 AI 서버 투자와 고대역폭메모리(HBM) 수요를 함께 보지만, 제품 구성과 사업 포트폴리오가 다릅니다. 현대차는 판매량·인센티브·환율을, HD현대중공업은 수주가 매출로 전환되는 시점과 원가를, NAVER는 광고·커머스·AI 수익화를 따로 읽어야 합니다.',
        note: '기업 이름을 테마로만 묶지 마세요. 실적 발표 자료에서 “가격·물량·원가·환율·금리·규제” 중 무엇이 다음 분기의 숫자를 바꿀지 표시하면 뉴스가 훨씬 선명해집니다.',
        files: [
          ['삼성전자', 'HBM·메모리·파운드리', '2026년 HBM4 양산 출하 및 HBM4E 샘플 관련 발표은 AI 인프라가 국내 반도체 공급망의 핵심 관찰 주제임을 보여 줍니다. 기술 발표와 실적 실현은 구분해서 봐야 합니다.', '메모리 가격 · 고객 인증 · 수율 · CAPEX'],
          ['SK하이닉스', 'D램·낸드·HBM', '메모리 비중이 높은 기업은 서버 수요와 제품 믹스, 공급 제약, 가격 사이클에 민감합니다. 경쟁력은 판매량만 아니라 고부가 제품 전환 속도에도 달려 있습니다.', 'HBM 비중 · ASP · 재고 · 고객 다변화'],
          ['현대차', '완성차·하이브리드·EV', '차량 한 대의 판매가 전부가 아닙니다. 지역별 믹스, 인센티브, 환율, 재고, 하이브리드와 전기차의 제품 구성까지 함께 봐야 영업이익의 방향을 읽을 수 있습니다.', '판매대수 · 인센티브 · 환율 · 가동률'],
          ['셀트리온', '바이오시밀러·직접판매', '바이오 기업은 허가, 출시, 경쟁약 가격, 유통망, 원가가 한꺼번에 작용합니다. 제품 개발 뉴스는 출발점이고 실제 처방과 판매가 이어지는지 확인해야 합니다.', '허가·출시 · 점유율 · 약가 · 재고'],
        ],
        matrix: [['KOSPI 200 ETF', '한국 대형주 바구니', '삼성·미래·KB·한투 등 운용사 상품 비교'], ['반도체 ETF', '메모리·장비·소부장 노출', '상위 편입종목 겹침 확인'], ['고배당 ETF', '배당·주주환원 기업 중심', '배당률 외 지속 가능성 확인'], ['밸류업 ETF', '기업가치 제고 지수 활용', '지수 규칙·편입 변경 확인']],
        checklist: ['회사 매출을 만드는 제품을 한 줄로 정리하기', '호재 기사와 실적 반영 시점을 분리하기', 'ETF 상위 10개 편입 종목을 직접 확인하기'],
      },
      3: {
        eyebrow: 'DAY 03 · RATES, BONDS & HEDGING DESK',
        title: '금리 한 번의 변화가<br><em>채권과 기업을 잇는 방식</em>',
        deck: '기준금리는 예금·대출만의 숫자가 아닙니다. 채권 가격, 금융주 이익, 원화 가치, 성장주 할인율까지 연결됩니다. 선물·옵션은 이 연결을 거래하는 도구지만 위험도 함께 커집니다.',
        pulse: [['기준금리', 68], ['국채', 84], ['환율', 73], ['파생상품', 91]],
        storyTitle: '채권은 “안전”이라는 단어 하나로 설명되지 않습니다.',
        story: '국채는 발행 주체의 신용위험이 상대적으로 낮은 편이지만, 시장금리가 오르면 기존 채권 가격은 내려갈 수 있습니다. 회사채에는 발행 기업의 신용위험이 추가됩니다. 같은 채권 ETF라도 만기와 듀레이션이 다르면 금리 움직임에 대한 반응도 달라집니다.',
        note: 'KOSPI 200 선물·옵션, 국채선물, 미국달러선물처럼 거래소에 상장된 파생상품은 헤지와 가격발견에 쓰입니다. 그러나 증거금과 레버리지 때문에 원금보다 큰 손실이 날 수 있어, 교육·모의거래·적격투자자 절차를 거쳐도 작은 규모로 구조를 익히는 것이 먼저입니다.',
        files: [
          ['한국은행', '기준금리와 통화정책', '기준금리는 시장의 모든 금리를 그대로 결정하지는 않지만, 예금·대출·채권 수익률과 환율 기대를 읽는 중요한 출발점입니다. 발표문에서 성장·물가·금융안정 판단을 함께 읽습니다.', '기준금리 · 물가 전망 · 성장 전망'],
          ['국고채 3년·10년', '만기가 다른 정부채', '3년물과 10년물은 같은 국채라도 금리 변화에 대한 민감도가 다릅니다. 장기채는 일반적으로 가격 변동이 더 클 수 있어 “채권=현금”으로 보기는 어렵습니다.', '만기 · 듀레이션 · 수익률 곡선'],
          ['은행·금융지주', '금리와 신용의 교차점', 'KB금융·신한지주·하나금융지주·우리금융지주는 예대금리차뿐 아니라 대손비용, 자본비율, 비은행 이익을 함께 봐야 합니다. 금리가 움직인다고 이익이 한 방향으로만 변하지 않습니다.', 'NIM · 대손충당금 · CET1 · 배당'],
          ['KOSPI 200 옵션', '권리와 의무의 비대칭', '옵션 매수는 지불한 프리미엄이 최대 손실이지만, 옵션 매도는 큰 손실 가능성을 가질 수 있습니다. 상품 이름보다 포지션의 최대 손실과 증거금 구조를 먼저 계산해야 합니다.', '만기 · 행사가 · 증거금 · 강제청산'],
        ],
        matrix: [['단기채 ETF', '짧은 만기·낮은 금리 민감도', '대기자금과 동일하지 않음'], ['장기국채 ETF', '긴 만기·큰 금리 민감도', '금리 하락·상승 모두 점검'], ['달러 ETF·선물', '환율 노출', '환헤지 여부 확인'], ['지수 선물·옵션', '레버리지·만기', '적격투자자·증거금 확인']],
        checklist: ['채권 ETF의 평균 만기와 듀레이션 확인하기', '금리 기사에서 기준금리와 시장금리를 구분하기', '파생 주문 전 최대손실·유지증거금부터 적기'],
      },
      4: {
        eyebrow: 'DAY 04 · RISK, DRAWDOWN & DIVERSIFICATION',
        title: '좋은 종목을 많이 사도<br><em>위험은 겹칠 수 있습니다</em>',
        deck: '포트폴리오 위험은 종목 개수만으로 줄지 않습니다. 한국 대형주, 반도체 ETF, AI 테마 ETF가 같은 방향으로 움직일 때 생기는 겹침과 최대낙폭을 시각적으로 읽어 봅니다.',
        pulse: [['집중위험', 88], ['상관관계', 74], ['변동성', 66], ['유동성', 52]],
        storyTitle: '분산은 이름이 아니라 ‘다르게 움직일 가능성’입니다.',
        story: '삼성전자 직접 보유와 KOSPI 200 ETF, 반도체 ETF를 동시에 담으면 상품은 세 개지만 반도체 노출은 생각보다 클 수 있습니다. 반대로 주식·채권·현금성 자산은 완벽한 안전판은 아니어도 손실 시점과 변동성이 달라 포트폴리오의 흔들림을 완화할 여지를 줍니다.',
        note: '수익률은 결과를, 변동성은 흔들림을, 최대낙폭(MDD)은 가장 힘들었던 구간을 보여 줍니다. 세 지표가 모두 필요합니다. 특히 “좋은 해의 수익률”보다 감당하기 어려운 하락폭을 먼저 가정해야 장기 계획이 흔들리지 않습니다.',
        files: [
          ['삼성전자 + 반도체 ETF', '직접 보유와 ETF 중복', 'ETF는 분산 도구지만 상위 편입 종목이 직접 보유 종목과 겹치면 집중위험이 커질 수 있습니다. 보유 수량이 아니라 포트폴리오 내 실질 비중을 합산해 봅니다.', '상위 10종목 · 업종 비중 · 중복 노출'],
          ['LG에너지솔루션 + 2차전지 ETF', '테마 집중의 사례', '전기차 수요, 메탈 가격, 고객 주문, 가동률은 관련 기업들이 함께 받는 변수입니다. 여러 종목을 담아도 같은 테마 충격에서 자유롭지 않을 수 있습니다.', '고객사 · 원재료 · 가동률 · CAPEX'],
          ['HD현대중공업 + 방산 ETF', '수주 산업의 공통 변수', '조선·방산은 수주 뉴스가 강한 관심을 받지만, 납기와 원가, 수출 승인, 환율이 성과를 가릅니다. 계약 규모와 단기 이익을 같은 뜻으로 해석하지 않습니다.', '수주잔고 · 납기 · 원가 · 승인'],
          ['KOSPI 200 + 미국지수 ETF', '국가 분산의 출발점', '국가를 나누면 기업·통화·산업 구성의 차이를 얻을 수 있지만, 글로벌 위험회피 국면에서는 함께 하락할 수 있습니다. 환율 효과도 수익률에 들어옵니다.', '상관관계 · 환율 · 산업 구성'],
        ],
        matrix: [['수익률', '얼마나 늘었나', '기간과 기준점 통일'], ['변동성', '얼마나 흔들렸나', '연환산·표본기간 확인'], ['MDD', '고점 대비 얼마나 빠졌나', '회복에 걸린 시간 확인'], ['샤프비율', '위험 대비 성과', '무위험수익률 가정 확인']],
        checklist: ['ETF와 직접 보유 종목의 중복 비중 합산하기', '가장 큰 하락을 견딜 수 있는지 금액으로 써 보기', '테마가 아니라 수요·원가·환율의 공통 변수를 찾기'],
      },
      5: {
        eyebrow: 'DAY 05 · PORTFOLIO EDITORIAL',
        title: '종목을 고른 뒤가 아니라,<br><em>목표부터 포트폴리오로</em>',
        deck: '자산배분은 시장을 예측하는 게임보다 목표·기간·손실 허용범위를 역할별로 나누는 과정에 가깝습니다. 국내 대표 ETF와 기업 사례를 “성장·완충·유동성”의 언어로 다시 배치합니다.',
        pulse: [['성장자산', 78], ['채권완충', 56], ['현금유동성', 43], ['리밸런싱', 86]],
        storyTitle: '매거진 속 종목도 포트폴리오 안에서는 ‘역할’로 바뀝니다.',
        story: '삼성전자나 현대차 같은 개별 주식은 기업 특유의 성장과 위험을 갖습니다. KOSPI 200 ETF는 한국 대형주 시장 노출을, 국고채 ETF는 금리 위험을, 현금성 자산은 가까운 지출에 대응할 여지를 제공합니다. 무엇이 더 좋다는 답보다 서로 다른 역할을 이해하는 것이 우선입니다.',
        note: '평균분산, 블랙-리터만, Risk Parity는 모두 정답 기계가 아니라 비중을 생각하는 서로 다른 렌즈입니다. 이 앱의 시뮬레이션 값은 학습용 가정치이며 실제 거래비용·세금·개인별 계좌 조건을 반영하지 않습니다.',
        files: [
          ['KOSPI 200 ETF', '한국 주식 성장 바구니', 'KODEX·TIGER·RISE·ACE 등 다양한 운용사의 지수 ETF가 있습니다. 이름이 비슷해도 보수, 규모, 유동성, 분배 방식, 지수 방법론은 확인해야 합니다.', '기초지수 · 보수 · 거래량 · 괴리율'],
          ['국고채 ETF', '완충 역할의 채권 노출', '채권 ETF는 주식과 다른 역할을 기대할 수 있지만 금리 변화에 따른 가격 변동이 있습니다. 목표 기간에 맞춰 단기·중기·장기 만기를 구분합니다.', '듀레이션 · 신용등급 · 만기'],
          ['삼성전자·현대차·KB금융', '개별 기업 위성 포지션', '지수 ETF를 중심으로 두고 개별 기업은 사업을 이해한 범위에서 작은 비중으로 두는 접근도 생각해 볼 수 있습니다. 이는 예시일 뿐 정답 비중은 아닙니다.', '기업위험 · 지수 중복 · 비중 상한'],
          ['달러·금·리츠 ETF', '분산 후보 자산', '환율, 실질금리, 부동산 경기 등 다른 변수를 갖는 상품은 분산 후보가 될 수 있습니다. 그러나 각각 비용·변동성·세금·기초자산의 위험이 존재합니다.', '환노출 · 임대수익 · 원자재 변동'],
        ],
        matrix: [['성장', '주식·주식 ETF', '장기 목표 자금'], ['완충', '국채·우량채 ETF', '변동성 조절'], ['유동성', '예금·MMF 등', '가까운 지출·비상금'], ['위성', '개별주·테마 ETF', '이해한 범위의 제한된 비중']],
        checklist: ['목적자금과 투자자금을 분리하기', '목표 비중·점검일·조정 기준을 미리 적기', '시뮬레이션 후 실제 비용·세금·계좌 조건을 별도로 확인하기'],
      },
    };
    const edition = editions[day];
    if (!edition) return '';
    return `<section class="daily-market-magazine" aria-label="${edition.eyebrow}">
      <header class="daily-magazine-hero"><div><span>${edition.eyebrow}</span><h2>${edition.title}</h2><p>${edition.deck}</p></div><div class="daily-pulse"><span>MARKET LENS</span>${edition.pulse.map(([label, value]) => `<div><b>${label}</b><i><em style="height:${value}%"></em></i><small>${value}</small></div>`).join('')}<p>막대 수치는 수익률이 아닌<br>학습용 관찰 우선순위입니다.</p></div></header>
      <div class="daily-magazine-story"><article><span>WHY IT MATTERS</span><h3>${edition.storyTitle}</h3><p>${edition.story}</p></article><aside><i class="fa-solid fa-magnifying-glass-chart"></i><b>읽는 순서</b><ol><li>사업과 상품의 구조</li><li>다음 분기 핵심 변수</li><li>가장 나쁜 경우의 위험</li></ol><p>${edition.note}</p></aside></div>
      <section class="market-file-grid">${edition.files.map(([name, category, body, check], index) => `<article class="market-file"><span>FILE ${String(index + 1).padStart(2, '0')}</span><h3>${name}</h3><b>${category}</b><p>${body}</p><div><i class="fa-solid fa-eye"></i><small>${check}</small></div></article>`).join('')}</section>
      <section class="market-comparison"><div><span>COMPARE BEFORE YOU BUY</span><h3>이름이 비슷해도, 확인할 항목은 다릅니다.</h3></div><div class="comparison-table">${edition.matrix.map(([name, meaning, check]) => `<p><b>${name}</b><span>${meaning}</span><em>${check}</em></p>`).join('')}</div></section>
      <footer class="daily-checklist"><div><span>READER'S CHECKLIST</span><strong>오늘의 읽기 과제</strong></div><ol>${edition.checklist.map(item => `<li>${item}</li>`).join('')}</ol></footer>
      <p class="market-source-note"><i class="fa-solid fa-circle-info"></i> 실제 기업·상품명은 학습 사례입니다. 한국거래소 KIND 공시, 운용사 상품설명서, 회사 IR·사업보고서와 한국은행 자료를 원문으로 확인하세요. 특정 상품의 매수·매도 추천이 아닙니다.</p>
    </section>`;
  }

  function renderKoreaMarketMagazine() {
    const companies = [
      ['삼성전자', 'AI 메모리 · 파운드리 · 디바이스', 'HBM·서버 메모리 수요, 파운드리 수율과 고객 구성을 함께 확인'],
      ['SK하이닉스', 'D램 · 낸드 · HBM', 'AI 메모리 제품 전환, 가격 사이클과 고객 인증이 핵심 변수'],
      ['현대차', '완성차 · 하이브리드 · EV', '지역별 판매, 인센티브, 환율과 전동화 제품 구성을 점검'],
      ['HD현대중공업', '상선 · 특수선 · 엔진', '수주잔고가 매출·이익으로 전환되는 시점과 원가를 확인'],
      ['NAVER', '광고 · 커머스 · 콘텐츠 · AI', '광고 회복, 커머스 수익성, AI 서비스의 수익화가 관찰 포인트'],
      ['셀트리온', '바이오시밀러 · 직접판매', '허가·출시 일정, 경쟁약 가격, 판매망 확대를 함께 확인'],
      ['KB금융', '은행 · 증권 · 보험 · 자산운용', '대손비용, CET1, 비이자이익과 주주환원 지속성을 점검'],
      ['LG에너지솔루션', '배터리 · ESS', '전기차·ESS 수요, 고객 주문, 가동률과 투자 규모가 중요'],
    ];
    return `<section class="market-magazine" aria-label="한국 주식 시장 매거진">
      <header class="magazine-hero"><div><span>KOREA EQUITY ATLAS · 2026</span><h2>산업의 흐름으로<br><em>기업을 읽는 법</em></h2><p>종목 이름을 외우기보다, 어떤 사업이 어떤 변수로 움직이는지부터 살펴보는 한국시장 리딩 가이드입니다.</p></div><div class="market-pulse"><span>SECTOR PULSE</span><div><b>AI 반도체</b><i style="height:82%"></i></div><div><b>자동차</b><i style="height:63%"></i></div><div><b>조선·방산</b><i style="height:72%"></i></div><div><b>금융</b><i style="height:55%"></i></div><small>막대 높이는 수익률이 아닌<br>학습용 산업 관찰 강도입니다.</small></div></header>
      <div class="magazine-lead-grid"><article class="lead-story"><span>LEAD STORY</span><h3>AI는 반도체 한 종목의 이야기가 아닙니다.</h3><p>메모리, 파운드리, 서버, 전력·냉각, 데이터센터 투자까지 연결된 공급망을 함께 봐야 합니다. 삼성전자와 SK하이닉스는 HBM·서버 메모리라는 공통 변수를 공유하지만 사업 구조와 제품 포트폴리오는 다릅니다.</p><div class="mini-compare"><span>수요</span><i></i><span>제품 믹스</span><i></i><span>가격</span><i></i><span>설비</span></div></article><article class="market-check"><span>INVESTOR CHECK</span><strong>3가지 질문</strong><ol><li>회사는 무엇을 팔아 매출을 만드나?</li><li>다음 분기 숫자를 바꿀 변수는 무엇인가?</li><li>가장 나쁜 경우의 위험은 무엇인가?</li></ol></article></div>
      <div class="company-card-grid">${companies.map(([name, sector, note], index) => `<article class="company-feature"><span>0${index + 1}</span><h3>${name}</h3><b>${sector}</b><p>${note}</p><i class="fa-solid ${['fa-microchip','fa-memory','fa-car-side','fa-ship','fa-network-wired','fa-flask','fa-building-columns','fa-battery-three-quarters'][index]}"></i></article>`).join('')}</div>
      <section class="sector-lens"><div><span>HOW TO READ</span><h3>업종별로 다른 ‘전망’의 뜻</h3></div><div class="sector-lens-grid"><p><b>반도체</b><span>가격·재고·고객 인증</span></p><p><b>자동차</b><span>판매·인센티브·환율</span></p><p><b>조선·방산</b><span>수주·납기·원가</span></p><p><b>플랫폼·바이오</b><span>수익화·허가·경쟁</span></p><p><b>금융·배터리</b><span>자본·대손·가동률</span></p></div></section>
    </section>`;
  }

  function bindTheoryLinks() {
    $messages.querySelectorAll('[data-theory-day-link]').forEach(button => {
      button.addEventListener('click', () => openTheoryDay(Number(button.dataset.theoryDayLink)));
    });
  }

  function bindViewLinks() {
    $messages.querySelectorAll('[data-go]').forEach(button => button.addEventListener('click', () => setView(button.dataset.go)));
  }

  function showWelcome() {
    const prompts = [
      '주식, ETF, 펀드의 차이를 고등학생도 이해할 수 있게 설명해줘.',
      '채권 가격과 금리의 관계를 쉬운 예시로 설명해줘.',
      '분산투자와 자산배분, 리밸런싱이 왜 필요한지 알려줘.',
      '평균분산, 블랙-리터만, Risk Parity의 차이를 비교해줘.',
    ].map(prompt => `
      <button class="example-chip" data-q="${escHtml(prompt)}">${escHtml(prompt)}</button>
    `).join('');

    $messages.innerHTML = `
      <div class="welcome-msg">
        <div class="welcome-icon"><i class="fa-solid fa-graduation-cap"></i></div>
        <h2>금융·투자 RAG 질문</h2>
        <p>5일 이론에서 읽은 내용을 바탕으로 궁금한 점을 자유롭게 질문하세요. 답변에 사용한 참고 문서도 함께 확인할 수 있습니다.</p>

        <section class="rag-flow" aria-label="RAG 답변 과정"><div><i class="fa-solid fa-keyboard"></i><b>질문</b><span>궁금한 점을 입력</span></div><i class="fa-solid fa-arrow-right"></i><div><i class="fa-solid fa-file-lines"></i><b>문서 탐색</b><span>등록 자료에서 근거 찾기</span></div><i class="fa-solid fa-arrow-right"></i><div><i class="fa-solid fa-lightbulb"></i><b>답변</b><span>핵심 내용과 참고 문서</span></div></section>

        <div class="quick-examples" id="quickExamples">
          <p class="examples-label">추천 RAG 질문</p>
          ${prompts}
        </div>
      </div>
    `;

    $messages.querySelectorAll('.example-chip').forEach(chip => {
      chip.addEventListener('click', () => sendQuestion(chip.dataset.q));
    });
  }

  function triggerSend() {
    const question = $questionInput.value.trim();
    if (!question || state.loading) return;
    $questionInput.value = '';
    resizeInput();
    sendQuestion(question);
  }

  async function sendQuestion(question) {
    if (state.loading) return;
    clearWelcome();

    appendMessage('user', question);
    const typingId = appendTyping();

    state.loading = true;
    setInputDisabled(true);

    try {
      const res = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          domain: state.domain,
          top_k: state.topK,
          session_id: state.sessionId,
        }),
      });

      removeTyping(typingId);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        appendMessage('bot', `⚠️ 오류: ${err.detail || res.statusText}`);
        return;
      }

      const data = await res.json();
      appendMessage('bot', data.answer, data.references || []);
      updateRefPanel(data.references || []);
    } catch (err) {
      removeTyping(typingId);
      appendMessage('bot', `⚠️ 네트워크 오류: ${err.message}`);
    } finally {
      state.loading = false;
      setInputDisabled(false);
      $questionInput.focus();
    }
  }

  function appendMessage(role, content, chunks = []) {
    const isUser = role === 'user';
    const id = `msg-${Date.now()}`;
    const time = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    const refBtnHtml = (!isUser && chunks.length)
      ? `<button class="ref-btn" data-msgid="${id}"><i class="fa-solid fa-paperclip"></i> 참고 ${chunks.length}건</button>`
      : '';

    const html = `
      <div class="msg ${role}" id="${id}">
        <div class="msg-avatar">${isUser ? '<i class="fa-solid fa-user"></i>' : '<i class="fa-solid fa-robot"></i>'}</div>
        <div>
          <div class="msg-bubble">${formatContent(content)}</div>
          <div class="msg-meta">
            <span>${time}</span>
            ${refBtnHtml}
          </div>
        </div>
      </div>
    `;

    $messages.insertAdjacentHTML('beforeend', html);
    if (chunks.length) {
      const btn = document.getElementById(id).querySelector('.ref-btn');
      btn?.addEventListener('click', () => updateRefPanel(chunks));
    }
    scrollToBottom();
    state.chatHistory.push({ role, content, chunks });
  }

  function appendTyping() {
    const id = `typing-${Date.now()}`;
    $messages.insertAdjacentHTML('beforeend', `
      <div class="msg bot" id="${id}">
        <div class="msg-avatar"><i class="fa-solid fa-robot"></i></div>
        <div class="msg-bubble">
          <div class="typing-dots"><span></span><span></span><span></span></div>
        </div>
      </div>
    `);
    scrollToBottom();
    return id;
  }

  function removeTyping(id) {
    document.getElementById(id)?.remove();
  }

  function clearWelcome() {
    $messages.querySelector('.welcome-msg')?.remove();
  }

  function updateRefPanel(chunks) {
    if (!chunks.length) {
      $refList.innerHTML = '<p class="ref-empty">질문 후 참고 문서가 여기에 표시됩니다.</p>';
      setPanel('right', false);
      return;
    }

    $refList.innerHTML = chunks.map((chunk, idx) => `
      <div class="ref-card">
        <div class="ref-card-title">${idx + 1}. ${escHtml(chunk.title || '제목 없음')}</div>
        <span class="ref-card-score">유사도 ${(chunk.score * 100).toFixed(1)}%</span>
        <div class="ref-card-content">${escHtml(chunk.content || '')}</div>
      </div>
    `).join('');
    setPanel('right', true);
  }

  async function handleFileUpload(file) {
    const lowerName = file.name.toLowerCase();
    const allowed = lowerName.endsWith('.txt') || lowerName.endsWith('.pdf');
    if (!allowed) {
      showUploadStatus('error', 'TXT 또는 PDF 파일만 지원합니다.');
      return;
    }

    showUploadStatus('loading', `"${escHtml(file.name)}" 업로드 중…`);
    const form = new FormData();
    form.append('file', file);
    form.append('domain', state.domain);

    try {
      const res = await fetch('/ingest/file', { method: 'POST', body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showUploadStatus('error', `오류: ${err.detail || res.statusText}`);
        return;
      }
      const data = await res.json();
      showUploadStatus('success', `"${escHtml(data.title)}" 등록 완료 (${data.chunks}개 청크)`);
    } catch (err) {
      showUploadStatus('error', `네트워크 오류: ${err.message}`);
    }
  }

  async function ingestText() {
    const title = $textTitle.value.trim();
    const content = $textContent.value.trim();

    if (!title || !content) {
      showUploadStatus('error', '제목과 내용을 모두 입력하세요.');
      return;
    }

    $ingestTextBtn.disabled = true;
    showUploadStatus('loading', '등록 중…');

    try {
      const res = await fetch('/ingest/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: crypto.randomUUID(),
          title,
          content,
          domain: state.domain,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showUploadStatus('error', `오류: ${err.detail || res.statusText}`);
        return;
      }

      const data = await res.json();
      showUploadStatus('success', `"${escHtml(data.title || data.document_id)}" 등록 완료 (${data.chunks}개 청크)`);
      $textTitle.value = '';
      $textContent.value = '';
    } catch (err) {
      showUploadStatus('error', `네트워크 오류: ${err.message}`);
    } finally {
      $ingestTextBtn.disabled = false;
    }
  }

  function updateSimulation() {
    const snapshot = getSimulationSnapshot();
    const { weights, hedgeRatio, model, total } = snapshot;
    const normalizedSuffix = total === 100 ? '' : ' (정규화)';

    $stockWeightLabel.textContent = `${percent(weights.stock)}${normalizedSuffix}`;
    $bondWeightLabel.textContent = `${percent(weights.bond)}${normalizedSuffix}`;
    $altWeightLabel.textContent = `${percent(weights.alt)}${normalizedSuffix}`;
    $hedgeRatioLabel.textContent = `${Math.round(hedgeRatio * 100)}%`;

    if (total === 0) {
      state.currentSimulation = null;
      $simReturn.textContent = '-';
      $simVolatility.textContent = '-';
      $simSharpe.textContent = '-';
      $simDrawdown.textContent = '-';
      $simAllocation.innerHTML = '<span>자산 비중 합계가 0%입니다. 슬라이더를 조정해 포트폴리오를 구성하세요.</span>';
      $simNarrative.innerHTML = '<strong>실습 안내</strong><br>주식/ETF, 채권, 대체·현금 중 하나 이상에 비중을 배분하면 리스크와 성과 지표를 계산합니다.';
      $simScenarioResult.innerHTML = '';
      $simCompare.innerHTML = '';
      $simDonut.style.background = '#e2e8f0';
      $simRiskBars.innerHTML = '';
      return;
    }

    const returns = SIMULATION_ASSUMPTIONS.expectedReturns;
    const vols = SIMULATION_ASSUMPTIONS.annualVolatility;
    const corr = SIMULATION_ASSUMPTIONS.correlationMatrix;
    const vector = [weights.stock, weights.bond, weights.alt];

    let variance = 0;
    for (let i = 0; i < vector.length; i += 1) {
      for (let j = 0; j < vector.length; j += 1) {
        variance += vector[i] * vector[j] * vols[i] * vols[j] * corr[i][j];
      }
    }

    const baseReturn = vector.reduce((sum, value, idx) => sum + value * returns[idx], 0);
    // 가장 큰 자산 집중도를 제외한 나머지 비중을 단순 분산효과로 보는 학습용 휴리스틱
    const diversification = 1 - Math.max(...vector);
    const expectedReturn = baseReturn
      + model.returnBoost
      - hedgeRatio * SIMULATION_ASSUMPTIONS.hedgeCostPerUnit
      + diversification * SIMULATION_ASSUMPTIONS.diversificationBonusScale;
    const volatility = Math.max(
      0.03,
      Math.sqrt(variance) * model.volMultiplier * (1 - hedgeRatio * SIMULATION_ASSUMPTIONS.hedgeVolatilityReduction),
    );
    const sharpe = (expectedReturn - SIMULATION_ASSUMPTIONS.riskFreeRate) / volatility;
    // 스트레스 손실은 학습자에게 손실값으로 보이도록 음수로 표기합니다.
    const drawdown = -Math.max(0, (
      volatility * SIMULATION_ASSUMPTIONS.stressVolatilityMultiplier
      + Math.max(0, weights.stock - 0.5) * SIMULATION_ASSUMPTIONS.equityStressPenalty
      - hedgeRatio * SIMULATION_ASSUMPTIONS.hedgeStressOffset
    ));

    $simReturn.textContent = percent(expectedReturn);
    $simVolatility.textContent = percent(volatility);
    $simSharpe.textContent = sharpe.toFixed(2);
    $simDrawdown.textContent = percent(drawdown);

    state.currentSimulation = {
      expectedReturn,
      volatility,
      sharpe,
      drawdown,
      weights: { ...weights },
      hedgeRatio,
      model: model.label,
    };

    $simAllocation.innerHTML = `
      <div class="allocation-bar" aria-label="정규화 자산 비중">
        <i style="width:${weights.stock * 100}%"></i><i style="width:${weights.bond * 100}%"></i><i style="width:${weights.alt * 100}%"></i>
      </div>
      <div class="allocation-legend">
        <span><b></b>주식/ETF ${percent(weights.stock)}</span>
        <span><b></b>채권 ${percent(weights.bond)}</span>
        <span><b></b>대체·현금 ${percent(weights.alt)}</span>
      </div>
      <small>파생 헤지 강도 ${Math.round(hedgeRatio * 100)}%</small>
    `;
    const stockStop = weights.stock * 100;
    const bondStop = stockStop + weights.bond * 100;
    $simDonut.style.background = `conic-gradient(#2563eb 0 ${stockStop}%, #14b8a6 ${stockStop}% ${bondStop}%, #f59e0b ${bondStop}% 100%)`;
    $simDonut.innerHTML = `<div><strong>${Math.round(hedgeRatio * 100)}%</strong><span>헤지 강도</span></div>`;
    const riskScale = Math.min(100, volatility * 400);
    const returnScale = Math.min(100, Math.max(0, expectedReturn * 600));
    const stressScale = Math.min(100, Math.abs(drawdown) * 300);
    $simRiskBars.innerHTML = `
      <div><span>기대수익</span><i><b style="width:${returnScale}%"></b></i><strong>${percent(expectedReturn)}</strong></div>
      <div><span>예상변동성</span><i><b style="width:${riskScale}%"></b></i><strong>${percent(volatility)}</strong></div>
      <div class="loss"><span>스트레스 손실</span><i><b style="width:${stressScale}%"></b></i><strong>${percent(drawdown)}</strong></div>`;

    // 정규화 비중 기준의 학습용 분류: 대략적인 성향 비교를 위한 규칙입니다.
    const tilt = weights.stock >= 0.55 ? '공격형' : weights.bond >= 0.4 ? '방어형' : '균형형';
    $simNarrative.innerHTML = `
      <strong>${model.label}</strong> 기준 ${tilt} 포트폴리오입니다.<br>
      ${model.note}<br>
      현재 설정은 기대수익률 ${percent(expectedReturn)}, 예상 변동성 ${percent(volatility)}, 샤프 비율 ${sharpe.toFixed(2)} 수준으로 계산됩니다.
    `;
    renderScenarioResult(state.currentSimulation);
    renderSavedComparison(state.currentSimulation);
  }

  function renderScenarioResult(snapshot) {
    const scenarios = {
      equity: { title: '주식 급락', detail: '주식/ETF가 크게 하락하고 채권의 완충 효과가 일부 나타나는 상황', loss: snapshot.weights.stock * 0.22 + snapshot.weights.alt * 0.08 - snapshot.weights.bond * 0.04 - snapshot.hedgeRatio * 0.10 },
      rates: { title: '금리 급등', detail: '채권 가격 하락과 위험자산 약세가 동시에 발생하는 상황', loss: snapshot.weights.bond * 0.12 + snapshot.weights.stock * 0.07 + snapshot.weights.alt * 0.03 - snapshot.hedgeRatio * 0.03 },
      inflation: { title: '인플레이션 재확산', detail: '채권 부담과 자산 전반의 변동성이 높아지는 상황', loss: snapshot.weights.bond * 0.09 + snapshot.weights.stock * 0.08 + snapshot.weights.alt * 0.02 - snapshot.hedgeRatio * 0.05 },
    };
    const scenario = scenarios[state.activeScenario];
    const estimatedLoss = -Math.max(0, scenario.loss);
    $simScenarioResult.innerHTML = `<div><span>${scenario.title} 가정 손실</span><strong>${percent(estimatedLoss)}</strong></div><p>${scenario.detail}입니다. 헤지는 손실을 줄이는 가정이지만 비용과 모든 위험을 없애지는 못합니다.</p>`;
  }

  function renderSavedComparison(snapshot) {
    if (!state.savedSimulation) {
      $simCompare.innerHTML = '<span><i class="fa-regular fa-bookmark"></i> 현재 설정을 저장하면 다음 조정안과 수익률·변동성을 비교할 수 있습니다.</span>';
      return;
    }
    const saved = state.savedSimulation;
    const diff = (value, previous) => `${value - previous >= 0 ? '+' : ''}${percent(value - previous)}`;
    $simCompare.innerHTML = `<strong><i class="fa-solid fa-code-compare"></i> 저장한 설정과 비교</strong><div><span>기대수익률 ${diff(snapshot.expectedReturn, saved.expectedReturn)}</span><span>변동성 ${diff(snapshot.volatility, saved.volatility)}</span><span>스트레스 손실 ${diff(snapshot.drawdown, saved.drawdown)}</span></div><small>기준: ${saved.model} · 주식/ETF ${percent(saved.weights.stock)} · 채권 ${percent(saved.weights.bond)}</small>`;
  }

  function buildSimulationPrompt() {
    const snapshot = getSimulationSnapshot();
    const model = snapshot.model.label;
    const allocation = `정규화 비중은 주식/ETF ${percent(snapshot.weights.stock)}, 채권 ${percent(snapshot.weights.bond)}, 대체·현금 ${percent(snapshot.weights.alt)}, 파생 헤지 강도 ${Math.round(snapshot.hedgeRatio * 100)}%입니다.`;
    return `${model} 기준 실습 포트폴리오를 설명해줘. ${allocation}. 금융상품과 자산배분 관점에서 개요, 주요 리스크 지표, 리밸런싱 포인트를 정리해줘.`;
  }

  function getSimulationSnapshot() {
    const raw = {
      stock: Number($stockWeight.value),
      bond: Number($bondWeight.value),
      alt: Number($altWeight.value),
    };
    const total = raw.stock + raw.bond + raw.alt;
    const safeTotal = total || 0.001;
    return {
      raw,
      total,
      hedgeRatio: Number($hedgeRatio.value) / 100,
      model: MODEL_META[$modelSelect.value],
      weights: {
        stock: raw.stock / safeTotal,
        bond: raw.bond / safeTotal,
        alt: raw.alt / safeTotal,
      },
    };
  }

  function formatContent(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
  }

  function showUploadStatus(type, msg) {
    $uploadStatus.className = `upload-status ${type}`;
    $uploadStatus.innerHTML = msg;
    $uploadStatus.classList.remove('hidden');
    if (type === 'success') {
      setTimeout(() => $uploadStatus.classList.add('hidden'), 4000);
    }
  }

  function setInputDisabled(disabled) {
    $sendBtn.disabled = disabled;
    $questionInput.disabled = disabled;
  }

  function resizeInput() {
    $questionInput.style.height = 'auto';
    $questionInput.style.height = `${Math.min($questionInput.scrollHeight, 140)}px`;
  }

  function scrollToBottom() {
    $messages.scrollTop = $messages.scrollHeight;
  }

  function percent(value) {
    return `${(value * 100).toFixed(1)}%`;
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  updateSimulation();
  setView('home');
  $topKLabel.textContent = state.topK;
})();
