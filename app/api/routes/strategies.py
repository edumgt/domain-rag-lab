"""전략 스펙 API (/backtests/strategies) — lumina-invest 종목 선정 화면·사이클이 호출한다.

인증: 환경변수 STRATEGY_API_KEY 가 설정되어 있으면 X-API-Key 헤더가 일치하거나, pr 로그인 세션의 Bearer 토큰(auth.current_user 와 같은
세션 테이블)이 유효해야 한다. 비어 있으면(개발) 공개. Bearer 허용은 LEAN 백테스트 화면의 「이 조건을 전략 스펙으로 저장」(브라우저에서
API 키 없이 export)을 위한 것이다(v0.6).
계약서: docs/contracts/kis-autotrade-api.md 1절.
"""
from __future__ import annotations

import hmac
import os

from datetime import date

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field

from app.schemas.chat import BacktestRequest
from app.schemas.strategy import AcceptanceCriteria, PositionSizing, SignalWeights, StrategyListResponse, StrategySpec, StrategyVersionsResponse
from app.services import strategy_export, strategy_store
from app.services.lean_backtest_service import LeanBacktestError, LeanBacktestService

_service = LeanBacktestService()


class StrategyExportRequest(BaseModel):
    """백테스트를 실행하고 합격하면 전략 스펙으로 저장한다. 실패(불합격)도 파일은 남기되 422."""

    strategy_id: str = Field(pattern=r"^[a-z0-9_]{3,40}$")
    name: str | None = Field(default=None, max_length=80)
    universe: list[str] = Field(min_length=1, max_length=50, description="KRX 6자리 코드. 비우면 backtest.ticker 1종목")
    backtest: BacktestRequest
    criteria: AcceptanceCriteria = Field(default_factory=AcceptanceCriteria)
    signal_weights: SignalWeights = Field(default_factory=SignalWeights)
    position_sizing: PositionSizing = Field(default_factory=PositionSizing)

router = APIRouter(prefix="/backtests/strategies", tags=["strategies"])


def _bearer_session_valid(token: str) -> bool:
    """pr 로그인 세션 토큰이 유효한지. auth.current_user 와 같은 규칙(세션 존재 + 만료 전). DB 는 필요할 때만 연다."""
    from datetime import datetime, timezone

    from app.core.database import SessionLocal
    from app.models.user import UserSession

    db = SessionLocal()
    try:
        session = db.query(UserSession).filter(UserSession.token == token).first()
        return bool(session and session.expires_at >= datetime.now(timezone.utc))
    except Exception:   # DB 미연결 등 — 키 인증만 유효
        return False
    finally:
        db.close()


def require_strategy_api_key(x_api_key: str | None = Header(default=None), authorization: str | None = Header(default=None)) -> None:
    expected = os.environ.get("STRATEGY_API_KEY", "").strip()
    if not expected:
        return
    if x_api_key and hmac.compare_digest(x_api_key.strip(), expected):
        return
    if authorization and authorization.startswith("Bearer ") and _bearer_session_valid(authorization[7:].strip()):
        return
    raise HTTPException(status_code=401, detail="X-API-Key 헤더 또는 pr 로그인(Bearer 세션)이 필요합니다.")


@router.get("", response_model=StrategyListResponse, dependencies=[Depends(require_strategy_api_key)])
def list_strategies() -> StrategyListResponse:
    return StrategyListResponse(strategies=strategy_store.list_passed())


@router.get("/{strategy_id}/versions", response_model=StrategyVersionsResponse, dependencies=[Depends(require_strategy_api_key)])
def strategy_versions(strategy_id: str) -> StrategyVersionsResponse:
    """모든 버전(불합격 포함)과 판정 사유 — lumina 전략설정 「버전 이력」. 파일이 하나도 없으면 404."""
    specs = strategy_store.list_versions(strategy_id)
    if not specs:
        raise HTTPException(status_code=404, detail="해당 전략의 스펙 파일이 없습니다.")
    latest_passed = max((s.version for s in specs if s.acceptance.passed), default=None)
    return StrategyVersionsResponse(
        strategy_id=strategy_id, latest_passed_version=latest_passed,
        versions=[{"version": s.version, "name": s.name, "passed": s.acceptance.passed, "failed": s.acceptance.failed,
                   "universe_size": len(s.universe), "entry": s.entry, "backtest_result": s.backtest_result, "created_at": s.created_at} for s in specs],
    )


