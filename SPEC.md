# Saral — Plain-Language Reader for First-Time Investors in India

## Purpose
A reader that takes pasted financial/legal text (policy, loan annexure, KID) and explains every paragraph in three layers — faithful, simple, and doubts — so a first-time investor who was handed a 20-40 page document can understand what they are signing.

## Stack
- **Backend:** Python 3.14 + FastAPI + Pydantic
- **Frontend:** Vanilla HTML/CSS/JS — no framework, no build step, no npm
- **LLM:** google-genai (Gemini), key from `GEMINI_API_KEY` env var only
- **No database, no accounts, no tracking, no personal data**

## Core Rule — Quote Verification
Every AI-generated block (faithful, simple, doubts, gloss, Q&A) MUST carry a sentence copied VERBATIM from the source document.

- Server-side code verifies that quote against the **stored source text** before returning it — against the document, not the prompt.
- Normalise case, whitespace, smart vs straight quotes, dashes, ellipsis, hyphenation and newlines before comparing.
- If verification **fails:** DROP the claim and return the document's own surrounding lines. Never return an empty block. No exceptions.

## Reading Structure — One Gemini Call Per Paragraph
Each call returns JSON with:
- `original` — verbatim paragraph, never altered
- `faithful` — same technical terms, clearer structure, meaning not simplified
- `simple` — everyday words, short sentences
- `doubts` — 2-4 questions a real first-time reader would ask, answered and quote-verified

`faithful`, `simple`, and `doubts` each carry their own supporting verbatim quote.

## Phase 1 Features
1. **POST /api/explain** — pasted text in, split to paragraphs, one call each, verified, cached by content hash + index.
2. **Lazy render** — explanation loads when a paragraph scrolls into view (debounced). Fast first paint, never block on the whole document.
3. **Split pane** — source left, explanation right, active paragraph linked and highlighted in both. Under each original: faithful, simple, doubts.
4. **Inline gloss** — hard terms underlined, click/tap shows verified meaning.
5. **Whole-document summary** — generated only on button press.
6. **Honest failure states** — missing key or failed call must say so and show the document's own text. Never blank, never silent.

## Not Yet (Phase 2+)
- /api/ask (chat with document)
- /api/flags (risk flags)
- /api/fit (product-fit check)
- /api/rights (investor rights)
- /api/transcribe (image/PDF OCR)
- Voice, read-aloud
- Hindi / Tamil
- Suspicious-message mode

## Entry Point
`app/server.py` — run with `uvicorn app.server:app --reload`

## Testing
`python -m pytest -q` must be green. Pytest covers verifier:
- A deliberately PARAPHRASED claim must FAIL verification
- A normalised-but-identical claim (smart quotes, ellipsis, hyphenation) must PASS
