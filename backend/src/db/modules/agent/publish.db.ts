import { eq, and, isNull } from 'drizzle-orm'
import { createHash } from 'crypto'
import { db } from '../../index'
import { agents, type Agent, type EmbedConfig } from '../../schema'
import { findAgentById } from './agent.db'
import { DEFAULT_EMBED_CONFIG } from '../../../config/defaults'

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
 * Generate a unique slug for an agent (excludes soft-deleted agents, allowing slug reuse)
 * @param name - The agent name
 * @returns A unique slug
 */
export async function generateUniqueSlug(name: string): Promise<string> {
  const baseSlug = slugify(name)

  // Check if base slug exists among non-deleted agents
  let slug = baseSlug
  let counter = 1

  while (true) {
    const existing = await db
      .select({ id: agents.id })
      .from(agents)
      .where(and(eq(agents.slug, slug), isNull(agents.deletedAt)))
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

  const currentConfig = agent.embedConfig || DEFAULT_EMBED_CONFIG
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
 * Find an agent by its slug (excludes soft-deleted agents)
 * @param slug - The agent slug
 * @returns The agent or undefined
 */
export async function findAgentBySlug(slug: string): Promise<Agent | undefined> {
  const result = await db
    .select()
    .from(agents)
    .where(and(eq(agents.slug, slug), isNull(agents.deletedAt)))
    .limit(1)

  return result[0]
}

/**
 * Check if a string is a valid UUID
 * @param str - The string to check
 * @returns True if the string is a valid UUID
 */
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

/**
 * Find an agent by either ID or slug (excludes soft-deleted agents)
 * If the identifier looks like a UUID, it will try to find by ID first
 * Otherwise, it will find by slug
 * @param identifier - The agent ID or slug
 * @returns The agent or undefined
 */
export async function findAgentByIdOrSlug(identifier: string): Promise<Agent | undefined> {
  // If it looks like a UUID, try to find by ID first
  if (isUUID(identifier)) {
    const result = await db
      .select()
      .from(agents)
      .where(and(eq(agents.id, identifier), isNull(agents.deletedAt)))
      .limit(1)

    if (result[0]) {
      return result[0]
    }
  }

  // Otherwise (or if ID not found), try to find by slug
  return findAgentBySlug(identifier)
}
