"""DART(금융감독원 전자공시) 재무제표 클라이언트 — 알트먼 Z-Score 입력값 전용.

lumina-invest `app/services/dart.py`(2026-10-12 실측 규약)에서 Z-Score 에 필요한 부분만 이식했다.
  - 모든 응답이 HTTP 200 이고 성공·실패는 본문 `status` 로 온다(`000` 정상 · `010/011` 키 오류 · `013` 자료 없음 ·
    `020` 한도 초과 · `800` 점검).
  - 고유번호(`corp_code`)는 `corpCode.xml` 이 ZIP 으로 내려온다 → 압축을 풀어 종목코드 매핑을 만들고 프로세스 메모리에 30일 캐시.
  - 재무제표는 `fnlttSinglAcntAll.json` 의 계정 행. 재무상태표 항목은 반드시 `sj_div == BS` 로 한정한다(자본총계는 SCE 에도 있다).
  - 분기 보고서: `thstrm_amount` = 당기 3개월, `thstrm_add_amount` = 당기 누적. 사업보고서(11011): `thstrm_amount` 가 연간.

Z-Score 에 더 필요한 세 계정(유동자산·유동부채·이익잉여금)을 추가했다. 계정명이 없으면 None 으로 두고 추정하지 않는다.
키가 없으면 `is_enabled()` 가 False 이고 호출자는 수집을 건너뛴다.
"""
from __future__ import annotations

import asyncio
import io
import logging
import re
import time
import zipfile
from typing import Any
from xml.etree import ElementTree

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

BASE = "https://opendart.fss.or.kr/api"
TIMEOUT = 20.0
CORP_CODE_TTL_SECONDS = 30 * 24 * 3600

REPRT_CODES = {1: "11013", 2: "11012", 3: "11014", 4: "11011"}
REPRT_NAMES = {"11013": "1분기보고서", "11012": "반기보고서", "11014": "3분기보고서", "11011": "사업보고서"}

# 재무상태표(BS) 계정. 회사마다 표기가 조금씩 달라 후보를 여러 개 둔다(_norm 으로 공백 제거 후 비교).
BS_TARGETS: dict[str, tuple[str, ...]] = {
    "assets": ("자산총계",),
    "liabilities": ("부채총계",),
    "equity": ("자본총계",),
    "currentAssets": ("유동자산", "유동자산합계"),
    "currentLiabilities": ("유동부채", "유동부채합계"),
    # 결손 상태의 회사는 "이익잉여금(결손금)" 또는 "결손금" 으로 표기한다. "결손금" 계정은 양수로 적힌 결손액이므로 부호를 뒤집는다.
    "retainedEarnings": ("이익잉여금", "이익잉여금(결손금)", "미처분이익잉여금", "이익잉여금(결손금)합계"),
    "deficit": ("결손금", "미처리결손금", "결손금합계"),
}
# 손익계산서(IS/CIS) 계정. 누적 칸은 TTM 계산용.
IS_TARGETS: dict[str, tuple[str, ...]] = {
    # 실측(2026-10-15 HLB 028300 CFS 반기): 적자 회사는 "영업손실" 로 오고 금액은 이미 음수다.
    "operatingIncome": ("영업이익", "영업이익(손실)", "영업손익", "영업손실", "영업이익(손실)합계"),
    "revenue": ("매출액", "수익(매출액)", "영업수익", "매출"),
}
SE_KIND = {"보통주": "common", "종류주": "preferred", "우선주": "preferred", "합계": "total"}


class DartError(Exception):
    def __init__(self, status: str, message: str):
        super().__init__(f"[{status}] {message}")
        self.status = status
        self.message = message


def api_key() -> str:
    return str(getattr(settings, "dart_api_key", "") or "").strip()


def is_enabled() -> bool:
    return bool(api_key())


def base_stock_code(code: str) -> tuple[str, bool]:
    """우선주 코드 → 보통주 코드. KRX 보통주는 끝자리 0(005935 삼성전자우 → 005930). (보통주 코드, 우선주 여부)."""
    c = str(code or "")
    if re.fullmatch(r"\d{6}", c) and c[-1] != "0":
        return c[:5] + "0", True
    return c, False


