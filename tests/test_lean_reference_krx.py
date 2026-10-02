"""LEAN 참조 데이터에 KRX 주식(Equity-krx) 시장시간·심볼 속성이 있어야 한국 주식 심볼을 LEAN Equity 로 다룰 수 있다."""
import csv
import json
import unittest
from pathlib import Path

REF = Path(__file__).resolve().parents[1] / "app" / "services" / "lean_reference_data"


class KrxReferenceTests(unittest.TestCase):
    def test_market_hours_has_krx_equity_regular_session(self):
        data = json.loads((REF / "market-hours" / "market-hours-database.json").read_text(encoding="utf-8"))
        entry = data["entries"]["Equity-krx-[*]"]
        self.assertEqual(entry["exchangeTimeZone"], "Asia/Seoul")
        market = [s for s in entry["monday"] if s["state"] == "market"]
        self.assertEqual((market[0]["start"], market[0]["end"]), ("09:00:00", "15:30:00"))
        self.assertEqual(entry["saturday"], [])
        self.assertIn("10/9/2026", entry["holidays"])   # 한글날
        self.assertIn("7/17/2026", entry["holidays"])   # 제헌절 (2026 공개 일정 대조)
        self.assertNotIn("9/28/2026", entry["holidays"])
        self.assertEqual(len([h for h in entry["holidays"] if h.endswith("/2026")]), 17)
        # 기존 항목이 깨지지 않았는지
        self.assertIn("Equity-usa-[*]", data["entries"])

    def test_symbol_properties_has_krx_equity_row(self):
        rows = [r for r in csv.reader((REF / "symbol-properties" / "symbol-properties-database.csv").read_text(encoding="utf-8").splitlines())
                if r and not r[0].startswith("#")]
        krx = [r for r in rows if r[0] == "krx" and r[2] == "equity"]
        self.assertEqual(len(krx), 1)
        self.assertEqual((krx[0][1], krx[0][4]), ("[*]", "KRW"))


if __name__ == "__main__":
    unittest.main()
