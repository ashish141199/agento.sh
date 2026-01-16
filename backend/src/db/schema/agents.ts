import { pgTable, text, timestamp, jsonb } from 'drizzle-orm/pg-core'
import { users } from './users'
import { models } from './models'

/**
 * Instructions config JSON structure
 */
export interface InstructionsConfig {
  whatDoesAgentDo: string
  howShouldItSpeak: string
  whatShouldItNeverDo: string
  anythingElse: string
}

/**
 * Agents table schema
 * Stores AI agent configurations
 */
export const agents = pgTable('agents', {
  /** Unique agent identifier (UUID) */
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),

  /** User who owns this agent */
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  /** Agent name */
  name: text('name').notNull(),

  /** Agent description */
  description: text('description'),

  /** Model UUID reference */
  modelId: text('model_id')
    .references(() => models.id),

  /** Instructions configuration (JSON) */
  instructionsConfig: jsonb('instructions_config').$type<InstructionsConfig>(),

  /** Computed system prompt based on name, description, and instructions */
  systemPrompt: text('system_prompt'),

  /** Timestamp when agent was created */
  createdAt: timestamp('created_at').notNull().defaultNow(),

  /** Timestamp when agent was last updated */
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

/**
 * Agent type inferred from schema
 */
export type Agent = typeof agents.$inferSelect

/**
 * Insert agent type inferred from schema
 */
export type InsertAgent = typeof agents.$inferInsert