@router.get("/{strategy_id}", response_model=StrategySpec, dependencies=[Depends(require_strategy_api_key)])
def latest_strategy(strategy_id: str) -> StrategySpec:
    spec = strategy_store.latest_passed(strategy_id)
    if spec is None:
        raise HTTPException(status_code=404, detail="합격한 전략 스펙이 없습니다.")
    return spec


@router.get("/{strategy_id}/versions/{version}", response_model=StrategySpec, dependencies=[Depends(require_strategy_api_key)])
def strategy_version(strategy_id: str, version: int) -> StrategySpec:
    spec = strategy_store.load(strategy_id, version)
    if spec is None:
        raise HTTPException(status_code=404, detail="해당 버전의 전략 스펙이 없습니다.")
    return spec


@router.post("", response_model=StrategySpec, status_code=201, dependencies=[Depends(require_strategy_api_key)])
def export_strategy(payload: StrategyExportRequest) -> StrategySpec:
    try:
        result = _service.run(**payload.backtest.model_dump())
    except LeanBacktestError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    result_dict = result.model_dump() if hasattr(result, "model_dump") else dict(result)
    spec = strategy_export.export_spec(
        request=payload.backtest, result=result_dict, strategy_id=payload.strategy_id, name=payload.name,
        universe=payload.universe, version=strategy_store.next_version(payload.strategy_id),
        criteria=payload.criteria, signal_weights=payload.signal_weights, position_sizing=payload.position_sizing,
    )
    if not spec.acceptance.passed:
        raise HTTPException(status_code=422, detail={"message": "합격 기준 미달로 전략이 노출되지 않습니다 (파일은 보존).", "failed": spec.acceptance.failed, "spec": spec.model_dump(mode="json")})
    return spec


class StrategyRevalidateRequest(BaseModel):
    """기존 스펙의 규칙·파라미터로 백테스트를 다시 돌려 새 버전을 만든다 (기간·종목만 바꿀 수 있음)."""

    ticker: str | None = Field(default=None, max_length=12)
    start_date: date | None = None
    end_date: date | None = None
    criteria: AcceptanceCriteria | None = None


@router.post("/{strategy_id}/revalidate", response_model=StrategySpec, status_code=201, dependencies=[Depends(require_strategy_api_key)])
def revalidate_strategy(strategy_id: str, payload: StrategyRevalidateRequest) -> StrategySpec:
    base = strategy_store.latest_passed(strategy_id)
    if base is None:
        raise HTTPException(status_code=404, detail="합격한 전략 스펙이 없습니다.")
    try:
        request = strategy_export.request_from_spec(base, ticker=payload.ticker, start_date=payload.start_date, end_date=payload.end_date)
        result = _service.run(**request.model_dump())
    except (ValueError, LeanBacktestError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    result_dict = result.model_dump() if hasattr(result, "model_dump") else dict(result)
    spec = strategy_export.export_spec(
        request=request, result=result_dict, strategy_id=strategy_id, name=base.name, universe=base.universe,
        version=strategy_store.next_version(strategy_id), criteria=payload.criteria or base.acceptance.criteria,
        signal_weights=base.signal_weights, position_sizing=base.position_sizing,
    )
    if not spec.acceptance.passed:
        raise HTTPException(status_code=422, detail={"message": "재검증 불합격. 이전 합격 버전이 계속 노출됩니다.", "failed": spec.acceptance.failed, "spec": spec.model_dump(mode="json")})
    return spec
