'use client'

/**
 * Public Chat Sidebar Component
 * Sidebar sheet with conversations list and user profile
 * @module components/agents/public-chat-sidebar
 */

import { Button } from '@/components/ui/button'
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Loader2, MessageSquare, Plus, Trash2, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/logo'
import type { Conversation } from '@/services/conversation.service'

/** User data for display */
interface User {
  fullName: string | null
  email: string
  imageUrl?: string | null
}

/** Props for PublicChatSidebar */
interface PublicChatSidebarProps {
  /** Whether sidebar is open */
  open: boolean
  /** Open state change handler */
  onOpenChange: (open: boolean) => void
  /** Whether user is authenticated */
  isAuthenticated: boolean
  /** Current user data */
  user: User | null
  /** List of conversations */
  conversations: Conversation[]
  /** Currently selected conversation ID */
  currentConversationId: string | null
  /** Whether conversations are loading */
  isLoading: boolean
  /** Start new chat handler */
  onNewChat: () => void
  /** Switch conversation handler */
  onSwitchConversation: (id: string) => void
  /** Delete conversation handler */
  onDeleteConversation: (id: string, e: React.MouseEvent) => void
  /** Logout handler */
  onLogout: () => void
}

/**
 * Get initials from a name for avatar fallback
 */
function getInitials(name: string | null): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Sidebar component for public chat
 * Shows conversation history and user profile
 */
export function PublicChatSidebar({
  open,
  onOpenChange,
  isAuthenticated,
  user,
  conversations,
  currentConversationId,
  isLoading,
  onNewChat,
  onSwitchConversation,
  onDeleteConversation,
  onLogout,
}: PublicChatSidebarProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
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
            onClick={onNewChat}
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
          ) : isLoading ? (
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
                  onClick={() => onSwitchConversation(conv.id)}
                >
                  <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 text-sm truncate">
                    {conv.title || 'New conversation'}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100"
                    onClick={(e) => onDeleteConversation(conv.id, e)}
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
                <DropdownMenuItem onClick={onLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
