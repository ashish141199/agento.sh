'use client'

/**
 * Message Parts Renderer Component
 * Renders message parts (text, tool calls, askUser) in chat interfaces
 * @module components/agents/message-parts-renderer
 */

import ReactMarkdown from 'react-markdown'
import { AskUserCard, AnsweredSummary } from './ask-user-card'
import { SimpleToolCallCard, getToolStatus } from './tool-call-card'
import type { AskUserInput, AskUserResponse } from '@/types/ask-user.types'

/** Stored response data for a submitted askUser tool call */
interface SubmittedResponse {
  input: AskUserInput
  response: AskUserResponse
}

/** Generic message part structure */
interface MessagePart {
  type: string
  text?: string
  state?: string
  toolCallId?: string
  input?: unknown
  output?: unknown
}

/** Props for MessagePartsRenderer component */
interface MessagePartsRendererProps {
  /** Array of message parts to render */
  parts: MessagePart[]
  /** Role of the message sender */
  role: 'user' | 'assistant'
  /** Map of submitted askUser responses */
  submittedResponses: Record<string, SubmittedResponse>
  /** ID of tool currently being submitted */
  submittingToolId: string | null
  /** Handler for askUser submissions */
  onAskUserSubmit: (
    toolCallId: string,
    input: AskUserInput,
    response: AskUserResponse
  ) => void
  /** Map of tool names to display titles */
  toolTitles?: Record<string, string>
}

/**
 * Renders a text part with appropriate formatting
 */
function TextPartRenderer({
  text,
  isUser,
}: {
  text: string
  isUser: boolean
}) {
  if (isUser) {
    return <p className="whitespace-pre-wrap">{text}</p>
  }

  return (
    <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0">
      <ReactMarkdown>{text}</ReactMarkdown>
    </div>
  )
}

/**
 * Renders an askUser tool part
 */
function AskUserPartRenderer({
  toolPart,
  submittedData,
  submittingToolId,
  onSubmit,
}: {
  toolPart: MessagePart
  submittedData: SubmittedResponse | undefined
  submittingToolId: string | null
  onSubmit: (
    toolCallId: string,
    input: AskUserInput,
    response: AskUserResponse
  ) => void
}) {
  const toolCallId = toolPart.toolCallId || ''
  const askInput = toolPart.input as AskUserInput | undefined
  const isWaitingForInput =
    toolPart.state === 'input-available' && !submittedData

  // Show AskUserCard if waiting for input
  if (isWaitingForInput && askInput?.questions) {
    return (
      <AskUserCard
        input={askInput}
        onSubmit={(response) => onSubmit(toolCallId, askInput, response)}
        isSubmitting={submittingToolId === toolCallId}
      />
    )
  }

  // Show summary if already submitted locally
  if (submittedData) {
    return (
      <AnsweredSummary input={submittedData.input} response={submittedData.response} />
    )
  }

  // Show summary from tool output if available (persisted from server)
  if (toolPart.state === 'output-available' && toolPart.output) {
    const outputResponse = toolPart.output as AskUserResponse
    if (askInput?.questions) {
      return <AnsweredSummary input={askInput} response={outputResponse} />
    }
  }

  // Fallback to loading state
  return (
    <SimpleToolCallCard
      toolName="Asking questions..."
      status={getToolStatus(toolPart.state)}
    />
  )
}

/**
 * Renders message parts (text, tool calls, etc.) in chat interfaces
 * Handles special rendering for askUser tool with input collection
 */
export function MessagePartsRenderer({
  parts,
  role,
  submittedResponses,
  submittingToolId,
  onAskUserSubmit,
  toolTitles = {},
}: MessagePartsRendererProps) {
  return (
    <>
      {parts.map((part, index) => {
        // Handle text parts
        if (part.type === 'text' && part.text) {
          return (
            <TextPartRenderer
              key={index}
              text={part.text}
              isUser={role === 'user'}
            />
          )
        }

        // Handle tool parts (format: tool-{toolName})
        if (part.type.startsWith('tool-')) {
          const toolName = part.type.replace('tool-', '')
          const toolCallId = part.toolCallId || ''

          // Special handling for askUser tool
          if (toolName === 'askUser') {
            return (
              <AskUserPartRenderer
                key={index}
                toolPart={part}
                submittedData={submittedResponses[toolCallId]}
                submittingToolId={submittingToolId}
                onSubmit={onAskUserSubmit}
              />
            )
          }

          // Regular tool call handling
          return (
            <SimpleToolCallCard
              key={index}
              toolName={toolName}
              status={getToolStatus(part.state)}
              displayName={toolTitles[toolName]}
            />
          )
        }

        return null
      })}
    </>
  )
}
