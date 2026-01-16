import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { users } from './users'

/**
 * Sessions table schema
 * Stores active user sessions for authentication
 */
export const sessions = pgTable('sessions', {
  /** Unique session identifier (UUID) */
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),

  /** User ID this session belongs to */
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  /** JWT refresh token for this session */
  refreshToken: text('refresh_token').notNull().unique(),

  /** User agent string from the client */
  userAgent: text('user_agent'),

  /** IP address of the client */
  ipAddress: text('ip_address'),

  /** Timestamp when session expires */
  expiresAt: timestamp('expires_at').notNull(),

  /** Timestamp when session was created */
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

/**
 * Session type inferred from schema
 */
export type Session = typeof sessions.$inferSelect

/**
 * Insert session type inferred from schema
 */
export type InsertSession = typeof sessions.$inferInsert
