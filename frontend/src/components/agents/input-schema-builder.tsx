'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible'
import {
  Pencil,
  Trash2,
  Plus,
  ChevronDown,
  Type,
  Hash,
  ToggleLeft,
  List,
  Braces,
} from 'lucide-react'
import type { ToolInput, ToolInputType, ToolInputSchema } from '@/services/tool.service'

/**
 * Type icons and labels
 */
const TYPE_CONFIG: Record<ToolInputType, { icon: React.ReactNode; label: string }> = {
  text: { icon: <Type className="h-4 w-4" />, label: 'Text' },
  number: { icon: <Hash className="h-4 w-4" />, label: 'Number' },
  boolean: { icon: <ToggleLeft className="h-4 w-4" />, label: 'Yes/No' },
  list: { icon: <List className="h-4 w-4" />, label: 'List' },
  object: { icon: <Braces className="h-4 w-4" />, label: 'Object' },
}

interface InputSchemaBuilderProps {
  value: ToolInputSchema
  onChange: (schema: ToolInputSchema) => void
  disabled?: boolean
}

/**
 * Component for building tool input schemas
 * Allows users to define what inputs a tool needs from the AI
 */
export function InputSchemaBuilder({
  value,
  onChange,
  disabled = false,
}: InputSchemaBuilderProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  const inputs = value.inputs || []

  const handleAddInput = (input: ToolInput) => {
    onChange({ inputs: [...inputs, input] })
    setIsAdding(false)
  }

  const handleUpdateInput = (index: number, input: ToolInput) => {
    const newInputs = [...inputs]
    newInputs[index] = input
    onChange({ inputs: newInputs })
    setEditingIndex(null)
  }

  const handleDeleteInput = (index: number) => {
    onChange({ inputs: inputs.filter((_, i) => i !== index) })
    if (editingIndex === index) {
      setEditingIndex(null)
    }
  }

  return (
    <div className="space-y-3">
      {/* Existing inputs */}
      {inputs.map((input, index) => (
        <div key={index}>
          {editingIndex === index ? (
            <InputEditor
              input={input}
              onSave={(updated) => handleUpdateInput(index, updated)}
              onCancel={() => setEditingIndex(null)}
              disabled={disabled}
            />
          ) : (
            <InputCard
              input={input}
              onEdit={() => setEditingIndex(index)}
              onDelete={() => handleDeleteInput(index)}
              disabled={disabled}
            />
          )}
        </div>
      ))}

      {/* Add new input form */}
      {isAdding ? (
        <InputEditor
          onSave={handleAddInput}
          onCancel={() => setIsAdding(false)}
          disabled={disabled}
        />
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsAdding(true)}
          disabled={disabled}
          className="w-full border-dashed"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Input
        </Button>
      )}
    </div>
  )
}

/**
 * Display card for an input
 */
function InputCard({
  input,
  onEdit,
  onDelete,
  disabled,
}: {
  input: ToolInput
  onEdit: () => void
  onDelete: () => void
  disabled?: boolean
}) {
  const typeConfig = TYPE_CONFIG[input.type]

  return (
    <div className="border rounded-lg p-3 bg-neutral-50 dark:bg-neutral-900">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-neutral-500">{typeConfig.icon}</span>
          <span className="font-medium">{input.name}</span>
        </div>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onEdit}
            disabled={disabled}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-red-500 hover:text-red-600"
            onClick={onDelete}
            disabled={disabled}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="mt-1 flex items-center gap-2 text-xs text-neutral-500">
        <span>{typeConfig.label}</span>
        <span>•</span>
        <span>{input.required ? 'Required' : 'Optional'}</span>
        {input.default !== undefined && (
          <>
            <span>•</span>
            <span>Default: {String(input.default)}</span>
          </>
        )}
      </div>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        {input.description}
      </p>

      {/* Show nested properties for object type */}
      {input.type === 'object' && input.properties && input.properties.length > 0 && (
        <div className="mt-2 pl-4 border-l-2 border-neutral-200 dark:border-neutral-700">
          <p className="text-xs text-neutral-500 mb-1">Fields:</p>
          {input.properties.map((prop, i) => (
            <div key={i} className="text-xs text-neutral-600 dark:text-neutral-400">
              {prop.name} ({TYPE_CONFIG[prop.type].label})
            </div>
          ))}
        </div>
      )}

      {/* Show item type for list type */}
      {input.type === 'list' && input.listItemType && (
        <div className="mt-2 text-xs text-neutral-500">
          List of: {TYPE_CONFIG[input.listItemType].label}
        </div>
      )}
    </div>
  )
}

