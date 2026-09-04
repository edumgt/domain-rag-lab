"""Backfill daily OHLCV history for every ticker in the company atlas into PostgreSQL.

The stock-detail modal only enables its "과거 데이터 보기" button when
``stock_price_history`` already has rows for a ticker, so this script needs to
run at least once (and can be re-run any time to refresh the cache).

Run inside the api container, which has network egress to Yahoo Finance and a
mounted copy of ``frontend/app.js`` (the source of truth for the ticker list):

    docker compose exec api python -m app.ops.backfill_ohlcv
"""

from __future__ import annotations

import asyncio
import re
from datetime import datetime, timezone
from pathlib import Path

import httpx
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.core.database import SessionLocal
from app.models.stock_price_history import StockPriceHistory

APP_JS_PATH = Path("/app/frontend/app.js")
YF_RANGE = "1y"
CONCURRENCY = 6
TIMEOUT = 10.0


def _extract_block(source: str, var_name: str) -> str:
    marker = f"const {var_name} = Object.fromEntries(Object.entries({{"
    start = source.index(marker) + len(marker)
    end = source.index("}).map(", start)
    return source[start:end]


def parse_tickers() -> list[tuple[str, str]]:
    """Return deduplicated (ticker, market) pairs parsed straight out of frontend/app.js."""
    source = APP_JS_PATH.read_text(encoding="utf-8")

    atlas_block = _extract_block(source, "COMPANY_ATLAS")
    tickers_block = _extract_block(source, "COMPANY_TICKERS")

    atlas_days: dict[str, list[list[str]]] = {}
    for m in re.finditer(r"(\d+):\s*`([^`]*)`", atlas_block):
        day, text = m.group(1), m.group(2)
        atlas_days[day] = [row.split("|") for row in text.strip().splitlines() if row.strip()]

    ticker_days: dict[str, list[str]] = {}
    for m in re.finditer(r"(\d+):\s*'([^']*)'", tickers_block):
        day, text = m.group(1), m.group(2)
        ticker_days[day] = text.split()

    pairs: dict[str, str] = {}
    for day, rows in atlas_days.items():
        codes = ticker_days.get(day, [])
        for (market, _name, _sector), code in zip(rows, codes):
            pairs[code] = market
    return sorted(pairs.items())


async def fetch_daily_bars(client: httpx.AsyncClient, ticker: str, market: str) -> list[dict]:
    symbol = f"{ticker}.{'KS' if market == 'KOSPI' else 'KQ'}"
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?range={YF_RANGE}&interval=1d"
    try:
        response = await client.get(url, headers={"User-Agent": "FinanceRagLab/1.0 (educational use)"})
        response.raise_for_status()
        result = response.json()["chart"]["result"][0]
    except Exception as exc:  # noqa: BLE001 — best-effort backfill, log and move on
        print(f"  ! {ticker} ({market}): fetch failed — {exc}")
        return []

    timestamps = result.get("timestamp") or []
    quote = result["indicators"]["quote"][0]
    opens, highs = quote.get("open") or [], quote.get("high") or []
    lows, closes = quote.get("low") or [], quote.get("close") or []
    volumes = quote.get("volume") or []

    bars = []
    for i, ts in enumerate(timestamps):
        o = opens[i] if i < len(opens) else None
        h = highs[i] if i < len(highs) else None
        l = lows[i] if i < len(lows) else None
        c = closes[i] if i < len(closes) else None
        if o is None or h is None or l is None or c is None:
            continue
        v = volumes[i] if i < len(volumes) and volumes[i] is not None else 0
        bars.append({
            "date": datetime.fromtimestamp(ts, tz=timezone.utc).date(),
            "open": round(o, 2), "high": round(h, 2), "low": round(l, 2), "close": round(c, 2),
            "volume": int(v),
        })
    return bars


def upsert_bars(ticker: str, market: str, bars: list[dict]) -> None:
    if not bars:
        return
    session = SessionLocal()
    try:
        for bar in bars:
            stmt = pg_insert(StockPriceHistory).values(ticker=ticker, market=market, **bar)
            stmt = stmt.on_conflict_do_update(
                index_elements=["ticker", "market", "date"],
                set_={
                    "open": stmt.excluded.open,
                    "high": stmt.excluded.high,
                    "low": stmt.excluded.low,
                    "close": stmt.excluded.close,
                    "volume": stmt.excluded.volume,
                },
            )
            session.execute(stmt)
        session.commit()
    finally:
        session.close()


async def main() -> None:
    pairs = parse_tickers()
    print(f"Found {len(pairs)} unique tickers to backfill (range={YF_RANGE}).")
    semaphore = asyncio.Semaphore(CONCURRENCY)
    done = 0
    failed: list[str] = []

    async with httpx.AsyncClient(timeout=TIMEOUT, follow_redirects=True) as client:
        async def worker(ticker: str, market: str) -> None:
            nonlocal done
            async with semaphore:
                bars = await fetch_daily_bars(client, ticker, market)
            upsert_bars(ticker, market, bars)
            done += 1
            if not bars:
                failed.append(f"{ticker}({market})")
            print(f"[{done}/{len(pairs)}] {ticker} ({market}): {len(bars)} bars", flush=True)

        await asyncio.gather(*(worker(t, m) for t, m in pairs))

    print("Backfill complete.")
    if failed:
        print(f"{len(failed)} tickers had no data: {', '.join(failed)}")


if __name__ == "__main__":
    asyncio.run(main())
