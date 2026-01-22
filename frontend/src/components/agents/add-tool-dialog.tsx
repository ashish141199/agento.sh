'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader2, Plug, Zap, Puzzle, ArrowLeft, Clipboard, Check } from 'lucide-react'
import { InputSchemaBuilder } from './input-schema-builder'
import { ApiConnectorConfigForm } from './api-connector-config-form'
import type {
  Tool,
  ToolType,
  ToolInputSchema,
  ApiConnectorConfig,
  CreateToolInput,
  UpdateToolInput,
} from '@/services/tool.service'

type Step = 'define' | 'configure'

interface AddToolDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: CreateToolInput | UpdateToolInput) => Promise<Tool>
  tool?: Tool
  isSaving?: boolean
}

/**
 * Two-step dialog for adding/editing tools
 * Step 1: Name, Description, Inputs, Action Type
 * Step 2: Configure the specific action (API Connector, MCP, etc.)
 */
export function AddToolDialog({
  open,
  onOpenChange,
  onSave,
  tool,
  isSaving = false,
}: AddToolDialogProps) {
  const isEditing = !!tool

  // Step state
  const [step, setStep] = useState<Step>('define')

  // Step 1 state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [inputSchema, setInputSchema] = useState<ToolInputSchema>({ inputs: [] })
  const [toolType, setToolType] = useState<ToolType>('api_connector')

  // Step 2 state - API Connector
  const [apiConfig, setApiConfig] = useState<ApiConnectorConfig>({
    method: 'GET',
    url: '',
  })

  // Created tool reference (for editing in step 2)
  const [createdTool, setCreatedTool] = useState<Tool | null>(null)

  // Track if we're in the middle of creating (to prevent useEffect from resetting step)
  const [isCreating, setIsCreating] = useState(false)

  // Reset form when dialog opens (only on initial open, not during creation flow)
  useEffect(() => {
    if (open && !isCreating) {
      if (tool) {
        // Editing existing tool - go directly to step 2 or stay on step 1 if no config
        setName(tool.name)
        setDescription(tool.description || '')
        setInputSchema(tool.inputSchema || { inputs: [] })
        setToolType(tool.type)
        setCreatedTool(tool)

        if (tool.config) {
          setApiConfig(tool.config as ApiConnectorConfig)
          setStep('configure')
        } else {
          setStep('define')
        }
      } else {
        // Creating new tool
        setName('')
        setDescription('')
        setInputSchema({ inputs: [] })
        setToolType('api_connector')
        setApiConfig({ method: 'GET', url: '' })
        setCreatedTool(null)
        setStep('define')
      }
    }
  }, [open, tool, isCreating])

  // Reset isCreating when dialog closes
  useEffect(() => {
    if (!open) {
      setIsCreating(false)
    }
  }, [open])

  // Step 1 validation
  const isStep1Valid = name.trim().length > 0

  // Step 2 validation (API Connector)
  const isStep2Valid = apiConfig.url.trim().length > 0

  // Handle Step 1 -> Step 2 transition
  const handleNext = async () => {
    if (!isStep1Valid) return

    try {
      // Mark as creating to prevent useEffect from resetting step
      setIsCreating(true)

      // Save tool with basic info (Step 1 data)
      const savedTool = await onSave({
        type: toolType,
        name: name.trim(),
        description: description.trim() || undefined,
        inputSchema: inputSchema.inputs.length > 0 ? inputSchema : undefined,
        config: null, // No config yet
      })

      setCreatedTool(savedTool)
      setStep('configure')
    } catch {
      // Error handled by parent
      setIsCreating(false)
    }
  }

  // Handle Step 2 save (final save with config)
  const handleSaveConfig = async () => {
    if (!isStep2Valid || !createdTool) return

    try {
      await onSave({
        config: apiConfig,
      })

      onOpenChange(false)
    } catch {
      // Error handled by parent
    }
  }

  // Handle back button
  const handleBack = () => {
    setStep('define')
  }

  // Close handler - confirm if in step 2
  const handleClose = (newOpen: boolean) => {
    if (!newOpen && step === 'configure' && !isEditing) {
      // User is closing mid-creation, tool was already created with null config
      // Could show confirmation, but for simplicity just close
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'define' ? (
              isEditing ? 'Edit Tool' : 'Add Tool'
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 -ml-2"
                  onClick={handleBack}
                  disabled={isSaving}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <span>Configure {toolType === 'api_connector' ? 'API' : 'MCP'}</span>
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        {step === 'define' ? (
          // Step 1: Define Tool
          <div className="space-y-6 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="tool-name">Name *</Label>
              <Input
                id="tool-name"
                placeholder="Get Weather"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSaving}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="tool-description">Description</Label>
              <Textarea
                id="tool-description"
                placeholder="Fetches current weather and forecast for any city"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSaving}
                rows={2}
              />
              <p className="text-xs text-neutral-500">
                Helps the AI understand when to use this tool
              </p>
            </div>

            {/* Inputs */}
            <div className="space-y-2">
              <Label>Inputs</Label>
              <p className="text-xs text-neutral-500 mb-2">
                What should the AI provide when calling this tool?
              </p>
              <InputSchemaBuilder
                value={inputSchema}
                onChange={setInputSchema}
                disabled={isSaving}
              />
            </div>

            {/* Action Type */}
            <div className="space-y-2">
              <Label>Action</Label>
              <p className="text-xs text-neutral-500 mb-2">
                What should this tool do?
              </p>
              <div className="grid grid-cols-3 gap-3">
                <ActionTypeCard
                  icon={<Plug className="h-5 w-5" />}
                  title="Call an API"
                  selected={toolType === 'api_connector'}
                  onClick={() => setToolType('api_connector')}
                  disabled={isSaving}
                />
                <ActionTypeCard
                  icon={<Zap className="h-5 w-5" />}
                  title="Connect to MCP"
                  selected={toolType === 'mcp_connector'}
                  onClick={() => setToolType('mcp_connector')}
                  disabled={true} // Coming soon
                  comingSoon
                />
                <ActionTypeCard
                  icon={<Puzzle className="h-5 w-5" />}
                  title="Integration"
                  selected={false}
                  onClick={() => {}}
                  disabled={true}
                  comingSoon
                />
              </div>
            </div>
          </div>
        ) : (
          // Step 2: Configure Action
          <div className="space-y-4 py-4">
            {/* Show available inputs as reference */}
            {inputSchema.inputs.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-neutral-500">Available inputs:</Label>
                <div className="flex flex-wrap gap-1.5">
                  {inputSchema.inputs.map((input) => (
                    <InputChip key={input.name} name={input.name} />
                  ))}
                </div>
                <p className="text-xs text-neutral-500">
                  Use <code className="text-xs">{`{{name}}`}</code> syntax to insert inputs
                </p>
              </div>
            )}

            {/* API Connector Config */}
            {toolType === 'api_connector' && (
              <ApiConnectorConfigForm
                value={apiConfig}
                onChange={setApiConfig}
                disabled={isSaving}
                availableInputs={inputSchema.inputs.map((i) => i.name)}
              />
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>

          {step === 'define' ? (
            <Button onClick={handleNext} disabled={!isStep1Valid || isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Next'
              )}
            </Button>
          ) : (
            <Button onClick={handleSaveConfig} disabled={!isStep2Valid || isSaving || !createdTool}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Tool'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Input chip with copy-to-clipboard functionality
 */
function InputChip({ name }: { name: string }) {
  const [copied, setCopied] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(`{{${name}}}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="flex items-center gap-1.5 px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded text-xs font-mono cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
    >
      <span>{name}</span>
      {(isHovered || copied) && (
        copied ? (
          <Check className="h-3 w-3 text-green-500" />
        ) : (
          <Clipboard className="h-3 w-3 text-neutral-400" />
        )
      )}
    </button>
  )
}

/**
 * Action type selection card
 */
function ActionTypeCard({
  icon,
  title,
  selected,
  onClick,
  disabled,
  comingSoon,
}: {
  icon: React.ReactNode
  title: string
  selected: boolean
  onClick: () => void
  disabled?: boolean
  comingSoon?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        relative flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all
        ${selected
          ? 'border-primary bg-primary/5'
          : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
        }
        ${disabled && !comingSoon ? 'opacity-50' : ''}
        ${comingSoon ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <span className={selected ? 'text-primary' : 'text-neutral-500'}>
        {icon}
      </span>
      <span className="mt-2 text-xs font-medium text-center">{title}</span>
      {comingSoon && (
        <span className="absolute -top-2 -right-2 px-1.5 py-0.5 bg-neutral-200 dark:bg-neutral-700 rounded text-[10px] font-medium">
          Soon
        </span>
      )}
      {selected && !comingSoon && (
        <div className="absolute bottom-2 w-1.5 h-1.5 rounded-full bg-primary" />
      )}
    </button>
  )
}
