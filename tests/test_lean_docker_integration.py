"""샘플 전략 1개 LEAN Docker 백테스트 통합 테스트. LEAN 이미지와 Docker 가 있을 때만 실행(CI·개발 PC 기본 skip)."""
import os
import shutil
import subprocess
import unittest
from datetime import date

from app.core.config import settings


def _lean_image_available() -> bool:
    if not shutil.which("docker"):
        return False
    try:
        out = subprocess.run(["docker", "images", "-q", settings.lean_docker_image], capture_output=True, text=True, timeout=20).stdout.strip()
    except Exception:
        return False
    return bool(out)


@unittest.skipUnless(os.environ.get("RUN_LEAN_INTEGRATION") == "1" and _lean_image_available(),
                     "RUN_LEAN_INTEGRATION=1 과 로컬 LEAN Docker 이미지가 있을 때만 실행")
class LeanDockerIntegrationTests(unittest.TestCase):
    def test_sample_ma_cross_backtest_runs_and_exports_spec(self):
        from app.schemas.chat import BacktestRequest
        from app.services import strategy_export, strategy_store
        from app.services.lean_backtest_service import LeanBacktestService

        request = BacktestRequest(ticker="005930.KS", start_date=date(2024, 1, 2), end_date=date(2025, 12, 30),
                                  compare_start_date=date(2024, 1, 2), compare_end_date=date(2025, 12, 30),
                                  strategy="ma_cross", short_window=5, long_window=20)
        result = LeanBacktestService().run(**request.model_dump())
        self.assertIn("trade_count", result)
        spec = strategy_export.build_spec(request=request, result=result, strategy_id="it_ma_cross_kr", name=None,
                                          universe=["005930"], version=strategy_store.next_version("it_ma_cross_kr"))
        self.assertEqual(spec.entry.params, {"short_window": 5, "long_window": 20})


if __name__ == "__main__":
    unittest.main()
