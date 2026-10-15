"""Evidence-based checks before LEAN execution; no suitability forecasts."""
from datetime import timedelta
import numpy as np
from app.services.lean_backtest_service import LeanBacktestService


def check_preconditions(request, service=None):
    service = service or LeanBacktestService()
    p=request
    rows=[]
    def add(key,status,observed,required):
        rows.append(dict(key=key,status=status,observed=observed,required=required))
    if p.start_date>=p.end_date or p.compare_start_date>=p.compare_end_date:
        add('기간 순서','fail','시작일 ≥ 종료일','각 시작일 < 종료일')
        return {'can_run':False,'checks':rows,'data':None}
    buffer=service._lookback_buffer(p.strategy,p.long_window,p.breakout_window)
    close,source=service.store.close_series(p.ticker,min(p.start_date,p.compare_start_date)-timedelta(days=buffer),max(p.end_date,p.compare_end_date)+timedelta(days=1))
    if close.empty:
        add('가격 데이터','fail','0개','2개 이상 유효 종가')
        return {'can_run':False,'checks':rows,'data':None}
    valid=bool(np.isfinite(close.to_numpy()).all() and (close>0).all() and not close.index.has_duplicates and close.index.is_monotonic_increasing)
    add('가격 무결성','pass' if valid else 'fail',f'{len(close)}봉 · 양수/유한값/날짜 중복/정렬 검사','양수·유한 종가, 날짜 중복 없음, 오름차순')
    window=close.loc[(close.index.date>=p.start_date)&(close.index.date<=p.end_date)]
    comparison=close.loc[(close.index.date>=p.compare_start_date)&(close.index.date<=p.compare_end_date)]
    add('검증·비교 데이터','pass' if min(len(window),len(comparison))>=2 else 'fail',f'검증 {len(window)}봉 / 비교 {len(comparison)}봉','각 2봉 이상')
    warmup=close.loc[close.index.date<p.start_date]
    required=p.long_window if p.strategy=='ma_cross' else p.breakout_window+1 if p.strategy=='momentum' else 0
    add('지표 준비 구간','pass' if len(warmup)>=required else 'warn',f'시작 전 {len(warmup)}봉 / 필요 {required}봉','첫 검증일 이전에 이동평균·돌파 계산에 필요한 거래일 확보')
    same=p.start_date==p.compare_start_date and p.end_date==p.compare_end_date
    add('비교 기간 정합성','pass' if same else 'warn',f'검증 {p.start_date}~{p.end_date} / 비교 {p.compare_start_date}~{p.compare_end_date}','동일 기간 초과수익에는 검증 기간의 동일 종목 단순 보유 사용; 다른 기간 차이는 별도 해석')
    if len(window):
        boundary=(window.index[0].date()-p.start_date).days<=10 and (p.end_date-window.index[-1].date()).days<=5
        add('기간 경계 확보','pass' if boundary else 'warn',f'실제 {window.index[0].date()}~{window.index[-1].date()}','요청 대비 앞 10일·뒤 5일 이내의 거래일 확보(휴장 허용 휴리스틱; 중간 누락 보장 아님)')
    currency='KRW' if p.ticker.endswith(('.KS','.KQ')) else 'USD' if p.ticker=='SPY' else '미확인'
    add('통화·자산 범위','warn',f'{p.ticker} · {currency} · 단일 자산 백테스트','SPY와 한국 종목의 %수익률은 현지 통화 기준. 환산 수익·동일 투자자 성과는 환율 데이터 필요')
    add('비용·가격 조정','warn','원시 종가 · 배당/분할 조정·세금·수수료·슬리피지 미반영','비용 차감 및 기업행사 확인 전에는 실전 순성과로 해석 금지')
    diagnostics=None
    if valid and len(window)>=2:
        displacement=abs(float(window.iloc[-1]-window.iloc[0]));path=float(window.diff().abs().sum())
        efficiency=round(displacement/path,4) if path else 0
        position=service._position_ma_cross(close,p.short_window,p.long_window) if p.strategy=='ma_cross' else service._position_momentum(close,p.breakout_window) if p.strategy=='momentum' else None
        diagnostics={'directional_efficiency':efficiency,'rapid_reversals':None,'win_rate_pct':None}
        if position is not None:
            w=position.loc[window.index];change=w.diff().fillna(0).ne(0).to_numpy().nonzero()[0]
            rapid=int(sum(b-a<=5 for a,b in zip(change,change[1:])))
            diagnostics.update(rapid_reversals=rapid,win_rate_pct=service._win_rate(close,w))
            add('추세·왕복 신호 관찰','review',f'방향 효율 {efficiency} / 5거래일 이내 연속 전환 {rapid}쌍 / 완결 거래 승률 {diagnostics["win_rate_pct"]}%', '방향 효율=시작·끝 가격차 절대값/일별 가격차 절대값 합. 빠른 전환은 휩쏘 의심 관측치이며 손실 원인 확정 아님')
    return {'can_run':not any(r['status']=='fail' for r in rows),'checks':rows,'data':{'ticker':p.ticker,'bars':len(window),'start':str(window.index[0].date()) if len(window) else None,'end':str(window.index[-1].date()) if len(window) else None,'source':source,'currency':currency},'diagnostics':diagnostics}
