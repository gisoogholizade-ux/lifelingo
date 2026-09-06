#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ALLOWED = {"EXPERIMENTAL", "STAGING", "PRODUCTION", "ARCHIVED", "REJECTED"}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--status", default="EXPERIMENTAL", choices=sorted(ALLOWED))
    args = parser.parse_args()
    report = json.loads((ROOT / "reports" / "mastery-evaluation.json").read_text())
    registry_path = ROOT / "registry" / "models.json"
    registry_path.parent.mkdir(parents=True, exist_ok=True)
    registry = json.loads(registry_path.read_text()) if registry_path.exists() else {"schemaVersion": 1, "models": []}
    model_id = report["selectedModelId"]
    entry = {
        "modelId": model_id, "modelType": "NEXT_ANSWER_MASTERY", "version": "v001",
        "datasetVersion": report["datasetVersion"], "createdAt": datetime.now(timezone.utc).isoformat(),
        "metrics": report["test"], "parameters": {"algorithm": report["selectedAlgorithm"]},
        "artifact": "artifacts/mastery-model.joblib", "status": args.status,
    }
    registry["models"] = [item for item in registry["models"] if item["modelId"] != model_id] + [entry]
    registry_path.write_text(json.dumps(registry, indent=2) + "\n")
    print(json.dumps(entry))


if __name__ == "__main__":
    main()
