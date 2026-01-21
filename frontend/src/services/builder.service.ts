import { api } from '@/lib/api'
import type { Agent } from './agent.service'
import type { Tool } from './tool.service'

/**
 * Message part structure (matches backend MessagePart type)
 */
export type MessagePart =
  | { type: 'text'; text: string }
  | { type: string; toolCallId?: string; toolName?: string; state?: string; input?: unknown; output?: unknown }

/**
 * Builder message structure
 */
export interface BuilderMessage {
  id: string
  userId: string
  agentId: string | null
  role: 'user' | 'assistant'
  content: string
  parts?: MessagePart[]
  createdAt: string
}

/**
 * Builder service for AI-assisted agent creation
 */
export const builderService = {
  /**
   * Get builder messages for an agent or new agent creation
   * @param token - Access token
   * @param agentId - Optional agent ID (for existing agents)
   */
  getMessages: (token: string, agentId?: string) =>
    api.get<{ messages: BuilderMessage[]; agentId: string | null }>(
      `/builder/messages${agentId ? `?agentId=${agentId}` : ''}`,
      token
    ),

  /**
   * Get agent data for builder context
   * @param agentId - Agent ID
   * @param token - Access token
   */
  getAgent: (agentId: string, token: string) =>
    api.get<{ agent: Agent | null; tools: Tool[] }>(
      `/builder/agent?agentId=${agentId}`,
      token
    ),
}
