from app.services.scoring import suggest_data_quality_score, suggest_reference_grade


def test_quality_score():
    score = suggest_data_quality_score(True, "10.1/abc", "pubmed", True)
    assert score >= 7


def test_reference_grade():
    assert suggest_reference_grade(7) == "A"
    assert suggest_reference_grade(5) == "B"
    assert suggest_reference_grade(3) == "C"
    assert suggest_reference_grade(1) == "D"
