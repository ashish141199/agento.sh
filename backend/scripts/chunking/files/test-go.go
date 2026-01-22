// Package document provides document processing utilities.
package document

import (
	"errors"
	"strings"
)

// Document represents a parsed document.
type Document struct {
	Content   string
	Source    string
	WordCount int
}

// Parser defines the interface for document parsers.
type Parser interface {
	Supports(mimeType string) bool
	Parse(buffer []byte, filename string) (*Document, error)
}

// TextParser handles plain text documents.
type TextParser struct {
	config map[string]interface{}
}

// NewTextParser creates a new text parser instance.
func NewTextParser() *TextParser {
	return &TextParser{
		config: make(map[string]interface{}),
	}
}

// Supports checks if the parser handles the given MIME type.
func (p *TextParser) Supports(mimeType string) bool {
	return mimeType == "text/plain"
}

// Parse converts buffer to document content.
func (p *TextParser) Parse(buffer []byte, filename string) (*Document, error) {
	content := string(buffer)
	if content == "" {
		return nil, errors.New("document content cannot be empty")
	}

	words := strings.Fields(content)
	return &Document{
		Content:   content,
		Source:    filename,
		WordCount: len(words),
	}, nil
}

// ChunkText splits text into chunks of approximately chunkSize characters.
func ChunkText(text string, chunkSize int) []string {
	var chunks []string
	var currentChunk strings.Builder

	sentences := strings.Split(text, ". ")
	for _, sentence := range sentences {
		if currentChunk.Len()+len(sentence) > chunkSize {
			if currentChunk.Len() > 0 {
				chunks = append(chunks, strings.TrimSpace(currentChunk.String()))
				currentChunk.Reset()
			}
		}
		if currentChunk.Len() > 0 {
			currentChunk.WriteString(". ")
		}
		currentChunk.WriteString(sentence)
	}

	if currentChunk.Len() > 0 {
		chunks = append(chunks, strings.TrimSpace(currentChunk.String()))
	}

	return chunks
}
