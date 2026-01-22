/**
 * Document processing utilities in C
 * Test file for knowledge system chunking
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define MAX_CONTENT_SIZE 65536
#define DEFAULT_CHUNK_SIZE 1000

/**
 * Represents a parsed document
 */
typedef struct {
    char *content;
    char *source;
    int word_count;
} Document;

/**
 * Creates a new Document instance
 * @param content The document content
 * @param source The source filename
 * @return Pointer to new Document or NULL on error
 */
Document* document_create(const char *content, const char *source) {
    if (content == NULL || strlen(content) == 0) {
        fprintf(stderr, "Document content cannot be empty\n");
        return NULL;
    }

    Document *doc = (Document*)malloc(sizeof(Document));
    if (doc == NULL) {
        return NULL;
    }

    doc->content = strdup(content);
    doc->source = strdup(source);

    // Count words
    doc->word_count = 0;
    int in_word = 0;
    for (const char *p = content; *p; p++) {
        if (*p == ' ' || *p == '\n' || *p == '\t') {
            in_word = 0;
        } else if (!in_word) {
            in_word = 1;
            doc->word_count++;
        }
    }

    return doc;
}

/**
 * Frees a Document instance
 * @param doc The document to free
 */
void document_free(Document *doc) {
    if (doc != NULL) {
        free(doc->content);
        free(doc->source);
        free(doc);
    }
}

/**
 * Chunks text into segments of approximately chunk_size characters
 * @param text The text to chunk
 * @param chunk_size Target size for each chunk
 * @param chunk_count Output parameter for number of chunks
 * @return Array of chunk strings (caller must free)
 */
char** chunk_text(const char *text, int chunk_size, int *chunk_count) {
    // Simplified implementation
    size_t text_len = strlen(text);
    int estimated_chunks = (text_len / chunk_size) + 1;

    char **chunks = (char**)malloc(estimated_chunks * sizeof(char*));
    *chunk_count = 0;

    const char *start = text;
    while (*start) {
        int len = chunk_size;
        if (strlen(start) < chunk_size) {
            len = strlen(start);
        } else {
            // Find sentence boundary
            while (len > 0 && start[len] != '.' && start[len] != '\n') {
                len--;
            }
            if (len == 0) len = chunk_size;
            else len++; // Include the delimiter
        }

        chunks[*chunk_count] = strndup(start, len);
        (*chunk_count)++;
        start += len;
    }

    return chunks;
}

int main(int argc, char *argv[]) {
    Document *doc = document_create("This is a test document.", "test.txt");
    if (doc != NULL) {
        printf("Document: %s (%d words)\n", doc->source, doc->word_count);
        document_free(doc);
    }
    return 0;
}
