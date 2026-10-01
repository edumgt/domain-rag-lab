"""Guard the temporal boundaries and fold-local event cutoff."""

import unittest

import numpy as np

from app.api.routes.walk_forward import HORIZON, SAMPLE_COUNT, _simulate


class WalkForwardTests(unittest.TestCase):
    def test_purged_folds_and_training_only_cutoff(self):
        result = _simulate(4, 10, 42)
        self.assertEqual(result["valid_count"], SAMPLE_COUNT - HORIZON)
        self.assertEqual(result["excluded_tail_count"], HORIZON)

        rng = np.random.RandomState(42)
        spy_return = rng.normal(0.0005, 0.01, SAMPLE_COUNT)
        future = np.array([
            spy_return[i + 1:i + HORIZON + 1].sum()
            for i in range(SAMPLE_COUNT - HORIZON)
        ])
        previous_train_count = 0
        for fold in result["folds"]:
            train_end = fold["train"]["end_index"]
            test_start = fold["test"]["start_index"]
            self.assertGreater(train_end, previous_train_count)
            self.assertEqual(test_start - train_end, 10)
            self.assertLess(train_end - 1 + HORIZON, test_start)
            self.assertEqual(fold["cutoff_pct"], round(float(np.quantile(future[:train_end], 0.1)) * 100, 2))
            self.assertEqual(sum(fold["confusion"].values()), fold["test"]["count"])
            self.assertEqual(len(fold["points"]), fold["test"]["count"])
            previous_train_count = train_end
        self.assertEqual(result["folds"][-1]["test"]["end_index"], result["valid_count"])


if __name__ == "__main__":
    unittest.main()
