'use client'

/**
 * Public Chat Component
 * Main chat interface for public agent conversations
 * @module components/agents/public-chat
 */

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Loader2, MessageSquare } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { cn } from '@/lib/utils'
import { ToolCallCard, type ToolCallPart } from './tool-call-card'
import { AuthModal } from '@/components/auth-modal'
import { PublicChatHeader } from './public-chat-header'
import { PublicChatSidebar } from './public-chat-sidebar'
import { useFetchWithAuth } from '@/hooks/use-fetch-with-auth'
import { conversationService, type Conversation } from '@/services/conversation.service'

/** Props for PublicChat component */
interface PublicChatProps {
  /** Agent ID */
  agentId: string
  /** Agent URL slug */
  agentSlug: string
  /** Agent display name */
  agentName: string
  /** Agent description */
  agentDescription: string | null
}

/**
 * Public chat interface for published agents
 * Handles authentication, conversations, and messaging
 */
export function PublicChat({ agentId, agentSlug, agentName, agentDescription }: PublicChatProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const conversationIdFromUrl = searchParams.get('c')

  // UI state
  const [input, setInput] = useState('')
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [pendingMessage, setPendingMessage] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Conversation state
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(conversationIdFromUrl)
  const [isLoadingConversations, setIsLoadingConversations] = useState(false)
  const [isCreatingConversation, setIsCreatingConversation] = useState(false)

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const newlyCreatedConversationRef = useRef<string | null>(null)

  // Auth state
  const user = useAuthStore((state) => state.user)
  const accessToken = useAuthStore((state) => state.accessToken)
  const clearAuth = useAuthStore((state) => state.clearAuth)
  const isAuthenticated = !!accessToken

  const fetchWithAuth = useFetchWithAuth()

  /**
   * Update URL with conversation ID
   */
  const updateUrlWithConversation = useCallback((conversationId: string | null) => {
    if (conversationId) {
      router.replace(`/chat/${agentSlug}?c=${conversationId}`, { scroll: false })
    } else {
      router.replace(`/chat/${agentSlug}`, { scroll: false })
    }
  }, [router, agentSlug])

  // Chat transport setup
  const transport = useMemo(() => {
    if (!isAuthenticated || !currentConversationId) return null
    return new DefaultChatTransport({
      api: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/conversations/${currentConversationId}/chat`,
      fetch: fetchWithAuth,
    })
  }, [currentConversationId, fetchWithAuth, isAuthenticated])

  const { messages, sendMessage, status, setMessages } = useChat({
    id: `public-chat-${currentConversationId || agentId}`,
    transport: transport || undefined,
  })

  const isLoading = status === 'submitted' || status === 'streaming'

  /**
   * Load user's conversations
   */
  const loadConversations = useCallback(async () => {
    if (!accessToken) return
    setIsLoadingConversations(true)
    try {
      const response = await conversationService.list(agentSlug, accessToken)
      if (response.data?.conversations) {
        setConversations(response.data.conversations)
      }
    } catch (error) {
      console.error('Failed to load conversations:', error)
    } finally {
      setIsLoadingConversations(false)
    }
  }, [accessToken, agentSlug])

  /**
   * Load messages for a conversation
   */
  const loadMessages = useCallback(async (conversationId: string) => {
    if (!accessToken) return
    try {
      const response = await conversationService.getMessages(conversationId, accessToken)
      if (response.data?.messages) {
        const uiMessages = response.data.messages.map((msg) => ({
          id: msg.id,
          role: msg.isAgent ? 'assistant' as const : 'user' as const,
          parts: [{ type: 'text' as const, text: msg.content }],
        }))
        setMessages(uiMessages)
      }
    } catch (error) {
      console.error('Failed to load messages:', error)
    }
  }, [accessToken, setMessages])

  /**
   * Create a new conversation
   */
  const createNewConversation = useCallback(async (): Promise<string | null> => {
    if (!accessToken || isCreatingConversation) return null

    setIsCreatingConversation(true)
    try {
      const response = await conversationService.create(agentSlug, accessToken)
      if (response.data?.conversation) {
        const newConv = response.data.conversation
        newlyCreatedConversationRef.current = newConv.id
        setConversations((prev) => [newConv, ...prev])
        setCurrentConversationId(newConv.id)
        updateUrlWithConversation(newConv.id)
        setSidebarOpen(false)
        return newConv.id
      }
    } catch (error) {
      console.error('Failed to create conversation:', error)
    } finally {
      setIsCreatingConversation(false)
    }
    return null
  }, [accessToken, agentSlug, isCreatingConversation, updateUrlWithConversation])

  /**
   * Switch to a different conversation
   */
  const switchConversation = useCallback((conversationId: string) => {
    setCurrentConversationId(conversationId)
    updateUrlWithConversation(conversationId)
    setSidebarOpen(false)
  }, [updateUrlWithConversation])

  /**
   * Start a new chat (clear current)
   */
  const startNewChat = useCallback(() => {
    setCurrentConversationId(null)
    setMessages([])
    updateUrlWithConversation(null)
    setSidebarOpen(false)
  }, [setMessages, updateUrlWithConversation])

  /**
   * Delete a conversation
   */
  const deleteConversation = useCallback(async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!accessToken) return
    try {
      await conversationService.delete(conversationId, accessToken)
      setConversations((prev) => prev.filter((c) => c.id !== conversationId))
      if (currentConversationId === conversationId) {
        setCurrentConversationId(null)
        setMessages([])
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error)
    }
  }, [accessToken, currentConversationId, setMessages])

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading || isCreatingConversation) return

    const messageText = input
    setInput('')

    if (!isAuthenticated) {
      setPendingMessage(messageText)
      setShowAuthModal(true)
      return
    }

    if (!currentConversationId) {
      setPendingMessage(messageText)
      await createNewConversation()
      return
    }

    sendMessage({ text: messageText })
    inputRef.current?.focus()
  }, [input, isLoading, isCreatingConversation, isAuthenticated, currentConversationId, createNewConversation, sendMessage])

  /**
   * Handle logout
   */
  const handleLogout = useCallback(() => {
    clearAuth()
    setConversations([])
    setCurrentConversationId(null)
    setMessages([])
  }, [clearAuth, setMessages])

  // Load conversations when authenticated
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      loadConversations()
    }
  }, [isAuthenticated, accessToken, loadConversations])

  // Load messages when conversation changes
  useEffect(() => {
    if (currentConversationId && accessToken) {
      if (newlyCreatedConversationRef.current === currentConversationId) {
        newlyCreatedConversationRef.current = null
        return
      }
      loadMessages(currentConversationId)
    }
  }, [currentConversationId, accessToken, loadMessages])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle post-auth: create conversation if pending message exists
  useEffect(() => {
    if (isAuthenticated && pendingMessage && !currentConversationId && !isCreatingConversation) {
      createNewConversation()
    }
  }, [isAuthenticated, pendingMessage, currentConversationId, isCreatingConversation, createNewConversation])

  // Send pending message when transport is ready
  useEffect(() => {
    if (isAuthenticated && pendingMessage && currentConversationId && transport && !isCreatingConversation) {
      sendMessage({ text: pendingMessage })
      setPendingMessage(null)
      setInput('')
      inputRef.current?.focus()
    }
  }, [isAuthenticated, pendingMessage, currentConversationId, transport, isCreatingConversation, sendMessage])

  return (
    <div className="h-full flex flex-col bg-white dark:bg-neutral-900">
      <PublicChatHeader
        agentName={agentName}
        agentDescription={agentDescription}
        isAuthenticated={isAuthenticated}
        user={user}
        onOpenSidebar={() => setSidebarOpen(true)}
        onSignIn={() => setShowAuthModal(true)}
        onLogout={handleLogout}
      />

      <PublicChatSidebar
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        isAuthenticated={isAuthenticated}
        user={user}
        conversations={conversations}
        currentConversationId={currentConversationId}
        isLoading={isLoadingConversations}
        onNewChat={startNewChat}
        onSwitchConversation={switchConversation}
        onDeleteConversation={deleteConversation}
        onLogout={handleLogout}
      />

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          {messages.length === 0 ? (
            <div className="h-[calc(100vh-200px)] flex flex-col items-center justify-center text-neutral-400 dark:text-neutral-500">
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
                    'max-w-[85%] rounded-lg px-4 py-3',
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
            <Button type="submit" disabled={!input.trim() || isLoading || isCreatingConversation} size="icon">
              {isLoading || isCreatingConversation ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
      </div>

      <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />
    </div>
  )
}
