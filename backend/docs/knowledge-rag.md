# Knowledge & RAG System

Technical documentation for the document processing, chunking, embedding, and vector search system.

## Architecture Overview

```
Upload/Crawl → Parse → Chunk → Embed → Store → Search
     │           │        │        │        │       │
     ▼           ▼        ▼        ▼        ▼       ▼
   S3/URL    Parsers  Chunkers  OpenAI  pgvector  HNSW
```

## Supported File Types

| Type | MIME Type | Parser | Chunking Strategy |
|------|-----------|--------|-------------------|
| PDF | `application/pdf` | `pdf.parser.ts` | Semantic (sentences) |
| Word | `.docx` | `docx.parser.ts` | Semantic (sentences) |
| Excel | `.xlsx`, `.xls` | `excel.parser.ts` | Row-based (tabular) |
| CSV | `text/csv` | `excel.parser.ts` | Row-based (tabular) |
| Markdown | `text/markdown` | `text.parser.ts` | Section-based (headers) |
| TypeScript | `.ts`, `.tsx` | `text.parser.ts` | Code-aware (functions/classes) |
| JavaScript | `.js`, `.jsx` | `text.parser.ts` | Code-aware (functions/classes) |
| JSON | `application/json` | `text.parser.ts` | Semantic |
| Plain Text | `text/plain` | `text.parser.ts` | Semantic (paragraphs) |
| Website | HTML | `website.crawler.ts` | Section-based (markdown) |

## Chunking Strategies

### 1. Semantic Chunking (Default)
Used for: PDF, DOCX, plain text

- Target size: ~1000 characters
- Overlap: 200 characters
- Split priority: headers → paragraphs → sentences → words
- Never splits mid-word

### 2. Section-based Chunking
Used for: Markdown, websites

- Splits at markdown headers (`#`, `##`, `###`)
- Keeps sections intact up to 1500 chars
- Large sections split by paragraphs, then sentences

### 3. Row-based Chunking
Used for: CSV, Excel

- Never splits mid-row
- Groups complete rows up to chunk size
- Preserves tabular data integrity

### 4. Code-aware Chunking
Used for: TypeScript, JavaScript

- Keeps JSDoc comments with declarations
- Preserves functions/classes/interfaces intact
- Splits large blocks by line boundaries

## Configuration

```typescript
// Chunking
chunkSize: 1000        // Target characters
chunkOverlap: 200      // Overlap between chunks
minChunkSize: 100      // Minimum chunk size
maxChunkSize: 2000     // Maximum chunk size

// Embedding
model: 'text-embedding-3-small'
dimensions: 1536
batchSize: 100

// Retrieval
topK: 5                      // Results to return
similarityThreshold: 0.5     // Minimum similarity (0-1)

// Limits
maxFileSize: 5MB
maxTotalPerAgent: 20MB
maxWebsitePages: 100
```

## Database Schema

### Tables

```sql
-- Knowledge sources (files, websites)
knowledge_sources (
  id, agent_id, user_id, name, type, status,
  chunk_count, total_characters, last_trained_at
)

-- Individual files within a source
knowledge_files (
  id, source_id, file_name, file_key, file_size_bytes,
  mime_type, status, chunk_count
)

-- Chunks with vector embeddings
knowledge_chunks (
  id, source_id, file_id, chunk_index,
  content, content_length, metadata,
  embedding vector(1536)  -- pgvector
)
```

### Indexes

```sql
-- Standard indexes
CREATE INDEX ON knowledge_sources (agent_id);
CREATE INDEX ON knowledge_sources (status);
CREATE INDEX ON knowledge_chunks (source_id);

-- Vector similarity index (HNSW)
CREATE INDEX ON knowledge_chunks
  USING hnsw (embedding vector_cosine_ops);
```

## Vector Search

### Similarity Calculation

Uses cosine similarity via pgvector:

```sql
SELECT content,
       1 - (embedding <=> query_vector) AS similarity
FROM knowledge_chunks
WHERE agent_id = ?
  AND 1 - (embedding <=> query_vector) >= threshold
ORDER BY embedding <=> query_vector
LIMIT ?
```

- `<=>` is pgvector's cosine distance operator
- Similarity = 1 - distance (range: 0 to 1)
- HNSW index enables O(log n) search

## Processing Flow

### File Upload
1. Validate size and type
2. Upload to S3
3. Parse document (extract text + metadata)
4. Chunk using appropriate strategy
5. Generate embeddings (batched, 100 per request)
6. Store chunks + embeddings in PostgreSQL
7. Update source status

### Website Indexing
1. Discover pages (breadth-first crawl)
2. Parallel fetch (5 concurrent)
3. Convert HTML → Markdown
4. Chunk by sections
5. Embed and store

### Search Query
1. Embed query text
2. HNSW index lookup (cosine similarity)
3. Filter by threshold
4. Return top-K results with metadata

## API Endpoints

```
POST /agents/:id/knowledge/files     # Upload files
POST /agents/:id/knowledge/website   # Index website
GET  /agents/:id/knowledge           # List sources
POST /agents/:id/knowledge/search    # Search knowledge
DELETE /agents/:id/knowledge/:sourceId
```

## Key Files

```
src/services/
├── document-processing/
│   ├── index.ts              # Main entry, parseAndChunk()
│   ├── chunker.service.ts    # All chunking strategies
│   ├── pdf.parser.ts         # PDF extraction
│   ├── docx.parser.ts        # Word extraction
│   ├── excel.parser.ts       # Excel/CSV extraction
│   ├── text.parser.ts        # Text/code extraction
│   └── website.crawler.ts    # Web crawling
├── embedding.service.ts      # OpenAI embeddings
└── knowledge.service.ts      # Orchestration

src/db/
├── schema/knowledge.ts       # Database schema
└── modules/knowledge/        # DB operations

src/config/
└── knowledge.defaults.ts     # Configuration
```

## Dependencies

- `pdf-parse` - PDF text extraction
- `mammoth` - DOCX text extraction
- `xlsx` - Excel/CSV parsing
- `cheerio` + `turndown` - HTML to Markdown
- `pgvector` - PostgreSQL vector extension
