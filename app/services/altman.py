"""알트먼 Z-Score — 순수 계산(네트워크·DB 의존 없음).

모델
  Z  (1968 원식, 상장 제조업) = 1.2·X1 + 1.4·X2 + 3.3·X3 + 0.6·X4 + 1.0·X5
       안전 > 2.99 · 회색 1.81~2.99 · 위험 < 1.81
  Z'' (1995, 비제조·신흥시장)  = 6.56·X1 + 3.26·X2 + 6.72·X3 + 1.05·X4b
       안전 > 2.6 · 회색 1.1~2.6 · 위험 < 1.1
  X1 = (유동자산 − 유동부채) / 자산총계      X2 = 이익잉여금 / 자산총계
  X3 = 영업이익(TTM, EBIT 근사) / 자산총계   X4 = 시가총액 / 부채총계   X4b = 자본총계(장부) / 부채총계
  X5 = 매출액(TTM) / 자산총계
적용 제외: 금융·보험·증권 — 유동/비유동 구분이 없고 부채 구조가 달라 Z 가 무의미하다.

산업 라벨(종목 보기 카드의 sector 문자열) → 모델 매핑은 `MODEL_BY_SECTOR`. 미지정 산업은 Z''(시가총액·매출 불필요라 결측에 강함).
입력이 하나라도 없으면 계산하지 않고 사유를 돌려준다 — 추정·보간하지 않는다.
"""
from __future__ import annotations

from typing import Any

MODEL_Z = "Z"
MODEL_Z2 = "Z''"
MODEL_EXCLUDED = "EXCLUDED"

ZONE_SAFE, ZONE_GREY, ZONE_DISTRESS, ZONE_EXCLUDED = "safe", "grey", "distress", "excluded"
ZONE_LABELS = {ZONE_SAFE: "안전", ZONE_GREY: "회색", ZONE_DISTRESS: "위험", ZONE_EXCLUDED: "금융업 제외"}

THRESHOLDS = {MODEL_Z: (1.81, 2.99), MODEL_Z2: (1.1, 2.6)}
WEIGHTS = {
    MODEL_Z: {"x1": 1.2, "x2": 1.4, "x3": 3.3, "x4": 0.6, "x5": 1.0},
    MODEL_Z2: {"x1": 6.56, "x2": 3.26, "x3": 6.72, "x4": 1.05},
}
COMPONENT_LABELS = {
    "x1": "운전자본 / 총자산",
    "x2": "이익잉여금 / 총자산",
    "x3": "영업이익(TTM) / 총자산",
    "x4": "시가총액 / 총부채",
    "x4b": "자본총계 / 총부채",
    "x5": "매출액(TTM) / 총자산",
}

EXCLUDED_SECTORS = {"금융", "보험", "증권", "증권·금융", "은행", "카드", "캐피탈"}
MANUFACTURING_SECTORS = {
    "반도체", "반도체장비", "반도체소재", "반도체부품", "반도체후공정", "전자·가전", "전자부품", "전자소재", "디스플레이소재", "LED·부품",
    "배터리", "배터리소재", "배터리장비", "배터리재활용", "배터리진단", "전지", "전해액",
    "자동차", "자동차부품", "산업재", "조선", "정밀장비", "검사장비", "자동화장비", "자동화", "로봇", "로봇부품",
    "전력·원전", "전력기기", "전력·부품", "원전", "방산", "방산·항공", "방산·철도", "방산·소재",
    "소재", "에너지·소재", "태양광·소재", "비철금속", "에너지", "환경",
    "식품", "식품·해운", "화장품", "화장품ODM", "화장품·소재", "의류", "소비재",
    "제약", "백신", "바이오CDMO", "진단", "미용의료기기", "미용·바이오",
}


def model_for_sector(sector: str | None) -> str:
    s = str(sector or "").strip()
    if s in EXCLUDED_SECTORS:
        return MODEL_EXCLUDED
    if s in MANUFACTURING_SECTORS:
        return MODEL_Z
    return MODEL_Z2


