"""Read-only market snapshots for the learning-oriented company atlas."""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Any
from urllib.parse import quote_plus
import xml.etree.ElementTree as ET

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.stock_price_history import StockPriceHistory

router = APIRouter(prefix="/market", tags=["market"])

_cache: dict[str, tuple[datetime, dict[str, Any]]] = {}
_ttl = timedelta(minutes=5)


def _parse_news(xml: str) -> list[dict[str, str]]:
    root = ET.fromstring(xml)
    items = []
    for item in root.findall("./channel/item")[:4]:
        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        published_at = (item.findtext("pubDate") or "").strip()
        if title and link:
            items.append({"title": title, "url": link, "published_at": published_at})
    return items


@router.get("/company")
async def company_snapshot(
    ticker: str = Query(pattern=r"^\d{6}$"),
    market: str = Query(pattern=r"^(KOSPI|KOSDAQ)$"),
    name: str = Query(min_length=1, max_length=60),
) -> dict[str, Any]:
    """Return a best-effort delayed quote and recent news links, cached for five minutes."""
    cache_key = f"{ticker}:{market}:{name}"
    now = datetime.now(timezone.utc)
    cached = _cache.get(cache_key)
    if cached and now - cached[0] < _ttl:
        return cached[1]

    symbol = f"{ticker}.{'KS' if market == 'KOSPI' else 'KQ'}"
    chart_url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?range=5d&interval=1d"
    news_url = f"https://news.google.com/rss/search?q={quote_plus(name + ' 주가')}&hl=ko&gl=KR&ceid=KR:ko"
    quote: dict[str, Any] | None = None
    news: list[dict[str, str]] = []
    errors: list[str] = []

    async with httpx.AsyncClient(timeout=6.0, follow_redirects=True) as client:
        chart_result, news_result = await _fetch_all(client, chart_url, news_url)
    if isinstance(chart_result, Exception):
        errors.append("시세 정보를 불러오지 못했습니다.")
    else:
        try:
            result = chart_result.json()["chart"]["result"][0]
            meta = result["meta"]
            current = meta.get("regularMarketPrice")
            previous = meta.get("chartPreviousClose") or meta.get("previousClose")
            change = current - previous if current is not None and previous is not None else None
            quote = {"price": current, "previous_close": previous, "change": change, "currency": meta.get("currency", "KRW"), "as_of": meta.get("regularMarketTime")}
        except (KeyError, IndexError, TypeError, ValueError):
            errors.append("시세 정보를 해석하지 못했습니다.")
    if isinstance(news_result, Exception):
        errors.append("최근 뉴스를 불러오지 못했습니다.")
    else:
        try:
            news = _parse_news(news_result.text)
        except ET.ParseError:
            errors.append("최근 뉴스 형식을 해석하지 못했습니다.")

    payload = {"ticker": ticker, "symbol": symbol, "quote": quote, "news": news, "updated_at": now.isoformat(), "errors": errors}
    _cache[cache_key] = (now, payload)
    return payload


_intraday_cache: dict[str, tuple[datetime, dict[str, Any]]] = {}
_intraday_ttl = timedelta(seconds=30)

_beta_cache: dict[str, tuple[datetime, dict[str, Any]]] = {}
_beta_ttl = timedelta(minutes=15)

_kospi_history_cache: dict[str, tuple[datetime, dict[str, Any]]] = {}
_kospi_history_ttl = timedelta(days=30)


