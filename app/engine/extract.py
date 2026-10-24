"""Section extraction engine for Saral documents."""

from typing import List


def split_sections(text: str) -> List[str]:
    """Split text into sections or paragraphs."""
    raw = text.split("\n")
    sections = []
    current = []
    for line in raw:
        stripped = line.strip()
        if stripped == "":
            if current:
                sections.append("\n".join(current).strip())
                current = []
        else:
            current.append(line)
    if current:
        sections.append("\n".join(current).strip())
    return [s for s in sections if s]
