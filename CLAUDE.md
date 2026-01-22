# CLAUDE.md - Project Root

## Overview
Autive is an AI agent builder platform that allows users to create, configure, and publish AI agents with custom tools, knowledge bases, and instructions.

## Package Manager
**Always use `bun`** - Never use npm, yarn, or pnpm for this project.

## Project Structure
```
agento.sh/
├── frontend/       # Next.js 16 app (port 3000)
├── backend/        # Fastify 5 server (port 8000)
├── docs/           # Documentation
│   └── about-autive.md  # Platform specification
└── CLAUDE.md
```

## Running the Project

### Frontend (Next.js)
```bash
cd frontend && bun run dev
```
Runs on http://localhost:3000

### Backend (Fastify)
```bash
cd backend && bun run dev
```
Runs on http://localhost:8000

## Key Features
- **Agent Builder**: Create AI agents with identity, instructions, knowledge, and tools
- **Tools**: API connectors and MCP (Model Context Protocol) integrations
- **Knowledge Base**: Upload documents (PDF, DOCX, TXT, etc.) with RAG retrieval via pgvector
- **AI Builder Assistant**: Natural language agent configuration using Claude Sonnet 4
- **Publishing**: Publish agents with unique URLs and embeddable widgets
- **Conversations**: Persistent chat history for published agents

## Tool System
Tools have two identifiers:
- `name`: Internal identifier (snake_case, e.g., `get_weather_data`)
- `title`: Human-readable display name (e.g., "Get Weather Data")

**Always display `title` to users; use `name` for internal operations.**

## Database
- PostgreSQL with pgvector extension for embeddings
- Drizzle ORM for schema and migrations

## Key Conventions
- Components are UI-only (no business logic)
- Business logic in `/services`
- Database operations in `/db/modules`
- All API routes authenticated via JWT (except public chat)
