import { eq, desc, asc, ilike, or, and } from 'drizzle-orm'
import { db } from '../../index'
import { agents, type Agent, type InsertAgent } from '../../schema'

/**
 * Find agent by ID
 * @param id - The agent ID
 * @returns The agent or undefined
 */
export async function findAgentById(id: string): Promise<Agent | undefined> {
  const result = await db
    .select()
    .from(agents)
    .where(eq(agents.id, id))
    .limit(1)
  return result[0]
}

/**
 * Find all agents for a user with optional search and sort
 * @param userId - The user ID
 * @param options - Search and sort options
 * @returns List of agents
 */
export async function findAgentsByUserId(
  userId: string,
  options?: {
    search?: string
    sortBy?: 'name' | 'createdAt' | 'updatedAt'
    sortOrder?: 'asc' | 'desc'
  }
): Promise<Agent[]> {
  const { search, sortBy = 'createdAt', sortOrder = 'desc' } = options || {}

  const conditions = [eq(agents.userId, userId)]

  if (search) {
    const searchPattern = `%${search}%`
    conditions.push(
      or(
        ilike(agents.name, searchPattern),
        ilike(agents.description, searchPattern)
      )!
    )
  }

  const sortColumn = {
    name: agents.name,
    createdAt: agents.createdAt,
    updatedAt: agents.updatedAt,
  }[sortBy]

  const orderFn = sortOrder === 'asc' ? asc : desc

  return db
    .select()
    .from(agents)
    .where(and(...conditions))
    .orderBy(orderFn(sortColumn))
}

/**
 * Create a new agent
 * @param data - The agent data
 * @returns The created agent
 */
export async function createAgent(data: InsertAgent): Promise<Agent> {
  const result = await db
    .insert(agents)
    .values(data)
    .returning()
  return result[0]!
}

/**
 * Update agent by ID
 * @param id - The agent ID
 * @param data - The data to update
 * @returns The updated agent or undefined
 */
export async function updateAgent(
  id: string,
  data: Partial<InsertAgent>
): Promise<Agent | undefined> {
  const result = await db
    .update(agents)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(agents.id, id))
    .returning()
  return result[0]
}

/**
 * Delete agent by ID
 * @param id - The agent ID
 * @returns True if deleted, false if not found
 */
export async function deleteAgent(id: string): Promise<boolean> {
  const result = await db
    .delete(agents)
    .where(eq(agents.id, id))
    .returning()
  return result.length > 0
}

/**
 * Check if agent belongs to user
 * @param agentId - The agent ID
 * @param userId - The user ID
 * @returns True if agent belongs to user
 */
export async function agentBelongsToUser(
  agentId: string,
  userId: string
): Promise<boolean> {
  const result = await db
    .select({ id: agents.id })
    .from(agents)
    .where(eq(agents.id, agentId))
    .limit(1)

  if (!result[0]) return false

  const agent = await findAgentById(agentId)
  return agent?.userId === userId
}
