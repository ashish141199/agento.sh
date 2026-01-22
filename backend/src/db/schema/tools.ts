import { pgTable, text, timestamp, boolean, jsonb, pgEnum } from 'drizzle-orm/pg-core'
import { users } from './users'
import { agents } from './agents'

/**
 * Tool type enum
 */
export const toolTypeEnum = pgEnum('tool_type', ['api_connector', 'mcp_connector'])

/**
 * Input types supported for tool inputs
 */
export type ToolInputType = 'text' | 'number' | 'boolean' | 'list' | 'object'

/**
 * Single tool input definition
 * Supports nested structures via properties (for objects) and listItemType (for lists)
 */
export interface ToolInput {
  /** Identifier name (no spaces, used in interpolation) */
  name: string
  /** Human-readable description (helps AI understand what to provide) */
  description: string
  /** Data type */
  type: ToolInputType
  /** Whether this input is required */
  required: boolean
  /** Default value when not provided */
  default?: unknown
  /** For 'list' type: what type of items are in the list */
  listItemType?: ToolInputType
  /** For 'list' type with 'object' items: nested properties */
  listItemProperties?: ToolInput[]
  /** For 'object' type: nested properties */
  properties?: ToolInput[]
}

/**
 * Input schema for a tool
 * Defines what inputs the AI should provide when calling the tool
 */
export interface ToolInputSchema {
  inputs: ToolInput[]
}

/**
 * API Connector authentication configuration
 */
export interface ApiConnectorAuth {
  type: 'none' | 'bearer' | 'api_key' | 'basic'
  token?: string
  apiKey?: string
  username?: string
  password?: string
}

/**
 * API Connector configuration
 * Supports {{inputName}} interpolation in url, headers, queryParams, and body
 */
export interface ApiConnectorConfig {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  url: string
  headers?: { key: string; value: string }[]
  queryParams?: { key: string; value: string }[]
  body?: string
  authentication?: ApiConnectorAuth
}

/**
 * MCP Connector configuration
 */
export interface McpConnectorConfig {
  serverUrl: string
  selectedTools?: string[]
  authentication?: {
    type: 'none' | 'bearer' | 'oauth2'
    token?: string
  }
}

/**
 * Tool configuration type (varies by tool type)
 */
export type ToolConfig = ApiConnectorConfig | McpConnectorConfig

/**
 * Tools table schema
 * Stores reusable tool configurations owned by users
 */
export const tools = pgTable('tools', {
  /** Unique tool identifier (UUID) */
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),

  /** User who owns this tool */
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  /** Tool type */
  type: toolTypeEnum('type').notNull().default('api_connector'),

  /** Tool name */
  name: text('name').notNull(),

  /** Tool description */
  description: text('description'),

  /** Whether the tool is enabled by default */
  enabled: boolean('enabled').notNull().default(true),

  /** Input schema defining what the AI should provide */
  inputSchema: jsonb('input_schema').$type<ToolInputSchema>(),

  /** Tool-specific configuration (varies by type, nullable until configured) */
  config: jsonb('config').$type<ToolConfig>(),

  /** Timestamp when tool was created */
  createdAt: timestamp('created_at').notNull().defaultNow(),

  /** Timestamp when tool was last updated */
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

/**
 * Agent-Tools junction table
 * Links tools to agents (many-to-many relationship)
 */
export const agentTools = pgTable('agent_tools', {
  /** Unique identifier (UUID) */
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),

  /** Agent this tool is assigned to */
  agentId: text('agent_id')
    .notNull()
    .references(() => agents.id, { onDelete: 'cascade' }),

  /** Tool being assigned */
  toolId: text('tool_id')
    .notNull()
    .references(() => tools.id, { onDelete: 'cascade' }),

  /** Whether this tool is enabled for this specific agent */
  enabled: boolean('enabled').notNull().default(true),

  /** Timestamp when assignment was created */
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

/**
 * Tool type inferred from schema
 */
export type Tool = typeof tools.$inferSelect

/**
 * Insert tool type inferred from schema
 */
export type InsertTool = typeof tools.$inferInsert

/**
 * AgentTool type inferred from schema
 */
export type AgentTool = typeof agentTools.$inferSelect

/**
 * Insert AgentTool type inferred from schema
 */
export type InsertAgentTool = typeof agentTools.$inferInsert
