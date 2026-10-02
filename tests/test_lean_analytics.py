"""LEAN 결과 파서 보강: 왕복 거래 승률(win_rate_pct)."""
import unittest
from datetime import date

import pandas as pd

from app.services.lean_backtest_service import LeanBacktestService


class WinRateTests(unittest.TestCase):
    def test_round_trips_are_counted_and_scored(self):
        idx = pd.bdate_range("2026-01-05", periods=8)
        close = pd.Series([100, 110, 120, 90, 95, 80, 85, 70], index=idx, dtype=float)
        # 진입(100) → 청산(120) 승 / 진입(95) → 청산(85) 패 / 마지막 진입은 미청산 → 제외
        position = pd.Series([1, 1, 0, 0, 1, 1, 0, 1], index=idx, dtype=float)
        self.assertEqual(LeanBacktestService._win_rate(close, position), 50.0)

    def test_no_completed_trade_is_none(self):
        idx = pd.bdate_range("2026-01-05", periods=3)
        close = pd.Series([1.0, 2.0, 3.0], index=idx)
        self.assertIsNone(LeanBacktestService._win_rate(close, pd.Series([1.0, 1.0, 1.0], index=idx)))
        self.assertIsNone(LeanBacktestService._win_rate(close, pd.Series([], dtype=float)))

    def test_analytics_includes_win_rate(self):
        idx = pd.bdate_range("2025-01-01", periods=400)
        close = pd.Series(100 + (pd.Series(range(400)) % 50).values.astype(float), index=idx)
        curve = (1 + close.pct_change().fillna(0)).cumprod()
        service = LeanBacktestService()
        result = service._analytics("ma_cross", close, curve, date(2025, 3, 1), date(2026, 6, 1), 5, 20, 21, 20)
        self.assertIn("win_rate_pct", result)
        self.assertGreater(result["trade_count"], 0)
        self.assertTrue(result["win_rate_pct"] is None or 0 <= result["win_rate_pct"] <= 100)


if __name__ == "__main__":
    unittest.main()
