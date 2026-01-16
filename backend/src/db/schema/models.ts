import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'

/**
 * Models table schema
 * Stores available AI model configurations
 */
export const models = pgTable('models', {
  /** Unique identifier (UUID) */
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),

  /** Model identifier (e.g., openrouter/auto, openai/gpt-4o) */
  modelId: text('model_id').notNull().unique(),

  /** Display name for the model */
  name: text('name').notNull(),

  /** Model provider (e.g., openrouter, openai, anthropic) */
  provider: text('provider').notNull(),

  /** Timestamp when model was added */
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

/**
 * Model type inferred from schema
 */
export type Model = typeof models.$inferSelect

/**
 * Insert Model type inferred from schema
 */
export type InsertModel = typeof models.$inferInsert
