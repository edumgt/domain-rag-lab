"""백테스트용 일봉 종가 저장소 — 시스템 OHLCV DB 우선, 없는 구간만 외부에서 받아 적재한다.

우선순위
  1. 이 서비스의 PostgreSQL ``stock_price_history`` (종목 매거진·ETF 기간수익률과 같은 테이블)
  2. (선택) 별도 OHLCV 저장소 pg-stock — ``OHLCV_DATABASE_URL`` 이 설정돼 있고 국내 종목일 때, ``ohlcv`` 테이블
  3. yfinance (Yahoo Finance)
2·3 에서 받은 봉은 1 에 upsert 하므로 같은 종목·기간은 다음부터 DB 만으로 끝난다.

구간 판단: 요청 [start, end) 에 대해 DB 가 비었으면 전체를, 앞쪽이 start 보다 10일 넘게 늦게 시작하면 앞 구간을,
마지막 봉이 (end-1) 보다 3일 넘게 오래됐으면 뒤 구간을 가져온다. 상장 전 구간처럼 외부에도 없는 앞 구간은
프로세스 메모리에 기억해 매번 다시 묻지 않는다.

종가는 수정주가가 아닌 원시 종가(raw close)로 통일한다 — DB·pg-stock·yfinance 세 소스가 섞여도 경계에서 단절이 없게.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Any, Callable

import pandas as pd
from sqlalchemy import select, text
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.stock_price_history import StockPriceHistory

logger = logging.getLogger(__name__)

KR_SUFFIX = {".KS": "KOSPI", ".KQ": "KOSDAQ"}
HEAD_TOLERANCE_DAYS = 10     # DB 첫 봉이 start 보다 이만큼 늦으면 앞 구간을 외부에서 찾는다
TAIL_TOLERANCE_DAYS = 3      # DB 마지막 봉이 (end-1) 보다 이만큼 오래되면 뒤 구간을 외부에서 찾는다(주말·휴장 허용)

Bar = dict[str, Any]   # {"date": date, "open", "high", "low", "close", "volume"}


def storage_key(symbol: str) -> tuple[str, str]:
    """yfinance 심볼 → stock_price_history (ticker, market). 국내는 6자리 코드+KOSPI/KOSDAQ(기존 적재 규약), 그 외는 심볼 그대로+US."""
    sym = str(symbol or "").strip().upper()
    for suffix, market in KR_SUFFIX.items():
        if sym.endswith(suffix):
            return sym[: -len(suffix)], market
    return sym, "US"


def yahoo_symbol(ticker: str, market: str) -> str:
    for suffix, name in KR_SUFFIX.items():
        if market == name:
            return f"{ticker}{suffix}"
    return ticker


def fetch_yahoo_bars(symbol: str, start: date, end_exclusive: date) -> list[Bar]:
    """yfinance 일봉(원시 가격). 없으면 빈 리스트."""
    import yfinance as yf

    frame = yf.download(symbol, start=start.isoformat(), end=end_exclusive.isoformat(), auto_adjust=False, progress=False, threads=False)
    if frame is None or frame.empty:
        return []
    if isinstance(frame.columns, pd.MultiIndex):
        frame.columns = frame.columns.get_level_values(0)
    bars: list[Bar] = []
    for idx, row in frame.iterrows():
        try:
            close = float(row["Close"])
        except (KeyError, TypeError, ValueError):
            continue
        if pd.isna(close):
            continue

        def num(col: str) -> float | None:
            try:
                v = float(row[col])
                return None if pd.isna(v) else round(v, 2)
            except (KeyError, TypeError, ValueError):
                return None

        vol = row.get("Volume")
        bars.append({
            "date": pd.Timestamp(idx).date(),
            "open": num("Open"), "high": num("High"), "low": num("Low"), "close": round(close, 2),
            "volume": int(vol) if vol is not None and not pd.isna(vol) else 0,
        })
    return bars


_remote_engine = None


def fetch_remote_bars(ticker: str, market: str, start: date, end_exclusive: date) -> list[Bar]:
    """별도 OHLCV 저장소(pg-stock, stock-coin-trade `database/pg-stock.sql`)의 ohlcv 테이블. 국내 6자리 코드만."""
    global _remote_engine
    if not settings.ohlcv_database_url or market not in KR_SUFFIX.values():
        return []
    if _remote_engine is None:
        from sqlalchemy import create_engine
        _remote_engine = create_engine(settings.ohlcv_database_url, pool_pre_ping=True, connect_args={"connect_timeout": 5})
    sql = text("SELECT trade_date, open, high, low, close, volume FROM ohlcv "
               "WHERE ticker_code = :t AND trade_date >= :a AND trade_date < :b ORDER BY trade_date")
    with _remote_engine.connect() as conn:
        rows = conn.execute(sql, {"t": ticker, "a": start, "b": end_exclusive}).fetchall()
    return [{"date": r[0], "open": r[1], "high": r[2], "low": r[3], "close": r[4], "volume": int(r[5] or 0)}
            for r in rows if r[4] is not None]


@dataclass
class OhlcvStore:
    session_factory: Callable[[], Any] = SessionLocal
    fetch_fn: Callable[[str, date, date], list[Bar]] = fetch_yahoo_bars
    remote_fn: Callable[[str, str, date, date], list[Bar]] | None = None
    _known_empty: set[tuple[str, str, str, date]] = field(default_factory=set)

    def __post_init__(self) -> None:
        if self.remote_fn is None and settings.ohlcv_database_url:
            self.remote_fn = fetch_remote_bars

    # ── 조회 ────────────────────────────────────────────────────────────────
    @staticmethod
    def _read(db, ticker: str, market: str, start: date, end_exclusive: date) -> list:
        stmt = (select(StockPriceHistory)
                .where(StockPriceHistory.ticker == ticker, StockPriceHistory.market == market,
                       StockPriceHistory.date >= start, StockPriceHistory.date < end_exclusive)
                .order_by(StockPriceHistory.date.asc()))
        return list(db.execute(stmt).scalars().all())

    def _missing_ranges(self, rows: list, ticker: str, market: str, start: date, end_exclusive: date) -> list[tuple[str, date, date]]:
        if not rows:
            return [("all", start, end_exclusive)]
        gaps: list[tuple[str, date, date]] = []
        first, last = rows[0].date, rows[-1].date
        if first > start + timedelta(days=HEAD_TOLERANCE_DAYS) and ("head", ticker, market, start) not in self._known_empty:
            gaps.append(("head", start, first))
        if last < end_exclusive - timedelta(days=1 + TAIL_TOLERANCE_DAYS) and ("tail", ticker, market, end_exclusive) not in self._known_empty:
            gaps.append(("tail", last + timedelta(days=1), end_exclusive))
        return gaps

    # ── 적재 ────────────────────────────────────────────────────────────────
    @staticmethod
    def _upsert(db, ticker: str, market: str, bars: list[Bar]) -> int:
        n = 0
        for bar in bars:
            stmt = pg_insert(StockPriceHistory).values(ticker=ticker, market=market, **bar)
            stmt = stmt.on_conflict_do_update(
                index_elements=["ticker", "market", "date"],
                set_={"open": stmt.excluded.open, "high": stmt.excluded.high, "low": stmt.excluded.low,
                      "close": stmt.excluded.close, "volume": stmt.excluded.volume},
            )
            db.execute(stmt)
            n += 1
        db.commit()
        return n

    # ── 공개 API ──────────────────────────────────────────────────────────────
    def close_series(self, symbol: str, start: date, end_exclusive: date) -> tuple[pd.Series, dict]:
        """[start, end) 의 종가 시계열(DatetimeIndex)과 출처 메타. 비어 있으면 빈 Series."""
        ticker, market = storage_key(symbol)
        meta: dict[str, Any] = {"symbol": symbol, "ticker": ticker, "market": market, "db_rows_before": 0,
                                "fetched": [], "stored_rows": 0, "source": "db"}
        db = self.session_factory()
        try:
            rows = self._read(db, ticker, market, start, end_exclusive)
            meta["db_rows_before"] = len(rows)
            gaps = self._missing_ranges(rows, ticker, market, start, end_exclusive)
            for kind, a, b in gaps:
                bars: list[Bar] = []
                source = None
                if self.remote_fn is not None:
                    try:
                        bars = self.remote_fn(ticker, market, a, b)
                        source = "pg-stock" if bars else None
                    except Exception as exc:   # 원격 저장소 장애는 yfinance 로 넘어간다
                        logger.warning("원격 OHLCV 조회 실패 %s %s~%s: %s", ticker, a, b, exc)
                        meta["remote_error"] = str(exc)[:160]
                if not bars:
                    bars = self.fetch_fn(symbol, a, b)
                    source = "yfinance" if bars else None
                if bars:
                    meta["stored_rows"] += self._upsert(db, ticker, market, bars)
                else:
                    self._known_empty.add((kind if kind != "all" else "head", ticker, market, start if kind != "tail" else end_exclusive))
                meta["fetched"].append({"range": kind, "from": a.isoformat(), "to": b.isoformat(), "source": source, "rows": len(bars)})
            if gaps:
                rows = self._read(db, ticker, market, start, end_exclusive)
        finally:
            db.close()

        sources = {f["source"] for f in meta["fetched"] if f["source"]}
        meta["source"] = "+".join(["db"] if meta["db_rows_before"] else []) + ("+" if meta["db_rows_before"] and sources else "") + "+".join(sorted(sources))
        if not meta["source"]:
            meta["source"] = "none"
        meta["rows"] = len(rows)
        meta["first_date"] = rows[0].date.isoformat() if rows else None
        meta["last_date"] = rows[-1].date.isoformat() if rows else None
        series = pd.Series([float(r.close) for r in rows], index=pd.to_datetime([r.date for r in rows]), dtype=float)
        return series, meta
