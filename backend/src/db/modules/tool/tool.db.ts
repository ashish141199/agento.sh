import { eq, and } from 'drizzle-orm'
import { db } from '../../index'
import { tools, agentTools, type Tool, type InsertTool, type AgentTool, type InsertAgentTool } from '../../schema'

/**
 * Tool with agent assignment info
 */
export type ToolWithAssignment = Tool & {
  agentToolId?: string
  agentEnabled?: boolean
}

/**
 * Find tool by ID
 * @param id - The tool ID
 * @returns The tool or undefined
 */
export async function findToolById(id: string): Promise<Tool | undefined> {
  const result = await db
    .select()
    .from(tools)
    .where(eq(tools.id, id))
    .limit(1)
  return result[0]
}

/**
 * Find all tools for a user
 * @param userId - The user ID
 * @returns List of tools
 */
export async function findToolsByUserId(userId: string): Promise<Tool[]> {
  return db
    .select()
    .from(tools)
    .where(eq(tools.userId, userId))
}

/**
 * Create a new tool
 * @param data - The tool data
 * @returns The created tool
 */
export async function createTool(data: InsertTool): Promise<Tool> {
  const result = await db
    .insert(tools)
    .values(data)
    .returning()
  return result[0]!
}

/**
 * Update tool by ID
 * @param id - The tool ID
 * @param data - The data to update
 * @returns The updated tool or undefined
 */
export async function updateTool(
  id: string,
  data: Partial<InsertTool>
): Promise<Tool | undefined> {
  const result = await db
    .update(tools)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(tools.id, id))
    .returning()
  return result[0]
}

/**
 * Delete tool by ID
 * @param id - The tool ID
 * @returns True if deleted, false if not found
 */
export async function deleteTool(id: string): Promise<boolean> {
  const result = await db
    .delete(tools)
    .where(eq(tools.id, id))
    .returning()
  return result.length > 0
}

/**
 * Check if tool belongs to user
 * @param toolId - The tool ID
 * @param userId - The user ID
 * @returns True if tool belongs to user
 */
export async function toolBelongsToUser(
  toolId: string,
  userId: string
): Promise<boolean> {
  const tool = await findToolById(toolId)
  return tool?.userId === userId
}

/**
 * Find all tools assigned to an agent
 * @param agentId - The agent ID
 * @returns List of tools with assignment info
 */
export async function findToolsByAgentId(agentId: string): Promise<ToolWithAssignment[]> {
  const result = await db
    .select({
      id: tools.id,
      userId: tools.userId,
      type: tools.type,
      name: tools.name,
      title: tools.title,
      description: tools.description,
      enabled: tools.enabled,
      inputSchema: tools.inputSchema,
      config: tools.config,
      createdAt: tools.createdAt,
      updatedAt: tools.updatedAt,
      agentToolId: agentTools.id,
      agentEnabled: agentTools.enabled,
    })
    .from(agentTools)
    .innerJoin(tools, eq(agentTools.toolId, tools.id))
    .where(eq(agentTools.agentId, agentId))

  return result as ToolWithAssignment[]
}

/**
 * Assign a tool to an agent
 * @param data - The assignment data
 * @returns The created agent-tool assignment
 */
export async function assignToolToAgent(data: InsertAgentTool): Promise<AgentTool> {
  const result = await db
    .insert(agentTools)
    .values(data)
    .returning()
  return result[0]!
}

/**
 * Remove a tool from an agent
 * @param agentId - The agent ID
 * @param toolId - The tool ID
 * @returns True if removed, false if not found
 */
export async function removeToolFromAgent(
  agentId: string,
  toolId: string
): Promise<boolean> {
  const result = await db
    .delete(agentTools)
    .where(
      and(
        eq(agentTools.agentId, agentId),
        eq(agentTools.toolId, toolId)
      )
    )
    .returning()
  return result.length > 0
}

/**
 * Update agent-tool assignment
 * @param agentId - The agent ID
 * @param toolId - The tool ID
 * @param data - The data to update
 * @returns The updated assignment or undefined
 */
export async function updateAgentTool(
  agentId: string,
  toolId: string,
  data: { enabled?: boolean }
): Promise<AgentTool | undefined> {
  const result = await db
    .update(agentTools)
    .set(data)
    .where(
      and(
        eq(agentTools.agentId, agentId),
        eq(agentTools.toolId, toolId)
      )
    )
    .returning()
  return result[0]
}

/**
 * Check if a tool is assigned to an agent
 * @param agentId - The agent ID
 * @param toolId - The tool ID
 * @returns True if assigned
 */
export async function isToolAssignedToAgent(
  agentId: string,
  toolId: string
): Promise<boolean> {
  const result = await db
    .select({ id: agentTools.id })
    .from(agentTools)
    .where(
      and(
        eq(agentTools.agentId, agentId),
        eq(agentTools.toolId, toolId)
      )
    )
    .limit(1)
  return result.length > 0
}
