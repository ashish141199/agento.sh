'use client'

import { Wrench } from 'lucide-react'

/**
 * Placeholder component for the agent tools configuration
 * Will be replaced with actual tools functionality later
 */
export function AgentToolsPlaceholder() {
  return (
    <div className="h-64 flex flex-col items-center justify-center text-neutral-400 dark:text-neutral-500 border rounded-lg border-dashed">
      <Wrench className="h-10 w-10 mb-4" />
      <h3 className="text-lg font-medium text-neutral-600 dark:text-neutral-400">Coming Soon</h3>
      <p className="text-sm mt-1 text-center max-w-xs">
        Tool configuration will allow your agent to perform actions like searching, sending emails, and more
      </p>
    </div>
  )
}
