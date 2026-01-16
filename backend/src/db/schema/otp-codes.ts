import { pgTable, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core'

/**
 * OTP codes table schema
 * Stores one-time passwords for email verification
 */
export const otpCodes = pgTable('otp_codes', {
  /** Unique OTP identifier (UUID) */
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),

  /** Email address the OTP was sent to */
  email: text('email').notNull(),

  /** The 6-digit OTP code */
  code: text('code').notNull(),

  /** Number of verification attempts */
  attempts: integer('attempts').notNull().default(0),

  /** Whether the OTP has been used */
  used: boolean('used').notNull().default(false),

  /** Timestamp when OTP expires (10 minutes from creation) */
  expiresAt: timestamp('expires_at').notNull(),

  /** Timestamp when OTP was created */
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

/**
 * OTP code type inferred from schema
 */
export type OtpCode = typeof otpCodes.$inferSelect

/**
 * Insert OTP code type inferred from schema
 */
export type InsertOtpCode = typeof otpCodes.$inferInsert
