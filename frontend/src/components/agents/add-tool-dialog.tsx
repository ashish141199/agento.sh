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
import { Loader2, Plug, Zap, Puzzle, ArrowLeft, Clipboard, Check, Info } from 'lucide-react'
import { InputSchemaBuilder } from './input-schema-builder'
import { ApiConnectorConfigForm } from './api-connector-config-form'
import { McpConnectorConfigForm } from './mcp-connector-config-form'
import type {
  Tool,
  ToolType,
  ToolInputSchema,
  ApiConnectorConfig,
  McpConnectorConfig,
  McpDiscoveredTool,
  CreateToolInput,
  UpdateToolInput,
} from '@/services/tool.service'

type Step = 'define' | 'configure'

interface AddToolDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: CreateToolInput | UpdateToolInput) => Promise<Tool>
  onImportMcpTools?: (tools: McpDiscoveredTool[], serverUrl: string, auth?: McpConnectorConfig['authentication']) => Promise<void>
  tool?: Tool
  isSaving?: boolean
}

/**
 * Two-step dialog for adding/editing tools
 * - API Connector: Name, Description, Action, Inputs → Configure API
 * - MCP Connector: Action → Connect to server, select tools → Import multiple tools
 */
export function AddToolDialog({
  open,
  onOpenChange,
  onSave,
  onImportMcpTools,
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
  const [toolType, setToolType] = useState<ToolType | null>(null)

  // Step 2 state - API Connector
  const [apiConfig, setApiConfig] = useState<ApiConnectorConfig>({
    method: 'GET',
    url: '',
  })

  // Step 2 state - MCP Connector
  const [mcpServerUrl, setMcpServerUrl] = useState('')
  const [mcpAuth, setMcpAuth] = useState<McpConnectorConfig['authentication']>()
  const [mcpDiscoveredTools, setMcpDiscoveredTools] = useState<McpDiscoveredTool[]>([])
  const [mcpSelectedTools, setMcpSelectedTools] = useState<string[]>([])
  const [mcpIsConnected, setMcpIsConnected] = useState(false)

  // Created tool reference (for editing in step 2)
  const [createdTool, setCreatedTool] = useState<Tool | null>(null)

  // Track if we're in the middle of creating (to prevent useEffect from resetting step)
  const [isCreating, setIsCreating] = useState(false)

  // Reset form when dialog opens (only on initial open, not during creation flow)
  useEffect(() => {
    if (open && !isCreating) {
      if (tool) {
        // Editing existing tool
        setName(tool.name)
        setDescription(tool.description || '')
        setInputSchema(tool.inputSchema || { inputs: [] })
        setToolType(tool.type)
        setCreatedTool(tool)

        if (tool.type === 'api_connector' && tool.config) {
          setApiConfig(tool.config as ApiConnectorConfig)
          setStep('configure')
        } else if (tool.type === 'mcp_connector' && tool.config) {
          const mcpConfig = tool.config as McpConnectorConfig
          setMcpServerUrl(mcpConfig.serverUrl)
          setMcpAuth(mcpConfig.authentication)
          setStep('configure')
        } else {
          setStep('define')
        }
      } else {
        // Creating new tool - reset everything
        setName('')
        setDescription('')
        setInputSchema({ inputs: [] })
        setToolType(null) // No default selection
        setApiConfig({ method: 'GET', url: '' })
        setMcpServerUrl('')
        setMcpAuth(undefined)
        setMcpDiscoveredTools([])
        setMcpSelectedTools([])
        setMcpIsConnected(false)
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
  const isStep1Valid = toolType === 'api_connector'
    ? name.trim().length > 0
    : toolType === 'mcp_connector'

  // Step 2 validation
  const isStep2Valid = toolType === 'api_connector'
    ? apiConfig.url.trim().length > 0
    : mcpIsConnected && mcpSelectedTools.length > 0

  // Handle Step 1 -> Step 2 transition
  const handleNext = async () => {
    if (!isStep1Valid || !toolType) return

    if (toolType === 'api_connector') {
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
    } else if (toolType === 'mcp_connector') {
      // For MCP, just go to step 2 (no tool created yet)
      setStep('configure')
    }
  }

  // Handle Step 2 save (API Connector)
  const handleSaveApiConfig = async () => {
    if (!apiConfig.url.trim() || !createdTool) return

    try {
      await onSave({
        config: apiConfig,
      })

      onOpenChange(false)
    } catch {
      // Error handled by parent
    }
  }

  // Handle Step 2 save (MCP Connector - imports multiple tools)
  const handleImportMcpTools = async () => {
    if (!mcpIsConnected || mcpSelectedTools.length === 0 || !onImportMcpTools) return

    try {
      const toolsToImport = mcpDiscoveredTools.filter(t => mcpSelectedTools.includes(t.name))
      await onImportMcpTools(toolsToImport, mcpServerUrl, mcpAuth)
      onOpenChange(false)
    } catch {
      // Error handled by parent
    }
  }

  // Handle back button
  const handleBack = () => {
    setStep('define')
    // Reset MCP state when going back
    if (toolType === 'mcp_connector') {
      setMcpIsConnected(false)
      setMcpDiscoveredTools([])
      setMcpSelectedTools([])
    }
  }

  // Close handler
  const handleClose = (newOpen: boolean) => {
    onOpenChange(newOpen)
  }

  // Get dialog title
  const getDialogTitle = () => {
    if (step === 'configure') {
      return (
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
          <span>{toolType === 'api_connector' ? 'Configure API' : 'Import from MCP'}</span>
        </div>
      )
    }

    if (isEditing) return 'Edit Tool'
    if (toolType === 'mcp_connector') return 'Import from MCP'
    return 'Add Tool'
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
        </DialogHeader>

        {step === 'define' ? (
          // Step 1: Define Tool
          <div className="space-y-6 py-4">
            {/* Action Type - Always shown first */}
            <div className="space-y-2">
              <Label>Action</Label>
              <p className="text-xs text-neutral-500 mb-2">
                What kind of tool do you want to add?
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
                  disabled={isSaving}
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

            {/* API Connector fields - only shown when API is selected */}
            {toolType === 'api_connector' && (
              <>
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
              </>
            )}

            {/* MCP info box - only shown when MCP is selected */}
            {toolType === 'mcp_connector' && (
              <div className="flex gap-3 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <p className="font-medium">MCP servers provide ready-to-use tools</p>
                  <p className="mt-1 text-blue-600 dark:text-blue-400">
                    Connect to a server to browse and import tools. Each imported tool will appear separately in your tools list.
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          // Step 2: Configure Action
          <div className="space-y-4 py-4">
            {/* API Connector Config */}
            {toolType === 'api_connector' && (
              <>
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

                <ApiConnectorConfigForm
                  value={apiConfig}
                  onChange={setApiConfig}
                  disabled={isSaving}
                  availableInputs={inputSchema.inputs.map((i) => i.name)}
                />
              </>
            )}

            {/* MCP Connector Config */}
            {toolType === 'mcp_connector' && (
              <McpConnectorConfigForm
                serverUrl={mcpServerUrl}
                onServerUrlChange={setMcpServerUrl}
                authentication={mcpAuth}
                onAuthenticationChange={setMcpAuth}
                discoveredTools={mcpDiscoveredTools}
                onDiscoveredToolsChange={setMcpDiscoveredTools}
                selectedTools={mcpSelectedTools}
                onSelectedToolsChange={setMcpSelectedTools}
                isConnected={mcpIsConnected}
                onIsConnectedChange={setMcpIsConnected}
                disabled={isSaving}
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
          ) : toolType === 'api_connector' ? (
            <Button onClick={handleSaveApiConfig} disabled={!isStep2Valid || isSaving || !createdTool}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Tool'
              )}
            </Button>
          ) : (
            <Button onClick={handleImportMcpTools} disabled={!isStep2Valid || isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                `Import ${mcpSelectedTools.length} Tool${mcpSelectedTools.length !== 1 ? 's' : ''}`
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
