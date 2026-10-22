"""종목 보기 재무건전성(알트먼 Z-Score) 수집기 — 한 시간에 한 종목.

왜 이렇게 하나
  DART 재무제표는 분기 공시라 실시간 조회가 의미 없고, 200종목을 한 번에 긁으면 키 한도(일 20,000건)를 lumina 와 나눠 쓰는 데 부담이 된다.
  그래서 API 프로세스 안에서 `interval` 마다 **한 종목만** 수집해 `stock_financial_health` 에 upsert 하고, 화면은 DB 만 읽는다.
  200종목 한 바퀴 ≈ 8.3일. 금융업(적용 제외)은 DART 를 부르지 않고 바로 기록하므로 시간 슬롯을 쓰지 않는다.

순서
  1. 아직 행이 없는 종목(종목 보기 일차·카드 순서) → 2. 가장 오래전에 계산한 종목.
종목 목록은 frontend/app.js 의 COMPANY_ATLAS·COMPANY_TICKERS 가 정본이다(app/ops/backfill_ohlcv.py 와 같은 방식).

종목당 DART 호출: 최신 보고서 탐색 1~5회(연결→별도 폴백 포함 ≤10) + 전기 사업보고서 1~2회 + 발행주식수 1회.
시가총액 = 발행주식수(보통주, 최신 보고서 기준) × 최근 종가(stock_price_history, 없으면 Yahoo 5일 차트의 마지막 종가).
"""
from __future__ import annotations

import asyncio
import logging
import re
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.stock_financial_health import StockFinancialHealth
from app.models.stock_price_history import StockPriceHistory
from app.services import altman, dart_client

logger = logging.getLogger(__name__)

APP_JS_PATH = Path(__file__).resolve().parents[2] / "frontend" / "app.js"
KST = timezone(timedelta(hours=9))


# ── 종목 목록(app.js 정본) ─────────────────────────────────────────────────────────

def _extract_block(source: str, var_name: str) -> str:
    marker = f"const {var_name} = Object.fromEntries(Object.entries({{"
    start = source.index(marker) + len(marker)
    end = source.index("}).map(", start)
    return source[start:end]


def parse_companies(source: str | None = None) -> list[dict[str, Any]]:
    """[{ticker, market, name, sector, day, index}] — 일차·카드 순서. 같은 종목이 여러 일차에 있으면 첫 것만."""
    text = source if source is not None else APP_JS_PATH.read_text(encoding="utf-8")
    atlas_block = _extract_block(text, "COMPANY_ATLAS")
    tickers_block = _extract_block(text, "COMPANY_TICKERS")
    atlas_days: dict[str, list[list[str]]] = {}
    for m in re.finditer(r"(\d+):\s*`([^`]*)`", atlas_block):
        atlas_days[m.group(1)] = [row.split("|") for row in m.group(2).strip().splitlines() if row.strip()]
    ticker_days: dict[str, list[str]] = {}
    for m in re.finditer(r"(\d+):\s*'([^']*)'", tickers_block):
        ticker_days[m.group(1)] = m.group(2).split()
    seen: set[str] = set()
    out: list[dict[str, Any]] = []
    theory_path = APP_JS_PATH.parent / "assets" / "theory-data.js"
    visible_days = set(re.findall(r"day:\s*(\d+)", theory_path.read_text())) if theory_path.exists() else set(atlas_days)
    for day in sorted(atlas_days, key=int):
        if day not in visible_days:
            continue
        codes = ticker_days.get(day, [])
        for index, (row, code) in enumerate(zip(atlas_days[day], codes)):
            if len(row) < 3 or code in seen:
                continue
            seen.add(code)
            out.append({"ticker": code, "market": row[0].strip(), "name": row[1].strip(), "sector": row[2].strip(),
                        "day": int(day), "index": index})
    return out


def pick_next(companies: list[dict[str, Any]], rows: dict[str, datetime | None]) -> dict[str, Any] | None:
    """rows: ticker → computed_at(없으면 키 자체가 없음). 미수집 먼저, 그다음 가장 오래된 것."""
    for company in companies:
        if company["ticker"] not in rows:
            return company
    if not companies:
        return None
    return min(companies, key=lambda c: rows.get(c["ticker"]) or datetime.min.replace(tzinfo=timezone.utc))


# ── 시세 ───────────────────────────────────────────────────────────────────────

