import { pgTable, text, timestamp, pgEnum } from 'drizzle-orm/pg-core'
import { users } from './users'
import { agents } from './agents'

/**
 * Builder message role enum
 */
export const builderMessageRoleEnum = pgEnum('builder_message_role', ['user', 'assistant'])

/**
 * Builder messages table schema
 * Stores AI-assisted agent building conversation messages
 * Each message belongs to a user and optionally to an agent
 */
export const builderMessages = pgTable('builder_messages', {
  /** Unique message identifier (UUID) */
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),

  /** User who owns this message */
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  /** Agent this message is for (null if agent not created yet) */
  agentId: text('agent_id')
    .references(() => agents.id, { onDelete: 'cascade' }),

  /** Message role */
  role: builderMessageRoleEnum('role').notNull(),

  /** Message content */
  content: text('content').notNull(),

  /** Timestamp when message was created */
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

/**
 * Builder message type inferred from schema
 */
export type BuilderMessage = typeof builderMessages.$inferSelect

/**
 * Insert builder message type inferred from schema
 */
export type InsertBuilderMessage = typeof builderMessages.$inferInsert
