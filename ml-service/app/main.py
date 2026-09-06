from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Literal

import joblib
import pandas as pd
from fastapi import FastAPI
from pydantic import BaseModel, Field

from .features import FEATURES, deterministic_probability, normalize

ROOT = Path(__file__).resolve().parents[1]
ARTIFACT = Path(os.getenv("LIFELINGO_MASTERY_MODEL", ROOT / "artifacts" / "mastery-model.joblib"))
REPORT = ROOT / "reports" / "mastery-evaluation.json"

app = FastAPI(title="LifeLingo ML", version="1.0.0", docs_url=None, redoc_url=None)
model = joblib.load(ARTIFACT) if ARTIFACT.exists() else None
report = json.loads(REPORT.read_text()) if REPORT.exists() else {}


class MasteryFeatures(BaseModel):
    skill: str = "speaking.fluency"
    estimated_level: str = "A1"
    difficulty: float = Field(0.35, ge=0, le=1)
    historical_accuracy: float = Field(0.5, ge=0, le=1)
    recent_accuracy: float = Field(0.5, ge=0, le=1)
    attempt_count: int = Field(0, ge=0)
    time_since_last_attempt_hours: float = Field(720, ge=0)
    review_success: float = Field(0.5, ge=0, le=1)
    mistake_frequency: float = Field(0, ge=0, le=1)
    hint_usage: float = Field(0, ge=0, le=1)
    translation_usage: float = Field(0, ge=0, le=1)
    response_time_ms: float = Field(12000, ge=0)


class SkillRow(MasteryFeatures):
    mastery: float = Field(0.5, ge=0, le=1)


def predict_row(payload: MasteryFeatures) -> dict:
    row = normalize(payload.model_dump())
    enough_history = row["attempt_count"] >= 5
    if model is None or not enough_history:
        probability = deterministic_probability(row)
        return {"probabilityCorrect": probability, "source": "DETERMINISTIC_FALLBACK", "confidence": "LOW"}
    probability = float(model.predict_proba(pd.DataFrame([row], columns=FEATURES))[0, 1])
    return {
        "probabilityCorrect": max(0.0, min(1.0, probability)),
        "source": "ML_BASELINE",
        "confidence": "HIGH" if row["attempt_count"] >= 20 else "MEDIUM",
        "modelId": report.get("selectedModelId"),
    }


@app.get("/v1/health")
def health() -> dict:
    return {"status": "ok", "modelLoaded": model is not None, "modelId": report.get("selectedModelId")}


@app.post("/v1/mastery/predict")
def mastery_predict(payload: MasteryFeatures) -> dict:
    return predict_row(payload)


@app.post("/v1/skills/weak")
def weak_skills(rows: list[SkillRow]) -> dict:
    ranked = []
    for item in rows:
        prediction = predict_row(item)
        if item.attempt_count >= 3 and (item.mastery < 0.58 or prediction["probabilityCorrect"] < 0.56):
            ranked.append({"skill": item.skill, "mastery": item.mastery, **prediction})
    return {"skills": sorted(ranked, key=lambda row: (row["mastery"], row["probabilityCorrect"]))[:8]}


@app.post("/v1/review/recommend")
def review_recommend(rows: list[SkillRow]) -> dict:
    ranked = []
    for item in rows:
        prediction = predict_row(item)
        forgetting = min(1.0, item.time_since_last_attempt_hours / (24 * 30))
        priority = 0.55 * (1 - item.mastery) + 0.30 * forgetting + 0.15 * (1 - prediction["probabilityCorrect"])
        ranked.append({"skill": item.skill, "priority": priority, **prediction})
    return {"recommendations": sorted(ranked, key=lambda row: row["priority"], reverse=True)[:12]}


@app.post("/v1/difficulty/recommend")
def difficulty_recommend(payload: MasteryFeatures) -> dict:
    prediction = predict_row(payload)
    p = prediction["probabilityCorrect"]
    label: Literal["TOO_EASY", "APPROPRIATE", "TOO_HARD"] = "TOO_EASY" if p > 0.84 else "TOO_HARD" if p < 0.48 else "APPROPRIATE"
    return {"label": label, **prediction}


@app.post("/v1/level/estimate")
def level_estimate(rows: list[SkillRow]) -> dict:
    qualified = [item for item in rows if item.attempt_count >= 3]
    if len(qualified) < 3:
        return {"label": "Still learning your level", "estimatedLevel": None, "confidence": 0.0}
    weighted = sum(item.mastery * max(3, item.attempt_count) for item in qualified) / sum(max(3, item.attempt_count) for item in qualified)
    index = 0 if weighted < 0.35 else 1 if weighted < 0.5 else 2 if weighted < 0.65 else 3 if weighted < 0.78 else 4 if weighted < 0.9 else 5
    confidence = min(0.95, 0.35 + len(qualified) * 0.05)
    return {"label": ("A1", "A2", "B1", "B2", "C1", "C2")[index], "estimatedLevel": ("A1", "A2", "B1", "B2", "C1", "C2")[index], "confidence": confidence, "officialCertification": False}
