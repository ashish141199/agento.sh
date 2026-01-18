'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Copy, Check, ArrowLeft } from 'lucide-react'
import type { EmbedConfig } from '@/services/agent.service'

interface EmbedModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  slug: string
  embedConfig: EmbedConfig
  onConfigChange: (config: Partial<EmbedConfig>) => void
  onBack: () => void
}

const POSITION_OPTIONS = [
  { value: 'bottom-right', label: 'Bottom Right' },
  { value: 'bottom-left', label: 'Bottom Left' },
  { value: 'top-right', label: 'Top Right' },
  { value: 'top-left', label: 'Top Left' },
] as const

const THEME_OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const

export function EmbedModal({
  open,
  onOpenChange,
  slug,
  embedConfig,
  onConfigChange,
  onBack,
}: EmbedModalProps) {
  const [copied, setCopied] = useState(false)
  const [position, setPosition] = useState<EmbedConfig['position']>(embedConfig.position)
  const [theme, setTheme] = useState<EmbedConfig['theme']>(embedConfig.theme)

  useEffect(() => {
    setPosition(embedConfig.position)
    setTheme(embedConfig.theme)
  }, [embedConfig])

  const embedCode = `<script
  src="https://agentoo.ai/embed.js"
  data-agent="${slug}"
  data-position="${position}"
  data-theme="${theme}"
  async
></script>`

  const handleCopy = async () => {
    await navigator.clipboard.writeText(embedCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handlePositionChange = (value: EmbedConfig['position']) => {
    setPosition(value)
    onConfigChange({ position: value })
  }

  const handleThemeChange = (value: EmbedConfig['theme']) => {
    setTheme(value)
    onConfigChange({ theme: value })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Embed Widget</DialogTitle>
          <DialogDescription>
            Add this script to your website to embed a chat widget.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Select value={position} onValueChange={handlePositionChange}>
                <SelectTrigger id="position" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POSITION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="theme">Theme</Label>
              <Select value={theme} onValueChange={handleThemeChange}>
                <SelectTrigger id="theme" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {THEME_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Embed Code</Label>
            <div className="relative">
              <pre className="bg-neutral-100 dark:bg-neutral-800 rounded-md p-3 text-xs overflow-x-auto">
                <code>{embedCode}</code>
              </pre>
              <Button
                variant="ghost"
                size="icon-sm"
                className="absolute top-2 right-2"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Note: The embed script is currently a placeholder and will be implemented in a future update.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
