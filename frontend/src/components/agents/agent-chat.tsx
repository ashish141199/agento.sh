'use client'

/**
 * Agent Chat Component
 * Real-time chat interface for user-created agents
 * @module components/agents/agent-chat
 */

import { useState, useRef, useEffect, useMemo } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Loader2, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ToolCallCard, type ToolCallPart } from './tool-call-card'
import { useFetchWithAuth } from '@/hooks/use-fetch-with-auth'

/** Props for AgentChat component */
interface AgentChatProps {
  /** Agent ID (null if agent not created yet) */
  agentId: string | null
  /** Agent display name */
  name: string
  /** Agent description */
  description: string
  /** Optional welcome message shown at start */
  welcomeMessage?: string
  /** Optional suggested prompts for users */
  suggestedPrompts?: string[]
}

/** Props for inner chat component */
interface AgentChatInnerProps {
  agentId: string
  name: string
  description: string
  welcomeMessage?: string
  suggestedPrompts?: string[]
}

/**
 * Inner chat component that only renders when agentId is available
 */
function AgentChatInner({ agentId, name, description, welcomeMessage, suggestedPrompts }: AgentChatInnerProps) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const fetchWithAuth = useFetchWithAuth()

  const transport = useMemo(() => {
    return new DefaultChatTransport({
      api: `http://localhost:8000/agents/${agentId}/chat`,
      fetch: fetchWithAuth,
    })
  }, [agentId, fetchWithAuth])

  const { messages, sendMessage, status } = useChat({
    id: `agent-chat-${agentId}`,
    transport,
  })

  const isLoading = status === 'submitted' || status === 'streaming'

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  /**
   * Handle form submission for chat input
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    sendMessage({ text: input })
    setInput('')
    inputRef.current?.focus()
  }

  /**
   * Handle click on a suggested prompt
   */
  const handleSuggestedPrompt = (prompt: string) => {
    if (isLoading) return
    sendMessage({ text: prompt })
    inputRef.current?.focus()
  }

  return (
    <div className="h-full flex flex-col border rounded-lg bg-white dark:bg-neutral-900 overflow-hidden">
      {/* Header with agent name and description */}
      <div className="px-4 py-3 border-b bg-neutral-50 dark:bg-neutral-800">
        <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">{name || 'Untitled Agent'}</h3>
        {description && (
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-1">{description}</p>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col">
        {/* Empty state: no welcome message and no messages */}
        {!welcomeMessage && messages.length === 0 && (
          <div className="flex-1 flex flex-col justify-between">
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="text-center text-neutral-400 dark:text-neutral-500">
                <MessageSquare className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">Start a conversation with {name || 'your agent'}</p>
              </div>
            </div>

            {/* Suggested prompts */}
            {suggestedPrompts && suggestedPrompts.length > 0 && (
              <div className="pt-4">
                <p className="text-xs text-center text-neutral-400 dark:text-neutral-500 mb-3">
                  Try asking:
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {suggestedPrompts.map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestedPrompt(prompt)}
                      className="px-3 py-1.5 text-sm rounded-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Messages list (including welcome message) */}
        {(welcomeMessage || messages.length > 0) && (
          <div className="flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Welcome message - always shown first if exists */}
              {welcomeMessage && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-lg px-3 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100">
                    <p className="text-sm whitespace-pre-wrap">{welcomeMessage}</p>
                  </div>
                </div>
              )}

              {/* Actual messages */}
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[80%] rounded-lg px-3 py-2',
                      message.role === 'user'
                        ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100'
                    )}
                  >
                    {message.parts?.map((part, index) => {
                      // Handle text parts
                      if (part.type === 'text') {
                        return message.role === 'user' ? (
                          <p key={index} className="text-sm whitespace-pre-wrap">
                            {part.text}
                          </p>
                        ) : (
                          <div key={index} className="text-sm prose prose-sm prose-neutral dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-pre:my-2 prose-pre:bg-neutral-800 dark:prose-pre:bg-neutral-900 [&_pre_code]:bg-transparent [&_pre_code]:text-neutral-100 [&_pre_code]:p-0 dark:[&_pre_code]:bg-transparent prose-code:bg-neutral-200 dark:prose-code:bg-neutral-700 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
                            <ReactMarkdown>{part.text}</ReactMarkdown>
                          </div>
                        )
                      }
                      // Handle tool call parts (API connectors configured by users)
                      if (part.type === 'dynamic-tool' || part.type.startsWith('tool-')) {
                        const toolPart = part as unknown as ToolCallPart
                        const toolName = toolPart.toolName || part.type.replace('tool-', '')

                        return (
                          <ToolCallCard
                            key={index}
                            part={{
                              ...toolPart,
                              toolName,
                            }}
                          />
                        )
                      }
                      return null
                    })}
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg px-3 py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-neutral-500 dark:text-neutral-400" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggested prompts - only show when no messages yet */}
            {messages.length === 0 && suggestedPrompts && suggestedPrompts.length > 0 && (
              <div className="pt-4">
                <p className="text-xs text-center text-neutral-400 dark:text-neutral-500 mb-3">
                  Try asking:
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {suggestedPrompts.map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestedPrompt(prompt)}
                      className="px-3 py-1.5 text-sm rounded-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} className="p-4 border-t bg-neutral-50 dark:bg-neutral-800">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button type="submit" disabled={!input.trim() || isLoading} size="icon">
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
 * Agent chat component with real-time streaming
 * Shows a placeholder if agent is not created yet
 */
export function AgentChat({ agentId, name, description, welcomeMessage, suggestedPrompts }: AgentChatProps) {
  if (!agentId) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-neutral-400 dark:text-neutral-500 border rounded-lg bg-neutral-50 dark:bg-neutral-900">
        <MessageSquare className="h-12 w-12 mb-4" />
        <h3 className="text-lg font-medium text-neutral-600 dark:text-neutral-400">Chat with your agent</h3>
        <p className="text-sm mt-1">Create your agent first to start chatting</p>
      </div>
    )
  }

  return (
    <AgentChatInner
      key={agentId}
      agentId={agentId}
      name={name}
      description={description}
      welcomeMessage={welcomeMessage}
      suggestedPrompts={suggestedPrompts}
    />
  )
}
