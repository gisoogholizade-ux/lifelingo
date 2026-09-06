from __future__ import annotations

import math
from typing import Any

NUMERIC_FEATURES = [
    "difficulty",
    "historical_accuracy",
    "recent_accuracy",
    "attempt_count",
    "time_since_last_attempt_hours",
    "review_success",
    "mistake_frequency",
    "hint_usage",
    "translation_usage",
    "response_time_ms",
]
CATEGORICAL_FEATURES = ["skill", "estimated_level"]
FEATURES = CATEGORICAL_FEATURES + NUMERIC_FEATURES
LEVELS = ("A1", "A2", "B1", "B2", "C1", "C2")


def bounded(value: Any, low: float = 0.0, high: float = 1.0) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return low
    if not math.isfinite(number):
        return low
    return min(high, max(low, number))


def normalize(payload: dict[str, Any]) -> dict[str, Any]:
    """Normalize an API feature row without accepting identity or private fields."""
    return {
        "skill": str(payload.get("skill") or "speaking.fluency")[:96],
        "estimated_level": str(payload.get("estimated_level") or "A1").upper()
        if str(payload.get("estimated_level") or "A1").upper() in LEVELS
        else "A1",
        "difficulty": bounded(payload.get("difficulty", 0.35)),
        "historical_accuracy": bounded(payload.get("historical_accuracy", 0.5)),
        "recent_accuracy": bounded(payload.get("recent_accuracy", 0.5)),
        "attempt_count": max(0, min(10000, int(payload.get("attempt_count", 0) or 0))),
        "time_since_last_attempt_hours": max(
            0.0, min(87600.0, float(payload.get("time_since_last_attempt_hours", 720) or 0))
        ),
        "review_success": bounded(payload.get("review_success", 0.5)),
        "mistake_frequency": bounded(payload.get("mistake_frequency", 0.0)),
        "hint_usage": bounded(payload.get("hint_usage", 0.0)),
        "translation_usage": bounded(payload.get("translation_usage", 0.0)),
        "response_time_ms": max(100.0, min(300000.0, float(payload.get("response_time_ms", 12000) or 0))),
    }


def deterministic_probability(row: dict[str, Any]) -> float:
    """Cold-start fallback; this is explicitly a deterministic heuristic, not ML."""
    value = (
        0.08
        + 0.32 * row["historical_accuracy"]
        + 0.28 * row["recent_accuracy"]
        + 0.15 * row["review_success"]
        - 0.20 * row["difficulty"]
        - 0.12 * row["mistake_frequency"]
        - 0.06 * row["hint_usage"]
        - 0.04 * row["translation_usage"]
        + min(0.08, math.log1p(row["attempt_count"]) * 0.018)
        - min(0.08, math.log1p(row["time_since_last_attempt_hours"] / 24) * 0.018)
    )
    return bounded(value, 0.05, 0.95)
