import { eq, ilike } from 'drizzle-orm'
import { createHash } from 'crypto'
import { db } from '../../index'
import { agents, type Agent, type EmbedConfig } from '../../schema'
import { findAgentById } from './agent.db'

/**
 * Generate a URL-friendly slug from a name
 * @param name - The name to convert to a slug
 * @returns URL-friendly slug
 */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/-+/g, '-')      // Replace multiple hyphens with single
    .replace(/^-|-$/g, '')    // Remove leading/trailing hyphens
}

/**
 * Generate a unique slug for an agent
 * @param name - The agent name
 * @returns A unique slug
 */
export async function generateUniqueSlug(name: string): Promise<string> {
  const baseSlug = slugify(name)

  // Check if base slug exists
  let slug = baseSlug
  let counter = 1

  while (true) {
    const existing = await db
      .select({ id: agents.id })
      .from(agents)
      .where(eq(agents.slug, slug))
      .limit(1)

    if (existing.length === 0) {
      return slug
    }

    slug = `${baseSlug}-${counter}`
    counter++
  }
}

/**
 * Compute a hash of the agent's publishable configuration
 * Used for detecting changes after publishing
 * @param agent - The agent to hash
 * @returns MD5 hash of the config
 */
export function computeConfigHash(agent: Agent): string {
  const configData = {
    name: agent.name,
    description: agent.description,
    modelId: agent.modelId,
    instructionsConfig: agent.instructionsConfig,
    systemPrompt: agent.systemPrompt,
  }

  return createHash('md5')
    .update(JSON.stringify(configData))
    .digest('hex')
}

/**
 * Publish an agent
 * @param id - The agent ID
 * @returns The published agent
 */
export async function publishAgent(id: string): Promise<Agent | undefined> {
  const agent = await findAgentById(id)
  if (!agent) return undefined

  // Generate slug if not exists
  const slug = agent.slug || await generateUniqueSlug(agent.name)
  const configHash = computeConfigHash(agent)

  const result = await db
    .update(agents)
    .set({
      slug,
      isPublished: true,
      publishedAt: new Date(),
      publishedConfigHash: configHash,
      updatedAt: new Date(),
    })
    .where(eq(agents.id, id))
    .returning()

  return result[0]
}

/**
 * Unpublish an agent
 * @param id - The agent ID
 * @returns The unpublished agent
 */
export async function unpublishAgent(id: string): Promise<Agent | undefined> {
  const result = await db
    .update(agents)
    .set({
      isPublished: false,
      updatedAt: new Date(),
    })
    .where(eq(agents.id, id))
    .returning()

  return result[0]
}

/**
 * Publish status response type
 */
export interface PublishStatus {
  isPublished: boolean
  hasChanges: boolean
  slug: string | null
  publishedAt: Date | null
}

/**
 * Get the publish status of an agent
 * @param id - The agent ID
 * @returns The publish status
 */
export async function getPublishStatus(id: string): Promise<PublishStatus | undefined> {
  const agent = await findAgentById(id)
  if (!agent) return undefined

  const currentHash = computeConfigHash(agent)
  const hasChanges = agent.isPublished && agent.publishedConfigHash !== currentHash

  return {
    isPublished: agent.isPublished,
    hasChanges,
    slug: agent.slug,
    publishedAt: agent.publishedAt,
  }
}

/**
 * Update embed config for an agent
 * @param id - The agent ID
 * @param config - The embed config to update
 * @returns The updated agent
 */
export async function updateEmbedConfig(
  id: string,
  config: Partial<EmbedConfig>
): Promise<Agent | undefined> {
  const agent = await findAgentById(id)
  if (!agent) return undefined

  const currentConfig = agent.embedConfig || { position: 'bottom-right', theme: 'light' }
  const newConfig = { ...currentConfig, ...config }

  const result = await db
    .update(agents)
    .set({
      embedConfig: newConfig,
      updatedAt: new Date(),
    })
    .where(eq(agents.id, id))
    .returning()

  return result[0]
}

/**
 * Find an agent by its slug
 * @param slug - The agent slug
 * @returns The agent or undefined
 */
export async function findAgentBySlug(slug: string): Promise<Agent | undefined> {
  const result = await db
    .select()
    .from(agents)
    .where(eq(agents.slug, slug))
    .limit(1)

  return result[0]
}
