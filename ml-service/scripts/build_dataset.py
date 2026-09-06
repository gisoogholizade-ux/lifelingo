#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path

import numpy as np
import pandas as pd

SKILLS = [
    "grammar.articles", "grammar.past_simple", "grammar.prepositions", "grammar.question_forms",
    "vocabulary.airport", "vocabulary.workplace", "vocabulary.restaurant", "vocabulary.healthcare",
    "speaking.fluency", "speaking.task_completion", "writing.sentence_structure", "listening.directions",
]
LEVELS = ["A1", "A2", "B1", "B2"]
QUALITY = {"LIFELINGO_VERIFIED", "SYSTEM_GROUND_TRUTH", "HUMAN_VERIFIED"}
PII_PATTERNS = [
    re.compile(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}"),
    re.compile(r"(?:\+?\d[\d\s().-]{7,}\d)"),
    re.compile(r"https?://\S+"),
]


def pseudonym(value: str) -> str:
    return "learner_" + hashlib.sha256(("lifelingo-dataset-v1:" + value).encode()).hexdigest()[:16]


def sanitize_text(value: str) -> str:
    result = str(value or "")
    for pattern in PII_PATTERNS:
        result = pattern.sub("[REDACTED]", result)
    return result[:2000]


def synthetic(learners: int, seed: int = 20260906) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    rows = []
    skill_bias = {skill: rng.normal(0, 0.28) for skill in SKILLS}
    for learner_number in range(learners):
        learner = f"SYNTHETIC-{learner_number:05d}"
        ability = rng.normal(0, 0.85)
        level_index = int(np.clip(round((ability + 1.25) * 1.15), 0, 3))
        for _ in range(int(rng.integers(8, 22))):
            skill = str(rng.choice(SKILLS))
            difficulty = float(rng.uniform(0.08, 0.92))
            attempts = int(rng.integers(1, 55))
            history = float(np.clip(0.50 + ability * 0.16 + skill_bias[skill] * 0.14 + rng.normal(0, 0.13), 0.03, 0.98))
            recent = float(np.clip(history + rng.normal(0, 0.12), 0.01, 0.99))
            review = float(np.clip(history + rng.normal(0, 0.16), 0, 1))
            mistakes = float(np.clip(0.62 - recent + rng.normal(0, 0.10), 0, 1))
            hints = float(np.clip(0.56 - ability * 0.12 + difficulty * 0.25 + rng.normal(0, 0.11), 0, 1))
            translation = float(np.clip((3 - level_index) * 0.14 + rng.normal(0.08, 0.09), 0, 1))
            elapsed = float(np.exp(rng.normal(4.2, 1.5)))
            response = float(np.clip(6000 + difficulty * 12000 - ability * 1800 + rng.normal(0, 2500), 800, 90000))
            logit = -0.15 + 1.55 * ability + 2.1 * recent + 1.0 * history + 0.7 * review - 2.0 * difficulty - 1.0 * mistakes - 0.65 * hints - 0.25 * translation - 0.10 * np.log1p(elapsed / 24) + skill_bias[skill]
            probability = 1 / (1 + np.exp(-logit))
            correct = int(rng.random() < probability)
            rows.append({
                "anonymous_learner_id": pseudonym(learner), "skill": skill, "estimated_level": LEVELS[level_index],
                "difficulty": difficulty, "historical_accuracy": history, "recent_accuracy": recent,
                "attempt_count": attempts, "time_since_last_attempt_hours": elapsed, "review_success": review,
                "mistake_frequency": mistakes, "hint_usage": hints, "translation_usage": translation,
                "response_time_ms": response, "correct": correct, "quality_label": "SYNTHETIC", "source": "SYNTHETIC_DEVELOPMENT_V1",
            })
    return pd.DataFrame(rows)


def consented_events(source: Path) -> pd.DataFrame:
    """Build from a pre-exported JSONL file; never connects training directly to production tables."""
    records = []
    for line in source.read_text().splitlines():
        item = json.loads(line)
        if not item.get("trainingConsent") or item.get("qualityLabel") not in QUALITY:
            continue
        features = dict(item.get("features") or {})
        if item.get("correct") is None:
            continue
        records.append({
            "anonymous_learner_id": pseudonym(str(item.get("anonymousLearnerId") or "")),
            **features,
            "correct": int(bool(item["correct"])),
            "quality_label": item["qualityLabel"],
            "source": sanitize_text(item.get("source", "CONSENTED_EXPORT")),
        })
    return pd.DataFrame(records)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--synthetic", action="store_true")
    parser.add_argument("--learners", type=int, default=600)
    parser.add_argument("--source", type=Path)
    parser.add_argument("--output", type=Path, default=Path("data/mastery-v001.csv"))
    args = parser.parse_args()
    if not args.synthetic and not args.source:
        parser.error("choose --synthetic or a consent-filtered --source export")
    frame = synthetic(args.learners) if args.synthetic else consented_events(args.source)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    frame.to_csv(args.output, index=False)
    metadata = {
        "version": "mastery-v001", "schemaVersion": 1, "sampleCount": len(frame),
        "learnerCount": int(frame.anonymous_learner_id.nunique()),
        "sources": sorted(frame.source.unique().tolist()),
        "qualityDistribution": frame.quality_label.value_counts().to_dict(),
        "consentVersion": "synthetic-not-applicable" if args.synthetic else "ai-improvement-v1",
        "sanitizerVersion": "pii-v1", "splitMethod": "grouped-by-learner",
        "synthetic": bool(args.synthetic),
    }
    args.output.with_suffix(".metadata.json").write_text(json.dumps(metadata, indent=2) + "\n")
    print(json.dumps(metadata))


if __name__ == "__main__":
    main()
