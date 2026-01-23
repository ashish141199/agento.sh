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
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Copy, Check, ArrowLeft, Plus, X } from 'lucide-react'
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
  { value: 'expanded', label: 'Expanded (fit to parent)' },
  { value: 'widget', label: 'Widget (bottom-right)' },
] as const

const THEME_OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const

/**
 * Normalize domain input: remove protocol, www, path, port
 */
function normalizeDomain(input: string): string {
  let domain = input.trim().toLowerCase()
  // Remove protocol
  domain = domain.replace(/^https?:\/\//, '')
  // Remove www.
  domain = domain.replace(/^www\./, '')
  // Remove path and query
  domain = domain.split('/')[0].split('?')[0]
  // Remove port
  domain = domain.split(':')[0]
  return domain
}

/**
 * Validate domain format
 */
function isValidDomain(domain: string): boolean {
  if (!domain) return false
  const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/
  return domainRegex.test(domain) && domain.includes('.')
}

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
  const [allowedDomains, setAllowedDomains] = useState<string[]>(embedConfig.allowedDomains || [])
  const [domainInput, setDomainInput] = useState('')
  const [domainError, setDomainError] = useState<string | null>(null)

  useEffect(() => {
    setPosition(embedConfig.position)
    setTheme(embedConfig.theme)
    setAllowedDomains(embedConfig.allowedDomains || [])
  }, [embedConfig])

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const embedCode = `<script
  src="${appUrl}/embed.js"
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

  const handleAddDomain = () => {
    const normalized = normalizeDomain(domainInput)

    if (!normalized) {
      setDomainError('Please enter a domain')
      return
    }

    if (!isValidDomain(normalized)) {
      setDomainError('Invalid domain format (e.g., example.com)')
      return
    }

    if (allowedDomains.includes(normalized)) {
      setDomainError('Domain already added')
      return
    }

    const newDomains = [...allowedDomains, normalized]
    setAllowedDomains(newDomains)
    onConfigChange({ allowedDomains: newDomains })
    setDomainInput('')
    setDomainError(null)
  }

  const handleRemoveDomain = (domain: string) => {
    const newDomains = allowedDomains.filter(d => d !== domain)
    setAllowedDomains(newDomains)
    onConfigChange({ allowedDomains: newDomains })
  }

  const handleDomainKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddDomain()
    }
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
            <Label htmlFor="allowed-domains">Allowed Domains</Label>
            <p className="text-xs text-muted-foreground">
              Restrict which websites can embed this agent. Leave empty to allow all domains.
            </p>
            <div className="flex gap-2">
              <Input
                id="allowed-domains"
                placeholder="example.com"
                value={domainInput}
                onChange={(e) => {
                  setDomainInput(e.target.value)
                  setDomainError(null)
                }}
                onKeyDown={handleDomainKeyDown}
                className="flex-1"
              />
              <Button type="button" variant="outline" size="icon" onClick={handleAddDomain}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {domainError && (
              <p className="text-xs text-destructive">{domainError}</p>
            )}
            {allowedDomains.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {allowedDomains.map((domain) => (
                  <Badge key={domain} variant="secondary" className="gap-1 pr-1">
                    {domain}
                    <button
                      type="button"
                      onClick={() => handleRemoveDomain(domain)}
                      className="ml-1 hover:bg-neutral-300 dark:hover:bg-neutral-600 rounded p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
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
            Add this script to your website to embed the chat interface.
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