@router.get("/kospi-history")
async def kospi_history(
    start: date = Query(description="조회 시작일(YYYY-MM-DD)"),
    end: date = Query(description="조회 종료일(YYYY-MM-DD, 미포함)"),
) -> dict[str, Any]:
    """Return historical KOSPI daily closes for the educational case-study chart."""
    if start >= end or (end - start).days > 370:
        raise HTTPException(status_code=400, detail="조회 기간은 최대 370일이며 시작일은 종료일보다 앞서야 합니다.")

    cache_key = f"{start.isoformat()}:{end.isoformat()}"
    now = datetime.now(timezone.utc)
    cached = _kospi_history_cache.get(cache_key)
    if cached and now - cached[0] < _kospi_history_ttl:
        return cached[1]

    kst = timezone(timedelta(hours=9))
    period1 = int(datetime.combine(start, datetime.min.time(), tzinfo=kst).timestamp())
    period2 = int(datetime.combine(end, datetime.min.time(), tzinfo=kst).timestamp())
    chart_url = f"https://query2.finance.yahoo.com/v8/finance/chart/%5EKS11?period1={period1}&period2={period2}&interval=1d"
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            response = await client.get(chart_url, headers={"User-Agent": "FinanceRagLab/1.0 (educational use)"})
            response.raise_for_status()
        result = response.json()["chart"]["result"][0]
        timestamps = result.get("timestamp") or []
        closes = result["indicators"]["quote"][0].get("close") or []
        bars = [
            {"time": timestamp * 1000, "close": close}
            for timestamp, close in zip(timestamps, closes)
            if close is not None
        ]
    except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError) as exc:
        raise HTTPException(status_code=502, detail="KOSPI 과거 종가를 불러오지 못했습니다.") from exc

    if not bars:
        raise HTTPException(status_code=502, detail="표시할 KOSPI 종가 데이터가 없습니다.")

    payload = {
        "symbol": "^KS11",
        "start": start.isoformat(),
        "end": end.isoformat(),
        "bars": bars,
        "source": "Yahoo Finance",
        "updated_at": now.isoformat(),
    }
    _kospi_history_cache[cache_key] = (now, payload)
    return payload


_kospi200_history_cache: dict[str, tuple[datetime, dict[str, Any]]] = {}
_kospi200_history_ttl = timedelta(minutes=30)


@router.get("/kospi200-history")
async def kospi200_history(
    start: date = Query(description="조회 시작일(YYYY-MM-DD)"),
    end: date = Query(description="조회 종료일(YYYY-MM-DD, 미포함)"),
) -> dict[str, Any]:
    """Return historical KOSPI 200 index daily closes for the futures-basis educational tool.

    This is the real KOSPI 200 *spot index* only. KRX futures prices are not
    available from a free, unauthenticated feed, so the basis tool combines
    this real spot series with a user-adjustable theoretical futures estimate.
    """
    if start >= end or (end - start).days > 180:
        raise HTTPException(status_code=400, detail="조회 기간은 최대 180일이며 시작일은 종료일보다 앞서야 합니다.")

    cache_key = f"{start.isoformat()}:{end.isoformat()}"
    now = datetime.now(timezone.utc)
    cached = _kospi200_history_cache.get(cache_key)
    if cached and now - cached[0] < _kospi200_history_ttl:
        return cached[1]

    kst = timezone(timedelta(hours=9))
    period1 = int(datetime.combine(start, datetime.min.time(), tzinfo=kst).timestamp())
    period2 = int(datetime.combine(end, datetime.min.time(), tzinfo=kst).timestamp())
    chart_url = f"https://query2.finance.yahoo.com/v8/finance/chart/%5EKS200?period1={period1}&period2={period2}&interval=1d"
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            response = await client.get(chart_url, headers={"User-Agent": "FinanceRagLab/1.0 (educational use)"})
            response.raise_for_status()
        result = response.json()["chart"]["result"][0]
        timestamps = result.get("timestamp") or []
        closes = result["indicators"]["quote"][0].get("close") or []
        bars = [
            {"time": timestamp * 1000, "close": close}
            for timestamp, close in zip(timestamps, closes)
            if close is not None
        ]
    except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError) as exc:
        raise HTTPException(status_code=502, detail="KOSPI 200 지수 종가를 불러오지 못했습니다.") from exc

    if not bars:
        raise HTTPException(status_code=502, detail="표시할 KOSPI 200 지수 데이터가 없습니다.")

    payload = {
        "symbol": "^KS200",
        "start": start.isoformat(),
        "end": end.isoformat(),
        "bars": bars,
        "source": "Yahoo Finance",
        "updated_at": now.isoformat(),
    }
    _kospi200_history_cache[cache_key] = (now, payload)
    return payload


