'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Loader2, MessageSquare } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { refreshAccessToken, handleAuthFailure } from '@/lib/api'
import { cn } from '@/lib/utils'
import { ToolCallCard, type ToolCallPart } from './tool-call-card'
import { AuthModal } from '@/components/auth-modal'

interface PublicChatProps {
  agentId: string
  agentName: string
  agentDescription: string | null
}

export function PublicChat({ agentId, agentName, agentDescription }: PublicChatProps) {
  const [input, setInput] = useState('')
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [pendingMessage, setPendingMessage] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const accessToken = useAuthStore((state) => state.accessToken)
  const isAuthenticated = !!accessToken

  // Custom fetch that handles 401 errors with token refresh
  const fetchWithAuth = useCallback(async (url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const currentToken = useAuthStore.getState().accessToken

    if (!currentToken) {
      throw new Error('Not authenticated')
    }

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
    if (!isAuthenticated) return null
    return new DefaultChatTransport({
      api: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/agents/${agentId}/chat`,
      fetch: fetchWithAuth,
    })
  }, [agentId, fetchWithAuth, isAuthenticated])

  const { messages, sendMessage, status } = useChat({
    id: `public-chat-${agentId}`,
    transport: transport || undefined,
  })

  const isLoading = status === 'submitted' || status === 'streaming'

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    if (!isAuthenticated) {
      setPendingMessage(input)
      setShowAuthModal(true)
      return
    }

    sendMessage({ text: input })
    setInput('')
    inputRef.current?.focus()
  }

  // Send pending message after auth succeeds and transport is ready
  useEffect(() => {
    if (isAuthenticated && pendingMessage && transport) {
      sendMessage({ text: pendingMessage })
      setPendingMessage(null)
      setInput('')
      inputRef.current?.focus()
    }
  }, [isAuthenticated, pendingMessage, transport, sendMessage])

  return (
    <div className="h-full flex flex-col bg-white dark:bg-neutral-900">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-neutral-50 dark:bg-neutral-800">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          {agentName}
        </h1>
        {agentDescription && (
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            {agentDescription}
          </p>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-neutral-400 dark:text-neutral-500">
            <MessageSquare className="h-12 w-12 mb-4" />
            <p className="text-lg">Start a conversation with {agentName}</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  'max-w-[70%] rounded-lg px-4 py-3',
                  message.role === 'user'
                    ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100'
                )}
              >
                {message.parts?.map((part, index) => {
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
                  if (part.type === 'dynamic-tool' || part.type.startsWith('tool-')) {
                    const toolPart = part as unknown as ToolCallPart
                    return (
                      <ToolCallCard
                        key={index}
                        part={{
                          ...toolPart,
                          toolName: toolPart.toolName || part.type.replace('tool-', ''),
                        }}
                      />
                    )
                  }
                  return null
                })}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-neutral-500 dark:text-neutral-400" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="p-4 border-t bg-neutral-50 dark:bg-neutral-800">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
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

      <AuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
      />
    </div>
  )
}
