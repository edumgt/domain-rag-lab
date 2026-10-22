"""30분마다 한 종목을 수집·분석·반영하는 재무건전성 수집기.

DART 공시 응답은 24시간 캐시하고 프로세스당 일일 호출을 4000건으로 제한한다.
종목 목록은 홈의 theory-data.js에 표시되는 일차와 app.js의 기업·티커 매핑을 사용한다.
"""
from __future__ import annotations

import asyncio
import logging
import re
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import httpx
from sqlalchemy import select, text as sql_text
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
    """미수집·가장 오래된 종목 정확히 하나만 처리한다(금융업 제외 판정 포함)."""
    companies = parse_companies()
    db = SessionLocal()
    try:
        rows = existing_rows(db)
    finally:
        db.close()
    company = pick_next(companies, rows)
    return await collect_one(company) if company else None


def seconds_until_due(rows: dict[str, datetime | None], interval: int, now: datetime) -> float:
    timestamps = [value for value in rows.values() if value]
    if not timestamps:
        return 0
    return max(0, interval - (now - max(timestamps)).total_seconds())


async def collect_if_due(interval: int) -> float:
    """DB 갱신 시각으로 재시작 후 주기를 이어가며, 워커 간 중복 실행을 막는다."""
    lock_db = SessionLocal()
    try:
        locked = lock_db.execute(sql_text("SELECT pg_try_advisory_xact_lock(724031802)")).scalar()
        if not locked:
            return 30
        remaining = seconds_until_due(existing_rows(lock_db), interval, datetime.now(timezone.utc))
        if remaining > 0:
            return remaining
        record = await collect_next()
        if record:
            logger.warning("재무건전성 파이프라인 반영: %s %s model=%s zone=%s z=%s reason=%s",
                           record["ticker"], record["name"], record["model"], record["zone"], record["z"], record["reason"])
        return interval
    finally:
        # Closing rolls back the lock transaction, releasing the advisory lock.
        lock_db.close()


async def run_forever() -> None:
    """API 기동 시 백그라운드 태스크. 키가 없으면 바로 종료한다."""
    if not dart_client.is_enabled():
        logger.warning("DART_API_KEY 없음 — 재무건전성 수집기 비활성")
        return
    interval = max(60, int(settings.financial_health_interval_seconds))
    await asyncio.sleep(max(0, int(settings.financial_health_startup_delay_seconds)))
    logger.warning("재무건전성 수집기 시작: %d초마다 한 종목 (DB 시각 기준 재개)", interval)
    while True:
        try:
            delay = await collect_if_due(interval)
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("재무건전성 파이프라인 실패 — 다음 주기에 재시도")
            delay = interval
        await asyncio.sleep(max(1, delay))