def _norm(name: Any) -> str:
    return re.sub(r"\s+", "", str(name or ""))


def parse_amount(row: dict, *keys: str) -> int | None:
    """DART 금액은 문자열이고 쉼표·음수 괄호·'-' 가 섞여 온다."""
    for key in keys:
        raw = str(row.get(key) or "").strip()
        if not raw or raw in ("-", "–"):
            continue
        neg = raw.startswith("(") and raw.endswith(")")
        cleaned = re.sub(r"[^0-9\-]", "", raw)
        if not cleaned or cleaned == "-":
            continue
        try:
            value = int(cleaned)
        except ValueError:
            continue
        return -value if neg and value > 0 else value
    return None


async def _get(path: str, params: dict) -> httpx.Response:
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.get(f"{BASE}/{path}", params={**params, "crtfc_key": api_key()})
    resp.raise_for_status()
    return resp


_json_cache: dict[tuple, tuple[float, dict]] = {}
_request_day = ""
_request_count = 0


async def _get_json(path: str, params: dict) -> dict:
    # Quarterly statements change slowly. Recalculate hourly without fetching
    # the same reports repeatedly; reserve the shared key's quota for FD too.
    global _request_day, _request_count
    key = (path, tuple(sorted(params.items())))
    cached = _json_cache.get(key)
    if cached and time.monotonic() - cached[0] < 24 * 3600:
        body = cached[1]
    else:
        day = time.strftime("%Y-%m-%d", time.gmtime())
        if day != _request_day:
            _request_day, _request_count = day, 0
        if _request_count >= 4000:
            raise DartError("020", "PR 수집기 일일 호출 예산(4000건) 도달")
        _request_count += 1
        await asyncio.sleep(0.2)
        body = (await _get(path, params)).json()
        if str(body.get("status")) in ("000", "013"):
            if len(_json_cache) >= 4000:
                _json_cache.clear()
            _json_cache[key] = (time.monotonic(), body)
    status = str(body.get("status") or "")
    if status and status != "000":
        raise DartError(status, str(body.get("message") or "알 수 없는 오류"))
    return body


_corp_cache: dict[str, Any] = {"map": None, "at": 0.0}
_corp_lock = asyncio.Lock()


async def corp_code_map() -> dict[str, str]:
    """종목코드(6자리) → DART 고유번호(8자리). ZIP 을 풀어 만들고 프로세스 메모리에 30일 캐시."""
    if _corp_cache["map"] and time.time() - _corp_cache["at"] < CORP_CODE_TTL_SECONDS:
        return _corp_cache["map"]
    async with _corp_lock:
        if _corp_cache["map"] and time.time() - _corp_cache["at"] < CORP_CODE_TTL_SECONDS:
            return _corp_cache["map"]
        resp = await _get("corpCode.xml", {})
        head = resp.content[:200].decode("utf-8", "replace")
        if "<status>" in head and "<status>000</status>" not in head:
            status = re.search(r"<status>(\d+)</status>", head)
            message = re.search(r"<message>([^<]*)</message>", head)
            raise DartError(status.group(1) if status else "900", message.group(1) if message else "고유번호 조회 실패")
        with zipfile.ZipFile(io.BytesIO(resp.content)) as zf:
            xml = zf.read(zf.namelist()[0])
        mapping = parse_corp_codes(xml)
        _corp_cache.update(map=mapping, at=time.time())
        logger.info("DART 고유번호 %d개 적재", len(mapping))
        return mapping


def parse_corp_codes(xml: bytes) -> dict[str, str]:
    mapping: dict[str, str] = {}
    for item in ElementTree.fromstring(xml).iter("list"):
        stock = (item.findtext("stock_code") or "").strip()
        corp = (item.findtext("corp_code") or "").strip()
        if stock and corp and re.fullmatch(r"\d{6}", stock):
            mapping[stock] = corp
    return mapping


