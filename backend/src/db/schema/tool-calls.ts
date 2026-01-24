import { pgTable, text, timestamp, integer, jsonb } from 'drizzle-orm/pg-core'
import { messages } from './messages'
import { agents } from './agents'
import { conversations } from './conversations'

/**
 * Tool calls table schema
 * Logs each individual tool invocation during agent responses
 */
export const toolCalls = pgTable('tool_calls', {
  /** Unique identifier (UUID) */
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),

  /** Message this tool call belongs to (the assistant message) */
  messageId: text('message_id')
    .notNull()
    .references(() => messages.id, { onDelete: 'cascade' }),

  /** Agent this tool call belongs to */
  agentId: text('agent_id')
    .notNull()
    .references(() => agents.id, { onDelete: 'cascade' }),

  /** Conversation this tool call belongs to (optional) */
  conversationId: text('conversation_id')
    .references(() => conversations.id, { onDelete: 'cascade' }),

  /** Step number within the message (1, 2, 3...) */
  stepNumber: integer('step_number').notNull(),

  /** Internal tool name (e.g., "get_weather") */
  toolName: text('tool_name').notNull(),

  /** Display name for the tool (e.g., "Get Weather") */
  toolTitle: text('tool_title'),

  /** Tool call ID from the AI provider */
  toolCallId: text('tool_call_id'),

  /** Arguments passed to the tool (JSON) */
  input: jsonb('input'),

  /** Tool response/result (JSON) */
  output: jsonb('output'),

  /** Execution status */
  status: text('status').notNull().default('pending'),

  /** Error message if status is 'error' */
  errorMessage: text('error_message'),

  /** Execution duration in milliseconds */
  durationMs: integer('duration_ms'),

  /** Timestamp when tool call was initiated */
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

/**
 * Tool call type inferred from schema
 */
export type ToolCall = typeof toolCalls.$inferSelect

/**
 * Insert tool call type inferred from schema
 */
export type InsertToolCall = typeof toolCalls.$inferInsert
