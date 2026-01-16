'use client'

import { MessageSquare } from 'lucide-react'

/**
 * Placeholder component for the agent chat interface
 * Will be replaced with actual chat functionality later
 */
export function AgentChatPlaceholder() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-neutral-400 border rounded-lg bg-neutral-50">
      <MessageSquare className="h-12 w-12 mb-4" />
      <h3 className="text-lg font-medium text-neutral-600">Chat with your agent</h3>
      <p className="text-sm mt-1">Test your agent here once it's configured</p>
    </div>
  )
}
