"""Causal close-to-close research checks, separate from LEAN engine statistics."""
from datetime import timedelta
import math
import numpy as np
from app.services.lean_backtest_service import LeanBacktestService


def metrics(curve):
    returns=curve.pct_change().dropna()
    total=float(curve.iloc[-1]/curve.iloc[0]-1)
    annual=(1+total)**(252/max(1,len(curve)-1))-1
    vol=float(returns.std(ddof=0)*math.sqrt(252))
    sharpe=float((returns.mean()*252-.02)/vol) if vol>0 else None
    return {'return_pct':round(total*100,2),'mdd_pct':round(float((curve/curve.cummax()-1).min())*100,2),
            'sharpe':round(sharpe,3) if sharpe is not None else None,'annualized_return_pct':round(annual*100,2),'bars':len(curve)}


def simulate(close,p,*,fee_bps=None,slippage_bps=None,stop_pct=None,trend=None):
    """Decide from bar t-1 and transact at close t. Never use the future bar for sizing decisions."""
    fee=p.fee_bps if fee_bps is None else fee_bps
    slip=p.slippage_bps if slippage_bps is None else slippage_bps
    stop=p.stop_loss_pct if stop_pct is None else stop_pct
    trend_on=p.trend_filter if trend is None else trend
    window=close.loc[(close.index.date>=p.start_date)&(close.index.date<=p.end_date)]
    if len(window)<3:raise ValueError('검증 구간은 3거래일 이상 필요합니다.')
    # Signals are *unshifted*: execution loop below uses the preceding observation explicitly.
    if p.strategy=='ma_cross':signal=(close.rolling(p.short_window).mean()>close.rolling(p.long_window).mean()).astype(float)
    else:signal=close*0+1
    # Compute breakout state directly from historical prices.
    if p.strategy=='momentum':
        hi=close.shift(1).rolling(p.breakout_window).max();lo=close.shift(1).rolling(p.breakout_window).min();holding=False;flags=[]
        for price,h,l in zip(close,hi,lo):
            if not holding and price>h:holding=True
            elif holding and price<l:holding=False
            flags.append(float(holding))
        signal=close*0;signal[:]=flags
    ma=close.rolling(p.trend_window).mean()
    location={idx:i for i,idx in enumerate(close.index)}
    cash=1.0;shares=0.0;entry=None;stopped=False;values=[];orders=0;cost_total=0.0;stops=0
    count=math.ceil((len(window)-1)/p.dca_interval_days) if len(window)>1 else 1
    budget=p.position_pct/100/count
    for i,(idx,price) in enumerate(window.items()):
        price=float(price);j=location[idx];prior=close.iloc[j-1] if j else None
        eligible=j>0
        decision=bool(signal.iloc[j-1]>0) if eligible else False
        # First bar establishes initial cash; all trades occur later, after the preceding close is observed.
        if i==0:values.append(cash);continue
        equity=cash+shares*price
        if not decision:stopped=False
        if trend_on and eligible:
            decision=decision and bool(prior>ma.iloc[j-1])
        stop_hit=bool(shares>0 and stop>0 and eligible and entry and prior<=entry*(1-stop/100))
        if stop_hit or not decision:
            if shares>0:
                notional=shares*price;charge=notional*(fee+slip)/10000
                cash+=notional-charge;cost_total+=charge;shares=0;entry=None;orders+=1
                if stop_hit:stops+=1;stopped=True
        elif decision and not stopped:
            if p.strategy=='dca':
                spend=min(cash,budget) if (i-1)%p.dca_interval_days==0 else 0
            else:
                target=equity*p.position_pct/100;spend=min(cash,max(0,target-shares*price)) if shares==0 else 0
            if spend>1e-10:
                notional=spend/(1+(fee+slip)/10000);charge=spend-notional
                old_cost=(entry or 0)*shares;shares+=notional/price;cash-=spend;cost_total+=charge;orders+=1
                entry=(old_cost+notional)/shares
        values.append(cash+shares*price)
    curve=window.astype(float)*0;curve[:]=values
    return {'metrics':metrics(curve),'orders':orders,'stop_events':stops,'cost_initial_pct':round(cost_total*100,4),
            'curve':curve}


