import { pgTable, text, timestamp, boolean, integer, real } from 'drizzle-orm/pg-core'
import { agents } from './agents'
import { users } from './users'
import { conversations } from './conversations'

/**
 * Messages table schema
 * Stores chat messages for each agent conversation
 */
export const messages = pgTable('messages', {
  /** Unique message identifier (UUID) */
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),

  /** Agent this message belongs to */
  agentId: text('agent_id')
    .notNull()
    .references(() => agents.id, { onDelete: 'cascade' }),

  /** Conversation this message belongs to (optional for backwards compatibility) */
  conversationId: text('conversation_id')
    .references(() => conversations.id, { onDelete: 'cascade' }),

  /** User who sent this message (null for agent messages) */
  userId: text('user_id')
    .references(() => users.id, { onDelete: 'cascade' }),

  /** Message content */
  content: text('content').notNull(),

  /** Whether this message is from the agent (true) or user (false) */
  isAgent: boolean('is_agent').notNull().default(false),

  /** Timestamp when message was created */
  createdAt: timestamp('created_at').notNull().defaultNow(),

  // === Usage tracking (for agent messages only) ===

  /** Model used for this response */
  model: text('model'),

  /** Total prompt tokens across all steps */
  promptTokens: integer('prompt_tokens'),

  /** Total completion tokens across all steps */
  completionTokens: integer('completion_tokens'),

  /** Total tokens (prompt + completion) */
  totalTokens: integer('total_tokens'),

  /** Total cost in credits */
  cost: real('cost'),
})

/**
 * Message type inferred from schema
 */
export type Message = typeof messages.$inferSelect

/**
 * Insert message type inferred from schema
 */
export type InsertMessage = typeof messages.$inferInsert
