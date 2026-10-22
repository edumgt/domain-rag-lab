"""종목 보기 재무건전성(알트먼 Z-Score): 순수 계산·DART 파싱·수집기 순서. 네트워크·DB 없이 돈다."""
import asyncio
from datetime import datetime, timedelta, timezone

import pytest

from app.services import altman, dart_client
from app.services import financial_health_collector as collector


# ── altman ───────────────────────────────────────────────────────────────────

def test_model_mapping_by_sector():
    assert altman.model_for_sector("금융") == altman.MODEL_EXCLUDED
    assert altman.model_for_sector("증권·금융") == altman.MODEL_EXCLUDED
    assert altman.model_for_sector("반도체") == altman.MODEL_Z
    assert altman.model_for_sector("화장품ODM") == altman.MODEL_Z
    assert altman.model_for_sector("플랫폼") == altman.MODEL_Z2
    assert altman.model_for_sector("바이오") == altman.MODEL_Z2
    assert altman.model_for_sector("듣도보도못한산업") == altman.MODEL_Z2      # 미지정은 Z''


def test_z_original_zones_and_contributions():
    inputs = {"assets": 1000, "liabilities": 400, "equity": 600, "currentAssets": 500, "currentLiabilities": 200,
              "retainedEarnings": 300, "operatingIncomeTtm": 100, "revenueTtm": 900, "marketCap": 1200}
    r = altman.compute(inputs, altman.MODEL_Z)
    assert r["ok"] and r["model"] == "Z"
    assert r["components"] == {"x1": 0.3, "x2": 0.3, "x3": 0.1, "x4": 3.0, "x5": 0.9}
    # 1.2·0.3 + 1.4·0.3 + 3.3·0.1 + 0.6·3.0 + 1.0·0.9 = 0.36+0.42+0.33+1.8+0.9 = 3.81
    assert r["z"] == 3.81 and r["zone"] == altman.ZONE_SAFE
    assert altman.zone_for("Z", 2.99) == altman.ZONE_GREY and altman.zone_for("Z", 3.0) == altman.ZONE_SAFE
    assert altman.zone_for("Z", 1.81) == altman.ZONE_GREY and altman.zone_for("Z", 1.8) == altman.ZONE_DISTRESS


def test_z_double_prime_uses_book_equity_and_no_sales():
    inputs = {"assets": 1000, "liabilities": 800, "equity": 200, "currentAssets": 300, "currentLiabilities": 350,
              "retainedEarnings": -100, "operatingIncomeTtm": -50}
    r = altman.compute(inputs, altman.MODEL_Z2)
    assert r["ok"] and "x5" not in r["components"]
    assert r["components"]["x4"] == 0.25                      # 자본총계/부채총계
    # 6.56·(−0.05) + 3.26·(−0.1) + 6.72·(−0.05) + 1.05·0.25 = −0.328 −0.326 −0.336 +0.2625 = −0.7275
    assert r["z"] == -0.73 and r["zone"] == altman.ZONE_DISTRESS
    assert altman.zone_for("Z''", 2.61) == altman.ZONE_SAFE and altman.zone_for("Z''", 1.1) == altman.ZONE_GREY


def test_missing_inputs_are_reported_not_estimated():
    r = altman.compute({"assets": 1000, "liabilities": 1, "currentAssets": 1, "currentLiabilities": 1, "retainedEarnings": 1,
                        "operatingIncomeTtm": None, "revenueTtm": 5, "marketCap": 5}, altman.MODEL_Z)
    assert not r["ok"] and r["z"] is None and r["missing"] == ["영업이익(TTM)"]
    assert altman.compute({}, altman.MODEL_EXCLUDED)["zone"] == altman.ZONE_EXCLUDED
    assert altman.compute({"assets": None}, altman.MODEL_Z2)["missing"] == ["자산총계"]
    assert "금융업" in altman.describe("Z", altman.ZONE_EXCLUDED, None)
    assert "회색" in altman.describe("Z", altman.ZONE_GREY, 2.0)


# ── dart_client ──────────────────────────────────────────────────────────────

def _row(div, name, cur, add=None, prev=None, prev_add=None):
    return {"sj_div": div, "account_nm": name, "thstrm_amount": cur, "thstrm_add_amount": add or "",
            "frmtrm_amount": prev or "", "frmtrm_add_amount": prev_add or "", "thstrm_nm": "제 57 기 3분기"}


QUARTER_ROWS = [
    _row("BS", "유동자산", "100,000"), _row("BS", "유동부채", "40,000"), _row("BS", "자산총계", "500,000"),
    _row("BS", "부채총계", "120,000"), _row("BS", "자본총계", "380,000"), _row("BS", "이익잉여금", "300,000"),
    _row("SCE", "자본총계", "1"),                                           # SCE 는 무시
    _row("IS", "영업이익", "10,000", add="25,000", prev="8,000", prev_add="20,000"),
    _row("IS", "매출액", "70,000", add="200,000", prev="65,000", prev_add="180,000"),
]


