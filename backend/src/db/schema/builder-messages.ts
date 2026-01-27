import { pgTable, text, timestamp, pgEnum, jsonb } from 'drizzle-orm/pg-core'
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

  /** Message content (text part for display) */
  content: text('content').notNull(),

  /** Full message parts including tool calls (UIMessage parts format) */
  parts: jsonb('parts').$type<MessagePart[]>(),

  /** Timestamp when message was created */
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

/**
 * Message part type for storage
 * Matches Vercel AI SDK UIMessage parts structure
 */
export type MessagePart =
  | { type: 'text'; text: string }
  | {
      type: 'tool-invocation' | 'tool-result' | string
      toolCallId?: string
      toolName?: string
      state?: string
      args?: unknown // for tool-invocation
      result?: unknown // for tool-result
      input?: unknown // legacy
      output?: unknown // legacy
    }

/**
 * Builder message type inferred from schema
 */
export type BuilderMessage = typeof builderMessages.$inferSelect

/**
 * Insert builder message type inferred from schema
 */
export type InsertBuilderMessage = typeof builderMessages.$inferInsert
