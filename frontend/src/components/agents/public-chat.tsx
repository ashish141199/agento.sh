'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Send, Loader2, MessageSquare, Menu, Plus, Trash2, LogOut } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { refreshAccessToken, handleAuthFailure } from '@/lib/api'
import { cn } from '@/lib/utils'
import { ToolCallCard, type ToolCallPart } from './tool-call-card'
import { AuthModal } from '@/components/auth-modal'
import { Logo } from '@/components/logo'
import { conversationService, type Conversation } from '@/services/conversation.service'

interface PublicChatProps {
  agentId: string
  agentSlug: string
  agentName: string
  agentDescription: string | null
}

export function PublicChat({ agentId, agentSlug, agentName, agentDescription }: PublicChatProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const conversationIdFromUrl = searchParams.get('c')

  const [input, setInput] = useState('')
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [pendingMessage, setPendingMessage] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(conversationIdFromUrl)
  const [isLoadingConversations, setIsLoadingConversations] = useState(false)
  const [isCreatingConversation, setIsCreatingConversation] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  // Track newly created conversation to skip loading messages from server
  const newlyCreatedConversationRef = useRef<string | null>(null)
  const user = useAuthStore((state) => state.user)
  const accessToken = useAuthStore((state) => state.accessToken)
  const clearAuth = useAuthStore((state) => state.clearAuth)
  const isAuthenticated = !!accessToken

  // Update URL when conversation changes
  const updateUrlWithConversation = useCallback((conversationId: string | null) => {
    if (conversationId) {
      router.replace(`/chat/${agentSlug}?c=${conversationId}`, { scroll: false })
    } else {
      router.replace(`/chat/${agentSlug}`, { scroll: false })
    }
  }, [router, agentSlug])

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

  // Load conversations when authenticated
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      loadConversations()
    }
  }, [isAuthenticated, accessToken])

  // Load messages when conversation changes (but skip for newly created conversations)
  useEffect(() => {
    if (currentConversationId && accessToken) {
      // Skip loading for conversations we just created - useChat will manage those messages
      if (newlyCreatedConversationRef.current === currentConversationId) {
        newlyCreatedConversationRef.current = null // Clear after skipping once
        return
      }
      loadMessages(currentConversationId)
    }
  }, [currentConversationId, accessToken])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle post-authentication: create conversation if user just logged in with pending message
  useEffect(() => {
    if (isAuthenticated && pendingMessage && !currentConversationId && !isCreatingConversation) {
      createNewConversation()
    }
  }, [isAuthenticated, pendingMessage, currentConversationId, isCreatingConversation])

  // Send pending message when transport is ready (after conversation is created)
  useEffect(() => {
    if (isAuthenticated && pendingMessage && currentConversationId && transport && !isCreatingConversation) {
      sendMessage({ text: pendingMessage })
      setPendingMessage(null)
      setInput('')
      inputRef.current?.focus()
    }
  }, [isAuthenticated, pendingMessage, currentConversationId, transport, isCreatingConversation, sendMessage])

  const loadConversations = async () => {
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
  }

  const loadMessages = async (conversationId: string) => {
    if (!accessToken) return
    try {
      const response = await conversationService.getMessages(conversationId, accessToken)
      if (response.data?.messages) {
        // Convert to UIMessage format
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
  }

  const createNewConversation = async (): Promise<string | null> => {
    if (!accessToken || isCreatingConversation) return null

    setIsCreatingConversation(true)
    try {
      const response = await conversationService.create(agentSlug, accessToken)
      if (response.data?.conversation) {
        const newConv = response.data.conversation
        // Mark this as newly created so loadMessages skips it
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
  }

  const switchConversation = (conversationId: string) => {
    setCurrentConversationId(conversationId)
    updateUrlWithConversation(conversationId)
    setSidebarOpen(false)
  }

  const startNewChat = () => {
    setCurrentConversationId(null)
    setMessages([])
    updateUrlWithConversation(null)
    setSidebarOpen(false)
  }

  const deleteConversation = async (conversationId: string, e: React.MouseEvent) => {
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
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading || isCreatingConversation) return

    const messageText = input
    setInput('') // Clear input immediately for better UX

    if (!isAuthenticated) {
      setPendingMessage(messageText)
      setShowAuthModal(true)
      return
    }

    // If no conversation, create one first then the useEffect will send the message
    if (!currentConversationId) {
      setPendingMessage(messageText)
      await createNewConversation()
      // useEffect will send the message when transport is ready
      return
    }

    // Conversation exists, send directly
    sendMessage({ text: messageText })
    inputRef.current?.focus()
  }

  const handleLogout = () => {
    clearAuth()
    setConversations([])
    setCurrentConversationId(null)
    setMessages([])
  }

  const getInitials = (name: string | null) => {
    if (!name) return '?'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-neutral-900">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-neutral-50 dark:bg-neutral-800 flex items-center gap-3">
        {/* Hamburger Menu */}
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Title and Description */}
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 truncate">
            {agentName}
          </h1>
          {agentDescription && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
              {agentDescription}
            </p>
          )}
        </div>

        {/* Profile Avatar */}
        {isAuthenticated && user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user.imageUrl || undefined} alt={user.fullName || 'User'} />
                  <AvatarFallback>{getInitials(user.fullName)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{user.fullName}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setShowAuthModal(true)}>
            Sign in
          </Button>
        )}
      </div>

      {/* Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-80 p-0 flex flex-col gap-0">
          <SheetHeader className="p-0 px-4 py-3 border-b">
            <SheetTitle>
              <Logo />
            </SheetTitle>
          </SheetHeader>

          {/* New Chat Button */}
          {isAuthenticated && (
            <div
              className="flex items-center gap-2 px-4 py-2.5 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 border-b"
              onClick={startNewChat}
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span className="text-sm font-medium">New chat</span>
            </div>
          )}

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {!isAuthenticated ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Sign in to see your conversations
              </div>
            ) : isLoadingConversations ? (
              <div className="p-4 flex justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No conversations yet
              </div>
            ) : (
              <div className="py-2">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 group',
                      currentConversationId === conv.id && 'bg-neutral-100 dark:bg-neutral-800'
                    )}
                    onClick={() => switchConversation(conv.id)}
                  >
                    <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1 text-sm truncate">
                      {conv.title || 'New conversation'}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100"
                      onClick={(e) => deleteConversation(conv.id, e)}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Profile Section at Bottom */}
          {isAuthenticated && user && (
            <div className="border-t p-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.imageUrl || undefined} alt={user.fullName || 'User'} />
                      <AvatarFallback>{getInitials(user.fullName)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user.fullName}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" side="top" className="w-56">
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </SheetContent>
      </Sheet>

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

      <AuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
      />
    </div>
  )
}