def zone_for(model: str, z: float) -> str:
    low, high = THRESHOLDS[model]
    if z < low:
        return ZONE_DISTRESS
    if z > high:
        return ZONE_SAFE
    return ZONE_GREY


def _ratio(numer: float | int | None, denom: float | int | None) -> float | None:
    if numer is None or denom is None or denom == 0:
        return None
    return float(numer) / float(denom)


def compute(inputs: dict[str, Any], model: str) -> dict[str, Any]:
    """inputs: assets·liabilities·equity·currentAssets·currentLiabilities·retainedEarnings·operatingIncomeTtm·revenueTtm·marketCap.

    반환: {"ok": bool, "model", "z", "zone", "components": {x1..}, "contributions": {...}, "missing": [...], "reason": str|None}
    """
    if model == MODEL_EXCLUDED:
        return {"ok": False, "model": model, "z": None, "zone": ZONE_EXCLUDED, "components": {}, "contributions": {},
                "missing": [], "reason": "금융업은 알트먼 Z-Score 적용 대상이 아닙니다."}
    if model not in WEIGHTS:
        raise ValueError(f"unknown model {model}")

    assets = inputs.get("assets")
    liabilities = inputs.get("liabilities")
    working_capital = None
    if inputs.get("currentAssets") is not None and inputs.get("currentLiabilities") is not None:
        working_capital = inputs["currentAssets"] - inputs["currentLiabilities"]

    components: dict[str, float | None] = {
        "x1": _ratio(working_capital, assets),
        "x2": _ratio(inputs.get("retainedEarnings"), assets),
        "x3": _ratio(inputs.get("operatingIncomeTtm"), assets),
    }
    if model == MODEL_Z:
        components["x4"] = _ratio(inputs.get("marketCap"), liabilities)
        components["x5"] = _ratio(inputs.get("revenueTtm"), assets)
    else:
        components["x4"] = _ratio(inputs.get("equity"), liabilities)

    missing_names = {
        "x1": "유동자산·유동부채", "x2": "이익잉여금", "x3": "영업이익(TTM)",
        "x4": "시가총액·부채총계" if model == MODEL_Z else "자본총계·부채총계", "x5": "매출액(TTM)",
    }
    if assets in (None, 0):
        missing = ["자산총계"]
    else:
        missing = [missing_names[k] for k, v in components.items() if v is None]
    if missing:
        rounded = {k: (round(v, 4) if v is not None else None) for k, v in components.items()}
        return {"ok": False, "model": model, "z": None, "zone": None, "components": rounded, "contributions": {},
                "missing": missing, "reason": "입력 계정 없음: " + ", ".join(missing)}

    weights = WEIGHTS[model]
    contributions = {k: round(weights[k] * components[k], 4) for k in weights}
    z = round(sum(contributions.values()), 2)
    return {"ok": True, "model": model, "z": z, "zone": zone_for(model, z), "components": {k: round(v, 4) for k, v in components.items()},
            "contributions": contributions, "missing": [], "reason": None}


def describe(model: str, zone: str | None, z: float | None) -> str:
    """배지·모달용 한 줄 설명."""
    if zone == ZONE_EXCLUDED:
        return "금융업은 부채 구조가 달라 Z-Score 를 적용하지 않습니다."
    if z is None or zone is None:
        return "재무제표 계정이 부족해 Z-Score 를 계산하지 못했습니다."
    low, high = THRESHOLDS[model]
    if zone == ZONE_SAFE:
        return f"{model} = {z:.2f} > {high} — 단기 부실 가능성이 낮은 구간입니다."
    if zone == ZONE_DISTRESS:
        return f"{model} = {z:.2f} < {low} — 재무적 어려움 신호가 있는 구간입니다. 유동성·수익성 추이를 함께 보세요."
    return f"{model} = {z:.2f} ({low}~{high}) — 판단을 유보하는 회색 지대입니다."
