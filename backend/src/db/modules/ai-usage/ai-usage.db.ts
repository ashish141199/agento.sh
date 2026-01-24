import { eq, asc, desc, sql } from 'drizzle-orm'
import { db } from '../../index'
import { aiUsage, type AiUsage, type InsertAiUsage } from '../../schema'

/**
 * Create a new AI usage log
 * @param data - The AI usage data
 * @returns The created AI usage log
 */
export async function createAiUsage(data: InsertAiUsage): Promise<AiUsage> {
  const result = await db
    .insert(aiUsage)
    .values(data)
    .returning()
  return result[0]!
}

/**
 * Create multiple AI usage logs
 * @param data - Array of AI usage data
 * @returns The created AI usage logs
 */
export async function createAiUsageBatch(data: InsertAiUsage[]): Promise<AiUsage[]> {
  if (data.length === 0) return []
  const result = await db
    .insert(aiUsage)
    .values(data)
    .returning()
  return result
}

/**
 * Find all AI usage logs for a chat message
 * @param messageId - The message ID
 * @returns List of AI usage logs ordered by step number
 */
export async function findAiUsageByMessageId(messageId: string): Promise<AiUsage[]> {
  return db
    .select()
    .from(aiUsage)
    .where(eq(aiUsage.messageId, messageId))
    .orderBy(asc(aiUsage.stepNumber))
}

/**
 * Find all AI usage logs for a builder message
 * @param builderMessageId - The builder message ID
 * @returns List of AI usage logs ordered by step number
 */
export async function findAiUsageByBuilderMessageId(builderMessageId: string): Promise<AiUsage[]> {
  return db
    .select()
    .from(aiUsage)
    .where(eq(aiUsage.builderMessageId, builderMessageId))
    .orderBy(asc(aiUsage.stepNumber))
}

/**
 * Find all AI usage logs for an agent
 * @param agentId - The agent ID
 * @param limit - Maximum number of results (default 100)
 * @returns List of AI usage logs ordered by creation time descending
 */
export async function findAiUsageByAgentId(agentId: string, limit = 100): Promise<AiUsage[]> {
  return db
    .select()
    .from(aiUsage)
    .where(eq(aiUsage.agentId, agentId))
    .orderBy(desc(aiUsage.createdAt))
    .limit(limit)
}

/**
 * Find all AI usage logs for a conversation
 * @param conversationId - The conversation ID
 * @returns List of AI usage logs ordered by creation time
 */
export async function findAiUsageByConversationId(conversationId: string): Promise<AiUsage[]> {
  return db
    .select()
    .from(aiUsage)
    .where(eq(aiUsage.conversationId, conversationId))
    .orderBy(asc(aiUsage.createdAt))
}

/**
 * Get total usage for an agent
 * @param agentId - The agent ID
 * @returns Aggregated usage stats
 */
export async function getAgentTotalUsage(agentId: string): Promise<{
  totalPromptTokens: number
  totalCompletionTokens: number
  totalTokens: number
  totalCost: number
  totalSteps: number
}> {
  const result = await db
    .select({
      totalPromptTokens: sql<number>`COALESCE(SUM(${aiUsage.promptTokens}), 0)::int`,
      totalCompletionTokens: sql<number>`COALESCE(SUM(${aiUsage.completionTokens}), 0)::int`,
      totalTokens: sql<number>`COALESCE(SUM(${aiUsage.totalTokens}), 0)::int`,
      totalCost: sql<number>`COALESCE(SUM(${aiUsage.cost}), 0)::float`,
      totalSteps: sql<number>`COUNT(*)::int`,
    })
    .from(aiUsage)
    .where(eq(aiUsage.agentId, agentId))

  return result[0] ?? {
    totalPromptTokens: 0,
    totalCompletionTokens: 0,
    totalTokens: 0,
    totalCost: 0,
    totalSteps: 0,
  }
}

/**
 * Get total usage for a conversation
 * @param conversationId - The conversation ID
 * @returns Aggregated usage stats
 */
export async function getConversationTotalUsage(conversationId: string): Promise<{
  totalPromptTokens: number
  totalCompletionTokens: number
  totalTokens: number
  totalCost: number
  totalSteps: number
}> {
  const result = await db
    .select({
      totalPromptTokens: sql<number>`COALESCE(SUM(${aiUsage.promptTokens}), 0)::int`,
      totalCompletionTokens: sql<number>`COALESCE(SUM(${aiUsage.completionTokens}), 0)::int`,
      totalTokens: sql<number>`COALESCE(SUM(${aiUsage.totalTokens}), 0)::int`,
      totalCost: sql<number>`COALESCE(SUM(${aiUsage.cost}), 0)::float`,
      totalSteps: sql<number>`COUNT(*)::int`,
    })
    .from(aiUsage)
    .where(eq(aiUsage.conversationId, conversationId))

  return result[0] ?? {
    totalPromptTokens: 0,
    totalCompletionTokens: 0,
    totalTokens: 0,
    totalCost: 0,
    totalSteps: 0,
  }
}
