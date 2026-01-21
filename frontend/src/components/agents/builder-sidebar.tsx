'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Loader2, X, Sparkles, Bot, Wrench, Check, GripVertical } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { refreshAccessToken, handleAuthFailure } from '@/lib/api'
import { cn } from '@/lib/utils'
import { builderService, type BuilderMessage } from '@/services/builder.service'
import type { Agent } from '@/services/agent.service'

interface BuilderSidebarProps {
  isOpen: boolean
  onClose: () => void
  onAgentUpdate: (agent: Agent) => void
  agentId?: string | null
  initialMessage?: string
}

/**
 * Get display name for a tool
 */
function getToolDisplayName(name: string): string {
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
 * Get tool status from AI SDK state
 */
function getToolStatus(state: string | undefined): 'pending' | 'success' | 'error' {
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

/**
 * Tool call card component for displaying tool execution in chat
 */
function ToolCallCard({ toolName, status }: { toolName: string; status: 'pending' | 'success' | 'error' }) {
  return (
    <div className="flex items-center gap-2 py-1.5 px-3 bg-neutral-50 dark:bg-neutral-700 rounded text-xs my-1 min-w-[200px]">
      <Wrench className="h-3 w-3 text-neutral-500 dark:text-neutral-400 shrink-0" />
      <span className="text-neutral-600 dark:text-neutral-300 flex-1">{getToolDisplayName(toolName)}</span>
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
 * Inner component that handles the chat
 */
function BuilderChatInner({
  agentId,
  initialMessages,
  onAgentUpdate,
  initialPrompt,
}: {
  agentId: string | null
  initialMessages: BuilderMessage[]
  onAgentUpdate: (agent: Agent) => void
  initialPrompt?: string
}) {
  const [input, setInput] = useState('')
  const hasAutoSentRef = useRef(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const hasPolledRef = useRef(false)
  const [currentAgentId, setCurrentAgentId] = useState<string | null>(agentId)

  // Custom fetch that handles 401 errors with token refresh
  const fetchWithAuth = useCallback(async (url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const currentToken = useAuthStore.getState().accessToken

    const headers = new Headers(init?.headers)
    headers.set('Authorization', `Bearer ${currentToken}`)

    const response = await fetch(url, {
      ...init,
      headers,
      credentials: 'include',
    })

    if (response.status === 401) {
      const newToken = await refreshAccessToken()

      if (newToken) {
        const retryHeaders = new Headers(init?.headers)
        retryHeaders.set('Authorization', `Bearer ${newToken}`)

        return fetch(url, {
          ...init,
          headers: retryHeaders,
          credentials: 'include',
        })
      } else {
        handleAuthFailure()
        throw new Error('Session expired. Please log in again.')
      }
    }

    return response
  }, [])

  const transport = useMemo(() => {
    return new DefaultChatTransport({
      api: `http://localhost:8000/builder/chat`,
      fetch: fetchWithAuth,
      body: { agentId: currentAgentId },
    })
  }, [currentAgentId, fetchWithAuth])

  const { messages: chatMessages, sendMessage, status } = useChat({
    id: `builder-chat-${currentAgentId || 'new'}`,
    transport,
  })

  const isLoading = status === 'submitted' || status === 'streaming'

  // Combine initial messages with chat messages
  const allMessages = useMemo(() => {
    // Convert initial messages to display format
    const initial = initialMessages.map(msg => ({
      id: msg.id,
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      parts: [{ type: 'text' as const, text: msg.content }],
    }))
    return [...initial, ...chatMessages]
  }, [initialMessages, chatMessages])

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
              {message.parts?.map((part, index) => {
                if (part.type === 'text') {
                  return message.role === 'user' ? (
                    <p key={index} className="whitespace-pre-wrap">{part.text}</p>
                  ) : (
                    <div key={index} className="prose prose-sm prose-neutral dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0">
                      <ReactMarkdown>{part.text}</ReactMarkdown>
                    </div>
                  )
                }
                // Handle tool parts (format: tool-{toolName})
                if (part.type.startsWith('tool-')) {
                  const toolPart = part as { state?: string; type: string }
                  const toolName = part.type.replace('tool-', '')
                  return (
                    <ToolCallCard
                      key={index}
                      toolName={toolName}
                      status={getToolStatus(toolPart.state)}
                    />
                  )
                }
                return null
              })}
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
          <Button type="submit" disabled={!input.trim() || isLoading} size="icon" className="shrink-0">
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
}: BuilderSidebarProps) {
  const [isInitializing, setIsInitializing] = useState(false)
  const [initialMessages, setInitialMessages] = useState<BuilderMessage[]>([])
  const [error, setError] = useState<string | null>(null)
  const [width, setWidth] = useState(380)
  const [isReady, setIsReady] = useState(false)
  const initRef = useRef(false)
  const isResizing = useRef(false)

  // Handle resize
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isResizing.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const startX = e.clientX
    const startWidth = width

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return
      const delta = startX - e.clientX
      const newWidth = Math.min(Math.max(startWidth + delta, 320), 600)
      setWidth(newWidth)
    }

    const handleMouseUp = () => {
      isResizing.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [width])

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
          />
        )}
      </div>
    </>
  )
}
