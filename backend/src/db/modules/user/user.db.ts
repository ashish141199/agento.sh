import { eq } from 'drizzle-orm'
import { db } from '../../index'
import { users, type User, type InsertUser } from '../../schema'

/**
 * Find user by ID
 * @param id - The user ID
 * @returns The user or undefined
 */
export async function findUserById(id: string): Promise<User | undefined> {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1)
  return result[0]
}

/**
 * Find user by email
 * @param email - The email address
 * @returns The user or undefined
 */
export async function findUserByEmail(email: string): Promise<User | undefined> {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1)
  return result[0]
}

/**
 * Find user by Google ID
 * @param googleId - The Google ID
 * @returns The user or undefined
 */
export async function findUserByGoogleId(googleId: string): Promise<User | undefined> {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.googleId, googleId))
    .limit(1)
  return result[0]
}

/**
 * Create a new user
 * @param data - The user data
 * @returns The created user
 */
export async function createUser(data: InsertUser): Promise<User> {
  const result = await db
    .insert(users)
    .values({
      ...data,
      email: data.email.toLowerCase(),
    })
    .returning()
  return result[0]!
}

/**
 * Update user by ID
 * @param id - The user ID
 * @param data - The data to update
 * @returns The updated user or undefined
 */
export async function updateUser(
  id: string,
  data: Partial<InsertUser>
): Promise<User | undefined> {
  const result = await db
    .update(users)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
    .returning()
  return result[0]
}

/**
 * Check if user exists by email
 * @param email - The email address
 * @returns True if user exists
 */
export async function userExistsByEmail(email: string): Promise<boolean> {
  const result = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1)
  return result.length > 0
}
