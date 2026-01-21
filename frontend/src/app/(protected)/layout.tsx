'use client'

import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'
import { authService } from '@/services/auth.service'
import { useAuthGuard } from '@/hooks/use-auth-guard'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LogOut } from 'lucide-react'
import { Logo } from '@/components/logo'
import { ModeToggle } from '@/components/mode-toggle'

/**
 * Protected layout component
 * Wraps all authenticated routes with app bar
 */
export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { user, clearAuth } = useAuthStore()
  const { isLoading } = useAuthGuard()

  /**
   * Handle logout
   */
  const handleLogout = async () => {
    try {
      await authService.logout()
    } catch {
      // Ignore logout errors
    }
    clearAuth()
    router.push('/get-started')
  }

  /**
   * Get user initials for avatar fallback
   */
  const getInitials = () => {
    if (!user?.fullName) return user?.email?.[0]?.toUpperCase() || '?'
    const names = user.fullName.split(' ')
    return names.map((n) => n[0]).join('').toUpperCase().slice(0, 2)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-neutral-500">Loading...</p>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950">
      <header className="h-14 border-b bg-white dark:bg-neutral-900 flex items-center justify-between px-4 md:px-6 shrink-0">
        <Logo asLink />

        <div className="flex items-center gap-2">
          <ModeToggle />
          <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="focus:outline-none">
              <Avatar className="h-8 w-8 cursor-pointer">
                <AvatarImage src={user?.imageUrl || undefined} alt={user?.fullName || 'User'} />
                <AvatarFallback className="bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-sm">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium leading-none">{user?.fullName || 'User'}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 overflow-hidden">{children}</main>
    </div>
  )
}
