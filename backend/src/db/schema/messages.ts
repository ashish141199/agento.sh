import { pgTable, text, timestamp, boolean } from 'drizzle-orm/pg-core'
import { agents } from './agents'

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

  /** Message content */
  content: text('content').notNull(),

  /** Whether this message is from the agent (true) or user (false) */
  isAgent: boolean('is_agent').notNull().default(false),

  /** Timestamp when message was created */
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

/**
 * Message type inferred from schema
 */
export type Message = typeof messages.$inferSelect

/**
 * Insert message type inferred from schema
 */
export type InsertMessage = typeof messages.$inferInsert