def research(p,service=None):
    from app.services.backtest_preconditions import check_preconditions
    service=service or LeanBacktestService()
    kr=p.ticker.endswith(('.KS','.KQ'))
    if p.market_scope=='global':raise ValueError('현재는 단일 자산 연구입니다. 글로벌 자산배분은 환율·거래일·가중치 통합 엔진이 필요해 실행하지 않습니다.')
    if p.market_scope=='us' and (kr or p.ticker!='SPY'):
        raise ValueError('미국 입문 모드는 SPY만 지원합니다. SPY를 선택하거나 한국 단일자산 모드를 사용하세요.')
    if p.market_scope=='kr' and not kr:raise ValueError('한국 모드는 .KS 또는 .KQ 종목을 선택하세요.')
    pre=check_preconditions(p,service)
    if not pre['can_run']:raise ValueError('필수 데이터 조건 미충족')
    buffer=max(service._lookback_buffer(p.strategy,p.long_window,p.breakout_window),p.trend_window*3+30)
    close,source=service.store.close_series(p.ticker,p.start_date-timedelta(days=buffer),p.end_date+timedelta(days=1))
    if not np.isfinite(close.to_numpy()).all() or (close<=0).any() or close.index.has_duplicates or not close.index.is_monotonic_increasing:
        raise ValueError('연구용 가격 무결성 검사 실패')
    window=close.loc[(close.index.date>=p.start_date)&(close.index.date<=p.end_date)]
    if len(window)<90:raise ValueError('시간순 검증을 위해 검증 기간 내 90거래일 이상 필요합니다.')
    from copy import deepcopy
    baseline_p=deepcopy(p);baseline_p.position_pct=100
    raw=simulate(close,baseline_p,fee_bps=0,slippage_bps=0,stop_pct=0,trend=False)
    cost=simulate(close,baseline_p,stop_pct=0,trend=False)
    managed=simulate(close,p)
    benchmark_p=deepcopy(p);benchmark_p.strategy='buy_hold';benchmark_p.position_pct=100
    benchmark=simulate(close,benchmark_p,stop_pct=0,trend=False)
    serial=lambda r:{k:v for k,v in r.items() if k!='curve'}
    # Parameters stay frozen. No claim that user-selected parameters are genuinely untouched OOS.
    folds=[]
    for n,indices in enumerate(np.array_split(np.arange(len(window)),3),1):
        q=deepcopy(p);q.start_date=window.index[indices[0]].date();q.end_date=window.index[indices[-1]].date()
        r=simulate(close,q);b=simulate(close,benchmark_p.model_copy(update={'start_date':q.start_date,'end_date':q.end_date}),stop_pct=0,trend=False)
        folds.append({'part':n,'start':str(q.start_date),'end':str(q.end_date),'strategy':r['metrics'],'benchmark':b['metrics']})
    sensitivity=[]
    for scale in [.8,1,1.2]:
        q=deepcopy(p)
        if p.strategy=='ma_cross':q.short_window=max(2,round(p.short_window*scale));q.long_window=max(q.short_window+1,round(p.long_window*scale))
        elif p.strategy=='momentum':q.breakout_window=max(5,round(p.breakout_window*scale))
        elif p.strategy=='dca':q.dca_interval_days=max(1,round(p.dca_interval_days*scale))
        else:break
        r=simulate(close,q)
        sensitivity.append({'scale':scale,'short':q.short_window,'long':q.long_window,'breakout':q.breakout_window,'interval':q.dca_interval_days,'metrics':r['metrics']})
    currency='KRW' if kr else 'USD';zone='Asia/Seoul' if kr else 'America/New_York'
    audit=[
      {'key':'자산·통화 범위','status':'pass','observed':f'{p.ticker} · {currency} · 단일자산','required':'현지 통화 %성과. 자산 성격만으로 전략 적합성 단정 금지'},
      {'key':'시장 시간·환율','status':'warn','observed':zone+' · 일봉 날짜 기반 연구','required':'미국은 EST 고정이 아닌 DST 적용. 장중 시간·휴장·환율 체결은 미모델링'},
      {'key':'체결·비용 가정','status':'pass','observed':f'직전 봉 신호 → 다음 봉 종가 체결, 수수료 {p.fee_bps}bp + 슬리피지 {p.slippage_bps}bp / 편도','required':'명시한 연구 가정의 적용 여부. 단순 비례 비용 모델. 실제 호가/체결 재현 인증 아님'},
      {'key':'위험관리','status':'pass','observed':f'진입 목표 비중 {p.position_pct}% · 손절 {p.stop_loss_pct}% · 추세필터 {p.trend_filter} ({p.trend_window}일)','required':'손절은 직전 종가로 판단 후 다음 종가에 체결. 갭 손실·손절 초과 가능'},
      {'key':'미래정보 차단','status':'pass','observed':'각 결정은 이전 봉까지의 신호만 사용','required':'지표 준비·방향성 회귀 테스트 검증. 모든 편향 제거를 의미하지 않음'},
      {'key':'과최적화 점검','status':'review','observed':'고정 파라미터 시간순 3구간 + 주변값 0.8/1.0/1.2배','required':'학습 최적화 없는 구간 안정성 점검. 진짜 미사용 OOS·Walk-Forward 최적화는 별도 필요'},
      {'key':'생존·선택 편향','status':'warn','observed':'사용자가 선택한 현재 종목의 과거 가격','required':'당시 구성종목·상장폐지 포함 유니버스 없음. 생존편향 검증 미충족'},
      {'key':'기업행사·총수익','status':'warn','observed':'원시 종가 기반 · 배당/분할 조정 미검증','required':'배당·분할 조정과 총수익 대사 필요'},
      {'key':'LEAN 엔진 성과 대사','status':'warn','observed':'연구 시뮬레이터 계산 · LEAN 공식 성과와 별도','required':'LEAN과 pandas의 준비 구간·DCA 배분·체결 시점이 다를 수 있음. 비용·위험관리·주문 통계 대사 미완료'},
      {'key':'지표 지원 범위','status':'review','observed':'보유·MA 교차·돌파·DCA, 선택적 추세 MA 필터','required':'RSI·MACD 및 글로벌 다중자산 엔진은 현재 미지원'}]
    return {'engine':'종가 기반 연구 시뮬레이터 (LEAN 공식 통계 아님)','inputs':p.model_dump(mode='json'),'precheck':pre,'audit':audit,'source':source,
      'baseline':serial(raw),'cost_only':serial(cost),'managed':serial(managed),'benchmark':serial(benchmark),'folds':folds,'sensitivity':sensitivity,
      'asset_profile':{'first_price':float(window.iloc[0]),'last_price':float(window.iloc[-1]),'high_close':float(window.max()),'low_close':float(window.min()),'currency':currency,'as_of':str(window.index[-1].date())},
      'points':[{'date':str(i.date()),'price':float(window.loc[i]/window.iloc[0]),'baseline':float(raw['curve'].loc[i]),'managed':float(managed['curve'].loc[i]),'benchmark':float(benchmark['curve'].loc[i])} for i in window.index[::max(1,len(window)//100)]],
      'limits':'고정된 종목·파라미터에 대한 연구 점검입니다. 최종 자산은 평가액이며 강제 청산 비용은 미차감. 분할·배당·세금·환율·유동성·실제 거래일별 호가·공매도는 미반영. 손절 뒤 신호가 꺼질 때까지 재진입하지 않으며, 매수후보유/DCA는 손절 후 재진입하지 않습니다. 자산 선택이 부진 원인임을 확정하지 않습니다.'}
