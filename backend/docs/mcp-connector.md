# MCP Connector

MCP (Model Context Protocol) connector allows agents to use tools from external MCP servers.

## Architecture

```
Frontend                    Backend                      MCP Server
─────────                   ───────                      ──────────
AddToolDialog ──────────► /tools/mcp/discover ────────► listTools()
     │                          │
     │                    McpClient.connect()
     │                    McpClient.discoverTools()
     │                          │
     ▼                          ▼
Tool Selection ◄──────── { tools: [...] }

Import Tools ───────────► /agents/:id/tools/mcp/import
                                │
                          Creates Tool records
                          with type: 'mcp_connector'

AgentChat ──────────────► /agents/:id/chat
                                │
                          buildAiSdkTools()
                          executeMcpConnector()
                                │
                          McpClient.callTool() ────────► callTool()
```

## SDK

Uses `@modelcontextprotocol/sdk` with `StreamableHTTPClientTransport`.

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
```

## Key Files

### Backend

| File | Purpose |
|------|---------|
| `src/services/mcp.service.ts` | MCP client - connect, discover, call tools |
| `src/routes/tools.routes.ts` | `/tools/mcp/discover`, `/agents/:id/tools/mcp/import` |
| `src/routes/chat.routes.ts` | `executeMcpConnector()`, `createMcpConnectorTool()` |
| `src/schemas/tool.schema.ts` | Validation schemas including `mcpDiscoveredToolSchema` |
| `src/db/schema/tools.ts` | Database schema with `title` column |

### Frontend

| File | Purpose |
|------|---------|
| `src/services/tool.service.ts` | API client, types for MCP tools |
| `src/components/agents/add-tool-dialog.tsx` | Tool creation UI with MCP tab |
| `src/components/agents/mcp-connector-config-form.tsx` | Server connection & tool discovery |
| `src/components/agents/agent-chat.tsx` | Fetches tools for title display |
| `src/components/agents/tool-call-card.tsx` | Displays tool calls with titles |

## Data Flow

### Tool Discovery

1. User enters MCP server URL
2. Frontend calls `POST /tools/mcp/discover`
3. Backend creates `McpClient`, connects, calls `discoverTools()`
4. Returns tool list with name, title, description, inputSchema

### Tool Import

1. User selects tools to import
2. Frontend calls `POST /agents/:id/tools/mcp/import`
3. Backend creates Tool records with:
   - `type: 'mcp_connector'`
   - `name`: internal identifier (e.g., `get_file_contents`)
   - `title`: human-readable (e.g., "Get File Contents")
   - `config`: `{ serverUrl, toolName, authentication }`

### Tool Execution (Chat)

1. AI decides to use a tool
2. `buildAiSdkTools()` creates AI SDK tool definitions
3. For MCP tools, `executeMcpConnector()` is called
4. Creates temporary `McpClient`, connects, calls `callTool()`
5. Returns result to AI

## Tool Name vs Title

| Field | Purpose | Example |
|-------|---------|---------|
| `name` | Internal identifier, used by AI | `get_file_contents` |
| `title` | Human-readable display | "Get File Contents" |

Title is extracted from MCP `annotations.title` or auto-generated from name:
```typescript
function generateTitleFromName(name: string): string {
  return name
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase())
}
```

## Authentication

Supports bearer token auth:

```typescript
interface McpConnectorConfig {
  serverUrl: string
  toolName: string
  authentication?: {
    type: 'none' | 'bearer'
    token?: string
  }
}
```

Passed via `requestInit` in transport:
```typescript
const transport = new StreamableHTTPClientTransport(
  new URL(this.serverUrl),
  {
    requestInit: {
      headers: { Authorization: `Bearer ${token}` }
    }
  }
)
```

## Validation Limits

| Field | Max Length |
|-------|------------|
| Tool description | 2000 chars |
| Input description | 5000 chars |
| Tool title | 200 chars |

## Database Schema

```sql
CREATE TABLE tools (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  type TEXT NOT NULL,           -- 'api_connector' | 'mcp_connector'
  name TEXT NOT NULL,           -- internal identifier
  title TEXT,                   -- human-readable display name
  description TEXT,
  enabled BOOLEAN DEFAULT true,
  input_schema JSONB,
  config JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## McpClient API

```typescript
class McpClient {
  constructor(serverUrl: string, auth?: McpAuth)

  async connect(): Promise<void>
  async disconnect(): Promise<void>
  async discoverTools(): Promise<DiscoveredTool[]>
  async callTool(toolName: string, args: Record<string, unknown>): Promise<ToolResult>
}
```
