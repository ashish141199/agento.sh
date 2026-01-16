# Agentoo - MVP Specification

## Overview

Agentoo is a simple, powerful agent builder platform that lets anyone create AI agents without dealing with the complexity of prompt engineering, RAG configuration, memory management, or infrastructure.

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
- Create new agent
- Quick stats (optional for V2)

---

## Agent Creation (3 Tabs + Chat)

### Layout
```
┌────────────────────────────────┬──────────────────────────┐
│                                │                          │
│  [General] [Instructions]      │      Chat Window         │
│  [Tools]                       │                          │
│                                │   Test your agent here   │
│  ┌──────────────────────────┐  │   as you build it        │
│  │                          │  │                          │
│  │  Form fields             │  │                          │
│  │                          │  │                          │
│  └──────────────────────────┘  │                          │
│                                │                          │
│  [Save Draft]  [Publish]   ⚙️  │   [Clear] [Save & Test]  │
│                                │                          │
└────────────────────────────────┴──────────────────────────┘
```

### Tab 1: General
| Field | Type | Required |
|-------|------|----------|
| Name | Text input | Yes |
| Description | Text area | No |
| Model | Dropdown (Auto/GPT-4o/Claude/etc.) | Yes (default: Auto) |

### Tab 2: Instructions
Instead of a raw system prompt, we ask 4 simple questions:

| Question | Purpose |
|----------|---------|
| What does this agent do? | Main goal/job |
| How should it speak? | Tone (Friendly / Professional / Direct) |
| What should it NEVER do? | Hard constraints, off-limits topics |
| Anything else it should know? | Additional context, rules, knowledge |

**Behind the scenes:** These answers are compiled into an optimized system prompt. Users never see the word "prompt."

### Tab 3: Tools
#### Knowledge Base
- Upload documents (PDF, DOCX, TXT, MD)
- Add website URLs (crawled and indexed)

**Behind the scenes:** Chunking, embedding, vector storage, retrieval — all handled automatically.

#### Tools
| Tool Type | Description | MVP? |
|-----------|-------------|------|
| Integration Actions (Platoona) | Pre-built integrations (2000+ actions) | ✅ Yes |
| HTTP Endpoint | Custom GET/POST/PUT/DELETE requests | ✅ Yes |
| Custom Code | Code executed in containerized environment | ❌ V2 |
| Call N8N Workflow | Trigger external N8N workflows | ❌ V2 |

### Chat Window (Right Side)
- Live testing while building
- Changes apply on "Save & Test" (not auto-update)
- Clear conversation button
- Shows tool usage in responses

---

## Settings (⚙️ Gear Icon → Modal)

### Context Management
| Setting | Options | Default |
|---------|---------|---------|
| Rolling window size | Number of messages (5/10/20/50) | 10 |
| Max tokens | Token limit before summarization | 4000 |
| Summarization | On / Off | On |
| Summarization prompt | Customizable (optional) | Smart default |

**Logic:** Summarization triggers when EITHER max tokens OR message count is reached.

### Performance
| Setting | Options | Default |
|---------|---------|---------|
| Caching | On / Off | On |

### Future Settings (V2+)
- Guardrails (blocked topics, required phrases)
- Rate limiting
- Cost limits
- Fallback behavior

---

## Publishing

After clicking "Publish," agent becomes live with 3 access methods:

### 1. Chat Link
```
https://app.agentoo.com/chat/abc123
```
- Shareable URL
- Anyone can chat with the agent
- No auth required for end users

### 2. Embed Code
```html
<script src="https://app.agentoo.com/embed.js" data-agent="abc123"></script>
```
- Drop into any website
- Renders as chat widget
- Customizable position (bottom-right default)

### 3. API Endpoint
```
POST https://api.agentoo.com/v1/agents/abc123/chat
Authorization: Bearer sk-xxxxx

{
  "message": "Hello",
  "session_id": "optional-for-continuity"
}
```
- Full programmatic access
- Streaming support
- Session management for multi-turn conversations

---

## What's Handled Automatically (User Never Sees)

| Component | How it's handled |
|-----------|------------------|
| System prompt | Generated from 4 questions |
| RAG/Embeddings | Auto-chunking, managed vector store |
| Context window | Rolling window + summarization |
| Memory | Short-term (session), long-term (V2) |
| Caching | Response caching for repeated queries |
| Error handling | Retries, fallbacks, graceful failures |
| Tool execution | Auth, retries, timeout handling |

---

## Pricing Model (MVP)

### BYOK (Bring Your Own Key)
- Users provide their own OpenAI/Anthropic/Groq API keys
- Platform is free to use
- Zero cost to us

### Future (V2)
- Optional managed credits (20-30% markup)
- Free tier + Paid plans based on:
  - Number of agents
  - Features (embed, API, analytics)
  - Support level

---

## Tech Stack (Recommended)

| Layer | Technology |
|-------|------------|
| Framework | Hono or Fastify (TypeScript) |
| AI | Vercel AI SDK + Provider SDKs |
| Database | Postgres (Supabase or Neon) |
| Vector Store | Supabase Vector or Pinecone |
| Cache | Redis (Upstash) |
| Auth | Clerk or Supabase Auth |
| File Storage | Supabase Storage or S3 |
| Deployment | Vercel or Railway |

---

## MVP Scope

### ✅ In Scope
- Auth (Email OTP + Google)
- Agent CRUD (Create, Read, Update, Delete)
- 3-tab creation flow
- Live chat testing
- Knowledge base (document upload)
- Tools: Platoona integrations + HTTP endpoints
- Publishing: Chat link, Embed, API
- Settings: Context window, summarization, caching
- BYOK model selection

### ❌ Out of Scope (V2+)
- Custom code tools
- N8N workflow integration
- MCP tools
- Marketplace / Explore page
- Analytics dashboard
- Team collaboration
- Versioning / Rollback
- Multi-agent orchestration
- Long-term memory across sessions
- Usage billing / Credits system

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Time to first working agent | < 5 minutes |
| Agent creation completion rate | > 70% |
| Users who publish an agent | > 50% |
| Users who share/embed | > 20% |

---

## Open Questions

1. Should chat link require auth for end users? (Recommendation: No, for frictionless sharing)
2. Rate limiting for free agents? (Recommendation: Yes, 100 req/day default)
3. Branding on embedded chat? (Recommendation: "Powered by Agentoo" with paid option to remove)

---

## Next Steps

1. ~~Talk to 5-10 potential users~~ (Done - confirmed N8N pain points)
2. Finalize UI mockups
3. Set up project scaffolding
4. Build auth flow
5. Build agent creation flow
6. Build chat interface
7. Build publishing flow
8. Ship MVP to early users
9. Iterate based on feedback

---

*Target: Ship testable MVP in 2-3 weeks*