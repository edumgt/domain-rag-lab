"""캘린더 「시스템일정」 탭 데이터: 네 서비스 주기 배치 정의와 라우트."""
import asyncio

from app.api.routes.market import system_schedule
from app.services.system_schedule_data import SYSTEM_JOBS


def test_jobs_cover_four_systems_and_have_valid_schedules():
    systems = {j["system"] for j in SYSTEM_JOBS}
    assert systems == {"lumina-invest", "stock-coin-trade", "domain-rag-lab", "stock-kms-portal"}
    ids = [j["id"] for j in SYSTEM_JOBS]
    assert len(ids) == len(set(ids))
    for j in SYSTEM_JOBS:
        s = j["schedule"]
        assert s["type"] in {"interval", "daily", "hourly", "event"}, j["id"]
        if s["type"] == "interval": assert s["every_sec"] > 0
        if s["type"] == "daily": assert all(len(t) == 5 and t[2] == ":" for t in s["times"])
        if s["type"] == "hourly": assert 0 <= s["minute"] < 60
        assert j["name"] and j["description"] and j["source"] and j["category"] in {"trading", "data", "ops", "infra"}


def test_known_periods_match_code():
    by_id = {j["id"]: j for j in SYSTEM_JOBS}
    assert by_id["fd-auto-trade"]["schedule"]["every_sec"] == 180          # lumina QUANT_CYCLE_SEC
    assert by_id["fd-confirm-fills"]["schedule"]["every_sec"] == 120
    assert by_id["st-ohlcv-sync"]["schedule"]["times"] == ["06:20", "18:20"]  # OHLCV_SYNC_HOUR 18 + 12h, minute 20
    assert by_id["st-certbot"]["schedule"]["times"] == ["03:15"]


def test_route_shape():
    out = asyncio.run(system_schedule())
    assert out["jobs"] == SYSTEM_JOBS and out["systems"] == sorted({j["system"] for j in SYSTEM_JOBS})
