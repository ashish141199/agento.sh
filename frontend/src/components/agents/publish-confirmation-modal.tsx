'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

interface PublishConfirmationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  agentName: string
  modelName: string | null
  toolsCount: number
  isPublishing: boolean
  onConfirm: (origin: { x: number; y: number }) => void
  onCancel: () => void
}

export function PublishConfirmationModal({
  open,
  onOpenChange,
  agentName,
  modelName,
  toolsCount,
  isPublishing,
  onConfirm,
  onCancel,
}: PublishConfirmationModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Publish Agent</DialogTitle>
          <DialogDescription>
            You are about to publish this agent for public access.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <p className="text-muted-foreground">Agent Name</p>
              <p className="font-medium">{agentName}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Model</p>
              <p className="font-medium">{modelName || 'Not selected'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Tools</p>
              <p className="font-medium">{toolsCount} enabled</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Once published, anyone with the share link will be able to chat with this agent.
          </p>
        </div>

        <DialogFooter className="gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isPublishing}
          >
            Cancel
          </Button>
          <Button
            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
              const rect = event.currentTarget.getBoundingClientRect()
              const origin = {
                x: (rect.left + rect.width / 2) / window.innerWidth,
                y: (rect.top + rect.height / 2) / window.innerHeight,
              }
              onConfirm(origin)
            }}
            disabled={isPublishing}
          >
            {isPublishing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Publishing...
              </>
            ) : (
              'Publish'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