def test_parse_statements_quarter_report_keeps_cumulative_columns():
    p = dart_client.parse_statements(QUARTER_ROWS, "11014")
    assert p["assets"] == 500_000 and p["equity"] == 380_000 and p["currentAssets"] == 100_000 and p["currentLiabilities"] == 40_000
    assert p["retainedEarnings"] == 300_000 and p["retainedEarningsBasis"] == "이익잉여금"
    assert p["operatingIncome"] == 10_000 and p["opBasis"] == "3개월"
    assert p["opCumulative"] == 25_000 and p["opPrevCumulative"] == 20_000
    assert p["revenueCumulative"] == 200_000 and p["revenuePrevCumulative"] == 180_000


def test_parse_statements_annual_report_treats_current_as_annual_and_flips_deficit():
    rows = [_row("BS", "자산총계", "1,000"), _row("BS", "결손금", "250"), _row("CIS", "영업이익(손실)", "(30)", prev="(10)")]
    p = dart_client.parse_statements(rows, "11011")
    assert p["retainedEarnings"] == -250 and p["retainedEarningsBasis"] == "결손금 부호 반전"
    assert p["operatingIncome"] == -30 and p["opBasis"] == "연간" and p["opCumulative"] == -30 and p["opPrevCumulative"] == -10
    assert "deficit" not in p


def test_ttm_amount_quarter_and_annual():
    latest = {**dart_client.parse_statements(QUARTER_ROWS, "11014"), "quarter": 3}
    assert dart_client.ttm_amount(latest, {"operatingIncome": 30_000}, "operatingIncome") == (35_000, "최근 4개 분기 합산(TTM)")
    assert dart_client.ttm_amount(latest, None, "revenue")[0] is None
    annual = {"quarter": 4, "revenue": 900}
    assert dart_client.ttm_amount(annual, None, "revenue") == (900, "연간")


def test_parse_amount_and_shares_and_candidates():
    assert dart_client.parse_amount({"a": "(1,234)"}, "a") == -1234
    assert dart_client.parse_amount({"a": "-"}, "a") is None
    assert dart_client.parse_shares([{"se": "보통주", "istc_totqy": "5,969,782,550"}, {"se": "우선주", "istc_totqy": "822,886,700"}]) == \
        {"common": 5_969_782_550, "preferred": 822_886_700, "total": 6_792_669_250}
    assert dart_client.report_candidates(2026, 10)[:3] == [(2026, 3), (2026, 2), (2026, 1)]
    assert dart_client.report_candidates(2026, 2)[:2] == [(2025, 4), (2025, 3)]
    assert dart_client.base_stock_code("005935") == ("005930", True) and dart_client.base_stock_code("005930") == ("005930", False)


# ── collector ────────────────────────────────────────────────────────────────

def test_parse_companies_reads_atlas_from_app_js():
    companies = collector.parse_companies()
    assert len(companies) >= 150
    assert {c['day'] for c in companies} == {1, 2, 3, 4}
    tickers = [c["ticker"] for c in companies]
    assert len(tickers) == len(set(tickers))
    first = companies[0]
    assert first == {"ticker": "005930", "market": "KOSPI", "name": "삼성전자", "sector": "반도체", "day": 1, "index": 0}
    assert {altman.model_for_sector(c["sector"]) for c in companies} == {"Z", "Z''", "EXCLUDED"}


def test_pick_next_prefers_uncollected_then_oldest():
    companies = [{"ticker": "A"}, {"ticker": "B"}, {"ticker": "C"}]
    now = datetime.now(timezone.utc)
    assert collector.pick_next(companies, {"A": now})["ticker"] == "B"
    rows = {"A": now, "B": now - timedelta(days=2), "C": now - timedelta(days=1)}
    assert collector.pick_next(companies, rows)["ticker"] == "B"
    assert collector.pick_next([], {}) is None


def test_dart_cache_and_quota_do_not_repeat_upstream_requests(monkeypatch):
    monkeypatch.setattr(dart_client, '_json_cache', {})
    monkeypatch.setattr(dart_client, '_request_count', 0)
    monkeypatch.setattr(dart_client, '_request_day', dart_client.time.strftime('%Y-%m-%d', dart_client.time.gmtime()))
    calls = []
    async def get(path, params):
        calls.append(path)
        class Response:
            def json(self):
                return {'status': '000', 'list': []}
        return Response()
    monkeypatch.setattr(dart_client, '_get', get)
    async def run():
        await dart_client._get_json('report', {'year': 2026})
        await dart_client._get_json('report', {'year': 2026})
        assert calls == ['report']
        monkeypatch.setattr(dart_client, '_request_count', 4000)
        with pytest.raises(dart_client.DartError):
            await dart_client._get_json('other', {})
        assert calls == ['report']
    asyncio.run(run())


def test_due_time_survives_restart():
    now = datetime.now(timezone.utc)
    assert collector.seconds_until_due({}, 1800, now) == 0
    assert collector.seconds_until_due({'A': now - timedelta(minutes=10)}, 1800, now) == 1200
    assert collector.seconds_until_due({'A': now - timedelta(hours=1)}, 1800, now) == 0


