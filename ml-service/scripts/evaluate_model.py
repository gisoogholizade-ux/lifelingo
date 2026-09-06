#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import joblib
import pandas as pd
from sklearn.metrics import accuracy_score, brier_score_loss, f1_score, precision_score, recall_score, roc_auc_score

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from app.features import FEATURES  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", type=Path, default=ROOT / "data" / "mastery-v001.csv")
    args = parser.parse_args()
    frame = pd.read_csv(args.dataset)
    split = json.loads((ROOT / "reports" / "mastery-splits.json").read_text())
    test = frame[frame.anonymous_learner_id.isin(split["test"])]
    model = joblib.load(ROOT / "artifacts" / "mastery-model.joblib")
    probability = model.predict_proba(test[FEATURES])[:, 1]
    prediction = (probability >= 0.5).astype(int)
    result = {
        "sampleCount": len(test), "learnerCount": int(test.anonymous_learner_id.nunique()),
        "accuracy": accuracy_score(test.correct, prediction), "precision": precision_score(test.correct, prediction, zero_division=0),
        "recall": recall_score(test.correct, prediction, zero_division=0), "f1": f1_score(test.correct, prediction, zero_division=0),
        "rocAuc": roc_auc_score(test.correct, probability), "brier": brier_score_loss(test.correct, probability),
        "synthetic": bool((test.quality_label == "SYNTHETIC").all()),
    }
    expected = json.loads((ROOT / "reports" / "mastery-evaluation.json").read_text())["test"]
    assert all(abs(result[key] - expected[key]) < 1e-10 for key in expected), "evaluation is not reproducible"
    print(json.dumps(result))


if __name__ == "__main__":
    main()
