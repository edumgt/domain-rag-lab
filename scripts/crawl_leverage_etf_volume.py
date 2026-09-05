#!/usr/bin/env python3
"""Build the Day 2 leveraged/inverse ETF trading-value chart data.

Pulls real monthly OHLCV bars for the two most heavily traded KOSPI200
leveraged/inverse-2X ETFs from the public Naver Finance chart endpoint, and
derives each month's combined trading value (거래대금 = 거래량 x 종가). This
mirrors crawl_etf_catalog.py: fetch public data once, write a static JSON
asset so the learning page does not call an external API from the browser.

Run it whenever the learning data needs to be refreshed:

    python3 scripts/crawl_leverage_etf_volume.py
"""

from __future__ import annotations

import json
import re
import time
from datetime import date
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "frontend" / "days" / "assets" / "leverage-etf-volume.json"
CHART_URL = (
    "https://api.finance.naver.com/siseJson.naver"
    "?symbol={code}&requestType=1&startTime=20240901&endTime={end}&timeframe=month"
)
HEADERS = {"User-Agent": "domain-rag-lab-learning-catalog/1.0 (+educational use)"}

# The two dominant KOSPI200 leveraged / inverse-2X ETFs by trading volume.
INSTRUMENTS = [
    {"code": "122630", "name": "KODEX 레버리지"},
    {"code": "252670", "name": "KODEX 200선물인버스2X"},
]

ROW_RE = re.compile(
    r'\["(\d{8})"\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*(\d+)\s*,'
)


def fetch_monthly_bars(code: str) -> list[dict]:
    url = CHART_URL.format(code=code, end=date.today().strftime("%Y%m%d"))
    for attempt in range(3):
        try:
            response = requests.get(url, headers=HEADERS, timeout=15)
            response.raise_for_status()
            text = response.content.decode("euc-kr", errors="ignore")
            break
        except requests.RequestException:
            if attempt == 2:
                return []
            time.sleep(0.4 * (attempt + 1))
    else:
        return []

    bars = []
    for month_str, _open, _high, _low, close, volume in ROW_RE.findall(text):
        bars.append(
            {
                "month": f"{month_str[0:4]}-{month_str[4:6]}",
                "close": float(close),
                "volume": int(volume),
            }
        )
    return bars


def main() -> None:
    per_instrument = {item["code"]: fetch_monthly_bars(item["code"]) for item in INSTRUMENTS}

    # Keep the most recent 12 monthly bars that every instrument reported.
    common_months = None
    for bars in per_instrument.values():
        months = {bar["month"] for bar in bars}
        common_months = months if common_months is None else (common_months & months)
    ordered_months = sorted(common_months)[-12:]

    combined_value_100m = []  # 억원 단위 (1억 = 100,000,000원)
    for month in ordered_months:
        total_won = 0.0
        for bars in per_instrument.values():
            bar = next((b for b in bars if b["month"] == month), None)
            if bar:
                total_won += bar["close"] * bar["volume"]
        combined_value_100m.append(round(total_won / 100_000_000))

    document = {
        "updatedAt": date.today().isoformat(),
        "instruments": INSTRUMENTS,
        "source": "https://finance.naver.com (siseJson.naver, timeframe=month)",
        "unit": "억원 (월별 종가 x 거래량으로 추정한 거래대금 합계)",
        "months": ordered_months,
        "combinedTradingValue100M": combined_value_100m,
        "notes": [
            "국내에서 거래량이 가장 많은 KOSPI200 레버리지·인버스2X ETF 2종의 합산 수치입니다.",
            "거래대금은 월간 캔들의 종가 x 거래량으로 추정한 값이며, 거래소가 발표하는 공식 거래대금과 다를 수 있습니다.",
            "가장 최근 달은 조회 시점까지의 부분월 데이터일 수 있습니다.",
        ],
    }
    OUTPUT.write_text(json.dumps(document, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"wrote {OUTPUT.relative_to(ROOT)} with {len(ordered_months)} months")


if __name__ == "__main__":
    main()
