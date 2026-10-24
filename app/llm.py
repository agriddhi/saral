"""
LLM client for Saral — one Gemini call per paragraph.

Each call returns structured JSON:
  original   verbatim paragraph, never altered
  faithful   same technical terms, clearer structure
  simple     everyday words, short sentences
  doubts     2-4 questions a real first-time reader would ask, answered

Every generated block carries a supporting verbatim quote verified server-side.
"""

import os
import json
from typing import Optional

from google import genai
from google.genai import types

from app.verifier import verify_quote


MODEL_NAME = "gemini-2.0-flash-lite"

# Reuse client across calls
_client: Optional[genai.Client] = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY environment variable is not set.")
        _client = genai.Client(api_key=api_key)
    return _client


_SYSTEM_PROMPT = """You are Saral, a plain-language reader for first-time investors in India.

You receive ONE paragraph of a financial or legal document.
You MUST respond in strict JSON. Do not add markdown code fences.

Required fields:
- "original": the paragraph text, reproduced exactly as given
- "faithful": a rewrite that keeps all technical terms but makes the structure clearer. After it, include "quote_faithful": a sentence copied VERBATIM from the original paragraph.
- "simple": a rewrite using only everyday words and short sentences. After it, include "quote_simple": a sentence copied VERBATIM from the original paragraph.
- "doubts": a list of 2 to 4 objects. Each object has:
    - "question": a question a real first-time reader would ask
    - "answer": a concise answer
    - "quote": a sentence copied VERBATIM from the original paragraph that supports the answer

Rules:
1. Every quote must be an exact sentence from the original paragraph.
2. Do not reword the quote. Copy it exactly, including punctuation.
3. Keep the JSON valid and well-formed.
"""


def explain_paragraph(paragraph: str, timeout: float = 30.0) -> dict:
    """
    Call Gemini to explain a single paragraph.

    Returns a dict with keys: original, faithful, quote_faithful,
    simple, quote_simple, doubts (list), and _verified (bool).
    If verification of any quote fails, the corresponding block is dropped
    and replaced with the original paragraph text.
    """
    if not paragraph or not paragraph.strip():
        return {
            "original": "",
            "faithful": "",
            "quote_faithful": "",
            "simple": "",
            "quote_simple": "",
            "doubts": [],
            "_verified": False,
        }

    client = _get_client()

    contents = [
        types.Content(
            role="user",
            parts=[
                types.Part.from_text(text=_SYSTEM_PROMPT),
            ],
        ),
        types.Content(
            role="user",
            parts=[
                types.Part.from_text(text=paragraph),
            ],
        ),
    ]

    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        temperature=0.2,
    )

    try:
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=contents,
            config=config,
        )
    except Exception as exc:
        # Honest failure: return the original with a failure marker
        return {
            "original": paragraph,
            "faithful": "",
            "quote_faithful": "",
            "simple": "",
            "quote_simple": "",
            "doubts": [],
            "_verified": False,
            "_error": f"Gemini call failed: {exc}",
        }

    raw = response.text or "{}"
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        return {
            "original": paragraph,
            "faithful": "",
            "quote_faithful": "",
            "simple": "",
            "quote_simple": "",
            "doubts": [],
            "_verified": False,
            "_error": f"JSON parse failed: {exc}",
        }

    # Ensure original is present and exact
    data["original"] = paragraph

    # Verify quotes
    faithful_ok = verify_quote(data.get("quote_faithful", ""), paragraph)
    simple_ok = verify_quote(data.get("quote_simple", ""), paragraph)

    if not faithful_ok:
        data["faithful"] = ""
        data["quote_faithful"] = ""
    if not simple_ok:
        data["simple"] = ""
        data["quote_simple"] = ""

    # Verify doubt quotes
    doubts = data.get("doubts", [])
    verified_doubts = []
    for d in doubts:
        if verify_quote(d.get("quote", ""), paragraph):
            verified_doubts.append(d)
    data["doubts"] = verified_doubts

    data["_verified"] = faithful_ok and simple_ok and len(verified_doubts) > 0

    # If nothing verified at all, return the original text as fallback
    if not data["_verified"]:
        data["faithful"] = ""
        data["simple"] = ""
        data["doubts"] = []
        data["_error"] = data.get("_error", "No verified quotes found.")

    return data


def summarize_document(paragraphs: list[str]) -> dict:
    """
    Generate a whole-document summary on button press.
    Each key carries a verbatim quote verified against the concatenated text.
    """
    full_text = "\n\n".join(paragraphs)
    if not full_text.strip():
        return {"summary": "", "quote": "", "_verified": False}

    client = _get_client()

    prompt = (
        "Summarise the following document for a first-time investor in India. "
        "Use everyday language. Keep it to 3-5 sentences. "
        "After the summary, provide a single sentence copied VERBATIM from the document. "
        "Return strict JSON with keys: 'summary' and 'quote'."
    )

    contents = [
        types.Content(role="user", parts=[types.Part.from_text(text=prompt)]),
        types.Content(role="user", parts=[types.Part.from_text(text=full_text)]),
    ]

    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        temperature=0.3,
    )

    try:
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=contents,
            config=config,
        )
    except Exception as exc:
        return {
            "summary": "",
            "quote": "",
            "_verified": False,
            "_error": f"Gemini call failed: {exc}",
        }

    raw = response.text or "{}"
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        return {
            "summary": "",
            "quote": "",
            "_verified": False,
            "_error": f"JSON parse failed: {exc}",
        }

    quote = data.get("quote", "")
    if verify_quote(quote, full_text):
        data["_verified"] = True
    else:
        data["summary"] = ""
        data["quote"] = ""
        data["_verified"] = False
        data["_error"] = "Summary quote verification failed."

    return data
