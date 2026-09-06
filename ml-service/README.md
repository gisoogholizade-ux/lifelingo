# LifeLingo ML service

This service predicts the probability that a learner will answer the next relevant item correctly. It is deliberately separate from generative AI and from the deterministic learner-model formulas in Postgres.

The checked-in development workflow uses a clearly labelled synthetic dataset. Its metrics prove that the pipeline, model comparison, serialization, fallback, and API work; they are not production-performance claims.

```bash
python scripts/build_dataset.py --synthetic --learners 600 --output data/mastery-v001.csv
python scripts/train_mastery.py --dataset data/mastery-v001.csv
python scripts/evaluate_model.py --dataset data/mastery-v001.csv
python scripts/register_model.py --status EXPERIMENTAL
uvicorn app.main:app --host 0.0.0.0 --port 8081
```

Production exports must be produced separately from consented learning events, sanitized, quality-filtered, versioned, and split by learner. Training is never exposed through HTTP and promotion is explicit.
