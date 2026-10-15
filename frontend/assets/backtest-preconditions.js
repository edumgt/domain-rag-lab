/* Backtest input checks and serial, read-only A/B experiments. */
window.BacktestPreconditions = (() => {
  let api, example, generation=0, busy=false;
  const ids=['btTicker','btStrategy','btStart','btEnd','btCompareStart','btCompareEnd','btShortWindow','btLongWindow','btDcaInterval','btBreakoutWindow'];
  const el=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num=v=>v==null?'미제공':Number(v).toFixed(2);
  const status={pass:'충족',warn:'주의',fail:'미충족',review:'관측'};
  function input(){return {ticker:el('btTicker').value.trim().toUpperCase(),strategy:el('btStrategy').value,start_date:el('btStart').value,end_date:el('btEnd').value,compare_start_date:el('btCompareStart').value,compare_end_date:el('btCompareEnd').value,initial_cash:10000,short_window:Number(el('btShortWindow').value),long_window:Number(el('btLongWindow').value),dca_interval_days:Number(el('btDcaInterval').value),breakout_window:Number(el('btBreakoutWindow').value)};}
  function selectedRows(p){
    const params={ma_cross:[['short_window','short',20],['long_window','long',60]],dca:[['dca_interval_days','interval',21]],momentum:[['breakout_window','breakout',20]],buy_hold:[]};
    return [{key:'예시 대상 종목',status:p.ticker===example.ticker?'pass':'warn',observed:p.ticker,required:`${example.title}의 기본 종목 ${example.ticker}. 변경은 실험이며 부적합 판정은 아님`},
      {key:'예시 알고리즘',status:p.strategy===example.strategy?'pass':'warn',observed:p.strategy,required:example.strategy},
      {key:'예시 시작일',status:p.start_date===example.start?'pass':'warn',observed:p.start_date,required:example.start+' · 기간 변경 시 예시와 다른 실험'},
      {key:'예시 비교 시작일',status:p.compare_start_date===example.compareStart?'pass':'warn',observed:p.compare_start_date,required:example.compareStart},
      {key:'유동성·환율 영향',status:'review',observed:'거래대금·호가·환율 시계열 미검증',required:'종가 데이터만으로 유동성 부족·환율 기여도를 확정할 수 없음'},
      ...params[example.strategy].map(([key,field,fallback])=>({key:'예시 파라미터 '+key,status:p[key]===(example[field]||fallback)?'pass':'warn',observed:String(p[key]),required:String(example[field]||fallback)}))];
  }
  function table(rows){return `<div class="precheck-scroll"><table><thead><tr><th>체크 항목</th><th>판정</th><th>관측값</th><th>조건·해석</th></tr></thead><tbody>${rows.map(r=>`<tr><th>${esc(r.key)}</th><td><span class="precheck-status ${esc(r.status)}">${status[r.status]||'미확인'}</span></td><td>${esc(r.observed)}</td><td>${esc(r.required)}</td></tr>`).join('')}</tbody></table></div>`;}
  function invalidate(){generation++;const mount=el('btPrecheckOutput');if(mount)mount.innerHTML=table(selectedRows(input()))+'<p>입력이 변경되었습니다. 데이터 조건을 다시 점검하세요. 경고는 성과 부진의 원인 확정이 아닙니다.</p>';if(el('btAbOutput'))el('btAbOutput').replaceChildren();}
  function lock(flag){busy=flag;for(const id of [...ids,'runBacktest','btPrecheckButton','btAbRun'])if(el(id))el(id).disabled=flag;document.querySelectorAll('[data-example]').forEach(e=>e.disabled=flag);}
  async function check(p){
    const current=generation;
    el('btPrecheckOutput').textContent='실제 종가·준비 구간·추세 신호를 확인하고 있습니다…';
    try{
      const d=await api('/backtests/precheck',null,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});
      if(current!==generation)throw Error('입력이 변경되었습니다. 다시 점검하세요.');
      el('btPrecheckOutput').innerHTML=table([...selectedRows(p),...d.checks])+`<p>${d.can_run?'필수 실행 조건 충족. 주의·관측 항목은 별도 검토하세요.':'필수 조건 미충족. 입력·데이터를 수정한 뒤 실행하세요.'} 데이터 출처: ${esc(d.data?.source?.source||'미확인')}</p>`;
      if(!d.can_run)throw Error('사전 조건 미충족으로 실행을 중단했습니다.');
      return d;
    }catch(e){if(current===generation&&!el('btPrecheckOutput').querySelector('table'))el('btPrecheckOutput').textContent='점검 실패: '+(e.detail||e.message||'데이터·입력 확인 필요');throw e;}
  }
  async function ab(){
    if(busy)return;lock(true);const p=input();p.compare_start_date=p.start_date;p.compare_end_date=p.end_date;
    const out=el('btAbOutput');out.textContent='동일 기간·전략·파라미터로 A 삼성전자 → B SPY 순서로 실행합니다…';
    const results=[];
    try{
      for(const ticker of ['005930.KS','SPY']){
        const q={...p,ticker};
        out.textContent=`${ticker} 데이터 점검 및 LEAN 실행 중… (${results.length+1}/2)`;
        const pre=await api('/backtests/precheck',null,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(q)});
        if(!pre.can_run)throw Error(ticker+'의 필수 데이터 조건 미충족');
        const result=await api('/backtests/run',null,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(q)});
        results.push({result,pre});
      }
      out.innerHTML=`<h4>동일 로직 A/B 결과 · ${esc(p.strategy)}</h4><p>요청 기간 ${esc(p.start_date)} ~ ${esc(p.end_date)} · MA ${p.short_window}/${p.long_window} · 돌파 ${p.breakout_window} · 적립 ${p.dca_interval_days}거래일. 최초 현금 10,000 현지 통화 단위.</p><div class="precheck-scroll"><table><thead><tr><th>대상</th><th>실제 데이터</th><th>전략 수익률</th><th>단순 보유</th><th>보유 대비 차이</th><th>MDD</th><th>샤프</th><th>포지션 변경</th></tr></thead><tbody>${results.map(({result:d,pre})=>`<tr><th>${esc(d.ticker)}</th><td>${esc(pre.data.start)} ~ ${esc(pre.data.end)}<br>${pre.data.bars}봉 · ${esc(pre.data.currency)}</td><td>${num(d.strategy_return_pct)}%</td><td>${num(d.benchmark_return_pct)}%</td><td>${num(d.strategy_return_pct-d.benchmark_return_pct)}%p</td><td>${num(d.max_drawdown_pct)}%</td><td>${num(d.sharpe_ratio)}</td><td>${d.trade_count}회</td></tr>`).join('')}</tbody></table></div><p>각 자산의 단순 보유 대비 차이와 낙폭을 함께 비교하세요. 차이가 나더라도 자산 선택이 유일한 원인이라고 확정할 수 없습니다. 통화·시장·거래일·기업 고유 위험이 함께 달라집니다. 환율 환산·비용·배당·분할 조정은 미반영입니다. 동일 요청 기간이어도 한국·미국의 거래일과 실제 확보 기간은 다를 수 있습니다.</p>${results.map(({result:d,pre})=>`<details><summary>${esc(d.ticker)} 조건·추세 관측 상세</summary>${table(pre.checks)}</details>`).join('')}`;
    }catch(e){out.textContent='A/B 비교 중단: '+(e.detail||e.message||'요청 실패')+`. 완료 ${results.length}/2. 불완전한 결과로 원인을 판정하지 않습니다.`;}
    finally{lock(false);}
  }
  function mount(fetcher,getExample){api=fetcher;example=getExample();el('btPrecheckMount').innerHTML=`<section class="backtest-precheck" aria-label="알고리즘 사전 조건 점검"><h3><i class="fa-solid fa-list-check" aria-hidden="true"></i> 알고리즘 예시 · 사전 조건 점검</h3><p>예시 기본 조건과 실제 실행값을 비교합니다. 종목명만으로 추세 적합성이나 성과 부진의 원인을 단정하지 않습니다.</p><button type="button" id="btPrecheckButton">현재 조건 점검</button><div id="btPrecheckOutput" aria-live="polite"></div><details><summary>삼성전자 vs SPY · 동일 로직 원인 검증</summary><p>SPY는 미국 대형주 지수 ETF, 삼성전자는 한국 개별 기업입니다. 지속적인 추세·횡보·휩쏘 발생은 선택 기간의 데이터로 확인해야 하며, SPY가 항상 유리하다고 가정하지 않습니다.</p><p>A 삼성전자(005930.KS)와 B SPY에 현재 선택한 전략·기간·파라미터를 동일 적용합니다. 비교 기간은 검증 기간으로 맞추고, 각 자산의 단순 보유를 기준으로 평가합니다. LEAN을 2회 순차 실행합니다.</p><button type="button" id="btAbRun">삼성전자 / SPY A·B 검증</button><div id="btAbOutput" aria-live="polite"></div></details></section>`;
    for(const id of ids)el(id).addEventListener('input',invalidate);
    el('btPrecheckButton').onclick=async()=>{if(busy)return;lock(true);try{await check(input());}catch{}finally{lock(false);}};
    el('btAbRun').onclick=ab;invalidate();
  }
  function select(e){example=e;if(el('btPrecheckOutput'))invalidate();}
  return {mount,select,check,lock,input};
})();
