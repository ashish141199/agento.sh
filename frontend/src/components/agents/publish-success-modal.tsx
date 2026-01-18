'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Copy, Check, ExternalLink, Code, ArrowLeft, Loader2 } from 'lucide-react'

interface PublishSuccessModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  slug: string
  onOpenEmbed: () => void
  onBack: () => void
  onUnpublish: () => void
  isUnpublishing: boolean
}

export function PublishSuccessModal({
  open,
  onOpenChange,
  slug,
  onOpenEmbed,
  onBack,
  onUnpublish,
  isUnpublishing,
}: PublishSuccessModalProps) {
  const [copiedUrl, setCopiedUrl] = useState(false)

  const shareUrl = `https://agentoo.ai/chat/${slug}`

  const handleCopyUrl = async () => {
    await navigator.clipboard.writeText(shareUrl)
    setCopiedUrl(true)
    setTimeout(() => setCopiedUrl(false), 2000)
  }

  const handleOpenPreview = () => {
    window.open(shareUrl, '_blank')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agent Published!</DialogTitle>
          <DialogDescription>
            Your agent is now live and accessible to anyone with the link.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Share URL Section */}
          <div className="space-y-2">
            <Label>Share Link</Label>
            <div className="flex gap-2">
              <Input
                value={shareUrl}
                readOnly
                className="flex-1 text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyUrl}
                title="Copy link"
              >
                {copiedUrl ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleOpenPreview}
                title="Open preview"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Embed Section */}
          <div className="space-y-2">
            <Label>Embed on Website</Label>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={onOpenEmbed}
            >
              <Code className="h-4 w-4 mr-2" />
              Get Embed Code
            </Button>
          </div>

          {/* API Section */}
          <div className="space-y-2">
            <Label>API Access</Label>
            <div className="bg-neutral-100 dark:bg-neutral-800 rounded-md p-3 text-sm text-muted-foreground">
              Coming Soon
            </div>
          </div>
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={onUnpublish}
            disabled={isUnpublishing}
            className="text-muted-foreground hover:text-destructive"
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
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Editor
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
