/**
 * Document processing utilities in C++
 * Test file for knowledge system chunking
 */

#include <string>
#include <vector>
#include <stdexcept>
#include <sstream>

namespace knowledge {

/**
 * Represents a parsed document
 */
class Document {
private:
    std::string content_;
    std::string source_;
    int wordCount_;

    int countWords(const std::string& text) {
        std::istringstream stream(text);
        std::string word;
        int count = 0;
        while (stream >> word) {
            count++;
        }
        return count;
    }

public:
    /**
     * Creates a new Document instance
     * @param content The document content
     * @param source The source filename
     * @throws std::invalid_argument If content is empty
     */
    Document(const std::string& content, const std::string& source)
        : content_(content), source_(source) {
        if (content.empty()) {
            throw std::invalid_argument("Document content cannot be empty");
        }
        wordCount_ = countWords(content);
    }

    const std::string& getContent() const { return content_; }
    const std::string& getSource() const { return source_; }
    int getWordCount() const { return wordCount_; }
};

/**
 * Interface for document parsers
 */
class DocumentParser {
public:
    virtual ~DocumentParser() = default;

    /**
     * Checks if this parser supports the given MIME type
     */
    virtual bool supports(const std::string& mimeType) const = 0;

    /**
     * Parses the buffer and returns a Document
     */
    virtual Document parse(const std::string& buffer, const std::string& filename) const = 0;
};

/**
 * Handles plain text documents
 */
class TextParser : public DocumentParser {
public:
    bool supports(const std::string& mimeType) const override {
        return mimeType == "text/plain";
    }

    Document parse(const std::string& buffer, const std::string& filename) const override {
        return Document(buffer, filename);
    }
};

/**
 * Utility class for text chunking
 */
class TextChunker {
private:
    int chunkSize_;

public:
    explicit TextChunker(int chunkSize = 1000) : chunkSize_(chunkSize) {}

    /**
     * Splits text into chunks of approximately chunkSize characters
     * @param text The text to chunk
     * @return Vector of text chunks
     */
    std::vector<std::string> chunk(const std::string& text) const {
        std::vector<std::string> chunks;
        std::string currentChunk;

        std::istringstream stream(text);
        std::string sentence;

        while (std::getline(stream, sentence, '.')) {
            if (!sentence.empty()) {
                if (currentChunk.length() + sentence.length() > chunkSize_) {
                    if (!currentChunk.empty()) {
                        chunks.push_back(currentChunk);
                        currentChunk.clear();
                    }
                }
                if (!currentChunk.empty()) {
                    currentChunk += ". ";
                }
                currentChunk += sentence;
            }
        }

        if (!currentChunk.empty()) {
            chunks.push_back(currentChunk);
        }

        return chunks;
    }
};

} // namespace knowledge
