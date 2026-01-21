'use client'

/**
 * Agent Editor Navigation Component
 * Previous/Next navigation buttons for the editor tabs
 * @module components/agents/agent-editor-navigation
 */

import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'

/** Props for AgentEditorNavigation */
interface AgentEditorNavigationProps {
  /** Whether on first tab */
  isFirstTab: boolean
  /** Whether on last tab */
  isLastTab: boolean
  /** Whether next button is disabled */
  isNextDisabled: boolean
  /** Whether saving is in progress */
  isSaving: boolean
  /** Previous button click handler */
  onPrevious: () => void
  /** Next button click handler */
  onNext: () => void
}

/**
 * Navigation buttons for agent editor tabs
 */
export function AgentEditorNavigation({
  isFirstTab,
  isLastTab,
  isNextDisabled,
  isSaving,
  onPrevious,
  onNext,
}: AgentEditorNavigationProps) {
  return (
    <div className="flex justify-between pt-6 border-t mt-6">
      <Button
        variant="outline"
        onClick={onPrevious}
        disabled={isFirstTab || isSaving}
      >
        <ChevronLeft className="h-4 w-4 mr-2" />
        Previous
      </Button>

      <Button
        onClick={onNext}
        disabled={isNextDisabled || isSaving || isLastTab}
      >
        {isSaving ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </>
        )}
      </Button>
    </div>
  )
}