async def resolve_corp(code: str) -> tuple[str, str, bool] | None:
    """종목코드 → (고유번호, 조회에 쓴 보통주 코드, 우선주 여부). 없으면 None."""
    if not re.fullmatch(r"\d{6}", str(code or "")) or not is_enabled():
        return None
    mapping = await corp_code_map()
    if mapping.get(code):
        return mapping[code], code, False
    base, preferred = base_stock_code(code)
    if preferred and mapping.get(base):
        return mapping[base], base, True
    return None


def parse_statements(rows: list[dict], reprt_code: str = "") -> dict[str, Any]:
    """계정 행 → Z-Score 입력 계정. 같은 계정이 여러 번 나오면 첫 값을 쓴다.

    사업보고서(11011)는 손익 `thstrm_amount` 가 연간이라 누적 칸이 비어 있다 → 연간 값을 누적으로 쓴다.
    결과 키: assets·liabilities·equity·currentAssets·currentLiabilities·retainedEarnings·operatingIncome·revenue,
    그리고 TTM 용 opCumulative·opPrevCumulative·revenueCumulative·revenuePrevCumulative, 기준 표시용 opBasis·periodName.
    """
    annual = reprt_code == "11011"
    out: dict[str, Any] = {k: None for k in (*BS_TARGETS, *IS_TARGETS)}
    out.update(opCumulative=None, opPrevCumulative=None, revenueCumulative=None, revenuePrevCumulative=None,
               opBasis=None, periodName=None)
    bs_names = {key: {_norm(n) for n in names} for key, names in BS_TARGETS.items()}
    is_names = {key: {_norm(n) for n in names} for key, names in IS_TARGETS.items()}
    for row in rows:
        div = str(row.get("sj_div") or "").upper()
        name = _norm(row.get("account_nm"))
        if div == "BS":
            for key, names in bs_names.items():
                if out[key] is None and name in names:
                    out[key] = parse_amount(row, "thstrm_amount")
        elif div in ("IS", "CIS"):
            for key, names in is_names.items():
                if out[key] is None and name in names:
                    value = parse_amount(row, "thstrm_amount")
                    basis = "연간" if annual else "3개월"
                    if value is None:
                        value = parse_amount(row, "thstrm_add_amount")
                        basis = "누적"
                    out[key] = value
                    if value is None:
                        continue
                    prefix = "op" if key == "operatingIncome" else "revenue"
                    out[f"{prefix}Cumulative"] = value if annual else parse_amount(row, "thstrm_add_amount")
                    out[f"{prefix}PrevCumulative"] = parse_amount(row, "frmtrm_amount") if annual else parse_amount(row, "frmtrm_add_amount")
                    if key == "operatingIncome":
                        out["opBasis"] = basis
                        out["periodName"] = str(row.get("thstrm_nm") or "").strip() or None
    # 이익잉여금이 없고 결손금만 있으면 결손액(양수)의 부호를 뒤집어 이익잉여금으로 쓴다.
    if out["retainedEarnings"] is None and out["deficit"] is not None:
        out["retainedEarnings"] = -abs(out["deficit"])
        out["retainedEarningsBasis"] = "결손금 부호 반전"
    else:
        out["retainedEarningsBasis"] = "이익잉여금" if out["retainedEarnings"] is not None else None
    out.pop("deficit", None)
    return out


async def fetch_financials(code: str, year: int, quarter: int) -> dict[str, Any] | None:
    """한 보고서의 Z-Score 입력 계정. 연결(CFS)을 먼저 보고 없으면 별도(OFS). 해당 보고서가 없으면 None."""
    resolved = await resolve_corp(code)
    if not resolved:
        return None
    corp, base_code, preferred = resolved
    reprt = REPRT_CODES[quarter]
    for fs_div in ("CFS", "OFS"):
        try:
            body = await _get_json("fnlttSinglAcntAll.json", {
                "corp_code": corp, "bsns_year": str(year), "reprt_code": reprt, "fs_div": fs_div,
            })
        except DartError as exc:
            if exc.status == "013":
                continue
            raise
        parsed = parse_statements(body.get("list") or [], reprt)
        if parsed.get("assets") is None and parsed.get("operatingIncome") is None:
            continue
        return {
            **parsed,
            "corpCode": corp, "stockCode": base_code, "isPreferred": preferred,
            "year": year, "quarter": quarter, "reportCode": reprt,
            "reportName": REPRT_NAMES.get(reprt, reprt),
            "fsDiv": "연결" if fs_div == "CFS" else "별도",
            "source": "금융감독원 전자공시(DART) fnlttSinglAcntAll",
        }
    return None


