"""Read-only market snapshots for the learning-oriented company atlas."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import quote_plus
import xml.etree.ElementTree as ET

import httpx
from fastapi import APIRouter, HTTPException, Query

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
