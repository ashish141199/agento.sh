'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Globe, Pencil, Trash2, AlertCircle, Zap } from 'lucide-react'
import type { ToolWithAssignment, ApiConnectorConfig, McpConnectorConfig } from '@/services/tool.service'

interface ToolCardProps {
  tool: ToolWithAssignment
  onEdit: () => void
  onRemove: () => void
}

/**
 * Card component for displaying a tool in the agent tools list
 */
export function ToolCard({ tool, onEdit, onRemove }: ToolCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault()
    onRemove()
    setShowDeleteDialog(false)
  }

  const inputCount = tool.inputSchema?.inputs?.length || 0
  const isConfigured = !!tool.config
  const isMcp = tool.type === 'mcp_connector'
  const apiConfig = !isMcp ? (tool.config as ApiConnectorConfig | null) : null
  const mcpConfig = isMcp ? (tool.config as McpConnectorConfig | null) : null

  // Extract server hostname for MCP display
  const getServerHost = (url: string) => {
    try {
      return new URL(url).hostname
    } catch {
      return url
    }
  }

  return (
    <>
      <div className={`flex items-center gap-4 p-4 rounded-lg border bg-white dark:bg-neutral-900 ${
        isConfigured
          ? 'border-neutral-200 dark:border-neutral-700'
          : 'border-amber-300 dark:border-amber-700'
      }`}>
        <div className={`p-2 rounded-md ${
          isConfigured
            ? isMcp
              ? 'bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
            : 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300'
        }`}>
          {!isConfigured ? (
            <AlertCircle className="h-5 w-5" />
          ) : isMcp ? (
            <Zap className="h-5 w-5" />
          ) : (
            <Globe className="h-5 w-5" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
            {tool.name}
          </div>
          <div className="text-sm text-neutral-500 dark:text-neutral-400 flex items-center gap-2 flex-wrap">
            <span>{isMcp ? 'MCP' : 'API'}</span>
            {apiConfig && (
              <>
                <span>&middot;</span>
                <span>{apiConfig.method}</span>
              </>
            )}
            {mcpConfig && (
              <>
                <span>&middot;</span>
                <span className="truncate max-w-[150px]">{getServerHost(mcpConfig.serverUrl)}</span>
              </>
            )}
            {inputCount > 0 && (
              <>
                <span>&middot;</span>
                <span>{inputCount} input{inputCount !== 1 ? 's' : ''}</span>
              </>
            )}
            {!isConfigured && (
              <span className="text-amber-600 dark:text-amber-400">
                &middot; Not configured
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onEdit}
            className="h-8 w-8 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowDeleteDialog(true)}
            className="h-8 w-8 text-neutral-500 hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-500"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Tool</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove &quot;{tool.name}&quot; from this agent?
              The tool itself will not be deleted and can be added again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
