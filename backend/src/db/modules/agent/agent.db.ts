import { eq, desc, asc, ilike, or, and } from 'drizzle-orm'
import { db } from '../../index'
import { agents, models, type Agent, type InsertAgent, type Model, type InstructionsConfig } from '../../schema'

/**
 * Agent with model details
 */
export type AgentWithModel = Agent & { model: Model | null }

/**
 * Generate system prompt from agent details
 */
export function generateSystemPrompt(
  name: string,
  description: string | null | undefined,
  instructionsConfig: InstructionsConfig | null | undefined
): string {
  const parts: string[] = []

  parts.push(`You are ${name}.`)

  if (description) {
    parts.push(description)
  }

  if (instructionsConfig) {
    if (instructionsConfig.whatDoesAgentDo) {
      parts.push(`\n## Your Purpose\n${instructionsConfig.whatDoesAgentDo}`)
    }
    if (instructionsConfig.howShouldItSpeak) {
      parts.push(`\n## Communication Style\n${instructionsConfig.howShouldItSpeak}`)
    }
    if (instructionsConfig.whatShouldItNeverDo) {
      parts.push(`\n## Restrictions\nYou must never:\n${instructionsConfig.whatShouldItNeverDo}`)
    }
    if (instructionsConfig.anythingElse) {
      parts.push(`\n## Additional Context\n${instructionsConfig.anythingElse}`)
    }
  }

  return parts.join('\n')
}

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
 * Find agent by ID with model details
 * @param id - The agent ID
 * @returns The agent with model details or undefined
 */
export async function findAgentByIdWithModel(id: string): Promise<AgentWithModel | undefined> {
  const result = await db
    .select({
      id: agents.id,
      userId: agents.userId,
      name: agents.name,
      description: agents.description,
      modelId: agents.modelId,
      instructionsConfig: agents.instructionsConfig,
      systemPrompt: agents.systemPrompt,
      slug: agents.slug,
      isPublished: agents.isPublished,
      publishedAt: agents.publishedAt,
      publishedConfigHash: agents.publishedConfigHash,
      embedConfig: agents.embedConfig,
      createdAt: agents.createdAt,
      updatedAt: agents.updatedAt,
      model: {
        id: models.id,
        modelId: models.modelId,
        name: models.name,
        provider: models.provider,
        createdAt: models.createdAt,
      },
    })
    .from(agents)
    .leftJoin(models, eq(agents.modelId, models.id))
    .where(eq(agents.id, id))
    .limit(1)

  if (!result[0]) return undefined

  return {
    ...result[0],
    model: result[0].model?.id ? result[0].model as Model : null,
  } as AgentWithModel
}

/**
 * Find all agents for a user with optional search and sort
 * Includes model details for each agent
 * @param userId - The user ID
 * @param options - Search and sort options
 * @returns List of agents with model details
 */
export async function findAgentsByUserId(
  userId: string,
  options?: {
    search?: string
    sortBy?: 'name' | 'createdAt' | 'updatedAt'
    sortOrder?: 'asc' | 'desc'
  }
): Promise<AgentWithModel[]> {
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

  const result = await db
    .select({
      id: agents.id,
      userId: agents.userId,
      name: agents.name,
      description: agents.description,
      modelId: agents.modelId,
      instructionsConfig: agents.instructionsConfig,
      systemPrompt: agents.systemPrompt,
      slug: agents.slug,
      isPublished: agents.isPublished,
      publishedAt: agents.publishedAt,
      publishedConfigHash: agents.publishedConfigHash,
      embedConfig: agents.embedConfig,
      createdAt: agents.createdAt,
      updatedAt: agents.updatedAt,
      model: {
        id: models.id,
        modelId: models.modelId,
        name: models.name,
        provider: models.provider,
        createdAt: models.createdAt,
      },
    })
    .from(agents)
    .leftJoin(models, eq(agents.modelId, models.id))
    .where(and(...conditions))
    .orderBy(orderFn(sortColumn))

  return result.map(row => ({
    ...row,
    model: row.model?.id ? row.model as Model : null,
  })) as AgentWithModel[]
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
