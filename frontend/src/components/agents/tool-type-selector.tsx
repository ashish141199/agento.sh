'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Globe, Bot, Puzzle, Workflow } from 'lucide-react'

type ToolType = 'api_connector'

interface ToolOption {
  type: ToolType
  name: string
  description: string
  icon: React.ReactNode
  enabled: boolean
}

const TOOL_OPTIONS: ToolOption[] = [
  {
    type: 'api_connector',
    name: 'API Connector',
    description: 'Connect to any external API',
    icon: <Globe className="h-5 w-5" />,
    enabled: true,
  },
  {
    type: 'api_connector', // placeholder
    name: 'Agent Tool',
    description: 'Call another agent',
    icon: <Bot className="h-5 w-5" />,
    enabled: false,
  },
  {
    type: 'api_connector', // placeholder
    name: 'Integration',
    description: 'Connect to popular services',
    icon: <Puzzle className="h-5 w-5" />,
    enabled: false,
  },
  {
    type: 'api_connector', // placeholder
    name: 'MCP Tool',
    description: 'Model Context Protocol tools',
    icon: <Workflow className="h-5 w-5" />,
    enabled: false,
  },
]

interface ToolTypeSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (type: ToolType) => void
}

/**
 * Dialog for selecting a tool type to add
 */
export function ToolTypeSelector({
  open,
  onOpenChange,
  onSelect,
}: ToolTypeSelectorProps) {
  const handleSelect = (option: ToolOption) => {
    if (option.enabled) {
      onSelect(option.type)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a Tool</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-4">
          {TOOL_OPTIONS.map((option, index) => (
            <button
              key={index}
              onClick={() => handleSelect(option)}
              disabled={!option.enabled}
              className={`flex items-center gap-4 p-4 rounded-lg border text-left transition-colors ${
                option.enabled
                  ? 'hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer border-neutral-200 dark:border-neutral-700'
                  : 'opacity-50 cursor-not-allowed border-neutral-100 dark:border-neutral-800'
              }`}
            >
              <div className={`p-2 rounded-md ${
                option.enabled
                  ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                  : 'bg-neutral-50 dark:bg-neutral-900 text-neutral-400 dark:text-neutral-600'
              }`}>
                {option.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${
                    option.enabled
                      ? 'text-neutral-900 dark:text-neutral-100'
                      : 'text-neutral-500 dark:text-neutral-500'
                  }`}>
                    {option.name}
                  </span>
                  {!option.enabled && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                      Coming Soon
                    </span>
                  )}
                </div>
                <p className={`text-sm ${
                  option.enabled
                    ? 'text-neutral-500 dark:text-neutral-400'
                    : 'text-neutral-400 dark:text-neutral-600'
                }`}>
                  {option.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
