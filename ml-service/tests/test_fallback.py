from app.features import deterministic_probability, normalize


def test_fallback_is_bounded_and_responds_to_evidence():
    weak = normalize({"recent_accuracy": 0.2, "historical_accuracy": 0.3, "difficulty": 0.8, "attempt_count": 7})
    strong = normalize({"recent_accuracy": 0.9, "historical_accuracy": 0.85, "difficulty": 0.3, "attempt_count": 20})
    assert 0.05 <= deterministic_probability(weak) < deterministic_probability(strong) <= 0.95