@router.get("/intraday")
async def intraday_chart(
    ticker: str = Query(pattern=r"^\d{6}$"),
    market: str = Query(pattern=r"^(KOSPI|KOSDAQ)$"),
) -> dict[str, Any]:
    """Return today's 1-minute bars from Yahoo Finance, cached for 30 seconds.

    This is the finest granularity available from a free, unauthenticated feed.
    It is not tick-by-tick trade data — real per-trade ticks require a paid KRX
    feed or an authenticated broker API (e.g. KIS Developers, Kiwoom Open API+).
    """
    cache_key = f"{ticker}:{market}"
    now = datetime.now(timezone.utc)
    cached = _intraday_cache.get(cache_key)
    if cached and now - cached[0] < _intraday_ttl:
        return cached[1]

    symbol = f"{ticker}.{'KS' if market == 'KOSPI' else 'KQ'}"
    chart_url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?range=1d&interval=1m"
    bars: list[dict[str, Any]] = []
    meta_out: dict[str, Any] = {}
    error: str | None = None
    try:
        async with httpx.AsyncClient(timeout=6.0, follow_redirects=True) as client:
            response = await client.get(chart_url, headers={"User-Agent": "FinanceRagLab/1.0 (educational use)"})
            response.raise_for_status()
        result = response.json()["chart"]["result"][0]
        meta = result["meta"]
        timestamps = result.get("timestamp") or []
        quote = result["indicators"]["quote"][0]
        opens, highs = quote.get("open") or [], quote.get("high") or []
        lows, closes = quote.get("low") or [], quote.get("close") or []
        volumes = quote.get("volume") or []
        for i, ts in enumerate(timestamps):
            o = opens[i] if i < len(opens) else None
            h = highs[i] if i < len(highs) else None
            l = lows[i] if i < len(lows) else None
            c = closes[i] if i < len(closes) else None
            if o is None or h is None or l is None or c is None:
                continue
            v = volumes[i] if i < len(volumes) and volumes[i] is not None else 0
            bars.append({"time": datetime.fromtimestamp(ts, tz=timezone.utc).isoformat(), "open": o, "high": h, "low": l, "close": c, "volume": v})
        meta_out = {
            "price": meta.get("regularMarketPrice"),
            "previous_close": meta.get("chartPreviousClose") or meta.get("previousClose"),
            "currency": meta.get("currency", "KRW"),
            "market_state": meta.get("marketState"),
            "exchange_name": meta.get("exchangeName"),
        }
        if not bars:
            error = "장중이 아니거나 표시할 분봉 데이터가 없습니다."
    except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError):
        error = "분봉 데이터를 불러오지 못했습니다."

    payload = {"ticker": ticker, "symbol": symbol, "market": market, "bars": bars, "meta": meta_out, "updated_at": now.isoformat(), "error": error}
    _intraday_cache[cache_key] = (now, payload)
    return payload


