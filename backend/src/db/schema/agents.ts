import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { users } from './users'
import { models } from './models'

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
    .notNull()
    .references(() => models.id),

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
