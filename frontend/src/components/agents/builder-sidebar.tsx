'use client'

/**
 * Builder Sidebar Component
 * AI-assisted agent creation chat interface
 * @module components/agents/builder-sidebar
 */

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Loader2, X, Sparkles, Bot, GripVertical } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { cn } from '@/lib/utils'
import { builderService, type BuilderMessage } from '@/services/builder.service'
import type { Agent } from '@/services/agent.service'
import { MessagePartsRenderer } from './message-parts-renderer'
import { useAskUser } from '@/hooks/use-ask-user'
import { useFetchWithAuth } from '@/hooks/use-fetch-with-auth'
import { useResizablePanel } from '@/hooks/use-resizable-panel'
import { API_BASE_URL } from '@/lib/api'
import type { AskUserInput, AskUserResponse } from '@/types/ask-user.types'
import { SUGGESTIONS } from '@/components/prompt-box'

/** Props for BuilderSidebar component */
interface BuilderSidebarProps {
  /** Whether the sidebar is open */
  isOpen: boolean
  /** Callback when sidebar is closed */
  onClose: () => void
  /** Callback when agent data is updated */
  onAgentUpdate: (agent: Agent) => void
  /** ID of existing agent being edited (null for new agent) */
  agentId?: string | null
  /** Initial message to send automatically */
  initialMessage?: string
  /** Current agent data */
  agent?: Agent | null
}

/** Props for BuilderChatInner component */
interface BuilderChatInnerProps {
  /** Current agent ID (null for new agent) */
  agentId: string | null
  /** Messages loaded from the server */
  initialMessages: BuilderMessage[]
  /** Callback when agent is updated */
  onAgentUpdate: (agent: Agent) => void
  /** Initial prompt to auto-send */
  initialPrompt?: string
  /** Current agent data */
  agent?: Agent | null
}

/**
 * Inner component that handles the chat functionality
 */
