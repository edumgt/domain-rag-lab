"""교차 검증용 샘플 전략 스펙 1개를 저장한다 (LEAN 백테스트 없이).

용도: lumina-invest 종목 선정 화면 드롭다운 노출·사이클 적용(settings.strategy.applied) 확인.
backtest_result 는 실제 백테스트가 아니라 **표시용 자리값**이며 engine="sample" 로 구분한다. 실전·운영 판단에 쓰지 않는다.
실행: cd /home/ubuntu/domain-rag-lab && .venv/bin/python scripts/seed_sample_strategy.py   (컨테이너는 data/ 마운트라 즉시 노출)
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from datetime import date, datetime, timedelta, timezone

from app.schemas.strategy import (
    Acceptance, BacktestPeriod, BacktestResultSummary, PositionSizing, SignalRule, SignalWeights, StrategySpec,
)
from app.services import strategy_store

KST = timezone(timedelta(hours=9))
spec = StrategySpec(
    strategy_id="sample_ma_cross_kr", version=strategy_store.next_version("sample_ma_cross_kr"),
    name="[샘플] 이동평균 교차 5/20 (교차 검증용)",
    universe=["005930", "000660", "035420"], timeframe="1d",
    entry=SignalRule(indicator="ma_cross", params={"short_window": 5, "long_window": 20}, condition="short_above_long"),
    exit=SignalRule(indicator="ma_cross", params={"short_window": 5, "long_window": 20}, condition="short_below_long"),
    signal_weights=SignalWeights(technical=1.0, lightgbm=0.0, buy_threshold=0.25, sell_threshold=-0.25),
    position_sizing=PositionSizing(max_position_pct=20.0, max_symbols=2),
    backtest_result=BacktestResultSummary(period=BacktestPeriod(start=date(2024, 1, 2), end=date(2026, 9, 30)),
                                          annualized_return_pct=0.0, max_drawdown_pct=0.0, sharpe_ratio=0.0, trade_count=0, engine="sample"),
    acceptance=Acceptance(passed=True, failed=[]),
    created_at=datetime.now(KST),
)
path = strategy_store.save(spec)
print("saved", path)
