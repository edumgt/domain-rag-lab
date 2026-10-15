from fastapi import APIRouter, HTTPException

from app.schemas.chat import BacktestRequest, BacktestResponse
from app.services.lean_backtest_service import LeanBacktestError, LeanBacktestService

router = APIRouter(prefix="/backtests", tags=["backtests"])
service = LeanBacktestService()


@router.post("/run", response_model=BacktestResponse)
def run_backtest(payload: BacktestRequest):
    try:
        return service.run(**payload.model_dump())
    except LeanBacktestError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail="백테스트 실행 중 외부 데이터 또는 LEAN 실행 오류가 발생했습니다.") from exc


@router.post('/precheck')
def precheck_backtest(payload: BacktestRequest):
    from app.services.backtest_preconditions import check_preconditions
    try:
        return check_preconditions(payload, service)
    except Exception as exc:
        raise HTTPException(status_code=502, detail='사전 조건 확인용 가격 데이터를 확보하지 못했습니다. 실행을 중단하고 다시 확인하세요.') from exc

from typing import Literal
from pydantic import Field, ConfigDict


class ResearchRequest(BacktestRequest):
    model_config = ConfigDict(allow_inf_nan=False)
    market_scope: Literal['us','kr','global'] = 'us'
    fee_bps: float = Field(default=5, ge=0, le=100)
    slippage_bps: float = Field(default=5, ge=0, le=200)
    stop_loss_pct: float = Field(default=10, ge=0, le=90)
    position_pct: float = Field(default=100, gt=0, le=100)
    trend_filter: bool = False
    trend_window: int = Field(default=60, ge=5, le=250)


@router.post('/research')
def research_backtest(payload: ResearchRequest):
    from app.services.backtest_research import research
    try:
        return research(payload, service)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    except Exception as exc:
        raise HTTPException(502, '연구 검증 데이터 또는 계산을 확인하지 못했습니다. 입력과 데이터 상태를 확인하세요.') from exc
