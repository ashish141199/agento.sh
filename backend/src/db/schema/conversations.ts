import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { agents } from './agents'
import { users } from './users'

/**
 * Conversations table schema
 * Groups chat messages into separate conversations per user per agent
 */
export const conversations = pgTable('conversations', {
  /** Unique conversation identifier (UUID) */
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),

  /** Agent this conversation belongs to */
  agentId: text('agent_id')
    .notNull()
    .references(() => agents.id, { onDelete: 'cascade' }),

  /** User who owns this conversation */
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  /** Conversation title (auto-generated from first message or user-set) */
  title: text('title'),

  /** Timestamp when conversation was created */
  createdAt: timestamp('created_at').notNull().defaultNow(),

  /** Timestamp when conversation was last updated */
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

/**
 * Conversation type inferred from schema
 */
export type Conversation = typeof conversations.$inferSelect

/**
 * Insert conversation type inferred from schema
 */
export type InsertConversation = typeof conversations.$inferInsert
