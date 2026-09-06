#!/usr/bin/env python3
"""Build a future LoRA/PEFT-ready JSONL file from an already consent-filtered export.

This does not train or promote a model, and model-generated/unverified learner text is
excluded from assistant ground truth.
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

VERIFIED = {"LIFELINGO_VERIFIED", "SYSTEM_GROUND_TRUTH", "HUMAN_VERIFIED"}
PII = [re.compile(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}"), re.compile(r"(?:\+?\d[\d\s().-]{7,}\d)"), re.compile(r"https?://\S+")]


def sanitize(value: str, limit: int = 2000) -> str:
    result = str(value or "")
    for pattern in PII:
        result = pattern.sub("[REDACTED]", result)
    return result[:limit]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    accepted = []
    for line in args.source.read_text().splitlines():
        item = json.loads(line)
        if not item.get("trainingConsent") or item.get("qualityLabel") not in VERIFIED or not item.get("verifiedTarget"):
            continue
        accepted.append({"messages": [{"role": "system", "content": sanitize(item.get("scenarioInstruction", "LifeLingo English practice"), 1000)}, {"role": "user", "content": sanitize(item.get("learnerInput", ""))}, {"role": "assistant", "content": sanitize(item["verifiedTarget"])}], "metadata": {"quality": item["qualityLabel"], "datasetVersion": "conversation-v001", "sanitizerVersion": "pii-v1"}})
    args.output.write_text("".join(json.dumps(item, ensure_ascii=False) + "\n" for item in accepted))
    print(json.dumps({"version": "conversation-v001", "sampleCount": len(accepted), "status": "FUTURE_TRAINING_INPUT_ONLY"}))


if __name__ == "__main__":
    main()
