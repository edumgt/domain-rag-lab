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
