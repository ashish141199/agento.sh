//! Document processing utilities in Rust
//! Test file for knowledge system chunking

use std::error::Error;
use std::fmt;

/// Represents a parsed document
#[derive(Debug, Clone)]
pub struct Document {
    content: String,
    source: String,
    word_count: usize,
}

/// Error type for document operations
#[derive(Debug)]
pub struct DocumentError {
    message: String,
}

impl fmt::Display for DocumentError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.message)
    }
}

impl Error for DocumentError {}

impl Document {
    /// Creates a new Document instance
    ///
    /// # Arguments
    /// * `content` - The document content
    /// * `source` - The source filename
    ///
    /// # Returns
    /// A Result containing the Document or an error
    pub fn new(content: String, source: String) -> Result<Self, DocumentError> {
        if content.is_empty() {
            return Err(DocumentError {
                message: "Document content cannot be empty".to_string(),
            });
        }

        let word_count = content.split_whitespace().count();

        Ok(Document {
            content,
            source,
            word_count,
        })
    }

    pub fn content(&self) -> &str {
        &self.content
    }

    pub fn source(&self) -> &str {
        &self.source
    }

    pub fn word_count(&self) -> usize {
        self.word_count
    }
}

/// Trait for document parsers
pub trait DocumentParser {
    /// Checks if this parser supports the given MIME type
    fn supports(&self, mime_type: &str) -> bool;

    /// Parses the buffer and returns a Document
    fn parse(&self, buffer: &[u8], filename: &str) -> Result<Document, Box<dyn Error>>;
}

/// Handles plain text documents
pub struct TextParser;

impl DocumentParser for TextParser {
    fn supports(&self, mime_type: &str) -> bool {
        mime_type == "text/plain"
    }

    fn parse(&self, buffer: &[u8], filename: &str) -> Result<Document, Box<dyn Error>> {
        let content = String::from_utf8(buffer.to_vec())?;
        Ok(Document::new(content, filename.to_string())?)
    }
}

/// Utility struct for text chunking
pub struct TextChunker {
    chunk_size: usize,
}

impl TextChunker {
    /// Creates a new TextChunker with the specified chunk size
    pub fn new(chunk_size: usize) -> Self {
        TextChunker { chunk_size }
    }

    /// Splits text into chunks of approximately chunk_size characters
    pub fn chunk(&self, text: &str) -> Vec<String> {
        let mut chunks = Vec::new();
        let mut current_chunk = String::new();

        for sentence in text.split(". ") {
            if current_chunk.len() + sentence.len() > self.chunk_size {
                if !current_chunk.is_empty() {
                    chunks.push(current_chunk.trim().to_string());
                    current_chunk.clear();
                }
            }
            if !current_chunk.is_empty() {
                current_chunk.push_str(". ");
            }
            current_chunk.push_str(sentence);
        }

        if !current_chunk.is_empty() {
            chunks.push(current_chunk.trim().to_string());
        }

        chunks
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_document_creation() {
        let doc = Document::new("Hello world".to_string(), "test.txt".to_string()).unwrap();
        assert_eq!(doc.word_count(), 2);
    }

    #[test]
    fn test_empty_content_error() {
        let result = Document::new("".to_string(), "test.txt".to_string());
        assert!(result.is_err());
    }
}