@router.get("/history")
def price_history(
    ticker: str = Query(pattern=r"^\d{6}$"),
    market: str = Query(pattern=r"^(KOSPI|KOSDAQ)$"),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Return cached daily OHLCV history for a ticker from PostgreSQL, if any has been backfilled.

    This never reaches out to Yahoo Finance itself — it only reports what is
    already stored, so the frontend can enable a "과거 데이터 보기" button only
    when real historical data exists.
    """
    rows = (
        db.query(StockPriceHistory)
        .filter(StockPriceHistory.ticker == ticker, StockPriceHistory.market == market)
        .order_by(StockPriceHistory.date.asc())
        .all()
    )
    bars = [
        {
            "date": row.date.isoformat(),
            "open": float(row.open),
            "high": float(row.high),
            "low": float(row.low),
            "close": float(row.close),
            "volume": int(row.volume or 0),
        }
        for row in rows
    ]
    return {"ticker": ticker, "market": market, "available": len(bars) > 0, "count": len(bars), "bars": bars}


@router.get("/beta")
async def market_beta(
    ticker: str = Query(pattern=r"^\d{6}$"),
    market: str = Query(pattern=r"^(KOSPI|KOSDAQ)$"),
) -> dict[str, Any]:
    """Estimate a stock's 60-trading-day beta against the KOSPI 200.

    Beta is calculated from matched daily close-to-close returns, not today's
    intraday bars, so the value is less sensitive to a single session's noise.
    """
    cache_key = f"{ticker}:{market}"
    now = datetime.now(timezone.utc)
    cached = _beta_cache.get(cache_key)
    if cached and now - cached[0] < _beta_ttl:
        return cached[1]

    symbol = f"{ticker}.{'KS' if market == 'KOSPI' else 'KQ'}"
    # Six months normally provides more than 60 common Korean trading days.
    stock_url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?range=6mo&interval=1d"
    benchmark_url = "https://query1.finance.yahoo.com/v8/finance/chart/%5EKS200?range=6mo&interval=1d"

    try:
        async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
            stock_response, benchmark_response = await _fetch_all(client, stock_url, benchmark_url)
        if isinstance(stock_response, Exception) or isinstance(benchmark_response, Exception):
            raise ValueError("price fetch failed")

        def close_by_date(response: httpx.Response) -> dict[date, float]:
            result = response.json()["chart"]["result"][0]
            timestamps = result.get("timestamp") or []
            closes = result["indicators"]["quote"][0].get("close") or []
            return {
                datetime.fromtimestamp(timestamp, tz=timezone.utc).date(): float(close)
                for timestamp, close in zip(timestamps, closes)
                if close is not None and float(close) > 0
            }

        stock_closes = close_by_date(stock_response)
        benchmark_closes = close_by_date(benchmark_response)
        common_dates = sorted(set(stock_closes) & set(benchmark_closes))
        returns: list[tuple[float, float]] = []
        for previous, current in zip(common_dates, common_dates[1:]):
            # Only consecutive observations are used; this excludes unmatched holidays.
            if (current - previous).days > 4:
                continue
            stock_return = stock_closes[current] / stock_closes[previous] - 1
            benchmark_return = benchmark_closes[current] / benchmark_closes[previous] - 1
            returns.append((stock_return, benchmark_return))
        returns = returns[-60:]
        if len(returns) < 30:
            raise ValueError("insufficient matched returns")

        stock_mean = sum(item[0] for item in returns) / len(returns)
        benchmark_mean = sum(item[1] for item in returns) / len(returns)
        covariance = sum((stock - stock_mean) * (benchmark - benchmark_mean) for stock, benchmark in returns)
        variance = sum((benchmark - benchmark_mean) ** 2 for _, benchmark in returns)
        if variance == 0:
            raise ValueError("zero benchmark variance")
        beta = covariance / variance
        payload = {
            "ticker": ticker,
            "market": market,
            "benchmark": "KOSPI 200",
            "window": len(returns),
            "beta": round(beta, 2),
            "updated_at": now.isoformat(),
            "error": None,
        }
    except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError, ZeroDivisionError):
        payload = {
            "ticker": ticker,
            "market": market,
            "benchmark": "KOSPI 200",
            "window": 0,
            "beta": None,
            "updated_at": now.isoformat(),
            "error": "베타를 계산할 충분한 일별 시세를 불러오지 못했습니다.",
        }

    _beta_cache[cache_key] = (now, payload)
    return payload


async def _fetch_all(client: httpx.AsyncClient, chart_url: str, news_url: str) -> tuple[httpx.Response | Exception, httpx.Response | Exception]:
    async def fetch(url: str) -> httpx.Response | Exception:
        try:
            response = await client.get(url, headers={"User-Agent": "FinanceRagLab/1.0 (educational use)"})
            response.raise_for_status()
            return response
        except httpx.HTTPError as exc:
            return exc

    import asyncio
    chart, news = await asyncio.gather(fetch(chart_url), fetch(news_url))
    return chart, news
