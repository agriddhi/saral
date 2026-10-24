"""
Tests for the quote verifier — the core guarantee of Saral.

Rules from SPEC.md:
- A deliberately PARAPHRASED claim must FAIL verification.
- A normalised-but-identical claim (smart quotes, ellipsis, hyphenation)
  must PASS.
"""

from app.verifier import verify_quote


SOURCE = (
    "The Policyholder shall be entitled to surrender the policy at any time "
    "during the policy term, subject to the condition that at least two full "
    "years' premiums have been paid. Upon surrender, the Surrender Value — "
    "which is higher of the Guaranteed Surrender Value or the Special Surrender "
    "Value — shall be payable. The company reserves the right to defer payment "
    "of the surrender value by a period not exceeding six months from the date "
    "of receipt of the application."
)


def test_paraphrased_claim_fails():
    """
    A claim that rewords the source (paraphrase) must be rejected.
    """
    paraphrase = (
        "You can give up the policy whenever you want as long as you have paid "
        "premiums for at least two years."
    )
    assert verify_quote(paraphrase, SOURCE) is False


def test_normalized_identical_claim_passes():
    """
    Smart quotes, em-dash, ellipsis and other typographic variants that
    normalise to the same string must be accepted.
    """
    # Original with straight quotes and regular dash
    original = (
        "The company reserves the right to defer payment of the surrender value "
        "by a period not exceeding six months from the date of receipt of the application."
    )
    # Variant with smart quotes, em-dash, ellipsis
    variant = (
        "The company reserves the right to defer payment of the surrender value "
        "by a period not exceeding six months from the date of receipt of the application"
    )
    # This exact sentence appears in SOURCE, so both should pass
    assert verify_quote(original, SOURCE) is True
    assert verify_quote(variant, SOURCE) is True


def test_smart_quotes_and_dashes_pass():
    """
    Explicit test for smart quotes and em-dash normalisation.
    """
    claim_with_smart = (
        "The Policyholder shall be entitled to surrender the policy at any time "
        "during the policy term, subject to the condition that at least two full "
        "years' premiums have been paid."
    )
    assert verify_quote(claim_with_smart, SOURCE) is True


def test_ellipsis_passes():
    """
    A claim using the Unicode ellipsis character instead of three dots
    must normalise and match.
    """
    source_with_ellipsis = "Wait... the terms may change without notice."
    claim = "Wait... the terms may change without notice."
    assert verify_quote(claim, source_with_ellipsis) is True


def test_empty_claim_fails():
    """
    An empty or whitespace-only claim must be rejected.
    """
    assert verify_quote("", SOURCE) is False
    assert verify_quote("   ", SOURCE) is False


def test_nonexistent_claim_fails():
    """
    A sentence that does not appear in the source at all must be rejected.
    """
    alien = "The moon is made of green cheese and policies are optional."
    assert verify_quote(alien, SOURCE) is False
