"""
Quote verifier — the heart of Saral.

Every AI-generated block must carry a verbatim sentence from the source.
This module normalises and checks whether a claimed quote actually exists
in the stored source text.
"""

import re
import unicodedata


def _normalize(text: str) -> str:
    """
    Normalise case, whitespace, smart quotes, dashes, ellipsis,
    hyphenation and newlines so that minor typographic differences
    do not break verification.
    """
    # Unicode NFKC for composed characters
    text = unicodedata.normalize("NFKC", text)
    # Lowercase
    text = text.lower()
    # Smart quotes → straight
    text = text.replace("\u201c", '"').replace("\u201d", '"')
    text = text.replace("\u2018", "'").replace("\u2019", "'")
    # En-dash, em-dash, figure-dash → hyphen
    text = text.replace("\u2013", "-").replace("\u2014", "-")
    text = text.replace("\u2015", "-")
    # Ellipsis → three dots
    text = text.replace("\u2026", "...")
    # Non-breaking spaces and other fancy spaces → normal space
    text = text.replace("\u00a0", " ").replace("\u2002", " ")
    text = text.replace("\u2003", " ").replace("\u2009", " ")
    # Hyphenated line-breaks: remove soft-hyphens and join
    text = text.replace("\u00ad", "")
    # Collapse all whitespace to a single space
    text = " ".join(text.split())
    return text.strip()


def verify_quote(claim_quote: str, source_text: str) -> bool:
    """
    Return True if `claim_quote` appears verbatim (after normalisation)
    inside `source_text`.

    Parameters
    ----------
    claim_quote : str
        The sentence the AI claims it copied verbatim.
    source_text : str
        The full original document paragraph.

    Returns
    -------
    bool
    """
    if not claim_quote or not source_text:
        return False

    norm_claim = _normalize(claim_quote)
    norm_source = _normalize(source_text)

    if not norm_claim:
        return False

    return norm_claim in norm_source