def report_candidates(now_year: int, now_month: int, lookback: int = 5) -> list[tuple[int, int]]:
    """현재 분기 직전부터 거슬러 올라가는 (연도, 분기) 후보. 분기 공시는 분기 말 후 45일(사업보고서 90일) 뒤에 올라온다."""
    year, quarter = now_year, (now_month - 1) // 3 + 1
    out: list[tuple[int, int]] = []
    for _ in range(lookback):
        quarter -= 1
        if quarter == 0:
            year, quarter = year - 1, 4
        out.append((year, quarter))
    return out


async def latest_financials(code: str, now_year: int, now_month: int) -> dict[str, Any] | None:
    """가장 최근 공시된 보고서를 뒤에서부터 찾는다. 키·한도·점검 오류(010/011/020/800)는 더 시도해도 같으므로 바로 올린다."""
    for year, quarter in report_candidates(now_year, now_month):
        try:
            found = await fetch_financials(code, year, quarter)
        except DartError as exc:
            if exc.status in ("010", "011", "020", "800"):
                raise
            logger.warning("DART 조회 실패 %s %dY%dQ: %s", code, year, quarter, exc)
            continue
        if found:
            return found
    return None


def ttm_amount(latest: dict, prev_annual: dict | None, key: str) -> tuple[int | None, str]:
    """최근 4개 분기 합(TTM). 사업보고서면 연간 그대로, 분·반기면 당기 누적 + 전기 연간 − 전기 동기간 누적.
    셋 중 하나라도 없으면 (None, 사유) — 연환산 같은 추정은 하지 않는다. key: operatingIncome·revenue."""
    label = {"operatingIncome": "영업이익", "revenue": "매출액"}.get(key, key)
    if latest.get("quarter") == 4:
        value = latest.get(key)
        return (value, "연간") if value is not None else (None, f"{label} 없음")
    prefix = "op" if key == "operatingIncome" else "revenue"
    cum, prev_cum = latest.get(f"{prefix}Cumulative"), latest.get(f"{prefix}PrevCumulative")
    prev_year = (prev_annual or {}).get(key)
    if cum is None:
        return None, f"당기 누적 {label} 없음"
    if prev_year is None or prev_cum is None:
        return None, f"전기 사업보고서 {label} 또는 전기 동기간 누적 없음"
    return cum + prev_year - prev_cum, "최근 4개 분기 합산(TTM)"


def parse_shares(rows: list[dict]) -> dict[str, int] | None:
    """stockTotqySttus 행 → {common, preferred, total}. 발행주식 총수(istc_totqy) 기준."""
    out: dict[str, int] = {}
    for row in rows:
        kind = SE_KIND.get(_norm(row.get("se")))
        if not kind:
            continue
        value = parse_amount(row, "istc_totqy")
        if value is not None and kind not in out:
            out[kind] = value
    if "total" not in out and ("common" in out or "preferred" in out):
        out["total"] = out.get("common", 0) + out.get("preferred", 0)
    return out if out.get("total") else None


async def shares_outstanding(code: str, year: int, quarter: int) -> dict[str, Any] | None:
    """보고서 기준 발행주식수. 같은 보고서가 없으면 None — 다른 기간 값으로 메우지 않는다."""
    resolved = await resolve_corp(code)
    if not resolved:
        return None
    corp = resolved[0]
    try:
        body = await _get_json("stockTotqySttus.json", {"corp_code": corp, "bsns_year": str(year), "reprt_code": REPRT_CODES[quarter]})
    except DartError as exc:
        if exc.status == "013":
            return None
        raise
    parsed = parse_shares(body.get("list") or [])
    return {**parsed, "year": year, "quarter": quarter, "source": "금융감독원 전자공시(DART) stockTotqySttus"} if parsed else None
