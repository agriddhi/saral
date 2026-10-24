"""
Saral server — FastAPI entry point.

Routes:
  POST /api/explain    — explain pasted text paragraph by paragraph
  GET  /               — serve static/index.html
"""

import os
import hashlib
import json
from typing import List
from pathlib import Path
from dotenv import load_dotenv

# Load .env file if present
load_dotenv(Path(__file__).parent.parent / ".env")

from fastapi import FastAPI, Request, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

from app.llm import explain_paragraph, summarize_document


app = FastAPI(title="Saral", version="phase-1")

# In-memory LRU cache: key = hash(text) + index → explanation dict
_cache: dict[str, dict] = {}
_cache_limit = 500

# Store source text by session/content hash so verifier can check against it
_source_store: dict[str, str] = {}


class ExplainRequest(BaseModel):
    text: str


class ExplainResponse(BaseModel):
    paragraphs: List[dict]
    content_hash: str


def _content_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]


def _split_paragraphs(text: str) -> List[str]:
    """Split on blank lines, preserving multi-line paragraphs."""
    raw = text.split("\n")
    paragraphs = []
    current = []
    for line in raw:
        stripped = line.strip()
        if stripped == "":
            if current:
                paragraphs.append("\n".join(current).strip())
                current = []
        else:
            current.append(line)
    if current:
        paragraphs.append("\n".join(current).strip())
    # Filter out empty paragraphs
    return [p for p in paragraphs if p]


def _paragraph_hash(content_hash: str, index: int) -> str:
    return f"{content_hash}:{index}"


def _get_cached(content_hash: str, index: int) -> dict | None:
    key = _paragraph_hash(content_hash, index)
    return _cache.get(key)


def _set_cache(content_hash: str, index: int, value: dict) -> None:
    key = _paragraph_hash(content_hash, index)
    if len(_cache) >= _cache_limit:
        # Simple eviction: drop oldest key
        oldest = next(iter(_cache))
        _cache.pop(oldest)
    _cache[key] = value


@app.post("/api/explain", response_model=ExplainResponse)
async def api_explain(req: ExplainRequest):
    text = req.text
    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="No text provided.")

    paragraphs = _split_paragraphs(text)
    if not paragraphs:
        raise HTTPException(status_code=400, detail="No paragraphs found.")

    content_hash = _content_hash(text)
    _source_store[content_hash] = text

    results = []
    for idx, paragraph in enumerate(paragraphs):
        cached = _get_cached(content_hash, idx)
        if cached is not None:
            results.append(cached)
            continue

        # Check for API key availability
        if not os.environ.get("GEMINI_API_KEY"):
            # Honest failure: return original with error marker
            fallback = {
                "original": paragraph,
                "faithful": "",
                "quote_faithful": "",
                "simple": "",
                "quote_simple": "",
                "doubts": [],
                "_verified": False,
                "_error": "GEMINI_API_KEY is not set. Showing the original text only.",
            }
            _set_cache(content_hash, idx, fallback)
            results.append(fallback)
            continue

        try:
            explanation = explain_paragraph(paragraph)
        except Exception as exc:
            fallback = {
                "original": paragraph,
                "faithful": "",
                "quote_faithful": "",
                "simple": "",
                "quote_simple": "",
                "doubts": [],
                "_verified": False,
                "_error": f"LLM error: {exc}",
            }
            _set_cache(content_hash, idx, fallback)
            results.append(fallback)
            continue

        _set_cache(content_hash, idx, explanation)
        results.append(explanation)

    return ExplainResponse(paragraphs=results, content_hash=content_hash)


class SummaryRequest(BaseModel):
    content_hash: str


@app.post("/api/summary")
async def api_summary(req: SummaryRequest):
    content_hash = req.content_hash
    text = _source_store.get(content_hash)
    if not text:
        raise HTTPException(status_code=404, detail="Document not found. Please re-submit the text.")

    paragraphs = _split_paragraphs(text)
    if not paragraphs:
        raise HTTPException(status_code=400, detail="No paragraphs found.")

    if not os.environ.get("GEMINI_API_KEY"):
        return JSONResponse(
            status_code=503,
            content={
                "summary": "",
                "quote": "",
                "_verified": False,
                "_error": "GEMINI_API_KEY is not set.",
            },
        )

    try:
        result = summarize_document(paragraphs)
    except Exception as exc:
        return JSONResponse(
            status_code=503,
            content={
                "summary": "",
                "quote": "",
                "_verified": False,
                "_error": f"LLM error: {exc}",
            },
        )

    return result


@app.get("/")
async def index():
    static_path = os.path.join(os.path.dirname(__file__), "..", "static", "index.html")
    if os.path.exists(static_path):
        return FileResponse(static_path)
    return {"message": "Saral API is running. Place static/index.html to use the reader."}


# Mount static files directory
static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
if os.path.isdir(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")
