"""
Test Python module for knowledge system.
Demonstrates various Python constructs for chunking.
"""

from typing import List, Optional
from dataclasses import dataclass


@dataclass
class Document:
    """Represents a parsed document."""

    content: str
    source: str
    word_count: int

    def __post_init__(self):
        """Validate document after initialization."""
        if not self.content:
            raise ValueError("Document content cannot be empty")


class DocumentParser:
    """Base class for document parsers."""

    def __init__(self, config: Optional[dict] = None):
        """Initialize parser with optional config."""
        self.config = config or {}

    def supports(self, mime_type: str) -> bool:
        """Check if parser supports the given MIME type."""
        raise NotImplementedError("Subclasses must implement supports()")

    def parse(self, buffer: bytes, filename: str) -> Document:
        """Parse document and return content."""
        raise NotImplementedError("Subclasses must implement parse()")


def chunk_text(text: str, chunk_size: int = 1000) -> List[str]:
    """
    Split text into chunks of approximately chunk_size characters.

    Args:
        text: The text to chunk
        chunk_size: Target size for each chunk

    Returns:
        List of text chunks
    """
    chunks = []
    current_chunk = ""

    for sentence in text.split(". "):
        if len(current_chunk) + len(sentence) > chunk_size:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = sentence
        else:
            current_chunk += ". " + sentence if current_chunk else sentence

    if current_chunk:
        chunks.append(current_chunk.strip())

    return chunks


if __name__ == "__main__":
    # Example usage
    sample_text = "This is a test. " * 100
    chunks = chunk_text(sample_text, 500)
    print(f"Created {len(chunks)} chunks")