def latest_close_from_db(db: Session, ticker: str, market: str) -> tuple[float, date] | None:
    row = db.execute(
        select(StockPriceHistory.close, StockPriceHistory.date)
        .where(StockPriceHistory.ticker == ticker, StockPriceHistory.market == market, StockPriceHistory.close.isnot(None))
        .order_by(StockPriceHistory.date.desc()).limit(1)
    ).first()
    return (float(row[0]), row[1]) if row else None


async def latest_close_from_yahoo(ticker: str, market: str) -> tuple[float, date] | None:
    symbol = f"{ticker}.{'KS' if market == 'KOSPI' else 'KQ'}"
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?range=5d&interval=1d"
    try:
        async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
            resp = await client.get(url, headers={"User-Agent": "FinanceRagLab/1.0 (educational use)"})
            resp.raise_for_status()
            result = resp.json()["chart"]["result"][0]
        closes = result["indicators"]["quote"][0].get("close") or []
        stamps = result.get("timestamp") or []
        for ts, close in zip(reversed(stamps), reversed(closes)):
            if close is not None:
                return float(close), datetime.fromtimestamp(ts, tz=KST).date()
    except Exception as exc:  # noqa: BLE001 — 시세는 보조 입력, 실패해도 수집은 계속
        logger.info("Yahoo 종가 조회 실패 %s: %s", symbol, exc)
    return None


# ── 수집 ───────────────────────────────────────────────────────────────────────

async def build_record(company: dict[str, Any], db: Session, now: datetime | None = None) -> dict[str, Any]:
    """한 종목의 저장 행(dict). DART 를 호출한다(적용 제외 산업은 호출하지 않음)."""
    now = now or datetime.now(KST)
    model = altman.model_for_sector(company["sector"])
    base: dict[str, Any] = {
        "ticker": company["ticker"], "market": company["market"], "name": company["name"], "sector": company["sector"],
        "model": model, "zone": None, "z": None, "ok": False, "reason": None, "source": None,
        "fiscal_year": None, "quarter": None, "report_name": None, "fs_div": None,
        "assets": None, "liabilities": None, "equity": None, "current_assets": None, "current_liabilities": None,
        "retained_earnings": None, "retained_earnings_basis": None, "operating_income_ttm": None, "operating_income_basis": None,
        "revenue_ttm": None, "revenue_basis": None, "shares_total": None, "close_used": None, "close_date": None, "market_cap": None,
        "x1": None, "x2": None, "x3": None, "x4": None, "x5": None, "computed_at": now,
    }
    if model == altman.MODEL_EXCLUDED:
        result = altman.compute({}, model)
        return {**base, "zone": result["zone"], "reason": result["reason"], "source": "산업 분류(종목 보기 카드)"}

    code = dart_client.base_stock_code(company["ticker"])[0]
    try:
        latest = await dart_client.latest_financials(code, now.year, now.month)
    except dart_client.DartError as exc:
        return {**base, "reason": f"DART 오류 {exc}"}
    except (httpx.HTTPError, ValueError) as exc:
        return {**base, "reason": f"DART 통신 실패: {exc}"}
    if not latest:
        return {**base, "reason": "DART 에 최근 5개 분기 보고서가 없습니다."}

    prev_annual = None
    if latest["quarter"] != 4:
        try:
            prev_annual = await dart_client.fetch_financials(code, latest["year"] - 1, 4)
        except (dart_client.DartError, httpx.HTTPError, ValueError) as exc:
            logger.info("전기 사업보고서 조회 실패 %s: %s", code, exc)
    op_ttm, op_basis = dart_client.ttm_amount(latest, prev_annual, "operatingIncome")
    rev_ttm, rev_basis = dart_client.ttm_amount(latest, prev_annual, "revenue")

    shares = None
    close = None
    market_cap = None
    if model == altman.MODEL_Z:
        try:
            shares = await dart_client.shares_outstanding(code, latest["year"], latest["quarter"])
        except (dart_client.DartError, httpx.HTTPError, ValueError) as exc:
            logger.info("발행주식수 조회 실패 %s: %s", code, exc)
        close = latest_close_from_db(db, company["ticker"], company["market"]) or await latest_close_from_yahoo(company["ticker"], company["market"])
        share_count = (shares or {}).get("common") or (shares or {}).get("total")
        if share_count and close:
            market_cap = int(share_count * close[0])

    inputs = {
        "assets": latest.get("assets"), "liabilities": latest.get("liabilities"), "equity": latest.get("equity"),
        "currentAssets": latest.get("currentAssets"), "currentLiabilities": latest.get("currentLiabilities"),
        "retainedEarnings": latest.get("retainedEarnings"), "operatingIncomeTtm": op_ttm, "revenueTtm": rev_ttm, "marketCap": market_cap,
    }
    result = altman.compute(inputs, model)
    comps = result["components"]
    return {
        **base,
        "zone": result["zone"], "z": result["z"], "ok": result["ok"], "reason": result["reason"],
        "source": latest.get("source"),
        "fiscal_year": latest["year"], "quarter": latest["quarter"], "report_name": latest["reportName"], "fs_div": latest["fsDiv"],
        "assets": inputs["assets"], "liabilities": inputs["liabilities"], "equity": inputs["equity"],
        "current_assets": inputs["currentAssets"], "current_liabilities": inputs["currentLiabilities"],
        "retained_earnings": inputs["retainedEarnings"], "retained_earnings_basis": latest.get("retainedEarningsBasis"),
        "operating_income_ttm": op_ttm, "operating_income_basis": op_basis, "revenue_ttm": rev_ttm, "revenue_basis": rev_basis,
        "shares_total": ((shares or {}).get("common") or (shares or {}).get("total")) if shares else None,
        "close_used": close[0] if close else None, "close_date": close[1] if close else None, "market_cap": market_cap,
        "x1": comps.get("x1"), "x2": comps.get("x2"), "x3": comps.get("x3"), "x4": comps.get("x4"), "x5": comps.get("x5"),
    }