/**
 * Editor form for creating/editing an input
 */
function InputEditor({
  input,
  onSave,
  onCancel,
  disabled,
  depth = 0,
}: {
  input?: ToolInput
  onSave: (input: ToolInput) => void
  onCancel: () => void
  disabled?: boolean
  depth?: number
}) {
  const [name, setName] = useState(input?.name || '')
  const [description, setDescription] = useState(input?.description || '')
  const [type, setType] = useState<ToolInputType>(input?.type || 'text')
  const [required, setRequired] = useState(input?.required ?? true)
  const [defaultValue, setDefaultValue] = useState(
    input?.default !== undefined ? String(input.default) : ''
  )
  const [listItemType, setListItemType] = useState<ToolInputType>(
    input?.listItemType || 'text'
  )
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Nested properties for object type
  const [properties, setProperties] = useState<ToolInput[]>(input?.properties || [])

  // Nested properties for list of objects
  const [listItemProperties, setListItemProperties] = useState<ToolInput[]>(
    input?.listItemProperties || []
  )

  const isValid = name.trim() && description.trim() && /^[a-zA-Z][a-zA-Z0-9_]*$/.test(name)

  const handleSave = () => {
    if (!isValid) return

    const newInput: ToolInput = {
      name: name.trim(),
      description: description.trim(),
      type,
      required,
    }

    // Parse default value based on type
    if (defaultValue.trim()) {
      if (type === 'number') {
        newInput.default = Number(defaultValue)
      } else if (type === 'boolean') {
        newInput.default = defaultValue.toLowerCase() === 'true'
      } else {
        newInput.default = defaultValue
      }
    }

    // Add properties for object type
    if (type === 'object' && properties.length > 0) {
      newInput.properties = properties
    }

    // Add list item type and properties for list inputs
    if (type === 'list') {
      newInput.listItemType = listItemType
      if (listItemType === 'object' && listItemProperties.length > 0) {
        newInput.listItemProperties = listItemProperties
      }
    }

    onSave(newInput)
  }

  // Limit nesting depth to prevent UI from getting too complex
  const maxDepth = 2
  const canNest = depth < maxDepth

  return (
    <div className="border rounded-lg p-4 bg-white dark:bg-neutral-950 space-y-4">
      {/* Name and Description in one row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={`input-name-${depth}`} className="text-sm">Name</Label>
          <Input
            id={`input-name-${depth}`}
            placeholder="city"
            value={name}
            onChange={(e) => setName(e.target.value.replace(/\s/g, ''))}
            disabled={disabled}
            className="h-9"
          />
          <p className="text-xs text-neutral-500">Identifier (no spaces)</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`input-description-${depth}`} className="text-sm">Description</Label>
          <Input
            id={`input-description-${depth}`}
            placeholder="The city to get weather for"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={disabled}
            className="h-9"
          />
          <p className="text-xs text-neutral-500">What should AI provide?</p>
        </div>
      </div>

      {/* Type selection */}
      <div className="space-y-1.5">
        <Label className="text-sm">Type</Label>
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(TYPE_CONFIG) as ToolInputType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              disabled={disabled}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm border transition-colors
                ${type === t
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {TYPE_CONFIG[t].icon}
              {TYPE_CONFIG[t].label}
            </button>
          ))}
        </div>
      </div>

      {/* Object properties (nested inputs) */}
      {type === 'object' && canNest && (
        <div className="space-y-2">
          <Label className="text-sm">Object Fields</Label>
          <p className="text-xs text-neutral-500">
            Define what fields this object should contain
          </p>
          <NestedInputBuilder
            inputs={properties}
            onChange={setProperties}
            disabled={disabled}
            depth={depth + 1}
          />
        </div>
      )}

      {/* List item type (only for list type) */}
      {type === 'list' && (
        <div className="space-y-1.5">
          <Label className="text-sm">List contains</Label>
          <div className="flex gap-2 flex-wrap">
            {(['text', 'number', 'boolean', 'object'] as ToolInputType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setListItemType(t)}
                disabled={disabled}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm border transition-colors
                  ${listItemType === t
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                {TYPE_CONFIG[t].icon}
                {TYPE_CONFIG[t].label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* List item properties (for list of objects) */}
      {type === 'list' && listItemType === 'object' && canNest && (
        <div className="space-y-2">
          <Label className="text-sm">Object Item Fields</Label>
          <p className="text-xs text-neutral-500">
            Define what fields each object in the list should contain
          </p>
          <NestedInputBuilder
            inputs={listItemProperties}
            onChange={setListItemProperties}
            disabled={disabled}
            depth={depth + 1}
          />
        </div>
      )}

      {/* Required and Default */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Checkbox
            id={`input-required-${depth}`}
            checked={required}
            onCheckedChange={(checked) => setRequired(checked === true)}
            disabled={disabled}
          />
          <Label htmlFor={`input-required-${depth}`} className="text-sm cursor-pointer">
            Required
          </Label>
        </div>

        <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
          <CollapsibleTrigger className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300">
            <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            Advanced
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <div className="space-y-1.5">
              <Label htmlFor={`input-default-${depth}`} className="text-sm">Default value</Label>
              <Input
                id={`input-default-${depth}`}
                placeholder={type === 'boolean' ? 'true or false' : 'Default value'}
                value={defaultValue}
                onChange={(e) => setDefaultValue(e.target.value)}
                disabled={disabled}
                className="h-9"
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={disabled}
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={disabled || !isValid}
        >
          {input ? 'Save' : 'Add'}
        </Button>
      </div>
    </div>
  )
}

/**
 * Nested input builder for object properties and list item properties
 */
function NestedInputBuilder({
  inputs,
  onChange,
  disabled,
  depth,
}: {
  inputs: ToolInput[]
  onChange: (inputs: ToolInput[]) => void
  disabled?: boolean
  depth: number
}) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  const handleAddInput = (input: ToolInput) => {
    onChange([...inputs, input])
    setIsAdding(false)
  }

  const handleUpdateInput = (index: number, input: ToolInput) => {
    const newInputs = [...inputs]
    newInputs[index] = input
    onChange(newInputs)
    setEditingIndex(null)
  }

  const handleDeleteInput = (index: number) => {
    onChange(inputs.filter((_, i) => i !== index))
    if (editingIndex === index) {
      setEditingIndex(null)
    }
  }

  return (
    <div className="space-y-2 pl-3 border-l-2 border-neutral-200 dark:border-neutral-700">
      {inputs.map((input, index) => (
        <div key={index}>
          {editingIndex === index ? (
            <InputEditor
              input={input}
              onSave={(updated) => handleUpdateInput(index, updated)}
              onCancel={() => setEditingIndex(null)}
              disabled={disabled}
              depth={depth}
            />
          ) : (
            <div className="flex items-center justify-between p-2 bg-neutral-50 dark:bg-neutral-900 rounded text-sm">
              <div className="flex items-center gap-2">
                <span className="text-neutral-500">{TYPE_CONFIG[input.type].icon}</span>
                <span className="font-medium">{input.name}</span>
                <span className="text-neutral-400">({TYPE_CONFIG[input.type].label})</span>
                {input.required && <span className="text-xs text-red-500">*</span>}
              </div>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setEditingIndex(index)}
                  disabled={disabled}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-red-500 hover:text-red-600"
                  onClick={() => handleDeleteInput(index)}
                  disabled={disabled}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}

      {isAdding ? (
        <InputEditor
          onSave={handleAddInput}
          onCancel={() => setIsAdding(false)}
          disabled={disabled}
          depth={depth}
        />
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsAdding(true)}
          disabled={disabled}
          className="w-full border-dashed h-8 text-xs"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Field
        </Button>
      )}
    </div>
  )
}
