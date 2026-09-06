# LifeLingo AI V1 implementation map

## Current system reused

- Static vanilla SPA: `index.html` → `v66.html` with hash routes and additive runtime modules.
- Supabase Auth, Postgres, RLS, RPC, Storage and Realtime remain authoritative.
- Course/Chapter/Review data, XP, streak, passport, Avatar Surprise, Daily Surprise, Partners and Admin remain intact.
- `v67-speak-fix.js` remains the canonical deterministic mission system; `lifelingo-premium-speak.js` remains the animation/geometry layer.
- Browser SpeechRecognition and SpeechSynthesis remain voice capture/playback fallbacks. They are not pronunciation scoring.

## Added system

- Versioned skill taxonomy and curated A1–B2 knowledge files.
- Metadata-aware retrieval that sends only the top relevant items to the orchestrator.
- RLS-protected learning events, learner models, per-skill mastery, spaced repetition, AI-only sessions/turns, usage and separate training consent.
- Deterministic mastery/review/level/cold-start services that work without an AI provider.
- Supabase Edge Function AI orchestrator with provider abstraction, response validation, timeouts and usage enforcement.
- AI Partner and AI mission UI inside Speak, preserving the animated stage.
- Reproducible Python mastery-prediction pipeline, group-by-learner splits, baseline comparison, registry metadata and FastAPI service.
- Private dataset/model/training metadata with explicit admin promotion and rollback RPCs.

## Boundaries

- Human Partner messages and identities never enter AI context, RAG or datasets.
- Raw voice is not stored by AI Partner and cannot be used for training under V1 consent.
- AI output cannot grant XP or mutate mission/application state; only validated fields are accepted and the backend remains authoritative.
- No online weight updates. Personalization updates immediately; model training remains offline and explicitly promoted.
- If no external provider secret is configured, the orchestrator uses the bounded Mock provider and the regular product remains available.

## Initial mastery formula

For an assessable event, normalize score to `[0,1]`, apply a difficulty weight of `0.85 + 0.30*difficulty`, subtract `0.08` for hint use and `0.06` for translation use, then clamp. Update mastery with an evidence-sensitive exponential average where alpha decreases from `0.35` toward a floor of `0.12`. A skill needs at least three observations before it can be labelled weak and five before it can be labelled strong.

Weak: evidence ≥ 3 and mastery < 0.58 or at least three recorded errors. Strong: evidence ≥ 5 and mastery ≥ 0.78. Difficulty remains `APPROPRIATE` before three observations. Level remains “Still learning your level” before twelve total skill observations; subsequent CEFR labels are estimates, never certifications.

## Improvement pipeline

`learning activity → separate consent → PII sanitizer → quality filter → learner-group split → versioned dataset → train baselines → evaluate/calibrate → registry EXPERIMENTAL → STAGING → explicit admin promotion → PRODUCTION`, with the previous production model retained for rollback.
