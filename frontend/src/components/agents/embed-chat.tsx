'use client'

/**
 * Embed Chat Component
 * Minimal chat interface designed for embedding in iframes
 * No authentication, no sidebar, no conversation persistence
 */

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Loader2, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface EmbedChatProps {
  agentId: string
  agentName: string
  agentDescription: string | null
}

export function EmbedChat({ agentId, agentName, agentDescription }: EmbedChatProps) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Create transport for the embed chat endpoint
  const transport = useMemo(() => {
    return new DefaultChatTransport({
      api: `${API_BASE_URL}/embed/${agentId}/chat`,
    })
  }, [agentId])

  const { messages, sendMessage, status } = useChat({
    id: `embed-${agentId}`,
    transport,
  })

  const isLoading = status === 'submitted' || status === 'streaming'
  const error = status === 'error'

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input on mount and when window gains focus (for widget mode)
  useEffect(() => {
    inputRef.current?.focus()

    const handleFocus = () => {
      inputRef.current?.focus()
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')

    sendMessage({ text: userMessage })
  }, [input, isLoading, sendMessage])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header - minimal */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-border">
        <h1 className="font-semibold text-foreground text-sm">{agentName}</h1>
        {agentDescription && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{agentDescription}</p>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageSquare className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              Start a conversation
            </p>
          </div>
        ) : (
          <div className="space-y-4">
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
                    'max-w-[85%] rounded-2xl px-4 py-2',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  )}
                >
                  {message.parts?.map((part, index) => {
                    if (part.type === 'text') {
                      return message.role === 'user' ? (
                        <p key={index} className="text-sm whitespace-pre-wrap">{part.text}</p>
                      ) : (
                        <div key={index} className="text-sm prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0">
                          <ReactMarkdown>{part.text}</ReactMarkdown>
                        </div>
                      )
                    }
                    return null
                  })}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="px-4 pb-2">
          <p className="text-xs text-destructive">Something went wrong. Please try again.</p>
        </div>
      )}

      {/* Input area */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-border">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={isLoading}
            className="flex-1 text-sm"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>

        {/* Powered by branding */}
        <div className="flex items-center justify-center gap-1 mt-2 pt-2 border-t border-border/50">
          <span className="text-[10px] text-muted-foreground">Powered by</span>
          <a
            href="https://autive.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-semibold text-foreground hover:text-primary transition-colors"
          >
            Autive
          </a>
        </div>
      </div>
    </div>
  )
}
