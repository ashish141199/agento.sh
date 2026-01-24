import { eq, asc, desc, sql } from 'drizzle-orm'
import { db } from '../../index'
import { builderUsage, type BuilderUsage, type InsertBuilderUsage } from '../../schema'

/**
 * Create a new builder usage log
 * @param data - The builder usage data
 * @returns The created builder usage log
 */
export async function createBuilderUsage(data: InsertBuilderUsage): Promise<BuilderUsage> {
  const result = await db
    .insert(builderUsage)
    .values(data)
    .returning()
  return result[0]!
}

/**
 * Create multiple builder usage logs
 * @param data - Array of builder usage data
 * @returns The created builder usage logs
 */
export async function createBuilderUsageBatch(data: InsertBuilderUsage[]): Promise<BuilderUsage[]> {
  if (data.length === 0) return []
  const result = await db
    .insert(builderUsage)
    .values(data)
    .returning()
  return result
}

/**
 * Find all builder usage logs for a builder message
 * @param builderMessageId - The builder message ID
 * @returns List of builder usage logs ordered by step number
 */
export async function findBuilderUsageByMessageId(builderMessageId: string): Promise<BuilderUsage[]> {
  return db
    .select()
    .from(builderUsage)
    .where(eq(builderUsage.builderMessageId, builderMessageId))
    .orderBy(asc(builderUsage.stepNumber))
}

/**
 * Find all builder usage logs for a user
 * @param userId - The user ID
 * @param limit - Maximum number of results (default 100)
 * @returns List of builder usage logs ordered by creation time descending
 */
export async function findBuilderUsageByUserId(userId: string, limit = 100): Promise<BuilderUsage[]> {
  return db
    .select()
    .from(builderUsage)
    .where(eq(builderUsage.userId, userId))
    .orderBy(desc(builderUsage.createdAt))
    .limit(limit)
}

/**
 * Get total usage for a user's builder sessions
 * @param userId - The user ID
 * @returns Aggregated usage stats
 */
export async function getUserBuilderTotalUsage(userId: string): Promise<{
  totalPromptTokens: number
  totalCompletionTokens: number
  totalTokens: number
  totalCost: number
  totalSteps: number
}> {
  const result = await db
    .select({
      totalPromptTokens: sql<number>`COALESCE(SUM(${builderUsage.promptTokens}), 0)::int`,
      totalCompletionTokens: sql<number>`COALESCE(SUM(${builderUsage.completionTokens}), 0)::int`,
      totalTokens: sql<number>`COALESCE(SUM(${builderUsage.totalTokens}), 0)::int`,
      totalCost: sql<number>`COALESCE(SUM(${builderUsage.cost}), 0)::float`,
      totalSteps: sql<number>`COUNT(*)::int`,
    })
    .from(builderUsage)
    .where(eq(builderUsage.userId, userId))

  return result[0] ?? {
    totalPromptTokens: 0,
    totalCompletionTokens: 0,
    totalTokens: 0,
    totalCost: 0,
    totalSteps: 0,
  }
}
