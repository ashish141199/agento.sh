'use client'

/**
 * Tool Call Card Components
 * Displays tool execution status in chat interfaces
 * @module components/agents/tool-call-card
 */

import { useState } from 'react'
import { ChevronDown, ChevronRight, Loader2, CheckCircle2, XCircle, Wrench, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Simple tool execution status */
export type ToolStatus = 'pending' | 'success' | 'error'

/**
 * Maps tool name to user-friendly display name
 * @param name - Internal tool name
 * @returns Human-readable display name
 */
export function getToolDisplayName(name: string): string {
  switch (name) {
    case 'createOrUpdateAgent':
      return 'Configuring agent'
    case 'createTool':
      return 'Creating tool'
    case 'updateTool':
      return 'Updating tool'
    case 'deleteTool':
      return 'Deleting tool'
    default:
      return name
  }
}

/**
 * Maps AI SDK tool state to simple display status
 * @param state - AI SDK tool state string
 * @returns Simplified status for display
 */
export function getToolStatus(state: string | undefined): ToolStatus {
  switch (state) {
    case 'output-available':
      return 'success'
    case 'output-error':
      return 'error'
    case 'input-streaming':
    case 'input-available':
    default:
      return 'pending'
  }
}

/** Props for SimpleToolCallCard component */
interface SimpleToolCallCardProps {
  /** The tool name to display */
  toolName: string
  /** Current execution status */
  status: ToolStatus
  /** Optional display name (title) to show instead of toolName */
  displayName?: string
}

/**
 * Simple tool call indicator for inline chat display
 * Shows tool name with a status icon (loading, success, or error)
 */
export function SimpleToolCallCard({ toolName, status, displayName }: SimpleToolCallCardProps) {
  return (
    <div className="flex items-center gap-2 py-1.5 px-3 bg-neutral-50 dark:bg-neutral-700 rounded text-xs my-1 w-full">
      <Wrench className="h-3 w-3 text-neutral-500 dark:text-neutral-400 shrink-0" />
      <span className="text-neutral-600 dark:text-neutral-300 flex-1">
        {displayName || getToolDisplayName(toolName)}
      </span>
      {status === 'pending' && (
        <Loader2 className="h-3 w-3 animate-spin text-neutral-400 shrink-0" />
      )}
      {status === 'success' && (
        <Check className="h-3 w-3 text-green-500 shrink-0" />
      )}
      {status === 'error' && (
        <X className="h-3 w-3 text-red-500 shrink-0" />
      )}
    </div>
  )
}

/**
 * Tool call state types from AI SDK
 */
export type ToolState =
  | 'input-streaming'
  | 'input-available'
  | 'approval-requested'
  | 'approval-responded'
  | 'output-available'
  | 'output-error'
  | 'output-denied'

/**
 * Tool call part interface
 */
export interface ToolCallPart {
  type: string
  toolName: string
  toolCallId: string
  state: ToolState
  title?: string
  input?: unknown
  output?: unknown
  errorText?: string
}

/**
 * Custom tool renderer props
 */
export interface ToolRendererProps {
  toolName: string
  displayName: string
  state: ToolState
  input?: unknown
  output?: unknown
  errorText?: string
}

/**
 * Registry of custom tool renderers
 */
export type ToolRendererRegistry = Record<string, React.ComponentType<ToolRendererProps>>

/**
 * Default tool renderers - can be extended
 */
const defaultRenderers: ToolRendererRegistry = {}

/**
 * Format JSON for display
 */
function formatJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

/**
 * Status indicator for tool call
 */
function StatusIndicator({ state }: { state: ToolState }) {
  switch (state) {
    case 'input-streaming':
    case 'input-available':
    case 'approval-requested':
    case 'approval-responded':
      return <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
    case 'output-available':
      return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
    case 'output-error':
    case 'output-denied':
      return <XCircle className="h-3.5 w-3.5 text-red-500" />
    default:
      return <Wrench className="h-3.5 w-3.5 text-neutral-500" />
  }
}

/**
 * Get status text for tool call
 */
function getStatusText(state: ToolState): string {
  switch (state) {
    case 'input-streaming':
      return 'Preparing...'
    case 'input-available':
      return 'Executing...'
    case 'approval-requested':
      return 'Awaiting approval'
    case 'approval-responded':
      return 'Processing...'
    case 'output-available':
      return 'Completed'
    case 'output-error':
      return 'Failed'
    case 'output-denied':
      return 'Denied'
    default:
      return 'Unknown'
  }
}

/**
 * Check if details are available
 */
function hasDetails(input: unknown, output: unknown, errorText?: string): boolean {
  return input !== undefined || output !== undefined || !!errorText
}

/**
 * Default tool call renderer with expandable details
 */
function DefaultToolRenderer({ displayName, state, input, output, errorText }: ToolRendererProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const isComplete = state === 'output-available'
  const isError = state === 'output-error' || state === 'output-denied'
  const showExpandIcon = hasDetails(input, output, errorText)

  return (
    <div>
      {/* Single-line header */}
      <button
        onClick={() => showExpandIcon && setIsExpanded(!isExpanded)}
        className={cn(
          "w-full flex items-center gap-2",
          showExpandIcon && "cursor-pointer"
        )}
        disabled={!showExpandIcon}
      >
        <StatusIndicator state={state} />

        <span className="font-medium text-sm text-neutral-800 dark:text-neutral-200">
          {displayName}
        </span>

        <span className={cn(
          "text-xs",
          isComplete && "text-green-600 dark:text-green-400",
          isError && "text-red-600 dark:text-red-400",
          !isComplete && !isError && "text-neutral-500 dark:text-neutral-400"
        )}>
          {getStatusText(state)}
        </span>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Expand/collapse icon */}
        {showExpandIcon && (
          <div className="text-neutral-400 dark:text-neutral-500">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </div>
        )}
      </button>

      {/* Expandable details */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-700 space-y-3">
          {/* Error message */}
          {errorText && (
            <div>
              <span className="text-xs font-medium text-red-600 dark:text-red-400">Error</span>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                {errorText}
              </p>
            </div>
          )}

          {/* Input */}
          {input !== undefined && (
            <div>
              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Input</span>
              <pre className="mt-1 p-2 text-xs bg-neutral-100 dark:bg-neutral-800 rounded overflow-x-auto text-neutral-700 dark:text-neutral-300">
                {formatJson(input)}
              </pre>
            </div>
          )}

          {/* Output */}
          {output !== undefined && (
            <div>
              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Output</span>
              <pre className="mt-1 p-2 text-xs bg-neutral-100 dark:bg-neutral-800 rounded overflow-x-auto text-neutral-700 dark:text-neutral-300">
                {formatJson(output)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface ToolCallCardProps {
  part: ToolCallPart
  customRenderers?: ToolRendererRegistry
}

/**
 * Tool call card component
 * Renders tool call with appropriate UI based on state
 * Supports custom renderers for specific tools
 */
export function ToolCallCard({ part, customRenderers = {} }: ToolCallCardProps) {
  const renderers = { ...defaultRenderers, ...customRenderers }
  const CustomRenderer = renderers[part.toolName]

  // Use title if available, otherwise use toolName
  const displayName = part.title || part.toolName

  const rendererProps: ToolRendererProps = {
    toolName: part.toolName,
    displayName,
    state: part.state,
    input: part.input,
    output: part.output,
    errorText: part.errorText,
  }

  return (
    <div className="my-2 p-3 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
      {CustomRenderer ? (
        <CustomRenderer {...rendererProps} />
      ) : (
        <DefaultToolRenderer {...rendererProps} />
      )}
    </div>
  )
}
