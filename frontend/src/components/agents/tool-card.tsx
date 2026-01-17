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
import { Globe, Pencil, Trash2 } from 'lucide-react'
import type { ToolWithAssignment } from '@/services/tool.service'

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

  const handleDelete = () => {
    onRemove()
    setShowDeleteDialog(false)
  }

  return (
    <>
      <div className="flex items-center gap-4 p-4 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
        <div className="p-2 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
          <Globe className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
            {tool.name}
          </div>
          <div className="text-sm text-neutral-500 dark:text-neutral-400">
            API Connector &middot; {tool.config.method}
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
