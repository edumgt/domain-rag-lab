"""Self-contained OHLCV EDA and chronological LightGBM learning exercise."""

from __future__ import annotations

import csv
import io
import math
import random
from datetime import date, datetime, timedelta, timezone
from statistics import mean, pstdev
from threading import Lock

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
import lightgbm as lgb
import numpy as np
from starlette.concurrency import run_in_threadpool
import yfinance as yf

router = APIRouter(prefix="/quant-lab", tags=["quant-lab"])

FEATURES = {
    "return_1": "전일 수익률",
    "return_5": "5일 수익률",
    "return_20": "20일 수익률",
    "ma_gap_5": "5일 이동평균 이격",
    "ma_gap_20": "20일 이동평균 이격",
    "volatility_5": "5일 변동성",
    "volatility_20": "20일 변동성",
    "range": "당일 고저폭",
    "volume_ratio": "거래량 / 20일 평균",
}
REQUIRED = ("date", "open", "high", "low", "close", "volume")
MAX_UPLOAD_BYTES = 1_000_000
SAMSUNG_TICKER = "005930.KS"
SAMSUNG_CACHE_TTL = timedelta(minutes=30)
_samsung_cache: tuple[datetime, list[dict], int] | None = None
_samsung_cache_lock = Lock()


def _sample_rows() -> list[dict]:
    """Repeatable fictional prices; never presented as historical market data."""
    rng = random.Random(202609)
    rows = []
    day = date(2023, 1, 2)
    close = 100.0
    while len(rows) < 620:
        if day.weekday() < 5:
            i = len(rows)
            regime = -0.0007 if 170 <= i < 285 else 0.0006
            daily_return = max(-0.095, min(0.095, regime + rng.gauss(0, 0.013 if i < 390 else 0.018)))
            opening = close * (1 + rng.gauss(0, 0.003))
            close = close * (1 + daily_return)
            high = max(opening, close) * (1 + rng.uniform(0.001, 0.012))
            low = min(opening, close) * (1 - rng.uniform(0.001, 0.012))
            rows.append({"date": day.isoformat(), "open": opening, "high": high,
                         "low": low, "close": close, "volume": int(rng.uniform(500_000, 2_000_000))})
        day += timedelta(days=1)
    return rows


def _samsung_rows() -> tuple[datetime, list[dict], int]:
    """Fetch two years of Samsung daily OHLCV once per cache window."""
    global _samsung_cache
    with _samsung_cache_lock:
        now = datetime.now(timezone.utc)
        if _samsung_cache and now - _samsung_cache[0] < SAMSUNG_CACHE_TTL:
            return _samsung_cache

        try:
            frame = yf.Ticker(SAMSUNG_TICKER).history(
                period="2y", interval="1d", auto_adjust=False,
                actions=False, timeout=15,
            )
        except Exception as error:
            raise HTTPException(status_code=502, detail="Yahoo Finance에서 삼성전자 일봉을 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.") from error
        if frame is None or frame.empty:
            raise HTTPException(status_code=502, detail="Yahoo Finance에서 삼성전자 일봉이 반환되지 않았습니다.")
        if any(name.title() not in frame.columns for name in REQUIRED[1:]):
            raise HTTPException(status_code=502, detail="Yahoo Finance 일봉에 필요한 OHLCV 열이 없습니다.")

        rows = []
        excluded_rows = 0
        for index, bar in frame.sort_index().iterrows():
            values = {name.lower(): float(bar[name.title()]) for name in REQUIRED[1:]}
            if (any(not math.isfinite(value) for value in values.values())
                    or min(values["open"], values["high"], values["low"], values["close"]) <= 0
                    or values["volume"] < 0
                    or values["high"] < max(values["open"], values["close"])
                    or values["low"] > min(values["open"], values["close"])):
                excluded_rows += 1
                continue
            rows.append({"date": index.date().isoformat(), **values})
        if len(rows) < 180:
            raise HTTPException(status_code=502, detail="삼성전자 일봉이 180거래일 미만이라 분석할 수 없습니다.")
        _samsung_cache = (now, rows, excluded_rows)
        return _samsung_cache


