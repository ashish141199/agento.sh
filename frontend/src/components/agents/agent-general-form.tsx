'use client'

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useModels } from '@/hooks/use-models'
import type { Agent } from '@/services/agent.service'

interface AgentGeneralFormProps {
  name: string
  description: string
  modelId: string | null
  onNameChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onModelIdChange: (value: string | null) => void
  disabled?: boolean
}

/**
 * General tab form for agent configuration
 * Includes name, description, and model selection
 */
export function AgentGeneralForm({
  name,
  description,
  modelId,
  onNameChange,
  onDescriptionChange,
  onModelIdChange,
  disabled = false,
}: AgentGeneralFormProps) {
  const { data: models = [], isLoading: isLoadingModels } = useModels()

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

      <div className="space-y-2">
        <Label htmlFor="model">AI Model</Label>
        <Select
          value={modelId || ''}
          onValueChange={(value) => onModelIdChange(value || null)}
          disabled={disabled || isLoadingModels}
        >
          <SelectTrigger id="model">
            <SelectValue placeholder={isLoadingModels ? 'Loading models...' : 'Select a model'} />
          </SelectTrigger>
          <SelectContent>
            {models.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                {model.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Choose the AI model that powers your agent
        </p>
      </div>
    </div>
  )
}
