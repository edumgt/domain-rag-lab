"""Reproducible purged expanding-window validation for a synthetic risk event."""

from __future__ import annotations

from functools import lru_cache

import numpy as np
from fastapi import APIRouter, Query
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import precision_recall_fscore_support, roc_auc_score

router = APIRouter(prefix="/walk-forward", tags=["walk-forward"])

SAMPLE_COUNT = 1250
HORIZON = 10


@lru_cache(maxsize=32)
def _simulate(n_splits: int, purge_window: int, seed: int) -> dict:
    """Fit each fold using only information available before its test window."""
    rng = np.random.RandomState(seed)
    spy_return = rng.normal(0.0005, 0.01, SAMPLE_COUNT)
    vix_change = rng.normal(0.0, 0.05, SAMPLE_COUNT)
    spread_change = rng.normal(0.0, 0.02, SAMPLE_COUNT)
    dates = np.busday_offset(np.datetime64("2019-01-01", "D"), np.arange(SAMPLE_COUNT))

    # Row i predicts the sum of the next ten returns. The final ten rows have
    # no complete future window and must be removed before labels are created.
    valid_count = SAMPLE_COUNT - HORIZON
    future_returns = np.array([
        spy_return[index + 1:index + HORIZON + 1].sum()
        for index in range(valid_count)
    ])
    features = np.column_stack((spy_return, vix_change, spread_change))[:valid_count]
    test_size = valid_count // (n_splits + 1)
    folds = []

    for index in range(n_splits):
        test_start = (index + 1) * test_size
        test_end = (index + 2) * test_size if index < n_splits - 1 else valid_count
        train_end = test_start - purge_window
        # The training label for row train_end - 1 ends before test_start.
        if train_end < 50:
            raise ValueError("격리 후 학습 데이터가 부족합니다.")

        # A full-series quantile would expose the test distribution to training.
        # Recompute the event cutoff from this fold's eligible training rows.
        cutoff = float(np.quantile(future_returns[:train_end], 0.10))
        train_labels = (future_returns[:train_end] <= cutoff).astype(int)
        test_labels = (future_returns[test_start:test_end] <= cutoff).astype(int)
        model = LogisticRegression(class_weight="balanced", random_state=42, max_iter=1000)
        model.fit(features[:train_end], train_labels)
        probabilities = model.predict_proba(features[test_start:test_end])[:, 1]
        predictions = model.predict(features[test_start:test_end]).astype(int)
        precision, recall, f1, _ = precision_recall_fscore_support(
            test_labels, predictions, average="binary", zero_division=0,
        )
        auc = float(roc_auc_score(test_labels, probabilities)) if len(np.unique(test_labels)) == 2 else None
        tp = int(np.sum((predictions == 1) & (test_labels == 1)))
        fp = int(np.sum((predictions == 1) & (test_labels == 0)))
        fn = int(np.sum((predictions == 0) & (test_labels == 1)))
        tn = int(np.sum((predictions == 0) & (test_labels == 0)))

        folds.append({
            "number": index + 1,
            "train": {"start": str(dates[0]), "end": str(dates[train_end - 1]),
                      "count": train_end, "start_index": 0, "end_index": train_end},
            "purge": {"start": str(dates[train_end]), "end": str(dates[test_start - 1]),
                      "count": purge_window, "start_index": train_end, "end_index": test_start},
            "test": {"start": str(dates[test_start]), "end": str(dates[test_end - 1]),
                     "count": test_end - test_start, "start_index": test_start, "end_index": test_end},
            "cutoff_pct": round(cutoff * 100, 2),
            "train_event_count": int(train_labels.sum()),
            "test_event_count": int(test_labels.sum()),
            "alert_count": int(predictions.sum()),
            "metrics": {"roc_auc": round(auc, 3) if auc is not None else None,
                        "recall": round(float(recall), 3), "precision": round(float(precision), 3),
                        "f1": round(float(f1), 3)},
            "confusion": {"tp": tp, "fp": fp, "fn": fn, "tn": tn},
            "points": [
                {"date": str(dates[test_start + day]), "actual": int(test_labels[day]),
                 "alert": int(predictions[day]), "probability": round(float(probabilities[day]), 3)}
                for day in range(test_end - test_start)
            ],
        })

    auc_values = [fold["metrics"]["roc_auc"] for fold in folds if fold["metrics"]["roc_auc"] is not None]
    return {
        "source": "고정 시드 가상 시장 데이터",
        "seed": seed,
        "sample_count": SAMPLE_COUNT,
        "valid_count": valid_count,
        "excluded_tail_count": HORIZON,
        "horizon": HORIZON,
        "n_splits": n_splits,
        "purge_window": purge_window,
        "folds": folds,
        "average": {
            "roc_auc": round(float(np.mean(auc_values)), 3) if auc_values else None,
            **{name: round(float(np.mean([fold["metrics"][name] for fold in folds])), 3)
               for name in ("recall", "precision", "f1")},
        },
    }


@router.get("/simulate")
def simulate_walk_forward(
    n_splits: int = Query(4, ge=3, le=5),
    purge_window: int = Query(10, ge=10, le=30),
    seed: int = Query(42, ge=0, le=9999),
) -> dict:
    return _simulate(n_splits, purge_window, seed)
