# CLAUDE.md - Backend

## Package Manager
**Always use `bun`** - Never use npm, yarn, or pnpm for this project.

- Install dependencies: `bun install`
- Add packages: `bun add <package>`
- Dev server (with watch): `bun run dev`
- Start server: `bun run start`
- Type check: `bun run type-check`

## Tech Stack
- Fastify 5
- TypeScript
- Bun runtime
- Drizzle ORM with PostgreSQL + pgvector
- Zod for validation
- Vercel AI SDK for chat streaming
- OpenRouter for AI models

## Server
- Runs on port **8000**
- CORS enabled for frontend (localhost:3000)

## Database
- PostgreSQL with pgvector extension
- Database name: `autive`
- Generate migrations: `bun run db:generate`
- Run migrations: `bun run db:migrate`
- Open Drizzle Studio: `bun run db:studio`

## Project Structure
```
backend/src/
├── index.ts                    # Main entry point
├── config/                     # Configuration
├── db/
│   ├── index.ts                # Database connection
│   ├── schema/                 # Drizzle table schemas
│   │   ├── users.ts
│   │   ├── agents.ts
│   │   ├── tools.ts
│   │   ├── knowledge.ts
│   │   ├── messages.ts
│   │   ├── conversations.ts
│   │   ├── builder-messages.ts
│   │   ├── models.ts
│   │   ├── sessions.ts
│   │   └── otp-codes.ts
│   └── modules/                # Database operations
│       ├── user/
│       ├── agent/
│       ├── tool/
│       ├── knowledge/
│       ├── message/
│       ├── conversation/
│       ├── builder/
│       ├── model/
│       ├── session/
│       └── otp/
├── routes/                     # API route handlers
│   ├── auth.routes.ts
│   ├── agents.routes.ts
│   ├── tools.routes.ts
│   ├── knowledge.routes.ts
│   ├── chat.routes.ts
│   ├── conversation.routes.ts
│   ├── builder.routes.ts
│   ├── publish.routes.ts
│   └── models.routes.ts
├── services/                   # Business logic
│   ├── auth.service.ts
│   ├── mcp.service.ts
│   ├── knowledge.service.ts
│   ├── embedding.service.ts
│   ├── s3.service.ts
│   ├── builder/
│   └── document-processing/
├── schemas/                    # Zod validation schemas
├── middleware/                 # Fastify middleware
├── types/                      # TypeScript types
└── utils/                      # Utility functions
```

## API Routes

### Authentication (`/auth`)
- `POST /auth/otp/request` - Request OTP
- `POST /auth/otp/verify` - Verify OTP and login
- `POST /auth/refresh` - Refresh access token
- `GET /auth/google/callback` - Google OAuth

### Agents (`/agents`)
- `GET /agents` - List agents (search, sort)
- `GET /agents/:id` - Get agent
- `POST /agents` - Create agent
- `PATCH /agents/:id` - Update agent
- `DELETE /agents/:id` - Soft delete agent

### Tools (`/tools`)
- `GET /tools` - List tools
- `POST /tools` - Create tool
- `PATCH /tools/:id` - Update tool
- `DELETE /tools/:id` - Delete tool
- `POST /tools/mcp/discover` - Discover MCP tools

### Agent Tools (`/agents/:agentId/tools`)
- `GET` - List agent's tools
- `POST` - Assign tool (includes MCP import)
- `PATCH /:toolId` - Update assignment
- `DELETE /:toolId` - Remove tool

### Knowledge (`/agents/:agentId/knowledge`)
- `GET` - List sources
- `POST /files` - Upload files
- `POST /website` - Add website
- `POST /website/discover` - Discover pages
- `POST /:sourceId/retrain` - Retrain source
- `DELETE /:sourceId` - Delete source
- `POST /search` - Search knowledge

### Chat (`/agents/:agentId/chat`)
- `GET /messages` - Get history
- `POST` - Stream chat
- `DELETE /messages` - Clear history

### Public Chat (`/chat/:slug`, `/conversations`)
- `GET /chat/:slug` - Get published agent
- `GET /chat/:slug/conversations` - List conversations
- `POST /chat/:slug/conversations` - Create conversation
- `POST /conversations/:id/chat` - Stream chat

### Publishing (`/agents/:id`)
- `GET /publish-status` - Check status
- `POST /publish` - Publish agent
- `POST /unpublish` - Unpublish agent

### Builder (`/builder`)
- `GET /messages` - Get builder messages
- `POST /chat` - Stream builder AI chat

## Architecture Rules
- **Database operations** MUST be in `src/db/modules/<module>/*.db.ts`
- **Services** contain business logic and call db modules
- **Routes** handle HTTP request/response only
- **Validation schemas** in `src/schemas/`

## Database Schema Rules
- **NEVER use JSON/JSONB for unbounded lists** - Create separate tables instead
- JSON columns acceptable for:
  - Fixed configuration objects (settings, config)
  - Bounded metadata
  - Input schemas

## Tool System
Tools have `name` (internal, snake_case) and `title` (display):
- Store both in database
- **Always return `title` in API responses**
- Use `title || name` for display fallback

### Tool Types
1. **api_connector**: HTTP requests with input interpolation
2. **mcp_connector**: Model Context Protocol integration

## Environment Variables
```
DATABASE_URL=postgresql://...
JWT_SECRET=...
OPENROUTER_API_KEY=...
FRONTEND_URL=http://localhost:3000
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=...
AWS_S3_BUCKET=...
SMTP_HOST=... (optional)
GOOGLE_AUTH_CLIENT_ID=... (optional)
GOOGLE_AUTH_CLIENT_SECRET=... (optional)
```

## Key Services

### MCP Service (`mcp.service.ts`)
- Connects via StreamableHTTP or SSE transport
- Discovers tools from MCP servers
- Executes MCP tool calls
- Converts MCP schemas to internal format

### Knowledge Service (`knowledge.service.ts`)
- File processing (PDF, DOCX, Excel, EPUB, etc.)
- Chunking and embedding generation
- Website crawling and indexing
- Vector search with pgvector

### Builder Service (`services/builder/`)
- AI agent building assistant
- Tool definitions for agent modification
- System prompt with agent context
