/**
 * useAskUser Hook
 * Manages state and logic for the askUser tool (human-in-the-loop pattern)
 * @module hooks/use-ask-user
 */

import { useState, useCallback, useRef } from 'react'
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
  /** Check if there's a pending askUser awaiting response (memoized) */
  hasPendingAskUser: (messages: MessageWithParts[]) => boolean
  /** Check if there's a pending askUser - always uses fresh data (for submit handlers) */
  checkPendingAskUser: (messages: MessageWithParts[]) => boolean
  /** Get submitted response for a tool call */
  getSubmittedResponse: (toolCallId: string) => SubmittedResponse | undefined
}

/** Message structure with parts for checking pending askUser */
export interface MessageWithParts {
  parts?: Array<{
    type: string
    state?: string
    toolCallId?: string
    toolName?: string // For tool-invocation format
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

  // Ref to always have latest submittedResponses (avoids stale closures)
  const submittedResponsesRef = useRef<Record<string, SubmittedResponse>>({})
  submittedResponsesRef.current = submittedResponses

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
   * Handles both formats:
   * - Stream format: type='tool-askUser'
   * - DB format: type='tool-invocation', toolName='askUser'
   */
  const hasPendingAskUser = useCallback(
    (messages: MessageWithParts[]): boolean => {
      const result = messages.some((m) =>
        m.parts?.some((part) => {
          // Get tool name from either format
          let toolName: string | undefined
          if (part.type === 'tool-invocation' || part.type === 'tool-result') {
            // DB format: toolName is a separate field
            toolName = part.toolName
          } else if (part.type.startsWith('tool-')) {
            // Stream format: tool name is in the type
            toolName = part.type.replace('tool-', '')
          }

          const toolCallId = part.toolCallId
          // Check for pending askUser - it's pending if:
          // - It's an askUser tool call
          // - State is NOT 'result' (hasn't been completed)
          // - We haven't already submitted a response for this toolCallId
          const isCompleted = part.state === 'result'

          return (
            toolName === 'askUser' &&
            !isCompleted &&
            toolCallId &&
            !submittedResponses[toolCallId]
          )
        })
      )

      return result
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

  /**
   * Check for pending askUser using ref (always fresh data).
   * Use this in submit handlers to avoid stale closure issues.
   */
  const checkPendingAskUser = useCallback(
    (messages: MessageWithParts[]): boolean => {
      const currentSubmitted = submittedResponsesRef.current
      const result = messages.some((m) =>
        m.parts?.some((part) => {
          // Get tool name from either format
          let toolName: string | undefined
          if (part.type === 'tool-invocation' || part.type === 'tool-result') {
            toolName = part.toolName
          } else if (part.type.startsWith('tool-')) {
            toolName = part.type.replace('tool-', '')
          }

          const toolCallId = part.toolCallId
          const isCompleted = part.state === 'result'

          return (
            toolName === 'askUser' &&
            !isCompleted &&
            toolCallId &&
            !currentSubmitted[toolCallId]
          )
        })
      )

      return result
    },
    [] // No dependencies - uses ref for fresh data
  )

  return {
    submittedResponses,
    submittingToolId,
    handleAskUserSubmit,
    hasPendingAskUser,
    checkPendingAskUser,
    getSubmittedResponse,
  }
}
