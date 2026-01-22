package com.knowledge.document;

import java.util.ArrayList;
import java.util.List;

/**
 * Represents a parsed document.
 */
public class Document {
    private String content;
    private String source;
    private int wordCount;

    /**
     * Creates a new Document instance.
     * @param content The document content
     * @param source The source filename
     */
    public Document(String content, String source) {
        if (content == null || content.isEmpty()) {
            throw new IllegalArgumentException("Document content cannot be empty");
        }
        this.content = content;
        this.source = source;
        this.wordCount = content.split("\\s+").length;
    }

    public String getContent() {
        return content;
    }

    public String getSource() {
        return source;
    }

    public int getWordCount() {
        return wordCount;
    }
}

/**
 * Interface for document parsers.
 */
interface DocumentParser {
    /**
     * Checks if this parser supports the given MIME type.
     * @param mimeType The MIME type to check
     * @return true if supported
     */
    boolean supports(String mimeType);

    /**
     * Parses the buffer and returns a Document.
     * @param buffer The file content
     * @param filename The source filename
     * @return Parsed document
     */
    Document parse(byte[] buffer, String filename);
}

/**
 * Utility class for text chunking.
 */
class TextChunker {
    private int chunkSize;

    public TextChunker(int chunkSize) {
        this.chunkSize = chunkSize;
    }

    /**
     * Splits text into chunks of approximately chunkSize characters.
     * @param text The text to chunk
     * @return List of text chunks
     */
    public List<String> chunk(String text) {
        List<String> chunks = new ArrayList<>();
        StringBuilder currentChunk = new StringBuilder();

        String[] sentences = text.split("\\. ");
        for (String sentence : sentences) {
            if (currentChunk.length() + sentence.length() > chunkSize) {
                if (currentChunk.length() > 0) {
                    chunks.add(currentChunk.toString().trim());
                    currentChunk = new StringBuilder();
                }
            }
            if (currentChunk.length() > 0) {
                currentChunk.append(". ");
            }
            currentChunk.append(sentence);
        }

        if (currentChunk.length() > 0) {
            chunks.add(currentChunk.toString().trim());
        }

        return chunks;
    }
}
