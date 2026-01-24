import { pgTable, text, timestamp, integer, real } from 'drizzle-orm/pg-core'
import { messages } from './messages'
import { builderMessages } from './builder-messages'
import { agents } from './agents'
import { conversations } from './conversations'

/**
 * AI usage table schema
 * Tracks token usage and cost for each LLM invocation (step)
 * Can be associated with either a chat message or a builder message
 */
export const aiUsage = pgTable('ai_usage', {
  /** Unique identifier (UUID) */
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),

  /** Chat message this usage belongs to (for agent chat/conversations) */
  messageId: text('message_id')
    .references(() => messages.id, { onDelete: 'cascade' }),

  /** Builder message this usage belongs to (for builder AI assistant) */
  builderMessageId: text('builder_message_id')
    .references(() => builderMessages.id, { onDelete: 'cascade' }),

  /** Agent this usage belongs to (optional for builder without agent context) */
  agentId: text('agent_id')
    .references(() => agents.id, { onDelete: 'cascade' }),

  /** Conversation this usage belongs to (optional) */
  conversationId: text('conversation_id')
    .references(() => conversations.id, { onDelete: 'cascade' }),

  /** Step number within the message (1, 2, 3...) */
  stepNumber: integer('step_number').notNull(),

  /** Type of step: 'initial' | 'tool-call' | 'continue' */
  stepType: text('step_type').notNull(),

  /** Model used for this step */
  model: text('model').notNull(),

  /** Number of tokens in the prompt */
  promptTokens: integer('prompt_tokens').notNull(),

  /** Number of tokens in the completion */
  completionTokens: integer('completion_tokens').notNull(),

  /** Total tokens (prompt + completion) */
  totalTokens: integer('total_tokens').notNull(),

  /** Cost in credits for this step */
  cost: real('cost').notNull(),

  /** Number of cached tokens (optional) */
  cachedTokens: integer('cached_tokens'),

  /** Number of reasoning tokens (optional, for models like o1) */
  reasoningTokens: integer('reasoning_tokens'),

  /** Timestamp when this step completed */
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

/**
 * AI usage type inferred from schema
 */
export type AiUsage = typeof aiUsage.$inferSelect

/**
 * Insert AI usage type inferred from schema
 */
export type InsertAiUsage = typeof aiUsage.$inferInsert
