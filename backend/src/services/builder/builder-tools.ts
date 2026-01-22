/**
 * Builder Tools Module
 * Defines all AI tools available to the Agent Builder assistant
 * @module services/builder/builder-tools
 */

import { tool } from 'ai'
import { z } from 'zod'
import {
  createAgent,
  updateAgent,
  findAgentByIdWithModel,
  generateSystemPrompt,
} from '../../db/modules/agent/agent.db'
import {
  createTool as dbCreateTool,
  updateTool as dbUpdateTool,
  deleteTool as dbDeleteTool,
  assignToolToAgent,
  findToolById,
  removeToolFromAgent,
} from '../../db/modules/tool/tool.db'
import { findModelByModelId } from '../../db/modules/model/model.db'
import { linkBuilderMessagesToAgent } from '../../db/modules/builder/builder.db'
import type { InstructionsConfig, AgentSettings } from '../../db/schema/agents'
import type { ApiConnectorConfig, ToolInputSchema, ToolInput } from '../../db/schema/tools'

/**
 * Context object for builder tools
 * Contains mutable state that tools can update
 */
export interface BuilderToolContext {
  /** ID of the user making requests */
  userId: string
  /** Current agent ID (may be updated when agent is created) */
  currentAgentId: string | null
}

/**
 * Schema for createOrUpdateAgent tool parameters
 */
const createOrUpdateAgentSchema = z.object({
  name: z.string().min(1).max(100).optional().describe('The agent name (required for first creation)'),
  description: z.string().max(500).optional().describe('Brief description of what the agent does'),
  whatDoesAgentDo: z.string().max(2000).optional().describe('The agent\'s core purpose and main responsibilities'),
  howShouldItSpeak: z.string().max(2000).optional().describe('The agent\'s tone, personality, and communication style'),
  whatShouldItNeverDo: z.string().max(2000).optional().describe('Restrictions, boundaries, and things the agent must avoid'),
  anythingElse: z.string().max(2000).optional().describe('Additional context, special instructions, or domain knowledge'),
  modelId: z.string().optional().describe('The AI model identifier to use (e.g., "openrouter/auto")'),
  conversationHistoryLimit: z.number().min(1).max(100).optional().describe('Number of previous messages to include (default 10)'),
  welcomeMessage: z.string().max(500).optional().describe('Initial message shown when users start a conversation'),
  suggestedPrompts: z.array(z.string().max(200)).max(10).optional().describe('Quick-click prompts shown to help users get started'),
})

/** Type for createOrUpdateAgent parameters */
type CreateOrUpdateAgentParams = z.infer<typeof createOrUpdateAgentSchema>

/**
 * Schema for tool input definition (used by builder)
 */
const toolInputDefSchema = z.object({
  name: z.string().describe('Input identifier (no spaces, e.g., "city", "userId")'),
  description: z.string().describe('What should the AI provide for this input'),
  type: z.enum(['text', 'number', 'boolean', 'list', 'object']).describe('Data type'),
  required: z.boolean().default(true).describe('Whether this input is required'),
  default: z.any().optional().describe('Default value if not provided'),
})

/**
 * Schema for createTool tool parameters
 */
const createToolSchema = z.object({
  name: z.string().min(1).max(100).describe('Tool name (used as function name, alphanumeric and underscores)'),
  description: z.string().max(500).optional().describe('Description of what this tool does - helps AI understand when to use it'),
  inputs: z.array(toolInputDefSchema).optional().describe('Input parameters the AI should provide when calling this tool'),
  url: z.string().url().describe('The API endpoint URL - can include {{inputName}} placeholders'),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).describe('HTTP method'),
  queryParams: z.array(z.object({
    key: z.string(),
    value: z.string(),
  })).optional().describe('Query parameters - values can include {{inputName}} placeholders'),
  authenticationType: z.enum(['none', 'bearer', 'api_key', 'basic']).optional().describe('Authentication type'),
  authToken: z.string().optional().describe('Bearer token or API key value'),
  authUsername: z.string().optional().describe('Username for basic auth'),
  authPassword: z.string().optional().describe('Password for basic auth'),
  headers: z.array(z.object({
    key: z.string(),
    value: z.string(),
  })).optional().describe('Custom headers - values can include {{inputName}} placeholders'),
  body: z.string().optional().describe('Request body template for POST/PUT/PATCH - can include {{inputName}} placeholders'),
})

