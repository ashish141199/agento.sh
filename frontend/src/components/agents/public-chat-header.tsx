'use client'

/**
 * Public Chat Header Component
 * Header with menu button, agent info, and user profile
 * @module components/agents/public-chat-header
 */

import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Menu, LogOut } from 'lucide-react'

/** User data for display */
interface User {
  fullName: string | null
  email: string
  imageUrl?: string | null
}

/** Props for PublicChatHeader */
interface PublicChatHeaderProps {
  /** Agent display name */
  agentName: string
  /** Agent description */
  agentDescription: string | null
  /** Whether user is authenticated */
  isAuthenticated: boolean
  /** Current user data */
  user: User | null
  /** Open sidebar handler */
  onOpenSidebar: () => void
  /** Sign in handler */
  onSignIn: () => void
  /** Logout handler */
  onLogout: () => void
}

/**
 * Get initials from a name for avatar fallback
 * @param name - Full name or null
 * @returns Initials string (max 2 characters)
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
 * Header component for public chat interface
 * Displays agent info, menu button, and user profile/sign in
 */
export function PublicChatHeader({
  agentName,
  agentDescription,
  isAuthenticated,
  user,
  onOpenSidebar,
  onSignIn,
  onLogout,
}: PublicChatHeaderProps) {
  return (
    <div className="px-4 py-3 border-b bg-neutral-50 dark:bg-neutral-800 flex items-center gap-3">
      {/* Hamburger Menu */}
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0"
        onClick={onOpenSidebar}
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

      {/* Profile Avatar / Sign In */}
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
            <DropdownMenuItem onClick={onLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button variant="outline" size="sm" onClick={onSignIn}>
          Sign in
        </Button>
      )}
    </div>
  )
}
