import { eq, and, gt, lt } from 'drizzle-orm'
import { db } from '../../index'
import { sessions, type Session, type InsertSession } from '../../schema'

/**
 * Create a new session
 * @param data - The session data
 * @returns The created session
 */
export async function createSession(data: InsertSession): Promise<Session> {
  const result = await db
    .insert(sessions)
    .values(data)
    .returning()
  return result[0]!
}

/**
 * Find session by refresh token
 * @param refreshToken - The refresh token
 * @returns The session if valid, undefined otherwise
 */
export async function findSessionByRefreshToken(
  refreshToken: string
): Promise<Session | undefined> {
  const result = await db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.refreshToken, refreshToken),
        gt(sessions.expiresAt, new Date())
      )
    )
    .limit(1)
  return result[0]
}

/**
 * Find all sessions for a user
 * @param userId - The user ID
 * @returns All sessions for the user
 */
export async function findSessionsByUserId(userId: string): Promise<Session[]> {
  return db
    .select()
    .from(sessions)
    .where(eq(sessions.userId, userId))
}

/**
 * Delete session by ID
 * @param id - The session ID
 * @returns True if deleted, false if not found
 */
export async function deleteSession(id: string): Promise<boolean> {
  const result = await db
    .delete(sessions)
    .where(eq(sessions.id, id))
    .returning()
  return result.length > 0
}

/**
 * Delete session by refresh token
 * @param refreshToken - The refresh token
 * @returns True if deleted, false if not found
 */
export async function deleteSessionByRefreshToken(
  refreshToken: string
): Promise<boolean> {
  const result = await db
    .delete(sessions)
    .where(eq(sessions.refreshToken, refreshToken))
    .returning()
  return result.length > 0
}

/**
 * Delete all sessions for a user
 * @param userId - The user ID
 */
export async function deleteAllSessionsForUser(userId: string): Promise<void> {
  await db
    .delete(sessions)
    .where(eq(sessions.userId, userId))
}

/**
 * Delete expired sessions
 */
export async function deleteExpiredSessions(): Promise<void> {
  await db
    .delete(sessions)
    .where(lt(sessions.expiresAt, new Date()))
}
