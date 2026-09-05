#!/usr/bin/env python3
"""Build the Day 2 Korean ETF catalogue.

The script intentionally keeps its sources separate: the public Naver Finance
ETF list supplies the whole market list and its three-month return field, while
the public composition response supplies the most recent disclosed holdings.
Run it whenever the learning data needs to be refreshed:

    python3 scripts/crawl_etf_catalog.py

It writes a static JSON asset so the learning page does not make hundreds of
browser-side requests when a learner opens the catalogue.
"""

from __future__ import annotations

import json
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date
from pathlib import Path

import requests


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "frontend" / "days" / "assets" / "etf-catalog.json"
LIST_URL = "https://finance.naver.com/api/sise/etfItemList.nhn"
COMPOSITION_URL = "https://wts-info-api.tossinvest.com/api/v2/stock-infos/A{code}/compositions"
HEADERS = {"User-Agent": "domain-rag-lab-learning-catalog/1.0 (+educational use)"}

BRANDS = {
    "KODEX": {"manager": "삼성자산운용", "site": "https://www.samsungfund.com"},
    "TIGER": {"manager": "미래에셋자산운용", "site": "https://investments.miraeasset.com/tigeretf/ko/main/index.do"},
    "ACE": {"manager": "한국투자신탁운용", "site": "https://www.aceetf.co.kr"},
    "RISE": {"manager": "KB자산운용", "site": "https://www.riseetf.co.kr"},
    "SOL": {"manager": "신한자산운용", "site": "https://www.soletf.com"},
    "PLUS": {"manager": "한화자산운용", "site": "https://www.plusetf.co.kr"},
    "KIWOOM": {"manager": "키움투자자산운용", "site": "https://www.kiwoometf.com"},
    "HANARO": {"manager": "NH-아문디자산운용", "site": "https://www.hanaroetf.com"},
}


def brand_for(name: str) -> str | None:
    upper = name.upper()
    return next((brand for brand in BRANDS if upper.startswith(f"{brand} ")), None)


def classify(name: str) -> tuple[str, str]:
    """Return a cautious, name-based asset class and investment theme label."""
    upper = name.upper()
    if any(token in name for token in ("머니마켓", "단기자금", "CD금리", "KOFR", "국고채", "회사채", "채권", "통안채")):
        return "채권·현금성", "금리·채권"
    if any(token in name for token in ("금", "은", "원유", "농산물", "구리", "원자재")):
        return "원자재", "원자재"
    if any(token in upper for token in ("S&P", "NASDAQ", "NYSE", "MSCI", "미국", "GLOBAL", "GLOBAL", "일본", "중국", "유럽", "인도", "베트남", "TAIWAN")):
        return "해외주식", theme_for(name)
    return "국내주식·혼합", theme_for(name)


def theme_for(name: str) -> str:
    for token, theme in (
        ("반도체", "반도체"), ("AI", "AI·소프트웨어"), ("2차전지", "2차전지"),
        ("바이오", "헬스케어·바이오"), ("헬스", "헬스케어·바이오"),
        ("금융", "금융"), ("은행", "금융"), ("자동차", "자동차"),
        ("조선", "조선·방산"), ("방산", "조선·방산"), ("에너지", "에너지"),
        ("고배당", "배당"), ("DIVIDEND", "배당"), ("리츠", "리츠"),
    ):
        if token in name.upper():
            return theme
    return "시장지수·다중섹터"


def get_json(url: str) -> dict:
    for attempt in range(3):
        try:
            response = requests.get(url, headers=HEADERS, timeout=15)
            response.raise_for_status()
            return response.json()
        except (requests.RequestException, ValueError):
            if attempt == 2:
                return {}
            time.sleep(0.4 * (attempt + 1))
    return {}


def fetch_holdings(item: dict) -> dict:
    payload = get_json(COMPOSITION_URL.format(code=item["itemcode"]))
    # Some cash, derivative, or newly listed ETFs have no composition payload.
    # Keep those rows in the complete catalogue rather than aborting the refresh.
    result = payload.get("result") or {}
    holdings = [
        {"name": row.get("name", ""), "weight": row.get("ratio")}
        for row in result.get("items", [])
        if row.get("name") and row.get("name") not in {"그 외", "기타"}
    ][:5]
    asset_class, theme = classify(item["itemname"])
    brand = brand_for(item["itemname"])
    return {
        "code": item["itemcode"],
        "name": item["itemname"],
        "brand": brand,
        "manager": BRANDS[brand]["manager"],
        "managerSite": BRANDS[brand]["site"],
        "price": item.get("nowVal"),
        "return3m": item.get("threeMonthEarnRate"),
        "assetClass": asset_class,
        "theme": theme,
        "holdingsAsOf": result.get("endDate"),
        "topHoldings": holdings,
        "detailUrl": f"https://finance.naver.com/item/main.naver?code={item['itemcode']}",
    }


def main() -> None:
    raw = requests.get(LIST_URL, headers=HEADERS, timeout=20)
    raw.raise_for_status()
    # The endpoint is CP949/EUC-KR even though its response header is not stable.
    listing = json.loads(raw.content.decode("cp949"))
    selected = [item for item in listing["result"]["etfItemList"] if brand_for(item["itemname"])]
    selected.sort(key=lambda item: (brand_for(item["itemname"]), item["itemname"]))

    records: list[dict] = []
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(fetch_holdings, item) for item in selected]
        for future in as_completed(futures):
            records.append(future.result())
    records.sort(key=lambda item: (item["brand"], item["name"]))

    document = {
        "updatedAt": date.today().isoformat(),
        "count": len(records),
        "sources": {
            "returns": "https://finance.naver.com/api/sise/etfItemList.nhn",
            "holdings": "https://wts-info-api.tossinvest.com/api/v2/stock-infos/A{code}/compositions",
            "officialDisclosure": "https://data.krx.co.kr/contents/MDC/MAIN/main/index.cmd?locale=ko_KR",
        },
        "notes": [
            "최근 3개월 수익률은 공개 시세 목록의 조회 시점 값입니다.",
            "상위 편입종목과 비중은 각 응답의 기준일 값이며 매일 바뀔 수 있습니다.",
            "채권·원자재·파생형 ETF는 개별 주식 대신 채권·선물·현금성 자산을 편입할 수 있습니다.",
            "섹터는 상품명 기반의 학습용 보조 분류입니다. 실제 구성은 운용사·KRX PDF를 확인하세요.",
        ],
        "items": records,
    }
    OUTPUT.write_text(json.dumps(document, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"wrote {OUTPUT.relative_to(ROOT)} with {len(records)} ETF records")


if __name__ == "__main__":
    main()