def test_collect_next_processes_exactly_one_even_when_excluded(monkeypatch):
    class DB:
        def close(self):
            pass
    monkeypatch.setattr(collector, 'SessionLocal', DB)
    monkeypatch.setattr(collector, 'existing_rows', lambda db: {})
    monkeypatch.setattr(collector, 'parse_companies', lambda: [{'ticker': 'A'}, {'ticker': 'B'}])
    calls = []
    async def collect(company):
        calls.append(company['ticker'])
        return {'model': 'EXCLUDED'}
    monkeypatch.setattr(collector, 'collect_one', collect)
    assert asyncio.run(collector.collect_next())['model'] == 'EXCLUDED'
    assert calls == ['A']


@pytest.mark.parametrize('locked,age,expected', [(False, 3600, False), (True, 60, False), (True, 3600, True)])
def test_due_guard_blocks_overlap_and_early_runs(monkeypatch, locked, age, expected):
    class DB:
        closed = False
        def execute(self, statement):
            return self
        def scalar(self):
            return locked
        def close(self):
            self.closed = True
    db = DB()
    monkeypatch.setattr(collector, 'SessionLocal', lambda: db)
    monkeypatch.setattr(collector, 'existing_rows', lambda db: {'A': datetime.now(timezone.utc) - timedelta(seconds=age)})
    calls = []
    async def collect():
        calls.append(True)
        return None
    monkeypatch.setattr(collector, 'collect_next', collect)
    asyncio.run(collector.collect_if_due(1800))
    assert bool(calls) is expected
    assert db.closed


def test_collector_failure_waits_full_interval(monkeypatch):
    monkeypatch.setattr(dart_client, 'is_enabled', lambda: True)
    monkeypatch.setattr(collector.settings, 'financial_health_startup_delay_seconds', 0)
    monkeypatch.setattr(collector.settings, 'financial_health_interval_seconds', 1800)
    calls = []
    async def collect(interval):
        calls.append(interval)
        raise ValueError('temporary failure')
    async def sleep(seconds):
        if seconds:
            assert seconds == 1800
            raise asyncio.CancelledError()
    monkeypatch.setattr(collector, 'collect_if_due', collect)
    monkeypatch.setattr(collector.asyncio, 'sleep', sleep)
    with pytest.raises(asyncio.CancelledError):
        asyncio.run(collector.run_forever())
    assert calls == [1800]


def test_build_record_excluded_sector_never_calls_dart(monkeypatch):
    async def boom(*_a, **_k):
        raise AssertionError("DART 호출 금지")
    monkeypatch.setattr(dart_client, "latest_financials", boom)
    rec = asyncio.run(collector.build_record({"ticker": "105560", "market": "KOSPI", "name": "KB금융", "sector": "금융"}, db=None))
    assert rec["model"] == "EXCLUDED" and rec["zone"] == "excluded" and rec["z"] is None and "금융업" in rec["reason"]


def test_build_record_z_company_with_stubbed_dart(monkeypatch):
    latest = {**dart_client.parse_statements(QUARTER_ROWS, "11014"), "year": 2026, "quarter": 3, "reportName": "3분기보고서",
              "fsDiv": "연결", "source": "stub"}

    async def fake_latest(code, y, m):
        assert code == "005930"
        return latest

    async def fake_prev(code, y, q):
        assert (y, q) == (2025, 4)
        return {"operatingIncome": 30_000, "revenue": 250_000}

    async def fake_shares(code, y, q):
        return {"common": 100, "total": 110}

    monkeypatch.setattr(dart_client, "latest_financials", fake_latest)
    monkeypatch.setattr(dart_client, "fetch_financials", fake_prev)
    monkeypatch.setattr(dart_client, "shares_outstanding", fake_shares)
    monkeypatch.setattr(collector, "latest_close_from_db", lambda db, t, m: (2000.0, datetime(2026, 10, 14).date()))
    rec = asyncio.run(collector.build_record({"ticker": "005930", "market": "KOSPI", "name": "삼성전자", "sector": "반도체"}, db=None))
    assert rec["ok"] and rec["model"] == "Z" and rec["market_cap"] == 200_000 and rec["shares_total"] == 100
    assert rec["operating_income_ttm"] == 35_000 and rec["revenue_ttm"] == 270_000
    # x1=.12 x2=.6 x3=.07 x4=200000/120000=1.6667 x5=.54 → 1.2·.12+1.4·.6+3.3·.07+0.6·1.6667+.54 = .144+.84+.231+1.0+.54 = 2.755
    assert rec["z"] == pytest.approx(2.76, abs=0.01) and rec["zone"] == "grey"
    assert rec["report_name"] == "3분기보고서" and rec["fs_div"] == "연결" and rec["close_used"] == 2000.0


def test_build_record_reports_dart_error_without_raising(monkeypatch):
    async def fail(code, y, m):
        raise dart_client.DartError("020", "요청 제한 초과")
    monkeypatch.setattr(dart_client, "latest_financials", fail)
    rec = asyncio.run(collector.build_record({"ticker": "000660", "market": "KOSPI", "name": "SK하이닉스", "sector": "반도체"}, db=None))
    assert not rec["ok"] and rec["z"] is None and "020" in rec["reason"]
