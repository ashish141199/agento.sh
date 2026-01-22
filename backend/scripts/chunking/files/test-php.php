<?php

declare(strict_types=1);

namespace Knowledge\Document;

/**
 * Represents a parsed document.
 */
class Document
{
    private string $content;
    private string $source;
    private int $wordCount;

    /**
     * Creates a new Document instance.
     *
     * @param string $content The document content
     * @param string $source The source filename
     * @throws \InvalidArgumentException If content is empty
     */
    public function __construct(string $content, string $source)
    {
        if (empty($content)) {
            throw new \InvalidArgumentException('Document content cannot be empty');
        }

        $this->content = $content;
        $this->source = $source;
        $this->wordCount = str_word_count($content);
    }

    public function getContent(): string
    {
        return $this->content;
    }

    public function getSource(): string
    {
        return $this->source;
    }

    public function getWordCount(): int
    {
        return $this->wordCount;
    }
}

/**
 * Interface for document parsers.
 */
interface DocumentParserInterface
{
    /**
     * Checks if this parser supports the given MIME type.
     */
    public function supports(string $mimeType): bool;

    /**
     * Parses the buffer and returns a Document.
     */
    public function parse(string $buffer, string $filename): Document;
}

/**
 * Handles plain text documents.
 */
class TextParser implements DocumentParserInterface
{
    private const SUPPORTED_TYPES = ['text/plain'];

    public function supports(string $mimeType): bool
    {
        return in_array($mimeType, self::SUPPORTED_TYPES, true);
    }

    public function parse(string $buffer, string $filename): Document
    {
        return new Document($buffer, $filename);
    }
}

/**
 * Utility class for text chunking.
 */
class TextChunker
{
    private int $chunkSize;

    public function __construct(int $chunkSize = 1000)
    {
        $this->chunkSize = $chunkSize;
    }

    /**
     * Splits text into chunks of approximately chunkSize characters.
     *
     * @param string $text The text to chunk
     * @return array<string> List of text chunks
     */
    public function chunk(string $text): array
    {
        $chunks = [];
        $currentChunk = '';

        $sentences = explode('. ', $text);
        foreach ($sentences as $sentence) {
            if (strlen($currentChunk) + strlen($sentence) > $this->chunkSize) {
                if (!empty($currentChunk)) {
                    $chunks[] = trim($currentChunk);
                    $currentChunk = '';
                }
            }
            $currentChunk .= empty($currentChunk) ? $sentence : '. ' . $sentence;
        }

        if (!empty($currentChunk)) {
            $chunks[] = trim($currentChunk);
        }

        return $chunks;
    }
}
