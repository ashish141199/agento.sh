import { pgTable, text, timestamp, integer, real } from 'drizzle-orm/pg-core'
import { builderMessages } from './builder-messages'
import { users } from './users'
import { agents } from './agents'

/**
 * Builder usage table schema
 * Tracks token usage and cost for each LLM invocation in the AI Builder assistant
 */
export const builderUsage = pgTable('builder_usage', {
  /** Unique identifier (UUID) */
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),

  /** Builder message this usage belongs to */
  builderMessageId: text('builder_message_id')
    .notNull()
    .references(() => builderMessages.id, { onDelete: 'cascade' }),

  /** User who owns this usage */
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  /** Agent being built/edited (optional - may not exist yet during creation) */
  agentId: text('agent_id')
    .references(() => agents.id, { onDelete: 'cascade' }),

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

  /** Cost in USD for this step */
  cost: real('cost').notNull(),

  /** Number of cached tokens (optional) */
  cachedTokens: integer('cached_tokens'),

  /** Number of reasoning tokens (optional) */
  reasoningTokens: integer('reasoning_tokens'),

  /** Timestamp when this step completed */
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

/**
 * Builder usage type inferred from schema
 */
export type BuilderUsage = typeof builderUsage.$inferSelect

/**
 * Insert builder usage type inferred from schema
 */
export type InsertBuilderUsage = typeof builderUsage.$inferInsert
