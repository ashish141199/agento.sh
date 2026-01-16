import { pgTable, text, timestamp, boolean, pgEnum } from 'drizzle-orm/pg-core'

/**
 * Authentication provider enum
 */
export const authProviderEnum = pgEnum('auth_provider', ['email', 'google'])

/**
 * Users table schema
 * Stores user account information
 */
export const users = pgTable('users', {
  /** Unique user identifier (UUID) */
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),

  /** User's email address (unique) */
  email: text('email').notNull().unique(),

  /** User's full name */
  fullName: text('full_name'),

  /** Authentication provider used */
  authProvider: authProviderEnum('auth_provider').notNull().default('email'),

  /** Google ID for OAuth users */
  googleId: text('google_id').unique(),

  /** Whether email is verified */
  emailVerified: boolean('email_verified').notNull().default(false),

  /** User profile image URL */
  imageUrl: text('image_url'),

  /** Timestamp when user was created */
  createdAt: timestamp('created_at').notNull().defaultNow(),

  /** Timestamp when user was last updated */
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

/**
 * User type inferred from schema
 */
export type User = typeof users.$inferSelect

/**
 * Insert user type inferred from schema
 */
export type InsertUser = typeof users.$inferInsert
