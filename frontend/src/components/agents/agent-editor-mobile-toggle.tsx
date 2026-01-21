'use client'

/**
 * Agent Editor Mobile Toggle Component
 * Toggle between Configure and Test Chat views on mobile
 * @module components/agents/agent-editor-mobile-toggle
 */

import { FileText, MessageSquare } from 'lucide-react'

/** Mobile view options */
type MobileView = 'form' | 'chat'

/** Props for AgentEditorMobileToggle */
interface AgentEditorMobileToggleProps {
  /** Current mobile view */
  mobileView: MobileView
  /** View change handler */
  onViewChange: (view: MobileView) => void
}

/**
 * Mobile toggle for switching between form and chat views
 */
export function AgentEditorMobileToggle({
  mobileView,
  onViewChange,
}: AgentEditorMobileToggleProps) {
  return (
    <div className="md:hidden flex border-b mb-4">
      <button
        onClick={() => onViewChange('form')}
        className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors ${
          mobileView === 'form'
            ? 'border-neutral-900 dark:border-neutral-100 text-neutral-900 dark:text-neutral-100'
            : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
        }`}
      >
        <FileText className="h-4 w-4" />
        Configure
      </button>
      <button
        onClick={() => onViewChange('chat')}
        className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors ${
          mobileView === 'chat'
            ? 'border-neutral-900 dark:border-neutral-100 text-neutral-900 dark:text-neutral-100'
            : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
        }`}
      >
        <MessageSquare className="h-4 w-4" />
        Test Chat
      </button>
    </div>
  )
}