/** Type for createTool parameters */
type CreateToolParams = z.infer<typeof createToolSchema>

/**
 * Schema for updateTool tool parameters
 */
const updateToolSchema = z.object({
  toolId: z.string().uuid().describe('The tool ID to update'),
  name: z.string().min(1).max(100).optional().describe('New tool name'),
  description: z.string().max(500).optional().describe('New description'),
  inputs: z.array(toolInputDefSchema).optional().describe('New input parameters - replaces existing inputs'),
  url: z.string().url().optional().describe('New API endpoint URL - can include {{inputName}} placeholders'),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).optional().describe('New HTTP method'),
  queryParams: z.array(z.object({
    key: z.string(),
    value: z.string(),
  })).optional().describe('New query parameters'),
  authenticationType: z.enum(['none', 'bearer', 'api_key', 'basic']).optional().describe('New authentication type'),
  authToken: z.string().optional().describe('New bearer token or API key'),
  authUsername: z.string().optional().describe('New username for basic auth'),
  authPassword: z.string().optional().describe('New password for basic auth'),
  headers: z.array(z.object({
    key: z.string(),
    value: z.string(),
  })).optional().describe('New custom headers'),
  body: z.string().optional().describe('New request body template'),
})

/** Type for updateTool parameters */
type UpdateToolParams = z.infer<typeof updateToolSchema>

/**
 * Schema for deleteTool tool parameters
 */
const deleteToolSchema = z.object({
  toolId: z.string().uuid().describe('The tool ID to delete'),
})

/**
 * Schema for askUser tool parameters
 */
const askUserSchema = z.object({
  questions: z
    .array(
      z.object({
        id: z.string().describe('Unique identifier for this question'),
        text: z.string().describe('The question text to display to the user'),
        type: z
          .enum(['single_choice', 'multiple_choice', 'text'])
          .describe('Type of question: single_choice (radio), multiple_choice (checkbox), or text (free input)'),
        options: z
          .array(
            z.object({
              label: z.string().describe('Display label for this option'),
              value: z.string().describe('Value to return when selected'),
            })
          )
          .optional()
          .describe('Options for MCQ questions (required for single_choice and multiple_choice)'),
        allowOther: z
          .boolean()
          .optional()
          .describe('If true, adds an "Other" option that lets the user type a custom answer'),
      })
    )
    .min(1)
    .max(5)
    .describe('Array of questions to ask the user (1-5 questions)'),
})

/**
 * Creates the askUser tool
 * This is a client-side tool (no execute function) that collects user input
 * @returns The askUser tool definition
 */
export function createAskUserTool() {
  return tool({
    description: `Ask the user clarification questions when you need more information to proceed. Use this tool to gather requirements before creating or configuring the agent.

Guidelines:
- Use when you need to understand the user's specific needs
- Prefer MCQ (single_choice or multiple_choice) over text questions when possible
- Keep questions clear and concise
- Maximum 5 questions per call, minimum 1
- Use allowOther: true for MCQ when the user might have an answer not in your options
- Each question must have a unique id`,
    title: 'Ask User',
    inputSchema: askUserSchema,
    // No execute function - this tool is handled client-side
  })
}

/**
 * Executes the createOrUpdateAgent tool logic
 * Creates a new agent or updates an existing one
 * @param context - The builder tool context
 * @param params - The tool parameters
 * @returns Result object with success status and agent data
 */
