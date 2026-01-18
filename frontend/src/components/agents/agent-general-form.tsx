'use client'

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface AgentGeneralFormProps {
  name: string
  description: string
  onNameChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  disabled?: boolean
}

/**
 * Identity tab form for agent configuration
 * Includes name and description
 */
export function AgentGeneralForm({
  name,
  description,
  onNameChange,
  onDescriptionChange,
  disabled = false,
}: AgentGeneralFormProps) {
  return (
    <div className="space-y-6 p-1">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          placeholder="My AI Assistant"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          disabled={disabled}
        />
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Give your agent a memorable name
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="A helpful assistant that..."
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          disabled={disabled}
          rows={3}
        />
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Briefly describe what your agent does
        </p>
      </div>
    </div>
  )
}
