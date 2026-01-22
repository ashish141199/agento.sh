# frozen_string_literal: true

# Document represents a parsed document
class Document
  attr_reader :content, :source, :word_count

  # Creates a new Document instance
  # @param content [String] The document content
  # @param source [String] The source filename
  def initialize(content, source)
    raise ArgumentError, 'Document content cannot be empty' if content.nil? || content.empty?

    @content = content
    @source = source
    @word_count = content.split(/\s+/).length
  end
end

# Base class for document parsers
class DocumentParser
  # Checks if this parser supports the given MIME type
  # @param mime_type [String] The MIME type to check
  # @return [Boolean]
  def supports?(mime_type)
    raise NotImplementedError, 'Subclasses must implement supports?'
  end

  # Parses the buffer and returns a Document
  # @param buffer [String] The file content
  # @param filename [String] The source filename
  # @return [Document]
  def parse(buffer, filename)
    raise NotImplementedError, 'Subclasses must implement parse'
  end
end

# Handles plain text documents
class TextParser < DocumentParser
  SUPPORTED_TYPES = ['text/plain'].freeze

  def supports?(mime_type)
    SUPPORTED_TYPES.include?(mime_type)
  end

  def parse(buffer, filename)
    Document.new(buffer, filename)
  end
end

# Utility class for text chunking
class TextChunker
  DEFAULT_CHUNK_SIZE = 1000

  # @param chunk_size [Integer] Target size for each chunk
  def initialize(chunk_size = DEFAULT_CHUNK_SIZE)
    @chunk_size = chunk_size
  end

  # Splits text into chunks
  # @param text [String] The text to chunk
  # @return [Array<String>] List of text chunks
  def chunk(text)
    chunks = []
    current_chunk = ''

    text.split('. ').each do |sentence|
      if current_chunk.length + sentence.length > @chunk_size
        chunks << current_chunk.strip unless current_chunk.empty?
        current_chunk = ''
      end
      current_chunk += current_chunk.empty? ? sentence : ". #{sentence}"
    end

    chunks << current_chunk.strip unless current_chunk.empty?
    chunks
  end
end
