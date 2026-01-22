# Autive - Platform Specification

## Overview

Autive is a simple, powerful agent builder platform that lets anyone create AI agents without dealing with the complexity of prompt engineering, RAG configuration, memory management, or infrastructure.

**Core Philosophy:** Make the initial agent creation stupidly simple, hide complexity behind smart defaults, expose advanced options only when needed.

---

## Problem We're Solving

Building AI agents today is hard:
- N8N/Flowise are visual but break down for complex agents
- Langchain/CrewAI require coding knowledge
- Advanced features (RAG, caching, context management) require deep understanding
- Most tools are either too simple (chatbots) or too complex (developer frameworks)

**Target Users:** Non-developers and citizen developers who want to build agents that actually work — without understanding chunking strategies, embedding models, or context windows.

---

## User Flow

### Authentication
- Email + OTP
- Sign in with Google
- No passwords

### Dashboard
- View all created agents
- Create new agent (manual or AI-assisted)
- Search and sort agents

---

## Agent Creation (4 Tabs + Chat)

### Layout
```
┌────────────────────────────────┬──────────────────────────┐
│                                │                          │
│  [Identity] [Instructions]     │      Chat Window         │
│  [Knowledge] [Tools]           │                          │
│                                │   Test your agent here   │
│  ┌──────────────────────────┐  │   as you build it        │
│  │                          │  │                          │
│  │  Form fields             │  │                          │
│  │                          │  │                          │
│  └──────────────────────────┘  │                          │
│                                │                          │
│  [← Previous]  [Next →]    ⚙️  │                          │
│                                │                          │
└────────────────────────────────┴──────────────────────────┘
```

### Tab 1: Identity
| Field | Type | Required |
|-------|------|----------|
| Name | Text input | Yes |
| Description | Text area | No |

### Tab 2: Instructions
Instead of a raw system prompt, we ask 4 simple questions:

| Question | Purpose |
|----------|---------|
| What does this agent do? | Main goal/job |
| How should it speak? | Tone and communication style |
| What should it NEVER do? | Hard constraints, off-limits topics |
| Anything else it should know? | Additional context, rules, knowledge |

**Behind the scenes:** These answers are compiled into an optimized system prompt. Users never see the word "prompt."

### Tab 3: Knowledge
- Upload documents (PDF, DOCX, TXT, MD, EPUB, Excel, HTML, ZIP)
- Add website URLs (crawled and indexed)
- Configure retrieval settings (enabled, topK, similarity threshold)
- Retrieval modes: Tool-based or Auto-inject

**Behind the scenes:** Chunking, embedding, vector storage, retrieval — all handled automatically using pgvector.

### Tab 4: Tools
| Tool Type | Description | Status |
|-----------|-------------|--------|
| API Connector | Custom GET/POST/PUT/PATCH/DELETE requests | ✅ Implemented |
| MCP Connector | Model Context Protocol server integration | ✅ Implemented |
| Integration Actions | Pre-built integrations | ❌ Future |
| Custom Code | Code executed in containerized environment | ❌ Future |

**Tool Properties:**
- `name`: Internal identifier (snake_case)
- `title`: Human-readable display name
- `description`: Helps AI understand when to use the tool
- `inputSchema`: Defines parameters the AI should provide

### Chat Window (Right Side)
- Live testing while building
- Shows tool usage in responses
- Conversation history with configurable limit
- Welcome message support

### Settings (⚙️ Gear Icon)

#### Model Selection
- Select from available OpenRouter models
- Default model configuration

#### Memory Settings
| Setting | Options | Default |
|---------|---------|---------|
| Conversation History Limit | Number of messages | 10 |

#### Chat Settings
| Setting | Description |
|---------|-------------|
| Welcome Message | Initial greeting for users |
| Suggested Prompts | Quick-start conversation starters |

---

## AI Builder Assistant

A dedicated AI assistant (Claude Sonnet 4) that helps users create agents through natural language:

- Chat-based interface in sidebar
- Can modify agent configuration
- Can create and configure tools
- Can manage knowledge sources
- Persistent conversation history

---

## Publishing

After clicking "Publish," agent becomes live with access methods:

### 1. Chat Link
```
https://autive.ai/chat/your-agent-slug
```
- Shareable URL
- Authenticated users can have persistent conversations
- Conversation history saved per user

### 2. Embed Code
```html
<script src="https://autive.ai/embed.js" data-agent="your-agent-slug"></script>
```
- Drop into any website
- Renders as chat widget
- Configurable position (fullscreen, bottom-right, bottom-left, top-right, top-left)
- Theme options (light, dark)

### 3. API Endpoint (Future)
```
POST https://api.autive.ai/v1/agents/:id/chat
```

---

## What's Handled Automatically (User Never Sees)

| Component | How it's handled |
|-----------|------------------|
| System prompt | Generated from 4 instruction questions |
| RAG/Embeddings | Auto-chunking, pgvector storage |
| Context window | Configurable conversation history limit |
| Tool execution | Input interpolation, MCP protocol handling |
| Error handling | Retries, fallbacks, graceful failures |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16 (App Router, TypeScript) |
| Backend | Fastify 5 (TypeScript, Bun runtime) |
| AI | Vercel AI SDK + OpenRouter |
| Database | PostgreSQL with Drizzle ORM |
| Vector Store | pgvector extension |
| File Storage | S3-compatible storage |
| Styling | Tailwind CSS v4 + shadcn/ui |
| State | Zustand + TanStack React Query |

---

## Database Schema

### Core Tables
- **users** - User accounts (email, Google OAuth)
- **agents** - Agent configurations
- **tools** - Reusable tool definitions (API/MCP)
- **agent_tools** - Agent-tool assignments
- **knowledge_sources** - Knowledge base sources
- **knowledge_files** - Files within sources
- **knowledge_chunks** - Vector-indexed content
- **messages** - Chat history
- **conversations** - Public chat conversations
- **builder_messages** - AI builder conversation
- **models** - Available AI models
- **sessions** - User sessions

---

## Implementation Status

### ✅ Implemented
- Auth (Email OTP + Google OAuth)
- Agent CRUD with soft deletes
- 4-tab creation flow (Identity, Instructions, Knowledge, Tools)
- Live chat testing with preview
- Knowledge base (file upload, website crawling)
- Tools: API connectors with full configuration
- Tools: MCP connector with discovery and import
- Tool input schema builder
- Publishing: Chat link with conversations
- Publishing: Embed widget configuration
- AI Builder assistant
- Conversation history management
- Model selection via OpenRouter

### ❌ Future Scope
- Integration marketplace
- Custom code tools
- Analytics dashboard
- Team collaboration
- Versioning / Rollback
- Multi-agent orchestration
- Usage billing / Credits system
- API endpoint access

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Time to first working agent | < 5 minutes |
| Agent creation completion rate | > 70% |
| Users who publish an agent | > 50% |
| Users who share/embed | > 20% |