function BuilderChatInner({
  agentId,
  initialMessages,
  onAgentUpdate,
  initialPrompt,
  agent,
}: BuilderChatInnerProps) {
  const [input, setInput] = useState('')
  const hasAutoSentRef = useRef(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const hasPolledRef = useRef(false)
  const [currentAgentId] = useState<string | null>(agentId)

  // Use custom hooks
  const fetchWithAuth = useFetchWithAuth()
  const {
    submittedResponses,
    submittingToolId,
    handleAskUserSubmit: baseHandleAskUserSubmit,
    hasPendingAskUser,
  } = useAskUser()

  const transport = useMemo(() => {
    return new DefaultChatTransport({
      api: `${API_BASE_URL}/builder/chat`,
      fetch: fetchWithAuth,
      body: { agentId: currentAgentId },
    })
  }, [currentAgentId, fetchWithAuth])

  const { messages: chatMessages, sendMessage, addToolOutput, status } = useChat({
    id: `builder-chat-${currentAgentId || 'new'}`,
    transport,
  })

  const isLoading = status === 'submitted' || status === 'streaming'

  /**
   * Handle askUser tool response submission
   */
  const handleAskUserSubmit = useCallback(
    async (toolCallId: string, askInput: AskUserInput, response: AskUserResponse) => {
      await baseHandleAskUserSubmit(
        toolCallId,
        askInput,
        response,
        addToolOutput,
        sendMessage
      )
    },
    [baseHandleAskUserSubmit, addToolOutput, sendMessage]
  )

  // Combine initial messages with chat messages
  const allMessages = useMemo(() => {
    // Convert initial messages to display format, using persisted parts if available
    const initial = initialMessages.map(msg => ({
      id: msg.id,
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      parts: msg.parts && msg.parts.length > 0
        ? msg.parts
        : [{ type: 'text' as const, text: msg.content }],
    }))
    return [...initial, ...chatMessages]
  }, [initialMessages, chatMessages])

  // Check if there's a pending askUser tool awaiting response
  const pendingAskUser = useMemo(
    () => hasPendingAskUser(chatMessages),
    [chatMessages, hasPendingAskUser]
  )

  // Poll for agent updates when assistant responds with tool calls
  useEffect(() => {
    const lastMessage = allMessages[allMessages.length - 1]
    if (lastMessage?.role === 'assistant' && !isLoading && !hasPolledRef.current) {
      // Check if message has tool results by looking for specific patterns
      const hasToolResult = lastMessage.parts?.some(
        p => p.type === 'tool-result' || p.type.startsWith('tool-')
      )

      if (hasToolResult || chatMessages.length > 0) {
        hasPolledRef.current = true
        // Fetch updated agent data
        const token = useAuthStore.getState().accessToken
        const agentIdToFetch = currentAgentId
        if (token && agentIdToFetch) {
          builderService.getAgent(agentIdToFetch, token).then(response => {
            if (response.data?.agent) {
              onAgentUpdate(response.data.agent)
            }
          }).catch(console.error)
        }
      }
    }

    // Reset poll flag when loading starts
    if (isLoading) {
      hasPolledRef.current = false
    }
  }, [allMessages, chatMessages.length, isLoading, currentAgentId, onAgentUpdate])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [allMessages])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Auto-send initial prompt if provided
  useEffect(() => {
    if (initialPrompt && !hasAutoSentRef.current && !isLoading) {
      hasAutoSentRef.current = true
      sendMessage({ text: initialPrompt })
    }
  }, [initialPrompt, isLoading, sendMessage])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    sendMessage({ text: input })
    setInput('')
    inputRef.current?.focus()
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {allMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-neutral-400 dark:text-neutral-500">
            <div className="p-3 rounded-full bg-neutral-100 dark:bg-neutral-800 mb-3">
              <Bot className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium">I&apos;m here to help you build your agent</p>
            <p className="text-xs mt-1">Tell me what kind of agent you want to create</p>
            {/* Show suggestions only when agent has no name/description and no prior messages */}
            {!agent?.name && !agent?.description && initialMessages.length === 0 && (
              <div className="mt-4 flex flex-wrap gap-2 justify-center px-4">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion.label}
                    type="button"
                    onClick={() => setInput(suggestion.prompt)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-neutral-600 dark:text-neutral-400 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-full hover:border-neutral-400 dark:hover:border-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
                  >
                    <suggestion.icon className="h-3 w-3" />
                    {suggestion.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {allMessages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'flex',
              message.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            <div
              className={cn(
                'max-w-[90%] rounded-lg px-3 py-2 text-sm',
                message.role === 'user'
                  ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100'
              )}
            >
              {message.parts && (
                <MessagePartsRenderer
                  parts={message.parts as Array<{ type: string; text?: string; state?: string; toolCallId?: string; input?: unknown; output?: unknown }>}
                  role={message.role as 'user' | 'assistant'}
                  submittedResponses={submittedResponses}
                  submittingToolId={submittingToolId}
                  onAskUserSubmit={handleAskUserSubmit}
                />
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg px-3 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-neutral-500 dark:text-neutral-400" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} className="p-3 border-t bg-neutral-50 dark:bg-neutral-900 rounded-b-lg">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your agent..."
            className="flex-1 text-sm"
          />
          <Button type="submit" disabled={!input.trim() || isLoading || pendingAskUser} size="icon" className="shrink-0">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

/**
 * Builder sidebar component for AI-assisted agent creation
 */
export function BuilderSidebar({
  isOpen,
  onClose,
  onAgentUpdate,
  agentId,
  initialMessage,
  agent,
}: BuilderSidebarProps) {
  const [isInitializing, setIsInitializing] = useState(false)
  const [initialMessages, setInitialMessages] = useState<BuilderMessage[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)
  const initRef = useRef(false)

  // Use resizable panel hook
  const { width, handleMouseDown } = useResizablePanel({
    initialWidth: 380,
    minWidth: 320,
    maxWidth: 500,
  })

  // Load messages when sidebar opens
  useEffect(() => {
    if (!isOpen || initRef.current) return

    const token = useAuthStore.getState().accessToken
    if (!token) return

    setIsInitializing(true)
    builderService.getMessages(token, agentId || undefined)
      .then(response => {
        if (response.data) {
          setInitialMessages(response.data.messages || [])
          initRef.current = true
          setIsReady(true)
        }
      })
      .catch(err => {
        setError(err.message)
      })
      .finally(() => {
        setIsInitializing(false)
      })
  }, [isOpen, agentId])

  // Reset when sidebar closes
  useEffect(() => {
    if (!isOpen) {
      initRef.current = false
      setIsReady(false)
      setInitialMessages([])
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop overlay - only on smaller screens */}
      <div
        className="fixed inset-0 bg-black/30 z-40 xl:hidden"
        onClick={onClose}
      />

      <div
        className="builder-sidebar-panel fixed inset-4 xl:relative xl:inset-auto z-50 xl:z-auto flex flex-col bg-white dark:bg-neutral-900 border rounded-lg shadow-lg xl:shadow-sm xl:h-full"
      >
        {/* Apply width via style for xl screens only */}
        <style>{`
          @media (min-width: 1280px) {
            .builder-sidebar-panel {
              width: ${width}px !important;
              min-width: 320px !important;
              max-width: 500px !important;
            }
          }
        `}</style>

        {/* Resize handle - xl screens only */}
        <div
          className="hidden xl:flex absolute left-0 top-0 bottom-0 w-1 cursor-col-resize group hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors items-center justify-center"
          onMouseDown={handleMouseDown}
        >
          <div className="absolute left-[-8px] w-4 h-full" />
          <GripVertical className="h-4 w-4 text-neutral-300 dark:text-neutral-600 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-neutral-50 dark:bg-neutral-800 rounded-t-lg">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
            <span className="font-medium text-sm text-neutral-900 dark:text-neutral-100">Agent Builder</span>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        {isInitializing && (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
          </div>
        )}

        {error && (
          <div className="flex-1 flex items-center justify-center p-4 text-center">
            <div>
              <p className="text-red-500 text-sm">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => {
                  setError(null)
                  initRef.current = false
                }}
              >
                Try again
              </Button>
            </div>
          </div>
        )}

        {!isInitializing && !error && isReady && (
          <BuilderChatInner
            agentId={agentId || null}
            initialMessages={initialMessages}
            onAgentUpdate={onAgentUpdate}
            initialPrompt={initialMessage}
            agent={agent}
          />
        )}
      </div>
    </>
  )
}
