"""전략 스펙 API: 합격 전략만 노출, 버전 조회, X-API-Key, export(백테스트 모킹)."""
import os
import unittest
from datetime import date, datetime
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.schemas.strategy import (
    Acceptance, BacktestPeriod, BacktestResultSummary, SignalRule, StrategySpec, evaluate_acceptance,
)
from app.services import strategy_store


def _spec(sid="ma_cross_kr", version=1, passed=True, ret=12.0, mdd=-14.0, trades=48) -> StrategySpec:
    summary = BacktestResultSummary(period=BacktestPeriod(start=date(2021, 1, 1), end=date(2026, 9, 30)),
                                    annualized_return_pct=ret, max_drawdown_pct=mdd, sharpe_ratio=0.9, trade_count=trades)
    return StrategySpec(
        strategy_id=sid, version=version, name="MA", universe=["005930.KS", "000660"],
        entry=SignalRule(indicator="ma_cross", params={"short_window": 20, "long_window": 60}, condition="short_above_long"),
        exit=SignalRule(indicator="ma_cross", params={"short_window": 20, "long_window": 60}, condition="short_below_long"),
        backtest_result=summary, acceptance=Acceptance(passed=passed, failed=[] if passed else ["x"]),
        created_at=datetime(2026, 10, 2, 12, 0),
    )


class StrategyApiTests(unittest.TestCase):
    def setUp(self):
        import tempfile

        self.tmp = tempfile.TemporaryDirectory()
        os.environ["STRATEGY_STORE_DIR"] = self.tmp.name
        os.environ.pop("STRATEGY_API_KEY", None)
        # app.main 은 import 시 DB/Qdrant 에 연결하므로 전략 라우터만 올린 독립 앱으로 검증한다.
        from fastapi import FastAPI

        from app.api.routes.strategies import router

        test_app = FastAPI()
        test_app.include_router(router)
        self.client = TestClient(test_app)

    def tearDown(self):
        self.tmp.cleanup()
        os.environ.pop("STRATEGY_STORE_DIR", None)
        os.environ.pop("STRATEGY_API_KEY", None)

    def test_universe_is_normalized_and_acceptance_rules(self):
        spec = _spec()
        self.assertEqual(spec.universe, ["005930", "000660"])
        ok = evaluate_acceptance(spec.backtest_result)
        self.assertTrue(ok.passed)
        bad = evaluate_acceptance(_spec(ret=-1.0, mdd=-25.0, trades=3).backtest_result)
        self.assertFalse(bad.passed)
        self.assertEqual(len(bad.failed), 3)

    def test_only_latest_passed_version_is_listed(self):
        strategy_store.save(_spec(version=1))
        strategy_store.save(_spec(version=2))
        strategy_store.save(_spec(version=3, passed=False))
        strategy_store.save(_spec(sid="bad_only", version=1, passed=False))

        listed = self.client.get("/backtests/strategies").json()["strategies"]
        self.assertEqual([(s["strategy_id"], s["version"]) for s in listed], [("ma_cross_kr", 2)])

        latest = self.client.get("/backtests/strategies/ma_cross_kr").json()
        self.assertEqual(latest["version"], 2)
        self.assertEqual(self.client.get("/backtests/strategies/ma_cross_kr/versions/3").json()["acceptance"]["passed"], False)
        self.assertEqual(self.client.get("/backtests/strategies/bad_only").status_code, 404)
        self.assertEqual(self.client.get("/backtests/strategies/nope/versions/9").status_code, 404)
        self.assertEqual(strategy_store.next_version("ma_cross_kr"), 4)

    def test_api_key_required_when_configured(self):
        os.environ["STRATEGY_API_KEY"] = "secret"
        self.assertEqual(self.client.get("/backtests/strategies").status_code, 401)
        self.assertEqual(self.client.get("/backtests/strategies", headers={"X-API-Key": "wrong"}).status_code, 401)
        self.assertEqual(self.client.get("/backtests/strategies", headers={"X-API-Key": "secret"}).status_code, 200)

    def test_export_runs_backtest_and_saves_passed_spec(self):
        fake = {"ticker": "005930.KS", "engine": "lean", "strategy": "ma_cross", "strategy_label": "x", "strategy_return_pct": 30,
                "benchmark_return_pct": 10, "comparison_return_pct": 1, "outperformance_pct": 20, "max_drawdown_pct": -12.5,
                "annualized_return_pct": 9.1, "annualized_volatility_pct": 15, "sharpe_ratio": 0.8, "invested_days_pct": 60,
                "trade_count": 41, "market_snapshot": {}}
        body = {"strategy_id": "ma_cross_kr", "universe": ["005930.KS"], "backtest": {
            "ticker": "005930.KS", "start_date": "2021-01-01", "end_date": "2026-09-30",
            "compare_start_date": "2021-01-01", "compare_end_date": "2026-09-30", "strategy": "ma_cross", "short_window": 10, "long_window": 50}}
        with patch("app.api.routes.strategies._service.run", return_value=fake) as run:
            response = self.client.post("/backtests/strategies", json=body)
        self.assertEqual(response.status_code, 201, response.text)
        spec = response.json()
        run.assert_called_once()
        self.assertEqual(spec["version"], 1)
        self.assertEqual(spec["entry"]["params"], {"short_window": 10, "long_window": 50})
        self.assertTrue(spec["acceptance"]["passed"])
        self.assertEqual(self.client.get("/backtests/strategies/ma_cross_kr").json()["version"], 1)

        fake_bad = {**fake, "trade_count": 5}
        with patch("app.api.routes.strategies._service.run", return_value=fake_bad):
            rejected = self.client.post("/backtests/strategies", json=body)
        self.assertEqual(rejected.status_code, 422)
        self.assertIn("trade_count", rejected.json()["detail"]["failed"][0])
        self.assertEqual(self.client.get("/backtests/strategies/ma_cross_kr").json()["version"], 1)  # v2 불합격은 비노출
        self.assertIsNotNone(strategy_store.load("ma_cross_kr", 2))  # 파일은 보존

    def test_revalidate_builds_request_from_spec(self):
        strategy_store.save(_spec(version=1))
        fake = {"ticker": "005930.KS", "engine": "lean", "strategy": "ma_cross", "strategy_label": "x", "strategy_return_pct": 1,
                "benchmark_return_pct": 1, "comparison_return_pct": 1, "outperformance_pct": 0, "max_drawdown_pct": -9.0,
                "annualized_return_pct": 7.0, "annualized_volatility_pct": 10, "sharpe_ratio": 0.7, "invested_days_pct": 50,
                "trade_count": 35, "market_snapshot": {}}
        with patch("app.api.routes.strategies._service.run", return_value=fake) as run:
            response = self.client.post("/backtests/strategies/ma_cross_kr/revalidate", json={"start_date": "2024-01-01", "end_date": "2026-09-30"})
        self.assertEqual(response.status_code, 201, response.text)
        kwargs = run.call_args.kwargs
        self.assertEqual((kwargs["ticker"], kwargs["strategy"], kwargs["short_window"], kwargs["long_window"]), ("005930.KS", "ma_cross", 20, 60))
        self.assertEqual(str(kwargs["start_date"]), "2024-01-01")
        self.assertEqual(response.json()["version"], 2)
        self.assertEqual(response.json()["backtest_result"]["period"]["start"], "2024-01-01")
        self.assertEqual(self.client.post("/backtests/strategies/nope/revalidate", json={}).status_code, 404)


if __name__ == "__main__":
    unittest.main()