async function executeCreateOrUpdateAgent(
  context: BuilderToolContext,
  params: CreateOrUpdateAgentParams
) {
  try {
    let agentIdToUse = context.currentAgentId
    let action: 'created' | 'updated' = 'updated'

    if (!agentIdToUse) {
      // Create new agent - requires name
      if (!params.name) {
        return {
          success: false,
          error: 'Agent name is required for initial creation',
        }
      }

      // Find model by modelId string if provided
      let modelUuid: string | undefined
      if (params.modelId) {
        const model = await findModelByModelId(params.modelId)
        modelUuid = model?.id
      }

      const newAgent = await createAgent({
        userId: context.userId,
        name: params.name,
        description: params.description,
        modelId: modelUuid,
      })

      agentIdToUse = newAgent.id
      context.currentAgentId = newAgent.id // Update context
      action = 'created'

      // Link orphan messages to the new agent
      await linkBuilderMessagesToAgent(context.userId, agentIdToUse)
    }

    // Build update data from params
    const updatePayload = await buildAgentUpdatePayload(agentIdToUse, params)

    // Update agent if we have anything to update
    if (Object.keys(updatePayload).length > 0) {
      await updateAgent(agentIdToUse, updatePayload)
    }

    // Get updated agent
    const updatedAgent = await findAgentByIdWithModel(agentIdToUse)

    return {
      success: true,
      action,
      agentId: agentIdToUse,
      agent: formatAgentResponse(updatedAgent),
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create/update agent',
    }
  }
}

/**
 * Builds the update payload for an agent from parameters
 * @param agentId - The agent ID to update
 * @param params - The parameters to apply
 * @returns The update payload object
 */
async function buildAgentUpdatePayload(
  agentId: string,
  params: CreateOrUpdateAgentParams
): Promise<Record<string, unknown>> {
  const instructionsConfig: Partial<InstructionsConfig> = {}
  if (params.whatDoesAgentDo !== undefined) instructionsConfig.whatDoesAgentDo = params.whatDoesAgentDo
  if (params.howShouldItSpeak !== undefined) instructionsConfig.howShouldItSpeak = params.howShouldItSpeak
  if (params.whatShouldItNeverDo !== undefined) instructionsConfig.whatShouldItNeverDo = params.whatShouldItNeverDo
  if (params.anythingElse !== undefined) instructionsConfig.anythingElse = params.anythingElse

  const settings: Partial<AgentSettings> = {}
  if (params.conversationHistoryLimit !== undefined) {
    settings.memory = { conversationHistoryLimit: params.conversationHistoryLimit }
  }
  if (params.welcomeMessage !== undefined || params.suggestedPrompts !== undefined) {
    settings.chat = {
      welcomeMessage: params.welcomeMessage || '',
      suggestedPrompts: params.suggestedPrompts || [],
    }
  }

  // Find model UUID if modelId provided
  let modelUuid: string | null | undefined
  if (params.modelId !== undefined) {
    if (params.modelId) {
      const model = await findModelByModelId(params.modelId)
      modelUuid = model?.id
    } else {
      modelUuid = null
    }
  }

  // Prepare update payload
  const updatePayload: Record<string, unknown> = {}
  if (params.name !== undefined) updatePayload.name = params.name
  if (params.description !== undefined) updatePayload.description = params.description
  if (modelUuid !== undefined) updatePayload.modelId = modelUuid

  // Get existing agent to merge configs
  const existingAgent = await findAgentByIdWithModel(agentId)
  if (existingAgent) {
    // Merge instructions config
    if (Object.keys(instructionsConfig).length > 0) {
      updatePayload.instructionsConfig = {
        ...existingAgent.instructionsConfig,
        ...instructionsConfig,
      }
    }

    // Merge settings
    if (Object.keys(settings).length > 0) {
      updatePayload.settings = {
        memory: {
          ...existingAgent.settings?.memory,
          ...settings.memory,
        },
        chat: {
          ...existingAgent.settings?.chat,
          ...settings.chat,
        },
      }
    }

    // Generate system prompt if any relevant fields changed
    if (updatePayload.name || updatePayload.description !== undefined || updatePayload.instructionsConfig) {
      updatePayload.systemPrompt = generateSystemPrompt(
        (updatePayload.name as string) || existingAgent.name,
        (updatePayload.description as string | null) ?? existingAgent.description,
        (updatePayload.instructionsConfig as InstructionsConfig) || existingAgent.instructionsConfig
      )
    }
  }

  return updatePayload
}