def _parse_csv(content: bytes) -> tuple[list[dict], dict[str, int]]:
    try:
        source = io.StringIO(content.decode("utf-8-sig"), newline="")
        reader = csv.DictReader(source)
        if not reader.fieldnames:
            raise ValueError("CSV 헤더가 없습니다.")
        columns = {name.strip().lower(): name for name in reader.fieldnames if name}
        if any(name not in columns for name in REQUIRED):
            raise ValueError("CSV에 date, open, high, low, close, volume 열이 필요합니다.")
        rows = []
        missing = {name: 0 for name in REQUIRED}
        seen = set()
        for item in reader:
            if len(rows) >= 10_000:
                raise ValueError("CSV는 최대 10,000행까지 지원합니다.")
            values = {name: (item.get(columns[name]) or "").strip() for name in REQUIRED}
            for name, value in values.items():
                if not value:
                    missing[name] += 1
            if any(not value for value in values.values()):
                continue
            parsed_date = date.fromisoformat(values["date"])
            if parsed_date in seen:
                raise ValueError("날짜가 중복되어 있습니다.")
            seen.add(parsed_date)
            numbers = {name: float(values[name]) for name in REQUIRED[1:]}
            if any(not math.isfinite(value) for value in numbers.values()):
                raise ValueError("가격과 거래량은 유한한 숫자여야 합니다.")
            if (min(numbers["open"], numbers["high"], numbers["low"], numbers["close"]) <= 0
                    or numbers["volume"] < 0 or numbers["high"] < max(numbers["open"], numbers["close"])
                    or numbers["low"] > min(numbers["open"], numbers["close"])):
                raise ValueError("OHLC 가격 범위 또는 거래량을 확인해 주세요.")
            rows.append({"date": parsed_date.isoformat(), **numbers})
        rows.sort(key=lambda row: row["date"])
        return rows, missing
    except (UnicodeError, csv.Error, ValueError, TypeError, OverflowError) as error:
        raise HTTPException(status_code=422, detail=f"CSV를 읽을 수 없습니다: {error}") from error


def _drawdown(returns: list[float]) -> float:
    equity = peak = 1.0
    worst = 0.0
    for value in returns:
        equity *= 1 + value
        peak = max(peak, equity)
        worst = min(worst, equity / peak - 1)
    return worst * 100


def _equity(returns: list[float]) -> list[float]:
    total = 1.0
    values = []
    for value in returns:
        total *= 1 + value
        values.append(round(total * 100, 2))
    return values


