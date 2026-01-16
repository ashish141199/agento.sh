import { eq, and, gt, lt } from 'drizzle-orm'
import { db } from '../../index'
import { otpCodes, type OtpCode, type InsertOtpCode } from '../../schema'

/**
 * Create a new OTP code
 * @param data - The OTP data
 * @returns The created OTP code
 */
export async function createOtpCode(data: InsertOtpCode): Promise<OtpCode> {
  const result = await db
    .insert(otpCodes)
    .values(data)
    .returning()
  return result[0]!
}

/**
 * Find valid OTP code by email and code
 * @param email - The email address
 * @param code - The OTP code
 * @returns The OTP code if valid, undefined otherwise
 */
export async function findValidOtpCode(
  email: string,
  code: string
): Promise<OtpCode | undefined> {
  const result = await db
    .select()
    .from(otpCodes)
    .where(
      and(
        eq(otpCodes.email, email.toLowerCase()),
        eq(otpCodes.code, code),
        eq(otpCodes.used, false),
        gt(otpCodes.expiresAt, new Date())
      )
    )
    .limit(1)
  return result[0]
}

/**
 * Find latest OTP code by email
 * @param email - The email address
 * @returns The latest OTP code or undefined
 */
export async function findLatestOtpByEmail(
  email: string
): Promise<OtpCode | undefined> {
  const result = await db
    .select()
    .from(otpCodes)
    .where(eq(otpCodes.email, email.toLowerCase()))
    .orderBy(otpCodes.createdAt)
    .limit(1)
  return result[0]
}

/**
 * Mark OTP code as used
 * @param id - The OTP code ID
 * @returns The updated OTP code or undefined
 */
export async function markOtpAsUsed(id: string): Promise<OtpCode | undefined> {
  const result = await db
    .update(otpCodes)
    .set({ used: true })
    .where(eq(otpCodes.id, id))
    .returning()
  return result[0]
}

/**
 * Increment OTP attempts
 * @param id - The OTP code ID
 * @returns The updated OTP code or undefined
 */
export async function incrementOtpAttempts(id: string): Promise<OtpCode | undefined> {
  const otp = await db
    .select()
    .from(otpCodes)
    .where(eq(otpCodes.id, id))
    .limit(1)

  if (!otp[0]) return undefined

  const result = await db
    .update(otpCodes)
    .set({ attempts: otp[0].attempts + 1 })
    .where(eq(otpCodes.id, id))
    .returning()
  return result[0]
}

/**
 * Delete expired OTP codes for an email
 * @param email - The email address
 */
export async function deleteExpiredOtpCodes(email: string): Promise<void> {
  await db
    .delete(otpCodes)
    .where(
      and(
        eq(otpCodes.email, email.toLowerCase()),
        lt(otpCodes.expiresAt, new Date())
      )
    )
}

/**
 * Delete all OTP codes for an email
 * @param email - The email address
 */
export async function deleteAllOtpCodesForEmail(email: string): Promise<void> {
  await db
    .delete(otpCodes)
    .where(eq(otpCodes.email, email.toLowerCase()))
}
