/**
 * useAskUser Hook
 * Manages state and logic for the askUser tool (human-in-the-loop pattern)
 * @module hooks/use-ask-user
 */

import { useState, useCallback, useMemo } from 'react'
import type { AskUserInput, AskUserResponse } from '@/types/ask-user.types'

/** Stored response data for a submitted askUser tool call */
interface SubmittedResponse {
  /** The original input with questions */
  input: AskUserInput
  /** The user's response */
  response: AskUserResponse
}

/** Return type for useAskUser hook */
interface UseAskUserReturn {
  /** Map of toolCallId to submitted responses */
  submittedResponses: Record<string, SubmittedResponse>
  /** ID of the tool call currently being submitted */
  submittingToolId: string | null
  /**
   * Handle submission of an askUser response
   * @param toolCallId - The tool call ID
   * @param askInput - The original input
   * @param response - The user's response
   * @param addToolOutput - Function to send tool output to AI SDK
   * @param sendMessage - Function to continue conversation
   */
  handleAskUserSubmit: (
    toolCallId: string,
    askInput: AskUserInput,
    response: AskUserResponse,
    addToolOutput: (params: { toolCallId: string; tool: string; output: unknown }) => Promise<void>,
    sendMessage: () => void
  ) => Promise<void>
  /** Check if there's a pending askUser awaiting response */
  hasPendingAskUser: (messages: MessageWithParts[]) => boolean
  /** Get submitted response for a tool call */
  getSubmittedResponse: (toolCallId: string) => SubmittedResponse | undefined
}

/** Message structure with parts for checking pending askUser */
export interface MessageWithParts {
  parts?: Array<{
    type: string
    state?: string
    toolCallId?: string
  }>
}

/**
 * Hook for managing askUser tool state and interactions
 * @returns Object with state and handlers for askUser functionality
 */
export function useAskUser(): UseAskUserReturn {
  const [submittedResponses, setSubmittedResponses] = useState<
    Record<string, SubmittedResponse>
  >({})
  const [submittingToolId, setSubmittingToolId] = useState<string | null>(null)

  /**
   * Handle submission of an askUser response
   */
  const handleAskUserSubmit = useCallback(
    async (
      toolCallId: string,
      askInput: AskUserInput,
      response: AskUserResponse,
      addToolOutput: (params: { toolCallId: string; tool: string; output: unknown }) => Promise<void>,
      sendMessage: () => void
    ) => {
      setSubmittingToolId(toolCallId)
      try {
        // Store the response for display
        setSubmittedResponses((prev) => ({
          ...prev,
          [toolCallId]: { input: askInput, response },
        }))

        // Send the tool output back to the agent
        await addToolOutput({
          toolCallId,
          tool: 'askUser',
          output: response,
        })

        // Continue the conversation
        sendMessage()
      } finally {
        setSubmittingToolId(null)
      }
    },
    []
  )

  /**
   * Check if any message has a pending askUser tool awaiting response
   */
  const hasPendingAskUser = useCallback(
    (messages: MessageWithParts[]): boolean => {
      return messages.some((m) =>
        m.parts?.some((part) => {
          if (part.type.startsWith('tool-')) {
            const toolName = part.type.replace('tool-', '')
            const toolCallId = part.toolCallId
            return (
              toolName === 'askUser' &&
              part.state === 'input-available' &&
              toolCallId &&
              !submittedResponses[toolCallId]
            )
          }
          return false
        })
      )
    },
    [submittedResponses]
  )

  /**
   * Get submitted response for a specific tool call
   */
  const getSubmittedResponse = useCallback(
    (toolCallId: string): SubmittedResponse | undefined => {
      return submittedResponses[toolCallId]
    },
    [submittedResponses]
  )

  return {
    submittedResponses,
    submittingToolId,
    handleAskUserSubmit,
    hasPendingAskUser,
    getSubmittedResponse,
  }
}