def _eda(rows: list[dict], missing: dict[str, int]) -> dict:
    returns = [rows[i]["close"] / rows[i - 1]["close"] - 1 for i in range(1, len(rows))]
    prices = [row["close"] for row in rows]
    samples = list(range(0, len(rows), max(1, len(rows) // 120)))
    if samples[-1] != len(rows) - 1:
        samples.append(len(rows) - 1)
    edges = np.linspace(min(returns), max(returns) + 1e-9, 13)
    counts, _ = np.histogram(returns, bins=edges)
    return {
        "rows": len(rows), "start": rows[0]["date"], "end": rows[-1]["date"],
        "missing": missing,
        "mean_return_pct": round(mean(returns) * 100, 3),
        "daily_volatility_pct": round(pstdev(returns) * 100, 3),
        "positive_days_pct": round(sum(value > 0 for value in returns) / len(returns) * 100, 1),
        "max_drawdown_pct": round(_drawdown(returns), 2),
        "price_change_pct": round((prices[-1] / prices[0] - 1) * 100, 2),
        "series": [{"date": rows[i]["date"], "close": round(prices[i], 2), "volume": round(rows[i]["volume"])} for i in samples],
        "histogram": [{"label": f"{(edges[i] + edges[i + 1]) * 50:+.1f}%", "count": int(counts[i])} for i in range(12)],
    }


def _features(rows: list[dict]) -> tuple[np.ndarray, np.ndarray, list[dict]]:
    close = np.array([row["close"] for row in rows], dtype=float)
    volume = np.array([row["volume"] for row in rows], dtype=float)
    x, y, labels = [], [], []
    for i in range(20, len(rows) - 1):
        daily = close[i - 19:i + 1] / close[i - 20:i] - 1
        values = [
            close[i] / close[i - 1] - 1,
            close[i] / close[i - 5] - 1,
            close[i] / close[i - 20] - 1,
            close[i] / mean(close[i - 4:i + 1]) - 1,
            close[i] / mean(close[i - 19:i + 1]) - 1,
            float(np.std(daily[-5:])),
            float(np.std(daily)),
            (rows[i]["high"] - rows[i]["low"]) / close[i],
            volume[i] / max(1, mean(volume[i - 19:i + 1])),
        ]
        x.append(values)
        # Decide after day i closes, enter at the following open, exit at its close.
        next_return = close[i + 1] / rows[i + 1]["open"] - 1
        y.append(int(next_return > 0))
        labels.append({"date": rows[i + 1]["date"], "return": float(next_return)})
    return np.asarray(x), np.asarray(y), labels


def _train(rows: list[dict], train_pct: int, threshold: float, rounds: int, cost_bps: int) -> dict:
    x, y, labels = _features(rows)
    split = int(len(x) * train_pct / 100)
    # A training label uses the next close. Purge the boundary row so the first
    # test date cannot enter training through that label.
    x_train, y_train = x[:split - 1], y[:split - 1]
    x_test, y_test = x[split:], y[split:]
    if len(x_train) < 100 or len(x_test) < 30 or len(set(y_train.tolist())) < 2:
        raise HTTPException(status_code=422, detail="학습·테스트 구간에 충분한 상승/하락 거래일이 필요합니다.")
    dataset = lgb.Dataset(x_train, label=y_train, feature_name=list(FEATURES))
    model = lgb.train({"objective": "binary", "metric": "binary_logloss", "verbosity": -1,
                       "learning_rate": 0.04, "num_leaves": 7, "min_data_in_leaf": 20,
                       "num_threads": 2, "seed": 42, "deterministic": True, "force_col_wise": True},
                      dataset, num_boost_round=rounds)
    probabilities = model.predict(x_test)
    signals = (probabilities >= threshold).astype(int)
    accuracy = float(np.mean(signals == y_test))
    train_majority = int(float(np.mean(y_train)) >= 0.5)
    majority = float(np.mean(y_test == train_majority))
    cost = cost_bps / 10_000
    strategy_returns, benchmark_returns, points = [], [], []
    for i, (signal, probability, label) in enumerate(zip(signals, probabilities, labels[split:])):
        signal = int(signal)
        strategy_returns.append(signal * (label["return"] - 2 * cost))
        benchmark_returns.append(label["return"] - 2 * cost)
        points.append({"date": label["date"], "probability": round(float(probability), 3),
                       "actual": int(y_test[i]), "signal": signal})
    strategy_equity, benchmark_equity = _equity(strategy_returns), _equity(benchmark_returns)
    for i, point in enumerate(points):
        point["strategy"] = strategy_equity[i]
        point["benchmark"] = benchmark_equity[i]
    gains = model.feature_importance(importance_type="gain")
    total_gain = float(sum(gains))
    importance = sorted([{"name": FEATURES[name], "gain_pct": round(float(gain / total_gain * 100), 1) if total_gain else 0}
                         for name, gain in zip(FEATURES, gains)], key=lambda item: item["gain_pct"], reverse=True)
    return {
        "train_rows": len(x_train), "test_rows": len(x_test),
        "train_end": labels[split - 2]["date"], "test_start": labels[split]["date"],
        "accuracy_pct": round(accuracy * 100, 1), "majority_baseline_pct": round(majority * 100, 1),
        "strategy_return_pct": round((strategy_equity[-1] / 100 - 1) * 100, 2),
        "benchmark_return_pct": round((benchmark_equity[-1] / 100 - 1) * 100, 2),
        "strategy_mdd_pct": round(_drawdown(strategy_returns), 2),
        "trade_count": int(2 * sum(signals)),
        "positive_predictions": int(sum(signals)), "importance": importance,
        "points": points,
    }


@router.post("/analyze")
async def analyze(
    source: str = Form("sample"),
    train_pct: int = Form(75, ge=60, le=85),
    threshold: float = Form(0.5, ge=0.4, le=0.7),
    rounds: int = Form(80, ge=30, le=200),
    cost_bps: int = Form(10, ge=0, le=100),
    file: UploadFile | None = File(None),
) -> dict:
    if source not in {"sample", "csv", "samsung"}:
        raise HTTPException(status_code=422, detail="데이터 출처를 선택해 주세요.")
    fetched_at = None
    excluded_rows = 0
    if source == "csv":
        if file is None or not (file.filename or "").lower().endswith(".csv"):
            raise HTTPException(status_code=422, detail="CSV 파일을 선택해 주세요.")
        content = await file.read(MAX_UPLOAD_BYTES + 1)
        if len(content) > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail="CSV 파일은 1MB 이하여야 합니다.")
        rows, missing = _parse_csv(content)
        source_label = file.filename[:100]
    elif source == "samsung":
        fetched_at, rows, excluded_rows = await run_in_threadpool(_samsung_rows)
        missing = {name: 0 for name in REQUIRED}
        source_label = "삼성전자 (005930.KS) · Yahoo Finance"
    else:
        rows, missing = _sample_rows(), {name: 0 for name in REQUIRED}
        source_label = "가상 OHLCV 예제"
    if len(rows) < 180:
        raise HTTPException(status_code=422, detail="유효한 거래일 데이터가 최소 180행 필요합니다.")
    eda = _eda(rows, missing)
    eda["excluded_rows"] = excluded_rows
    return {"source": source_label, "sample": source == "sample",
            "fetched_at": fetched_at.isoformat() if fetched_at else None,
            "eda": eda,
            "model": await run_in_threadpool(_train, rows, train_pct, threshold, rounds, cost_bps)}
