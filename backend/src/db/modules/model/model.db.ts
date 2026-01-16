import { eq } from 'drizzle-orm'
import { db } from '../../index'
import { models, type Model, type InsertModel } from '../../schema'

/**
 * Find all models
 * @returns List of all models
 */
export async function findAllModels(): Promise<Model[]> {
  return db.select().from(models)
}

/**
 * Find model by ID (UUID)
 * @param id - The model UUID
 * @returns The model or undefined
 */
export async function findModelById(id: string): Promise<Model | undefined> {
  const result = await db
    .select()
    .from(models)
    .where(eq(models.id, id))
    .limit(1)
  return result[0]
}

/**
 * Find model by model identifier
 * @param modelId - The model identifier (e.g., 'openrouter/auto')
 * @returns The model or undefined
 */
export async function findModelByModelId(modelId: string): Promise<Model | undefined> {
  const result = await db
    .select()
    .from(models)
    .where(eq(models.modelId, modelId))
    .limit(1)
  return result[0]
}

/**
 * Find models by provider
 * @param provider - The provider name (e.g., 'openai', 'anthropic')
 * @returns List of models for the provider
 */
export async function findModelsByProvider(provider: string): Promise<Model[]> {
  return db
    .select()
    .from(models)
    .where(eq(models.provider, provider))
}

/**
 * Create a new model
 * @param data - The model data
 * @returns The created model
 */
export async function createModel(data: InsertModel): Promise<Model> {
  const result = await db
    .insert(models)
    .values(data)
    .returning()
  return result[0]!
}

/**
 * Check if model exists by ID
 * @param id - The model UUID
 * @returns True if model exists
 */
export async function modelExists(id: string): Promise<boolean> {
  const result = await db
    .select({ id: models.id })
    .from(models)
    .where(eq(models.id, id))
    .limit(1)
  return result.length > 0
}

/**
 * Delete model by ID
 * @param id - The model UUID
 * @returns True if deleted, false if not found
 */
export async function deleteModel(id: string): Promise<boolean> {
  const result = await db
    .delete(models)
    .where(eq(models.id, id))
    .returning()
  return result.length > 0
}