/**
 * Formats agent data for tool response
 * @param agent - The agent data from database
 * @returns Formatted agent response object
 */
function formatAgentResponse(agent: Awaited<ReturnType<typeof findAgentByIdWithModel>>) {
  if (!agent) return null

  return {
    id: agent.id,
    name: agent.name,
    description: agent.description,
    model: agent.model?.name || 'Default',
    instructionsConfigured: !!(
      agent.instructionsConfig?.whatDoesAgentDo ||
      agent.instructionsConfig?.howShouldItSpeak ||
      agent.instructionsConfig?.whatShouldItNeverDo ||
      agent.instructionsConfig?.anythingElse
    ),
    welcomeMessage: agent.settings?.chat?.welcomeMessage || null,
    suggestedPrompts: agent.settings?.chat?.suggestedPrompts || [],
  }
}

/**
 * Creates the createOrUpdateAgent tool
 * @param context - The builder tool context
 * @returns The tool definition
 */
export function createCreateOrUpdateAgentTool(context: BuilderToolContext) {
  return tool({
    description: 'Creates a new agent or updates the current agent configuration. Use this after gathering enough information from the user. All fields are optional except name is required for initial creation.',
    inputSchema: createOrUpdateAgentSchema,
    execute: (params: CreateOrUpdateAgentParams) => executeCreateOrUpdateAgent(context, params),
  })
}

/**
 * Executes the createTool tool logic
 * Creates a new API connector tool for the agent
 * @param context - The builder tool context
 * @param params - The tool parameters
 * @returns Result object with success status and tool data
 */