def upsert(db: Session, record: dict[str, Any]) -> None:
    stmt = pg_insert(StockFinancialHealth).values(**record)
    update_cols = {k: getattr(stmt.excluded, k) for k in record if k not in ("ticker", "market")}
    db.execute(stmt.on_conflict_do_update(constraint="uq_stock_financial_health_ticker_market", set_=update_cols))
    db.commit()


def existing_rows(db: Session) -> dict[str, datetime | None]:
    return {t: c for t, c in db.execute(select(StockFinancialHealth.ticker, StockFinancialHealth.computed_at)).all()}


async def collect_one(company: dict[str, Any]) -> dict[str, Any]:
    db = SessionLocal()
    try:
        record = await build_record(company, db)
        upsert(db, record)
        return record
    finally:
        db.close()


async def collect_next() -> dict[str, Any] | None:
    """미수집·가장 오래된 종목 하나를 수집한다. 적용 제외 산업은 DART 없이 즉시 기록하고 다음 종목으로 넘어간다."""
    companies = parse_companies()
    db = SessionLocal()
    try:
        rows = existing_rows(db)
    finally:
        db.close()
    for _ in range(len(companies) + 1):
        company = pick_next(companies, rows)
        if not company:
            return None
        record = await collect_one(company)
        rows[company["ticker"]] = record["computed_at"]
        if record["model"] != altman.MODEL_EXCLUDED:
            logger.info("재무건전성 수집 %s %s: model=%s zone=%s z=%s reason=%s",
                        company["ticker"], company["name"], record["model"], record["zone"], record["z"], record["reason"])
            return record
    return None


async def run_forever() -> None:
    """API 기동 시 백그라운드 태스크. 키가 없으면 바로 종료한다."""
    if not dart_client.is_enabled():
        logger.warning("DART_API_KEY 없음 — 재무건전성 수집기 비활성")
        return
    interval = max(60, int(settings.financial_health_interval_seconds))
    await asyncio.sleep(max(0, int(settings.financial_health_startup_delay_seconds)))
    logger.info("재무건전성 수집기 시작: %d초 주기로 홈 전체 종목", interval)
    while True:
        started = asyncio.get_running_loop().time()
        companies = parse_companies()
        for company in companies:
            try:
                record = await collect_one(company)
                logger.info("재무건전성 수집 %s: zone=%s z=%s reason=%s", company["ticker"], record["zone"], record["z"], record["reason"])
            except asyncio.CancelledError:
                raise
            except Exception:
                logger.exception("재무건전성 종목 수집 실패 %s", company["ticker"])
            await asyncio.sleep(0.5)
        logger.info("재무건전성 전체 수집 완료: %d종목", len(companies))
        await asyncio.sleep(max(1, interval - (asyncio.get_running_loop().time() - started)))
