'use client'

import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import type { InstructionsConfig } from '@/services/agent.service'

interface AgentInstructionsFormProps {
  instructionsConfig: InstructionsConfig
  onInstructionsChange: (config: InstructionsConfig) => void
  disabled?: boolean
}

/**
 * Instructions tab form for agent configuration
 * Includes four questions to define agent behavior
 */
export function AgentInstructionsForm({
  instructionsConfig,
  onInstructionsChange,
  disabled = false,
}: AgentInstructionsFormProps) {
  const handleChange = (field: keyof InstructionsConfig, value: string) => {
    onInstructionsChange({
      ...instructionsConfig,
      [field]: value,
    })
  }

  return (
    <div className="space-y-6 p-1">
      <div className="space-y-2">
        <Label htmlFor="whatDoesAgentDo">What does this agent do?</Label>
        <Textarea
          id="whatDoesAgentDo"
          placeholder="This agent helps users with..."
          value={instructionsConfig.whatDoesAgentDo}
          onChange={(e) => handleChange('whatDoesAgentDo', e.target.value)}
          disabled={disabled}
          rows={3}
        />
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Describe the main purpose and capabilities of your agent
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="howShouldItSpeak">How should it speak?</Label>
        <Textarea
          id="howShouldItSpeak"
          placeholder="Friendly and professional, using simple language..."
          value={instructionsConfig.howShouldItSpeak}
          onChange={(e) => handleChange('howShouldItSpeak', e.target.value)}
          disabled={disabled}
          rows={3}
        />
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Define the tone, style, and personality of your agent
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="whatShouldItNeverDo">What should it never do?</Label>
        <Textarea
          id="whatShouldItNeverDo"
          placeholder="Never share personal information, never make promises..."
          value={instructionsConfig.whatShouldItNeverDo}
          onChange={(e) => handleChange('whatShouldItNeverDo', e.target.value)}
          disabled={disabled}
          rows={3}
        />
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Set boundaries and restrictions for your agent
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="anythingElse">Anything else it should know?</Label>
        <Textarea
          id="anythingElse"
          placeholder="Additional context, company information, special instructions..."
          value={instructionsConfig.anythingElse}
          onChange={(e) => handleChange('anythingElse', e.target.value)}
          disabled={disabled}
          rows={3}
        />
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Any other context or instructions for your agent
        </p>
      </div>

      <Separator />

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label>Knowledge</Label>
          <span className="text-xs text-neutral-400 dark:text-neutral-500">optional</span>
        </div>
        <div className="rounded-lg border border-dashed border-neutral-200 dark:border-neutral-800 p-6 text-center">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Coming soon</p>
        </div>
      </div>
    </div>
  )
}
