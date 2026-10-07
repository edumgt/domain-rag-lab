"""백테스트 가격 저장소: 시스템 OHLCV DB 우선 → 없는 구간만 외부(pg-stock → yfinance) 수집 후 적재."""
from datetime import date, timedelta
from types import SimpleNamespace

import pandas as pd
from sqlalchemy.dialects.postgresql import Insert

from app.services import ohlcv_store as os_
from app.services.lean_backtest_service import LeanBacktestService


class FakeSession:
    """select → 저장된 행(날짜 필터는 파이썬에서), Insert(upsert) → rows 에 반영."""

    def __init__(self, rows=()):
        self.rows = {(r.date): r for r in rows}
        self.inserted = 0
        self.commits = 0
        self.closed = False

    def execute(self, stmt):
        if isinstance(stmt, Insert):
            p = stmt.compile().params
            self.rows[p["date"]] = SimpleNamespace(ticker=p["ticker"], market=p["market"], date=p["date"], close=p["close"])
            self.inserted += 1
            return None
        crit = {c.right.value for c in stmt._where_criteria if hasattr(c, "right") and hasattr(c.right, "value") and isinstance(c.right.value, date)}
        lo, hi = min(crit), max(crit)
        found = sorted((r for r in self.rows.values() if lo <= r.date < hi), key=lambda r: r.date)
        return SimpleNamespace(scalars=lambda: SimpleNamespace(all=lambda: found))

    def commit(self): self.commits += 1
    def close(self): self.closed = True


def row(d, close): return SimpleNamespace(ticker="005930", market="KOSPI", date=d, close=close)
def bars(start, n, base=100.0): return [{"date": start + timedelta(days=i), "open": base, "high": base, "low": base, "close": base + i, "volume": 1} for i in range(n)]


def test_storage_key_and_symbol():
    assert os_.storage_key("005930.KS") == ("005930", "KOSPI") and os_.storage_key("247540.kq") == ("247540", "KOSDAQ") and os_.storage_key("SPY") == ("SPY", "US")
    assert os_.yahoo_symbol("005930", "KOSPI") == "005930.KS" and os_.yahoo_symbol("SPY", "US") == "SPY"


def test_db_only_when_fully_covered():
    start, end = date(2026, 1, 5), date(2026, 1, 20)
    sess = FakeSession([row(start + timedelta(days=i), 10 + i) for i in range(15)])
    calls = []
    store = os_.OhlcvStore(session_factory=lambda: sess, fetch_fn=lambda *a: calls.append(a) or [])
    series, meta = store.close_series("005930.KS", start, end)
    assert calls == [] and meta["source"] == "db" and meta["rows"] == 15 and sess.inserted == 0 and sess.closed
    assert isinstance(series.index, pd.DatetimeIndex) and float(series.iloc[-1]) == 24.0


def test_empty_db_fetches_all_and_stores():
    start, end = date(2026, 1, 5), date(2026, 1, 10)
    sess = FakeSession()
    fetched = []
    store = os_.OhlcvStore(session_factory=lambda: sess, fetch_fn=lambda sym, a, b: fetched.append((sym, a, b)) or bars(a, 5))
    series, meta = store.close_series("005930.KS", start, end)
    assert fetched == [("005930.KS", start, end)] and sess.inserted == 5 and sess.commits == 1
    assert meta["source"] == "yfinance" and meta["db_rows_before"] == 0 and meta["stored_rows"] == 5 and len(series) == 5
    assert meta["fetched"][0] == {"range": "all", "from": "2026-01-05", "to": "2026-01-10", "source": "yfinance", "rows": 5}


def test_tail_gap_fetches_only_missing_tail_and_remote_wins():
    start, end = date(2026, 1, 1), date(2026, 1, 31)
    sess = FakeSession([row(start + timedelta(days=i), 1 + i) for i in range(10)])     # 1/1~1/10 만 있음
    remote, yahoo = [], []
    store = os_.OhlcvStore(session_factory=lambda: sess,
                           fetch_fn=lambda sym, a, b: yahoo.append((a, b)) or [],
                           remote_fn=lambda t, m, a, b: remote.append((t, m, a, b)) or bars(a, (b - a).days, base=50))
    series, meta = store.close_series("005930.KS", start, end)
    assert remote == [("005930", "KOSPI", date(2026, 1, 11), end)] and yahoo == []
    assert meta["source"] == "db+pg-stock" and meta["db_rows_before"] == 10 and meta["rows"] == 30


def test_head_gap_known_empty_is_not_refetched():
    start, end = date(2025, 12, 1), date(2026, 1, 20)
    first = date(2026, 1, 2)
    sess = FakeSession([row(first + timedelta(days=i), 1 + i) for i in range(18)])   # 1/2~1/19: 앞 구간(12월)이 비어 있음
    calls = []
    store = os_.OhlcvStore(session_factory=lambda: sess, fetch_fn=lambda sym, a, b: calls.append((a, b)) or [])
    store.close_series("005930.KS", start, end)
    assert calls == [(start, first)]            # 앞 구간만 물어봄
    store.close_series("005930.KS", start, end)
    assert len(calls) == 1                       # 외부에도 없던 앞 구간은 다시 묻지 않음


def test_within_tolerance_no_fetch():
    """마지막 봉이 (end-1) 로부터 3일 이내면(주말) 뒤 구간을 다시 받지 않는다."""
    start, end = date(2026, 1, 5), date(2026, 1, 13)   # 월~월(배타) → 마지막 거래일 금 1/9 는 허용 범위
    sess = FakeSession([row(start + timedelta(days=i), 1) for i in range(5)])
    calls = []
    store = os_.OhlcvStore(session_factory=lambda: sess, fetch_fn=lambda *a: calls.append(a) or [])
    store.close_series("005930.KS", start, end)
    assert calls == []


def test_service_uses_store_and_reports_price_source(monkeypatch):
    start = date(2025, 1, 1)
    sess = FakeSession([row(start + timedelta(days=i), 100 + (i % 7)) for i in range(400)])
    store = os_.OhlcvStore(session_factory=lambda: sess, fetch_fn=lambda *a: [])
    svc = LeanBacktestService(store=store)
    monkeypatch.setattr(svc, "_resolve_runner", lambda: "local")
    monkeypatch.setattr(svc, "_run_local", lambda *a, **k: "LEAN LOG")
    out = svc.run(ticker="005930.KS", start_date=date(2025, 6, 1), end_date=date(2025, 12, 31),
                  compare_start_date=date(2025, 3, 1), compare_end_date=date(2025, 12, 31), initial_cash=10000, strategy="buy_hold")
    assert out["price_source"]["source"] == "db" and out["price_source"]["rows"] > 0 and out["lean_runner"] == "local"
    assert set(out["timings"]) == {"download_ms", "lean_ms", "total_ms"} and out["trade_count"] >= 0
