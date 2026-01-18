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

interface UnpublishConfirmationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  agentName: string
  isUnpublishing: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function UnpublishConfirmationModal({
  open,
  onOpenChange,
  agentName,
  isUnpublishing,
  onConfirm,
  onCancel,
}: UnpublishConfirmationModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Unpublish Agent</DialogTitle>
          <DialogDescription>
            Are you sure you want to unpublish this agent?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{agentName}</span> will no longer be accessible via the share link. You can publish it again at any time.
          </p>
        </div>

        <DialogFooter className="gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isUnpublishing}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isUnpublishing}
          >
            {isUnpublishing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Unpublishing...
              </>
            ) : (
              'Unpublish'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
