import { api } from '@/lib/api'

/**
 * Conversation type
 */
export interface Conversation {
  id: string
  agentId: string
  userId: string
  title: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Message type
 */
export interface Message {
  id: string
  agentId: string
  conversationId: string
  userId: string | null
  content: string
  isAgent: boolean
  createdAt: string
}

/**
 * Conversation service for public chat
 */
export const conversationService = {
  /**
   * List conversations for a published agent
   * @param slug - Agent slug
   * @param token - Access token
   */
  list: (slug: string, token: string) =>
    api.get<{ conversations: Conversation[] }>(`/chat/${slug}/conversations`, token),

  /**
   * Create a new conversation
   * @param slug - Agent slug
   * @param token - Access token
   */
  create: (slug: string, token: string) =>
    api.post<{ conversation: Conversation }>(`/chat/${slug}/conversations`, undefined, token),

  /**
   * Get messages for a conversation
   * @param conversationId - Conversation ID
   * @param token - Access token
   */
  getMessages: (conversationId: string, token: string) =>
    api.get<{ messages: Message[] }>(`/conversations/${conversationId}/messages`, token),

  /**
   * Delete a conversation
   * @param conversationId - Conversation ID
   * @param token - Access token
   */
  delete: (conversationId: string, token: string) =>
    api.delete<void>(`/conversations/${conversationId}`, token),
}
