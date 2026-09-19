(() => {
  const clean = (value) => value.replace(/\s+/g, ' ').trim();
  const extractEntries = (root) => [...root.querySelectorAll('.glossary-item')].map((item) => {
    const term = item.querySelector('dt');
    const description = item.querySelector('dd');
    if (!term || !description) return null;
    const richDetailTemplate = description.querySelector(':scope > template.glossary-rich-detail');
    const clone = term.cloneNode(true);
    clone.querySelector('small')?.remove();
    return {
      title: clean(clone.textContent),
      aliases: clean(term.querySelector('small')?.textContent || ''),
      detail: [...description.querySelectorAll(':scope > p')].map((paragraph) => clean(paragraph.textContent)).filter(Boolean).length
        ? [...description.querySelectorAll(':scope > p')].map((paragraph) => clean(paragraph.textContent)).filter(Boolean)
        : [clean(description.textContent)],
      richDetail: richDetailTemplate
        ? [...richDetailTemplate.content.childNodes].map((node) => node.cloneNode(true))
        : null,
      infographic: description.querySelector('.glossary-infographic')?.cloneNode(true) || null,
      item,
      manualOnly: item.hasAttribute('data-glossary-manual-only'),
    };
  }).filter((entry) => entry && entry.title);
  // 용어모음에서도 공통으로 쓰는, 일차별 본문에 반복 등장하는 핵심 용어입니다.
  const COMMON_ENTRIES = [
    { title: '중앙은행', aliases: 'Central Bank', detail: ['한 국가 또는 통화권의 물가와 금융시스템 안정을 위해 통화정책을 수행하는 기관입니다. 일반 개인에게 예금·대출 상품을 직접 판매하기보다 정부·은행·금융시장과의 거래를 중심으로 역할을 합니다.'] },
    { title: '통화정책', aliases: 'Monetary Policy', detail: ['중앙은행이 기준금리, 유동성 공급 등의 수단을 활용해 물가와 금융 여건에 대응하는 정책입니다. 효과가 나타나는 시점과 정도는 경제 상황에 따라 달라집니다.'] },
    { title: '기준금리', aliases: 'Policy Rate · Base Rate', detail: ['중앙은행이 정하는 대표 정책금리입니다. 시중 예금·대출 금리에 영향을 주지만, 개별 금융상품의 금리와 같지는 않습니다.'] },
    { title: '법정화폐', aliases: 'Fiat Money', detail: ['국가가 법에 따라 통용을 인정한 화폐입니다. 금처럼 실물자산으로의 교환을 약속해서가 아니라 국가의 제도와 신용을 바탕으로 사용됩니다.'] },
    { title: '최후의 대출자', aliases: 'Lender of Last Resort', detail: ['금융위기 때 유동성이 부족한 금융기관에 중앙은행이 정해진 조건과 담보 아래 긴급 자금을 공급해 금융시스템 불안을 줄이는 역할입니다.'] },
    { title: '현금흐름', aliases: 'Cash Flow', detail: ['일정 기간에 기업이나 개인에게 현금이 들어오고 나가는 움직임입니다. 회계상 이익과 현금흐름은 발생 시점과 비현금 비용 때문에 다를 수 있습니다.'] },
    { title: '캐시 카우', aliases: 'Cash Cow', detail: ['큰 추가 투자 없이도 꾸준하고 안정적인 현금을 만들어 내는 상품·사업부·자산을 뜻합니다. 돈의 움직임 자체를 뜻하는 현금흐름과는 다릅니다.'] },
    { title: '펀드', aliases: 'Fund', detail: ['여러 투자자의 자금을 모아 주식·채권 등 자산에 투자하는 집합투자 상품입니다. 상품에 따라 원금과 수익률이 보장되지 않으며, 환매 방식과 비용이 다릅니다.'] },
    { title: '차익거래', aliases: 'Arbitrage(아비트라지)', detail: ['경제적으로 비슷한 대상 사이의 가격 차이를 이용해 위험을 낮춘 수익 기회를 찾는 거래입니다. 세금·수수료·차입·체결 비용과 시장 제약 때문에 무위험 수익이 보장되지는 않습니다.'] },
    { title: '공매도', aliases: 'Short Selling', detail: ['보유하지 않은 증권을 빌려 먼저 매도한 뒤, 나중에 사서 갚는 거래입니다. 가격 하락 시 이익을 기대할 수 있지만 가격이 오르면 손실이 커질 수 있습니다.'] },
    { title: '만기', aliases: 'Maturity · Expiration', detail: ['금융상품이나 계약에서 약정한 기간이 끝나 원금·이자 지급, 상환, 정산 또는 권리 행사가 이루어지는 시점입니다. 상품마다 만기일과 만기 때 처리 방식이 미리 정해져 있습니다.', '채권은 보통 만기에 발행자가 원금을 상환하고, 예금·적금은 약정 기간이 끝나 만기 이율을 적용해 원리금을 지급합니다. 약속어음·환어음에서는 만기가 지급을 청구할 수 있는 기한 또는 지급일을 뜻합니다. 반면 만기 전 해지·매도·할인은 약정한 만기 조건과 다른 금리·가격 또는 비용이 적용될 수 있습니다.', '선물·옵션에서는 계약이 끝나 현금결제 또는 실물인도가 이루어지거나, 옵션의 권리 행사가 가능한 마지막 시점을 뜻합니다. 같은 ‘만기’라도 상품에 따라 자동 연장 여부, 휴일 처리, 중도상환·중도해지 조건, 결제일이 다를 수 있으므로 약관과 상품설명서를 확인해야 합니다.'] },
    { title: '옵션', aliases: 'Option', detail: ['정해진 기간 또는 날짜에 기초자산을 약정 가격으로 사고팔 수 있는 권리를 거래하는 계약입니다. 매수자는 프리미엄을 내고 권리를 얻고, 매도자는 행사될 때 이행 의무를 집니다.'] },
    { title: '인버스', aliases: 'Inverse', detail: ['기초지수와 반대 방향의 일간 수익률을 목표로 설계한 상품 또는 전략입니다. 장기 누적 수익률은 기초지수 수익률의 단순한 반대가 아닐 수 있습니다.'] },
    { title: 'ETN', aliases: 'Exchange-Traded Note', detail: ['증권회사가 발행하고 거래소에 상장한 파생결합증권입니다. 지수 수익률을 추종하도록 설계될 수 있으나 발행사의 신용위험도 함께 고려해야 합니다.'] },
    {
      title: '이더리움',
      aliases: 'Ethereum · ETH',
      detailHtml: `
        <p>이더리움이 더 이상 채굴을 하지 않는다는 것은, 네트워크를 유지하고 새로운 코인을 발행하는 <strong>합의 알고리즘(Consensus Algorithm)</strong> 방식을 기존의 '작업증명(PoW)'에서 '지분증명(PoS)'으로 전면 교체했기 때문입니다.</p>
        <p>이 변혁은 2022년 9월 진행된 '더 머지(The Merge)'라는 대형 업그레이드를 통해 이루어졌습니다.</p>
        <h3>작업증명(PoW) vs 지분증명(PoS) 차이점</h3>
        <ul>
          <li><strong>기존: 작업증명 (Proof of Work - 채굴)</strong>
            <ul>
              <li>비트코인처럼 고성능 그래픽카드나 전용 채굴기(ASIC)를 24시간 가동해 수학 문제를 빠르게 푸는 컴퓨터가 블록을 생성하고 보상을 받던 방식입니다.</li>
              <li><strong>문제점:</strong> 막대한 전기 소모, 채굴기 구매 비용 부담, 환경 오염 논란이 컸습니다.</li>
            </ul>
          </li>
          <li><strong>현재: 지분증명 (Proof of Stake - 스테이킹)</strong>
            <ul>
              <li>컴퓨터의 연산력(하드웨어) 대신 <strong>이더리움(ETH) 자산 자체를 담보로 맡기는(Staking) 방식</strong>입니다.</li>
              <li>32 ETH 이상을 네트워크에 예치(Lock-up)한 사람들을 '검증인(Validator)'으로 등록하고, 시스템이 이들 중 무작위로 추첨하여 거래를 검증하고 블록을 생성할 권한을 줍니다.</li>
              <li>문제 풀이가 없으므로 고성능 컴퓨터나 막대한 전력이 전혀 필요하지 않습니다.</li>
            </ul>
          </li>
        </ul>
        <h3>지분증명(PoS) 전환으로 바뀐 점</h3>
        <ul>
          <li><strong>에너지 소비 99.95% 감소:</strong> 복잡한 연산 과정을 없애면서 전기 소모량이 획기적으로 줄어들어 환경 친화적인 블록체인이 되었습니다.</li>
          <li><strong>채굴기 무용지물:</strong> 과거 이더리움 채굴에 쓰이던 대규모 그래픽카드(GPU) 채굴장은 더 이상 이더리움 블록 생성에 참여할 수 없게 되었습니다.</li>
          <li><strong>네트워크 보안성 및 경제 구조 변화:</strong> 검증인이 거짓 거래를 승인하려고 시도하면 담보로 맡긴 ETH가 몰수(Slashing)되는 페널티를 받습니다. 따라서 자산을 잃지 않기 위해 정직하게 검증하게 만드는 경제적 구조로 보안을 유지합니다.</li>
        </ul>
        <p>결론적으로 이더리움은 "전기를 써서 문제 푸는 기계 경쟁(채굴)"을 버리고, "이더리움을 많이 맡긴 사람에게 검증 자격을 주는 시스템(스테이킹)"으로 완전히 탈바꿈했습니다.</p>`,
    },
    {
      title: '비트코인',
      aliases: 'Bitcoin · BTC',
      detailHtml: `
        <p>블록체인 네트워크에서 거래되는 대표적인 암호자산입니다. 가격 변동성이 크고, 보관 방식·거래소·규제 환경에 따른 위험을 함께 확인해야 합니다.</p>
        <p>비트코인을 국가의 법정화폐(Legal Tender)로 공식 채택했던 대표적인 국가는 <strong>엘살바도르</strong>입니다.</p>
        <p>변화된 현재 상황을 종합하면 다음과 같습니다.</p>
        <ul>
          <li><strong>엘살바도르 (El Salvador):</strong><br />2021년 세계 최초로 비트코인을 미 달러화(USD)와 함께 법정화폐로 지정했습니다. 다만 2025년 법 개정을 거치며 상인의 비트코인 수락 의무(강제성)를 완화하여 자율적 사용 방식(Voluntary Legal Tender)으로 제도를 조정했습니다. 그럼에도 정부 차원의 비트코인 매수 및 관련 산업 육성 기조는 지속하고 있습니다.</li>
          <li><strong>중앙아프리카공화국 (CAR):</strong><br />2022년에 두 번째로 비트코인을 법정화폐로 도입했으나, 국제금융기구 및 지역 중앙은행과의 갈등, 인프라 부족 문제로 인해 <strong>2023년 법안을 폐지</strong>하고 도입을 철회했습니다.</li>
          <li><strong>스위스 추크(Zug) 및 루가노(Lugano) 등 일부 지방 지자체:</strong><br />국가 전체 차원은 아니지만, 해당 지역에서는 세금 납부나 공공 서비스 결제 시 비트코인을 공식 수단으로 인정하고 있습니다.</li>
        </ul>
        <p>현재 국가 단위에서 비트코인을 결제 수단이자 화폐 정책의 핵심으로 운용하는 사례는 <strong>엘살바도르가 유일</strong>하며, 대다수의 다른 국가들은 비트코인을 법정화폐가 아닌 <strong>투자가능한 자산/원자재 또는 제도권 내 가상자산</strong>으로 분류하여 규제·관리하고 있습니다.</p>
        <p>아닙니다. <strong>비트코인은 지금도 활발하게 채굴되고 있습니다.</strong></p>
        <p>비트코인은 총발행량이 <strong>2,100만 개</strong>로 제한되어 있으며, 현재 약 <strong>1,980만 개 이상</strong>이 채굴된 상태입니다. 따라서 아직 채굴할 수 있는 남아있는 비트코인이 존재하며, 완전히 모든 채굴이 끝나는 시점은 <strong>2140년경</strong>으로 예상됩니다.</p>
        <p>채굴이 아직 계속되고 있는 이유와 향후 구조는 다음과 같습니다.</p>
        <p><strong>1. 반감기(Halving)로 인한 채굴 속도 감소</strong></p>
        <ul>
          <li>비트코인은 약 4년마다 새로운 블록을 채굴할 때 지급되는 보상 수량이 절반으로 줄어드는 <strong>반감기</strong> 메커니즘을 가지고 있습니다.</li>
          <li>처음에는 블록 1개당 50개의 비트코인이 지급되었지만, 여러 차례의 반감기를 거쳐 2024년 4월 제4차 반감기 이후 현재는 블록당 <strong>3.125개</strong>만 신규 발행되어 채굴자에게 지급됩니다.</li>
          <li>이처럼 발행량이 점차 극소량으로 줄어들기 때문에, 남아있는 약 100만여 개의 비트코인을 모두 채굴하기까지는 앞으로도 100년 이상의 시간이 소요됩니다.</li>
        </ul>
        <p><strong>2. 2140년 이후 비트코인이 모두 채굴되면 어떻게 될까?</strong></p>
        <p>새로운 비트코인 발행이 완전히 끝나더라도 <strong>채굴자라는 직업이나 채굴 작업 자체가 사라지지는 않습니다.</strong></p>
        <ul>
          <li><strong>보상 방식의 전환:</strong> 2140년 이후에는 '신규 발행 비트코인' 보상은 없어지지만, 대신 사용자들이 거래를 송금할 때 내는 '거래 수수료(Transaction Fees)'가 채굴자의 수익이 됩니다.</li>
          <li><strong>네트워크 유지:</strong> 채굴자들은 비트코인 네트워크의 보안을 유지하고 거래 내역을 검증·승인하는 대가로 거래 수수료를 받으며 채굴 작업을 계속 이어가게 됩니다.</li>
        </ul>
        <p>즉, 비트코인은 지금도 약 10분마다 새로 생성되어 채굴되고 있으며, 모든 발행이 끝나더라도 시스템 보안을 위한 채굴 활동은 계속 유지됩니다.</p>`,
    },
    {
      title: '스테이블코인',
      aliases: 'Stablecoin',
      detailHtml: `
        <p>법정화폐 등 특정 자산의 가치에 연동되도록 설계한 암호자산입니다. 준비자산의 구성·상환 구조·발행사의 신용에 따라 실제 안정성은 다를 수 있습니다.</p>
        <p>네, 스테이블코인은 <strong>글로벌 금융 시장과 해외 결제 망에서는 이미 대규모로 활성화</strong>되어 있으며, <strong>한국 국내에서는 아직 법적 규제 장벽으로 인해 실제 도입 초기 단계</strong>에 머물러 있습니다.</p>
        <p><strong>글로벌 현황 (이미 활발히 도입됨)</strong></p>
        <ul>
          <li><strong>글로벌 결제 네트워크 결합:</strong> 페이팔(PayPal)의 <strong>PYUSD</strong>, 비자(Visa) 및 마스터카드(Mastercard)의 <strong>USDC 결제망 지원</strong> 등 전통 금융 기업들이 국경 간 송금 및 결제 수단으로 적극 활용 중입니다.</li>
          <li><strong>글로벌 시장 규모:</strong> 테더(USDT), 써클(USDC) 등 달러 연동 스테이블코인은 수백조 원 규모의 시가총액을 형성하며 가상자산 거래의 핵심 수단이자 해외 송금 인프라로 자리 잡았습니다.</li>
          <li><strong>주요국 제도화:</strong> 미국(GENIE 법안 등), 유럽연합(MiCA), 일본, 영국 등은 법적 지위와 발행 기준을 확립하여 민간 은행 및 기업의 발행을 제도권 내에서 허용하고 있습니다.</li>
        </ul>
        <p><strong>국내 현황 (제도화 준비 및 속도 조절 단계)</strong></p>
        <ul>
          <li><strong>원화 스테이블코인 민간 발행 제약:</strong> 현행법상 화폐 발행 권한은 한국은행에 있으며, 비은행 민간 기업이 원화 연동 스테이블코인을 발행하는 것은 금융 안정성과 통화 정책 영향으로 인해 사실상 제한되어 있습니다.</li>
          <li><strong>정책 추진 및 접근법:</strong>
            <ul>
              <li><strong>정부·국회:</strong> 가상자산 산업 육성 및 원화 스테이블코인 제도화를 위한 디지털자산기본법 제정을 추진 중입니다.</li>
              <li><strong>한국은행:</strong> 통화 주권 보호 및 금융 안정성을 위해 민간 스테이블코인 도입에 신중한 입장을 유지하며, 중앙은행 디지털화폐(CBDC) 실증 사업('프로젝트 한강' 등)을 병행하고 있습니다.</li>
            </ul>
          </li>
        </ul>
        <p>글로벌 차원에서는 해외 송금·상거래 결제 수단으로 유의미한 도입이 이루어졌으나, 국내에서는 법제화 및 규제 가이드라인 확립 절차가 진행 중인 상태입니다.</p>`,
    },
    { title: '블록체인', aliases: 'Blockchain · 분산원장', detail: ['거래 기록을 한 회사의 서버 하나가 아니라 여러 참여자가 같은 규칙으로 확인·공유하는 장부 기술입니다. 새 거래는 묶여서 기록되고, 이전 기록과 연결되어 임의로 고치기 어렵도록 설계됩니다.', '블록체인이 있다고 거래 내용·토큰 가격·서비스 운영이 자동으로 안전한 것은 아닙니다. 주소를 잘못 입력하거나, 개인키를 잃거나, 스마트계약 코드에 오류가 있으면 되돌리기 어려울 수 있습니다.'] },
    { title: '메인넷', aliases: 'Mainnet', detail: ['자체적인 거래 기록과 합의 규칙을 실제로 운영하는 독립 블록체인 네트워크입니다. 이더리움 메인넷, 비트코인 네트워크처럼 실제 가치가 있는 자산과 거래가 움직이는 본망을 말합니다.', '연습용 테스트넷과 달리 메인넷에서는 실제 가스비가 들고 전송 실수의 금전적 결과가 생길 수 있습니다. 같은 토큰 이름이라도 어느 네트워크의 토큰인지 먼저 확인해야 합니다.'] },
    { title: '네이티브 코인', aliases: 'Native Coin', detail: ['특정 메인넷이 원래부터 발행·관리하는 기본 자산입니다. BTC는 비트코인 네트워크의, ETH는 이더리움 네트워크의 네이티브 코인입니다.', '보통 거래 수수료를 내거나 네트워크 검증에 참여하는 데 쓰입니다. 이더리움 위에서 발행된 USDC 같은 토큰과 달리, 네트워크 자체를 움직이는 데 필요한 기본 연료에 가깝습니다.'] },
    { title: '토큰', aliases: 'Token · ERC-20', detail: ['이미 존재하는 블록체인 위에서 스마트계약으로 만든 디지털 자산입니다. 같은 이더리움 위에서 만들어도 결제용, 투표용, 게임용처럼 역할과 권리가 서로 다를 수 있습니다.', '토큰을 전송하려면 해당 네트워크의 네이티브 코인으로 가스비를 내는 경우가 많습니다. 이름·티커가 같아도 발행 주소와 네트워크가 다르면 다른 자산일 수 있습니다.'] },
    { title: '가스비', aliases: 'Gas Fee · 네트워크 수수료', detail: ['블록체인에서 전송이나 스마트계약 실행을 처리해 준 검증자에게 내는 네트워크 사용료입니다. 이더리움에서는 보통 ETH로 냅니다.', '사용자가 몰리거나 실행할 코드가 복잡할수록 가스비가 높아질 수 있습니다. 거래소의 출금 수수료와는 별개일 수 있으며, 실패한 거래도 처리 과정의 비용이 발생할 수 있으므로 승인 전에 비용을 확인해야 합니다.'] },
    { title: '스마트계약', aliases: 'Smart Contract · 스마트 컨트랙트', detail: ['블록체인에 올려 두고 정해진 조건에 따라 자동 실행되도록 만든 프로그램입니다. “담보를 맡기면 대출을 실행한다”, “두 토큰을 정한 규칙으로 교환한다” 같은 규칙을 코드로 처리할 수 있습니다.', '법률 문서 전체를 자동으로 대체한다는 뜻은 아닙니다. 코드 오류, 관리자 권한, 외부 가격 정보의 오류가 있으면 자산 손실로 이어질 수 있으므로, 모르는 사이트에서 지갑 연결·서명을 요청할 때 특히 주의해야 합니다.'] },
    { title: '개인키', aliases: 'Private Key · 복구 문구 · 시드 문구', detail: ['블록체인 주소의 자산을 움직일 수 있다는 사실을 증명하는 비밀 정보입니다. 복구 문구(시드 문구)는 여러 개인키를 다시 만들 수 있는 백업 정보입니다.', '은행 비밀번호보다 더 강한 권한에 가깝습니다. 누구에게도 알려 주거나 화면·메신저·클라우드에 보관해서는 안 되며, 이를 요구하는 고객센터·에어드롭은 사기라고 생각하는 것이 안전합니다.'] },
    { title: '개인지갑', aliases: 'Wallet · 지갑', detail: ['가상자산 자체를 담는 상자라기보다, 블록체인 주소와 개인키를 관리해 거래에 서명하게 해 주는 도구입니다. 앱·브라우저 확장 프로그램 형태의 핫월렛과, 인터넷 연결을 줄인 하드웨어 지갑 등이 있습니다.', '개인지갑은 직접 통제한다는 장점이 있지만, 복구 문구 분실·피싱·잘못된 서명도 이용자가 책임져야 합니다. 처음에는 소액 전송, 공식 앱 확인, 권한 승인 범위 점검이 중요합니다.'] },
    { title: '작업증명', aliases: 'PoW · Proof of Work', detail: ['참여자가 계산 작업을 경쟁적으로 수행해 새 블록을 제안하고 거래 순서에 합의하는 방식입니다. 비트코인이 대표 사례이며, 이 과정의 계산 능력을 해시파워라고 부릅니다.', '네트워크를 공격하려면 막대한 장비·전력 비용이 들도록 설계한 방식이지만, 채굴 수익은 코인 가격·난이도·전력비에 따라 달라지고 높은 전력 사용도 논의 대상입니다.'] },
    { title: '지분증명', aliases: 'PoS · Proof of Stake', detail: ['네트워크 자산을 일정량 예치한 검증자가 거래 검증과 블록 제안에 참여하는 합의 방식입니다. 무작위 선정과 지분 규모 등 네트워크별 규칙으로 검증자를 고릅니다.', '코인을 예치했다고 원금이나 보상이 보장되는 것은 아닙니다. 가격 하락, 출금 대기기간, 검증자 운영 위험, 규칙 위반 시 예치분 일부가 줄어드는 슬래싱 위험을 함께 봐야 합니다.'] },
    { title: '스테이킹', aliases: 'Staking', detail: ['지분증명 네트워크의 검증에 참여하거나 그 참여자에게 자산을 맡기고 보상을 받는 구조를 말합니다. 은행 예금처럼 보일 수 있지만, 네트워크 보안 참여와 보상 배분에 가깝습니다.', '보상률만 보면 안 됩니다. 코인 가격 변동, 락업·언스테이킹 기간, 수수료, 검증자 실패·슬래싱, 거래소가 대신 스테이킹하는 경우의 수탁 위험을 확인해야 합니다.'] },
    { title: '탈중앙화금융', aliases: 'DeFi · Decentralized Finance', detail: ['예금·대출·교환 같은 금융 기능의 규칙을 은행 내부 시스템 대신 공개 블록체인의 스마트계약으로 실행하려는 서비스 묶음입니다. 대표적으로 토큰 교환, 담보 대출, 예치·유동성 공급이 있습니다.', '중개기관이 완전히 사라진다기보다, 이용자가 지갑·개인키·코드 위험을 더 직접 부담하는 구조입니다. 스마트계약 오류, 해킹, 오라클 오류, 담보 급락과 청산, 가짜 사이트 위험을 이해해야 합니다.'] },
    { title: '탈중앙화 거래소', aliases: 'DEX · Decentralized Exchange', detail: ['중앙 거래소의 주문 접수 시스템 대신, 이용자의 지갑과 스마트계약을 이용해 토큰을 교환하는 서비스입니다. 자산을 거래소에 미리 맡기지 않고도 거래할 수 있습니다.', '거래 전에 지갑 연결·서명·가스비가 필요할 수 있고, 가짜 토큰·낮은 유동성·가격 미끄러짐·스마트계약 위험을 이용자가 직접 확인해야 합니다.'] },
    { title: '중앙화 거래소', aliases: 'CEX · Centralized Exchange', detail: ['회사가 주문을 연결하고 고객 자산을 수탁하며 원화·달러 입출금과 고객지원을 제공하는 가상자산 거래소입니다. 국내 원화 거래소가 대표적인 형태입니다.', '이용이 편리한 대신 거래소의 보안·운영·출금 정책과 수탁 위험이 남습니다. 예금자보호 대상 여부, 고객 자산 분리관리, 출금 제한과 수수료를 거래소별로 확인해야 합니다.'] },
    { title: '자동화시장조성자', aliases: 'AMM · Automated Market Maker', detail: ['매수·매도 주문을 하나씩 맞추는 주문장 대신, 두 자산을 담아 둔 유동성 풀의 비율과 수식으로 교환 가격을 정하는 방식입니다. 많은 DEX가 이 방식을 사용합니다.', '큰 금액을 한꺼번에 교환하면 풀의 자산 비율이 많이 바뀌어 예상보다 불리한 가격에 체결될 수 있습니다. 이를 가격 미끄러짐(슬리피지)이라고 합니다.'] },
    { title: '유동성 풀', aliases: 'Liquidity Pool(리퀴디티 풀) · 유동성 공급', detail: ['DEX에서 교환에 쓰도록 두 종류 이상의 토큰을 함께 예치해 둔 자금 바구니입니다. 이용자는 이 풀을 상대로 토큰을 교환하고, 공급자는 조건에 따라 수수료·보상을 받을 수 있습니다.', '유동성 공급은 단순 예금이 아닙니다. 두 토큰의 가격이 크게 다르게 움직이면 보유만 했을 때와 다른 손익(비영구적 손실)이 생길 수 있고, 풀·토큰·스마트계약의 위험도 남습니다.'] },
    { title: '오라클', aliases: 'Oracle', detail: ['블록체인 밖의 가격·환율·날씨 같은 정보를 스마트계약이 읽을 수 있게 전달하는 장치 또는 네트워크입니다. 담보 대출에서 “담보 가격이 얼마인지” 판단할 때 필요합니다.', '오라클 가격이 늦거나 잘못되거나 조작되면 대출 청산·교환 가격 등 스마트계약의 실행 결과가 잘못될 수 있습니다. 코드가 정상이어도 입력 데이터가 틀리면 위험할 수 있다는 대표 사례입니다.'] },
    { title: 'TVL', aliases: 'Total Value Locked · 예치 자산', detail: ['DeFi 서비스의 스마트계약에 예치된 자산 가치를 달러 등으로 합산한 지표입니다. 얼마나 많은 자금이 잠겨 있는지를 가늠할 때 쓰입니다.', 'TVL이 높다고 안전성·수익성·토큰 가치가 보장되지는 않습니다. 토큰 가격 상승, 같은 자산의 중복 예치, 일시적인 보상 때문에 수치가 커질 수 있어 수수료·이용자 수·위험과 함께 봐야 합니다.'] },
    { title: '온체인', aliases: 'On-chain', detail: ['거래나 자산 상태가 공개 블록체인 기록에 직접 남아 누구나 블록 탐색기 등에서 확인할 수 있는 상태를 말합니다.', '온체인 기록이 공개되어도 주소의 실제 주인이 누구인지 자동으로 알 수 있는 것은 아니며, 잘못 보낸 거래를 되돌리거나 사기를 자동으로 막아 주지도 않습니다.'] },
    { title: '에어드롭', aliases: 'Airdrop', detail: ['프로젝트가 홍보·초기 이용자 보상 등을 위해 지갑이나 계정에 토큰을 무상 배분하는 방식입니다.', '정상 에어드롭은 복구 문구나 개인키를 요구하지 않습니다. 낯선 토큰을 받았다는 이유만으로 링크를 누르거나 지갑을 연결·서명하지 말고, 공식 채널과 거래 권한 요청을 먼저 확인해야 합니다.'] },
    { title: 'NFT', aliases: 'Non-Fungible Token · 대체 불가능 토큰', detail: ['서로 완전히 같은 단위로 바꾸기 어려운 고유한 디지털 항목을 나타내도록 만든 토큰입니다. 디지털 이미지, 게임 아이템, 멤버십 권한 등에 연결해 쓸 수 있습니다.', 'NFT를 보유한다고 이미지의 저작권이나 사업의 지분을 자동으로 얻는 것은 아닙니다. 토큰이 가리키는 파일 위치, 이용권 범위, 거래 가능성, 스마트계약과 플랫폼 위험을 따로 확인해야 합니다.'] },
    { title: '락업·언락', aliases: 'Lock-up · Unlock', detail: ['락업은 투자자·팀·재단 등이 받은 토큰을 일정 기간 팔거나 옮기지 못하도록 묶어 두는 조건이고, 언락은 그 제한이 풀려 유통 가능 물량이 늘어나는 시점입니다.', '언락 일정은 매도 가능 물량과 시장 수급에 영향을 줄 수 있지만 가격 방향을 확정하지는 않습니다. 총발행량, 현재 유통량, 실제 수령자와 조건을 함께 확인해야 합니다.'] },
    { title: '자산배분', aliases: 'Asset Allocation', detail: ['주식·채권·현금·대체자산 등 자산군에 투자 비중을 나누는 전략입니다. 분산은 손실을 없애지는 않지만 특정 자산에 대한 의존을 줄이는 데 도움을 줄 수 있습니다.'] },
    { title: '퀀트', aliases: 'Quantitative Investing · Quant', detail: ['데이터와 통계·규칙 기반 모델을 사용해 투자 의사결정이나 위험관리를 하는 접근입니다. 과거 성과를 바탕으로 한 모델은 미래 수익을 보장하지 않습니다.'] },
    { title: '집합투자', aliases: 'Collective Investment · 集合投資', detail: ['여러 투자자의 자금을 모아 전문가가 운용하고, 그 결과를 투자자에게 나누는 구조입니다. 펀드는 대표적인 집합투자 상품입니다.'] },
    { title: '상장지수집합투자기구', aliases: 'ETF · Exchange-Traded Fund', detail: ['거래소에 상장되어 장중에 주식처럼 매매할 수 있는 펀드입니다. 특정 지수를 따라가도록 설계되는 경우가 많습니다.'] },
    { title: '지정참가회사', aliases: 'AP · Authorized Participant', detail: ['ETF 운용사와 직접 ETF 지분을 설정·환매할 수 있는 금융회사입니다. ETF 시장가격과 순자산가치(NAV)의 차이가 커질 때 괴리 축소에 참여합니다.'] },
    { title: '설정·환매', aliases: 'Creation / Redemption', detail: ['ETF 지분을 새로 만들거나 없애는 과정입니다. 일반 투자자는 거래소에서 ETF를 사고팔고, 지정참가회사(AP)는 정해진 절차에 따라 설정·환매합니다.'] },
    { title: '집중투자 제한', aliases: 'Concentration Limit · 10% Rule', detail: ['펀드가 한 발행인의 증권에 지나치게 투자하지 않도록 두는 운용 한도입니다. 상품과 법령의 예외가 있어 일률적으로 적용되지는 않습니다.'] },
    {
      title: '채무증권',
      aliases: 'Debt Security · 債務證券',
      detailHtml: `
        <p><strong>먼저 ‘증권(證券)’이란?</strong><br />돈을 받을 권리, 회사의 지분처럼 재산상 권리가 있다는 사실을 나타내는 문서나 전자기록입니다. 과거에는 종이 증서가 많았지만, 지금은 대부분 전자등록으로 관리됩니다.</p>
        <p><strong>채무증권</strong>은 그중에서 정부·기업·금융기관 등이 돈을 빌렸고 원금과 이자를 갚아야 한다는 내용을 담은 증권입니다. 쉽게 말해 <strong>“빚과 상환 약속을 증권으로 만든 것”</strong>입니다.</p>
        <h3>비슷하게 들리는 네 단어</h3>
        <ul>
          <li><strong>채권(債權)</strong>: 돈이나 물건을 달라고 요구할 수 있는 법적인 권리입니다. 투자상품이라는 뜻은 아닙니다.</li>
          <li><strong>채무(債務)</strong>: 돈을 갚거나 약속한 일을 해야 하는 의무입니다.</li>
          <li><strong>채권(債券)</strong>: 정부나 기업이 돈을 빌리기 위해 발행하는 국채·회사채 같은 투자상품입니다. 마지막 글자 券은 증서·표라는 뜻입니다.</li>
          <li><strong>채무증권(債務證券)</strong>: 국채·회사채 등 빚을 나타내는 증권을 묶어 부르는 더 넓은 분류입니다.</li>
        </ul>
        <p><strong>핵심:</strong> 채권(債券)은 채무증권에 속하지만 ‘채무증권’의 공식적인 줄임말은 아닙니다. 채권(債權)은 받을 권리 자체, 채권(債券)은 거래 가능한 투자상품이라는 차이가 있습니다.</p>`,
    },
    { title: 'BIS 비율', aliases: 'Capital Adequacy Ratio · BIS', detail: ['은행 등의 규제자본을 위험가중자산(RWA)으로 나눈 자본적정성 지표입니다. 손실을 감당할 여력을 평가할 때 활용합니다.'] },
    { title: '보통주자본비율', aliases: 'CET1 Ratio · Common Equity Tier 1', detail: ['보통주와 이익잉여금처럼 손실흡수력이 높은 자본을 위험가중자산으로 나눈 비율입니다. 은행 건전성을 보는 핵심 지표 중 하나입니다.'] },
    { title: '위험가중자산', aliases: 'RWA · Risk-Weighted Assets', detail: ['대출·채권 등 자산의 금액에 신용·시장·운영 위험을 반영한 가중치를 적용해 계산한 값입니다. BIS 자본비율의 분모가 됩니다.'] },
    { title: '듀레이션', aliases: 'Duration · Dur.', detail: ['채권 가격이 금리 변화에 얼마나 민감한지 가늠하는 지표입니다. 듀레이션이 클수록 같은 금리 변화에 가격 변동 폭도 커지는 경향이 있습니다.'] },
    { title: '금융 숫자 단위', aliases: 'bp · %p · Point · Tick · Pip · Spread', detail: ['금융에서는 가격과 금리의 작은 변화를 정확하게 말하려고 별도 단위를 씁니다. 단위가 무엇인지 먼저 확인하면 숫자를 훨씬 쉽게 읽을 수 있습니다.', 'bp(베이시스포인트)는 금리의 아주 작은 차이입니다. 1bp는 0.01%이고, 35bp는 0.35%입니다. %p(퍼센트포인트)는 퍼센트 값끼리의 차이입니다. 금리가 3%에서 4%가 되면 1%p 올랐다고 합니다.', '포인트는 지수·선물 등의 숫자 단위입니다. 예를 들어 지수가 300에서 301이 되면 1포인트 올랐다고 합니다. 틱은 거래소가 정한 최소 가격 움직임입니다. 가격이 10원 단위로 움직이도록 정해졌다면 1틱은 10원입니다.', '핍(pip)은 외환에서 쓰는 작은 환율 변화 단위입니다. 통화쌍마다 표시 자릿수가 달라 크기가 다를 수 있습니다. 스프레드는 매수 가격과 매도 가격, 또는 두 금리 사이의 차이입니다. 스프레드가 넓을수록 실제 거래 비용이나 가격 차이가 커질 수 있습니다.'] },
    { title: '근사', aliases: 'Approximation · ≈', detail: ['복잡한 실제 값을 계산하기 전에, 핵심 관계를 살려 가까운 값으로 간단히 추정하는 방법입니다. 정확한 값과 같다는 뜻은 아니므로, 변화 폭이 커지거나 조건이 달라지면 오차도 커질 수 있습니다.', '기호 “≈”는 “대략 같다”, “약”이라고 읽습니다. 예를 들어 100 ÷ 3 ≈ 33.3은 정확한 값이 끝없이 이어지는 33.333…이지만, 계산에 편한 가까운 값 33.3으로 쓴다는 뜻입니다.', '채권에서는 듀레이션을 이용해 가격 변화율 ≈ −수정듀레이션 × 금리 변화(%p)로 빠르게 가늠합니다. 예: 수정듀레이션 5, 금리 변화 +0.2%p라면 가격 변화율 ≈ −5 × 0.2% = −1.0%입니다. 가격이 10만 원이었다면 약 1,000원 하락해 약 9만 9,000원으로 볼 수 있습니다. 여기서 %p는 금리의 차이(예: 3.0%→3.2%), %는 채권 가격의 변화율입니다. 컨벡시티는 실제 가격 곡선의 휘어짐을 반영해 이 듀레이션 근사의 오차를 보완합니다.'] },
    { title: '컨벡시티', aliases: '볼록성 · Convexity', detail: ['쉽게 말해 직선으로 예상한 값과 실제로 휘어진 곡선 사이의 차이를 설명하는 개념입니다. 수학에서는 집합·함수의 모양, 경제학에서는 여러 재화의 조합을 선호하는 볼록선호를 설명할 때 사용합니다.', '채권에서는 금리와 가격의 곡선 관계를 나타냅니다. 듀레이션이 가격 변화를 직선으로 어림잡는 1차 민감도라면, 컨벡시티는 그 직선 근사의 오차를 보완하는 2차 효과입니다. 일반적인 양(+)의 컨벡시티에서는 금리 하락 때 가격 상승 폭이 더 커지고, 금리 상승 때 가격 하락 폭은 더 작아지는 경향이 있습니다.'] },
    { title: '베타', aliases: 'β · Beta', detail: ['베타는 종목이나 투자 전략이 시장과 비교해 얼마나 크게 함께 움직이는지를 보여 주는 값입니다. 쉽게 말해 시장이 오르거나 내릴 때 이 종목이 얼마나 민감하게 반응하는지 가늠하는 지표입니다.', '베타가 1이면 시장과 비슷한 폭으로 움직이는 경향이 있습니다. 예를 들어 시장이 10% 오를 때 베타가 1인 종목도 약 10% 오르는 식입니다. 베타가 1.5이면 시장이 10% 움직일 때 약 15% 움직일 수 있어, 오를 때와 내릴 때 모두 더 큰 폭으로 흔들릴 수 있습니다. 베타가 0.5이면 시장 움직임의 약 절반 수준으로 반응하는 경향을 뜻합니다.', '베타는 과거 가격을 바탕으로 계산한 값이라 앞으로도 똑같이 움직인다고 보장하지 않습니다. 또 어떤 시장지수와 비교했는지, 어느 기간의 자료를 썼는지에 따라서도 값이 달라질 수 있습니다.'] },
  ];
  const entries = extractEntries(document);
  COMMON_ENTRIES.forEach((entry) => {
    if (!entries.some((item) => item.title === entry.title)) entries.push({ ...entry, item: null, manualOnly: false });
  });

  if (!entries.length) return;

  document.body.insertAdjacentHTML('beforeend', `
    <div class="glossary-modal" id="glossaryModal" hidden>
      <div class="glossary-modal__backdrop" data-glossary-close></div>
      <section class="glossary-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="glossaryModalTitle">
        <button class="glossary-modal__close" type="button" aria-label="용어 설명 닫기" data-glossary-close>×</button>
        <p class="glossary-modal__label">용어 설명</p>
        <h2 id="glossaryModalTitle"></h2>
        <p class="glossary-modal__aliases" id="glossaryModalAliases"></p>
        <div class="glossary-modal__detail" id="glossaryModalDetail"></div>
      </section>
    </div>`);

  const modal = document.querySelector('#glossaryModal');
  const title = document.querySelector('#glossaryModalTitle');
  const aliases = document.querySelector('#glossaryModalAliases');
  const detail = document.querySelector('#glossaryModalDetail');
  const closeButton = modal.querySelector('.glossary-modal__close');
  let trigger = null;
  const open = (entry, source) => {
    trigger = source;
    title.textContent = entry.title;
    aliases.textContent = entry.aliases;
    aliases.hidden = !entry.aliases;
    const detailNodes = entry.richDetail
      ? entry.richDetail.map((node) => node.cloneNode(true))
      : entry.detailHtml
        ? (() => {
          const template = document.createElement('template');
          template.innerHTML = entry.detailHtml;
          return [...template.content.childNodes];
        })()
        : entry.detail.map((paragraph) => {
          const element = document.createElement('p');
          element.textContent = paragraph;
          return element;
        });
    detail.replaceChildren(...detailNodes);
    if (entry.infographic) detail.append(entry.infographic.cloneNode(true));
    modal.hidden = false;
    closeButton.focus();
  };
  const close = () => {
    if (modal.hidden) return;
    modal.hidden = true;
    trigger?.focus({ preventScroll: true });
  };
  const setMatchTerms = (entry) => {
    entry.matchTerms = (entry.manualOnly ? [] : [entry.title, ...entry.aliases.split(/\s*[·/]\s*/)])
      .map(clean)
      .filter((term, termIndex, terms) => term && (term === entry.title || /[가-힣]/.test(term) || term.length >= 3) && terms.indexOf(term) === termIndex);
  };

  entries.forEach((entry, index) => {
    if (entry.item) {
      entry.item.tabIndex = 0;
      entry.item.setAttribute('role', 'button');
      entry.item.setAttribute('aria-label', `${entry.title} 용어 설명 보기`);
      entry.item.addEventListener('click', () => open(entry, entry.item));
      entry.item.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          open(entry, entry.item);
        }
      });
    }
    entry.index = index;
    setMatchTerms(entry);
  });

  document.querySelectorAll('[data-glossary-close]').forEach((element) => element.addEventListener('click', close));
  document.querySelectorAll('[data-glossary-term]').forEach((element) => {
    const entry = entries.find((item) => item.title === element.dataset.glossaryTerm);
    if (!entry) return;
    element.setAttribute('aria-label', `${entry.title} 용어 설명 보기`);
    element.addEventListener('click', () => open(entry, element));
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });

  const linkTerms = () => {
    const byTerm = entries.flatMap((entry) => entry.matchTerms.map((text) => ({ entry, text })))
      .sort((a, b) => b.text.length - a.text.length);
    const walker = document.createTreeWalker(document.querySelector('#app'), NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.parentElement?.closest('.lesson-body, .goal, .check')) return NodeFilter.FILTER_REJECT;
        if (node.parentElement.closest('a, button, .no-glossary-link, script, style')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    textNodes.forEach((node) => {
      const text = node.nodeValue;
      const matches = [];
      byTerm.forEach((term) => {
        let start = 0;
        while (true) {
          const index = text.indexOf(term.text, start);
          if (index < 0) break;
          matches.push({ index, end: index + term.text.length, entry: term.entry, text: term.text });
          start = index + term.text.length;
        }
      });
      matches.sort((a, b) => a.index - b.index || b.end - a.end);
      const selected = matches.reduce((result, match) => {
        if (!result.length || match.index >= result[result.length - 1].end) result.push(match);
        return result;
      }, []);
      if (!selected.length) return;
      const fragment = document.createDocumentFragment();
      let cursor = 0;
      selected.forEach((match) => {
        fragment.append(text.slice(cursor, match.index));
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'glossary-term';
        button.textContent = match.text;
        button.setAttribute('aria-label', `${match.entry.title} 용어 설명 보기`);
        button.addEventListener('click', () => open(match.entry, button));
        fragment.append(button);
        cursor = match.end;
      });
      fragment.append(text.slice(cursor));
      node.replaceWith(fragment);
    });
  };
  linkTerms();

  Promise.all([1, 2, 3, 4].map((day) => fetch(`${String(day).padStart(2, '0')}.html`).then((response) => response.ok ? response.text() : '').catch(() => '')))
    .then((pages) => {
      pages.filter(Boolean).forEach((page) => extractEntries(new DOMParser().parseFromString(page, 'text/html')).forEach((entry) => {
        if (entries.some((item) => item.title === entry.title)) return;
        setMatchTerms(entry);
        entries.push(entry);
      }));
      linkTerms();
    });
})();
