# CLAUDE.md - Frontend

## Package Manager
**Always use `bun`** - Never use npm, yarn, or pnpm for this project.

- Install dependencies: `bun install`
- Add packages: `bun add <package>`
- Dev server: `bun run dev`
- Build: `bun run build`

## Tech Stack
- Next.js 16 (App Router, Turbopack)
- TypeScript
- Tailwind CSS v4
- shadcn/ui components
- TanStack React Query (server state)
- Zustand (client state)
- Vercel AI SDK (chat streaming)

### Adding shadcn Components
```bash
bunx shadcn@latest add <component>
```

## Project Structure
```
frontend/src/
├── app/
│   ├── layout.tsx                    # Root layout
│   ├── globals.css                   # Global styles (Tailwind)
│   ├── page.tsx                      # Landing page (public)
│   ├── (protected)/                  # Authenticated routes
│   │   ├── layout.tsx                # App bar with user menu
│   │   ├── dashboard/page.tsx        # Agent list + builder prompt
│   │   └── agents/
│   │       ├── new/page.tsx          # Create agent options
│   │       └── [id]/page.tsx         # Agent editor
│   ├── chat/[slug]/page.tsx          # Public chat with published agent
│   ├── get-started/page.tsx          # Login/signup
│   └── auth/                         # OAuth callbacks
├── components/
│   ├── ui/                           # shadcn/ui components
│   ├── providers/                    # React providers
│   └── agents/                       # Agent-related components
├── services/                         # API service functions
├── stores/                           # Zustand stores
├── hooks/                            # Custom React hooks
├── lib/                              # Utilities
└── types/                            # TypeScript types
```

## Key Components (components/agents/)

### Agent Editor
- `agent-editor.tsx` - Main editor with tabs and resizable panels
- `agent-general-form.tsx` - Identity tab (name, description)
- `agent-instructions-form.tsx` - Instructions config
- `knowledge-section.tsx` - Knowledge base management
- `agent-tools-form.tsx` - Tool list with search
- `agent-settings-panel.tsx` - Model, memory, chat settings
- `agent-chat.tsx` - Preview chat
- `builder-sidebar.tsx` - AI builder assistant

### Tools
- `add-tool-dialog.tsx` - Two-step tool creation (define → configure)
- `tool-card.tsx` - Tool display in list
- `api-connector-config-form.tsx` - API tool configuration
- `mcp-connector-config-form.tsx` - MCP tool configuration
- `input-schema-builder.tsx` - Tool input schema editor

### Chat
- `public-chat.tsx` - Public chat interface
- `tool-call-card.tsx` - Tool execution display
- `message-parts-renderer.tsx` - Message content renderer

### Publishing
- `publish-button.tsx` - Publish/unpublish actions
- `embed-modal.tsx` - Embed code generator

## Services (services/)
- `agent.service.ts` - Agent CRUD, publishing
- `tool.service.ts` - Tool management, MCP discovery/import
- `knowledge.service.ts` - Knowledge source operations
- `conversation.service.ts` - Public chat conversations
- `builder.service.ts` - AI builder messages
- `auth.service.ts` - Authentication
- `model.service.ts` - Available models

## Custom Hooks (hooks/)
- `use-agent-editor.ts` - Agent editor state management
- `use-auth-guard.ts` - Route protection
- `use-fetch-with-auth.ts` - Authenticated fetch wrapper
- `use-publish-status.ts` - Publishing state

## State Management
- **Zustand**: `auth.store.ts` - User, tokens, login/logout
- **React Query**: Server state (agents, tools, messages, etc.)

## Architecture Rules
- Components are UI-only (no business logic)
- Business logic in `/services`
- Use `useAuthGuard` hook for protected routes
- State: Zustand for client state, React Query for server state

## Tool Display Convention
Tools have `name` (internal) and `title` (display). Always show `title` to users:
```tsx
const displayName = tool.title || tool.name
```

## Route Groups
- `(protected)` - Requires authentication, has app bar layout
- Public routes - `get-started`, `auth/*`, `chat/*`
