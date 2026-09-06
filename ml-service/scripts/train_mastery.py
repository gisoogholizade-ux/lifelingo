#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, brier_score_loss, f1_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import GroupShuffleSplit
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from app.features import CATEGORICAL_FEATURES, FEATURES, NUMERIC_FEATURES  # noqa: E402


def split(frame: pd.DataFrame):
    first = GroupShuffleSplit(n_splits=1, test_size=0.30, random_state=42)
    train_index, remainder_index = next(first.split(frame, groups=frame.anonymous_learner_id))
    train, remainder = frame.iloc[train_index], frame.iloc[remainder_index]
    second = GroupShuffleSplit(n_splits=1, test_size=0.50, random_state=43)
    validation_index, test_index = next(second.split(remainder, groups=remainder.anonymous_learner_id))
    return train, remainder.iloc[validation_index], remainder.iloc[test_index]


def pipeline(classifier) -> Pipeline:
    numeric = Pipeline([("impute", SimpleImputer(strategy="median")), ("scale", StandardScaler())])
    categorical = Pipeline([("impute", SimpleImputer(strategy="most_frequent")), ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False))])
    return Pipeline([("features", ColumnTransformer([("numeric", numeric, NUMERIC_FEATURES), ("categorical", categorical, CATEGORICAL_FEATURES)])), ("model", classifier)])


def metrics(model: Pipeline, frame: pd.DataFrame) -> dict:
    truth = frame.correct.astype(int)
    probability = model.predict_proba(frame[FEATURES])[:, 1]
    predicted = (probability >= 0.5).astype(int)
    return {
        "accuracy": accuracy_score(truth, predicted), "precision": precision_score(truth, predicted, zero_division=0),
        "recall": recall_score(truth, predicted, zero_division=0), "f1": f1_score(truth, predicted, zero_division=0),
        "rocAuc": roc_auc_score(truth, probability), "brier": brier_score_loss(truth, probability),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", type=Path, default=ROOT / "data" / "mastery-v001.csv")
    args = parser.parse_args()
    frame = pd.read_csv(args.dataset)
    train, validation, test = split(frame)
    candidates = {
        "logistic-regression": LogisticRegression(max_iter=1500, class_weight="balanced", random_state=42),
        "random-forest": RandomForestClassifier(n_estimators=180, min_samples_leaf=8, class_weight="balanced", n_jobs=-1, random_state=42),
        "gradient-boosting": GradientBoostingClassifier(n_estimators=120, learning_rate=0.045, max_depth=2, random_state=42),
    }
    trained, validation_metrics = {}, {}
    for name, estimator in candidates.items():
        trained[name] = pipeline(estimator).fit(train[FEATURES], train.correct)
        validation_metrics[name] = metrics(trained[name], validation)
    selected = max(validation_metrics, key=lambda name: validation_metrics[name]["rocAuc"] - 0.35 * validation_metrics[name]["brier"])
    test_metrics = metrics(trained[selected], test)
    artifact_dir, report_dir = ROOT / "artifacts", ROOT / "reports"
    artifact_dir.mkdir(parents=True, exist_ok=True); report_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(trained[selected], artifact_dir / "mastery-model.joblib")
    split_manifest = {"train": sorted(train.anonymous_learner_id.unique().tolist()), "validation": sorted(validation.anonymous_learner_id.unique().tolist()), "test": sorted(test.anonymous_learner_id.unique().tolist())}
    (report_dir / "mastery-splits.json").write_text(json.dumps(split_manifest, indent=2) + "\n")
    report = {
        "selectedModelId": f"mastery-{selected}-v001", "selectedAlgorithm": selected,
        "datasetVersion": "mastery-v001", "datasetIsSynthetic": bool((frame.quality_label == "SYNTHETIC").all()),
        "sampleCount": len(frame), "learnerCount": int(frame.anonymous_learner_id.nunique()),
        "splitCounts": {"train": len(train), "validation": len(validation), "test": len(test)},
        "validation": validation_metrics, "test": test_metrics,
        "selectionRule": "highest validation ROC-AUC minus 0.35 times Brier score; complexity is not preferred",
    }
    (report_dir / "mastery-evaluation.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report))


if __name__ == "__main__":
    main()
