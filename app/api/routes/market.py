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