async function executeCreateTool(context: BuilderToolContext, params: CreateToolParams) {
  try {
    if (!context.currentAgentId) {
      return {
        success: false,
        error: 'Please create the agent first before adding tools',
      }
    }

    // Build input schema from inputs array
    let inputSchema: ToolInputSchema | undefined
    if (params.inputs && params.inputs.length > 0) {
      inputSchema = {
        inputs: params.inputs.map(input => ({
          name: input.name,
          description: input.description,
          type: input.type,
          required: input.required ?? true,
          default: input.default,
        })) as ToolInput[],
      }
    }

    // Build API config
    const apiConfig: ApiConnectorConfig = {
      url: params.url,
      method: params.method,
      headers: params.headers,
      queryParams: params.queryParams,
      body: params.body,
    }

    // Add authentication if provided
    if (params.authenticationType && params.authenticationType !== 'none') {
      apiConfig.authentication = {
        type: params.authenticationType,
        token: params.authToken,
        apiKey: params.authToken,
        username: params.authUsername,
        password: params.authPassword,
      }
    }

    // Create the tool
    const newTool = await dbCreateTool({
      userId: context.userId,
      type: 'api_connector',
      name: params.name,
      description: params.description,
      inputSchema,
      config: apiConfig,
      enabled: true,
    })

    // Assign to agent
    await assignToolToAgent({
      agentId: context.currentAgentId,
      toolId: newTool.id,
      enabled: true,
    })

    return {
      success: true,
      toolId: newTool.id,
      tool: {
        id: newTool.id,
        name: newTool.name,
        description: newTool.description,
        type: 'api_connector',
        url: params.url,
        method: params.method,
        inputs: params.inputs?.map(i => i.name) || [],
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create tool',
    }
  }
}

/**
 * Creates the createTool tool definition
 * @param context - The builder tool context
 * @returns The tool definition
 */
export function createCreateToolTool(context: BuilderToolContext) {
  return tool({
    description: 'Creates a new API connector tool for the agent. Tools allow the agent to interact with external APIs.',
    inputSchema: createToolSchema,
    execute: (params: CreateToolParams) => executeCreateTool(context, params),
  })
}

/**
 * Executes the updateTool tool logic
 * Updates an existing tool configuration
 * @param context - The builder tool context
 * @param params - The tool parameters
 * @returns Result object with success status and updated tool data
 */
async function executeUpdateTool(context: BuilderToolContext, params: UpdateToolParams) {
  try {
    const existingTool = await findToolById(params.toolId)
    if (!existingTool) {
      return { success: false, error: 'Tool not found' }
    }

    if (existingTool.userId !== context.userId) {
      return { success: false, error: 'Not authorized to update this tool' }
    }

    const existingConfig = existingTool.config as ApiConnectorConfig
    const updateData: Record<string, unknown> = {}

    if (params.name) updateData.name = params.name
    if (params.description !== undefined) updateData.description = params.description

    // Update input schema if provided
    if (params.inputs !== undefined) {
      if (params.inputs.length > 0) {
        updateData.inputSchema = {
          inputs: params.inputs.map(input => ({
            name: input.name,
            description: input.description,
            type: input.type,
            required: input.required ?? true,
            default: input.default,
          })) as ToolInput[],
        }
      } else {
        updateData.inputSchema = null
      }
    }

    // Build updated config
    const newConfig: ApiConnectorConfig = {
      url: params.url || existingConfig.url,
      method: params.method || existingConfig.method,
      headers: params.headers !== undefined ? params.headers : existingConfig.headers,
      queryParams: params.queryParams !== undefined ? params.queryParams : existingConfig.queryParams,
      body: params.body !== undefined ? params.body : existingConfig.body,
    }

    // Handle authentication updates
    if (params.authenticationType !== undefined) {
      if (params.authenticationType === 'none') {
        newConfig.authentication = undefined
      } else {
        newConfig.authentication = {
          type: params.authenticationType,
          token: params.authToken,
          apiKey: params.authToken,
          username: params.authUsername,
          password: params.authPassword,
        }
      }
    } else {
      newConfig.authentication = existingConfig.authentication
    }

    updateData.config = newConfig
    const updatedTool = await dbUpdateTool(params.toolId, updateData)

    return {
      success: true,
      tool: {
        id: updatedTool?.id,
        name: updatedTool?.name,
        description: updatedTool?.description,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update tool',
    }
  }
}

/**
 * Creates the updateTool tool definition
 * @param context - The builder tool context
 * @returns The tool definition
 */
export function createUpdateToolTool(context: BuilderToolContext) {
  return tool({
    description: 'Updates an existing tool configuration',
    inputSchema: updateToolSchema,
    execute: (params: UpdateToolParams) => executeUpdateTool(context, params),
  })
}

/**
 * Executes the deleteTool tool logic
 * Removes a tool from the agent and deletes it
 * @param context - The builder tool context
 * @param params - The tool parameters
 * @returns Result object with success status
 */
async function executeDeleteTool(context: BuilderToolContext, params: { toolId: string }) {
  try {
    const existingTool = await findToolById(params.toolId)
    if (!existingTool) {
      return { success: false, error: 'Tool not found' }
    }

    if (existingTool.userId !== context.userId) {
      return { success: false, error: 'Not authorized to delete this tool' }
    }

    // Remove from agent first
    if (context.currentAgentId) {
      await removeToolFromAgent(context.currentAgentId, params.toolId)
    }

    // Delete the tool
    await dbDeleteTool(params.toolId)

    return {
      success: true,
      message: `Tool "${existingTool.name}" has been deleted`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete tool',
    }
  }
}

/**
 * Creates the deleteTool tool definition
 * @param context - The builder tool context
 * @returns The tool definition
 */
export function createDeleteToolTool(context: BuilderToolContext) {
  return tool({
    description: 'Removes a tool from the agent',
    inputSchema: deleteToolSchema,
    execute: (params: { toolId: string }) => executeDeleteTool(context, params),
  })
}

/**
 * Creates all builder tools with the given context
 * @param context - The builder tool context containing userId and currentAgentId
 * @returns Object containing all builder tool definitions
 */
export function createBuilderTools(context: BuilderToolContext) {
  return {
    askUser: createAskUserTool(),
    createOrUpdateAgent: createCreateOrUpdateAgentTool(context),
    createTool: createCreateToolTool(context),
    updateTool: createUpdateToolTool(context),
    deleteTool: createDeleteToolTool(context),
  }
}
