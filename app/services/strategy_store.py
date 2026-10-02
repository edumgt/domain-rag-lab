"""전략 스펙 저장소 — data/strategies/<strategy_id>_v<version>.json.

- 합격(acceptance.passed=True) 스펙만 목록·최신 조회에 노출된다. 불합격 버전은 파일로 보존만 한다.
- 파일은 domain-rag-lab 내부 저장용이다. lumina-invest 는 이 파일을 직접 읽지 않고 /backtests/strategies API 로 받는다.
"""
from __future__ import annotations

import json
import os
import re
from pathlib import Path

from app.schemas.strategy import StrategySpec, StrategySummary

_FILE = re.compile(r"^(?P<id>[a-z0-9_]{3,40})_v(?P<ver>\d+)\.json$")


def strategies_dir() -> Path:
    root = os.environ.get("STRATEGY_STORE_DIR") or str(Path(__file__).resolve().parents[2] / "data" / "strategies")
    path = Path(root)
    path.mkdir(parents=True, exist_ok=True)
    return path


def _path(strategy_id: str, version: int) -> Path:
    return strategies_dir() / f"{strategy_id}_v{version}.json"


def save(spec: StrategySpec) -> Path:
    path = _path(spec.strategy_id, spec.version)
    path.write_text(spec.model_dump_json(indent=2), encoding="utf-8")
    return path


def _index() -> list[tuple[str, int]]:
    out = []
    for file in strategies_dir().glob("*.json"):
        match = _FILE.match(file.name)
        if match:
            out.append((match.group("id"), int(match.group("ver"))))
    return sorted(out)


def next_version(strategy_id: str) -> int:
    versions = [v for sid, v in _index() if sid == strategy_id]
    return (max(versions) + 1) if versions else 1


def load(strategy_id: str, version: int) -> StrategySpec | None:
    path = _path(strategy_id, version)
    if not path.exists():
        return None
    try:
        return StrategySpec.model_validate_json(path.read_text(encoding="utf-8"))
    except (ValueError, json.JSONDecodeError):
        return None


def latest_passed(strategy_id: str) -> StrategySpec | None:
    for sid, ver in sorted(_index(), key=lambda p: p[1], reverse=True):
        if sid != strategy_id:
            continue
        spec = load(sid, ver)
        if spec and spec.acceptance.passed:
            return spec
    return None


def list_passed() -> list[StrategySummary]:
    latest: dict[str, StrategySpec] = {}
    for sid, ver in _index():
        spec = load(sid, ver)
        if spec and spec.acceptance.passed and (sid not in latest or latest[sid].version < spec.version):
            latest[sid] = spec
    return [
        StrategySummary(strategy_id=s.strategy_id, version=s.version, name=s.name, universe_size=len(s.universe),
                        backtest_result=s.backtest_result, created_at=s.created_at)
        for s in sorted(latest.values(), key=lambda s: s.strategy_id)
    ]
