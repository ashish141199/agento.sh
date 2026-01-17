'use client'

import { useState } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ChevronDown, Plus, Trash2, Loader2 } from 'lucide-react'
import type { Tool, ApiConnectorConfig, ApiConnectorAuth } from '@/services/tool.service'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
type AuthType = 'none' | 'bearer' | 'api_key' | 'basic'

interface Header {
  key: string
  value: string
}

interface ApiConnectorFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: { name: string; description?: string; config: ApiConnectorConfig }) => Promise<void>
  tool?: Tool
  isSaving?: boolean
}

/**
 * Form dialog for creating/editing an API Connector tool
 */
export function ApiConnectorForm({
  open,
  onOpenChange,
  onSave,
  tool,
  isSaving = false,
}: ApiConnectorFormProps) {
  const [name, setName] = useState(tool?.name || '')
  const [description, setDescription] = useState(tool?.description || '')
  const [method, setMethod] = useState<HttpMethod>(tool?.config?.method || 'GET')
  const [url, setUrl] = useState(tool?.config?.url || '')
  const [headers, setHeaders] = useState<Header[]>(tool?.config?.headers || [])
  const [body, setBody] = useState(tool?.config?.body || '')
  const [authType, setAuthType] = useState<AuthType>(tool?.config?.authentication?.type || 'none')
  const [authToken, setAuthToken] = useState(tool?.config?.authentication?.token || '')
  const [authApiKey, setAuthApiKey] = useState(tool?.config?.authentication?.apiKey || '')
  const [authUsername, setAuthUsername] = useState(tool?.config?.authentication?.username || '')
  const [authPassword, setAuthPassword] = useState(tool?.config?.authentication?.password || '')
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const isEditing = !!tool

  const handleAddHeader = () => {
    setHeaders([...headers, { key: '', value: '' }])
  }

  const handleRemoveHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index))
  }

  const handleHeaderChange = (index: number, field: 'key' | 'value', value: string) => {
    const newHeaders = [...headers]
    newHeaders[index] = { ...newHeaders[index], [field]: value }
    setHeaders(newHeaders)
  }

  const handleSubmit = async () => {
    if (!name.trim() || !url.trim()) return

    const authentication: ApiConnectorAuth | undefined = authType === 'none'
      ? undefined
      : {
          type: authType,
          ...(authType === 'bearer' && { token: authToken }),
          ...(authType === 'api_key' && { apiKey: authApiKey }),
          ...(authType === 'basic' && { username: authUsername, password: authPassword }),
        }

    const config: ApiConnectorConfig = {
      method,
      url,
      ...(headers.length > 0 && { headers: headers.filter(h => h.key.trim()) }),
      ...(body.trim() && { body }),
      ...(authentication && { authentication }),
    }

    await onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      config,
    })

    // Reset form if creating new
    if (!isEditing) {
      setName('')
      setDescription('')
      setMethod('GET')
      setUrl('')
      setHeaders([])
      setBody('')
      setAuthType('none')
      setAuthToken('')
      setAuthApiKey('')
      setAuthUsername('')
      setAuthPassword('')
    }
  }

  const isValid = name.trim() && url.trim()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit API Connector' : 'API Connector'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="tool-name">Name *</Label>
            <Input
              id="tool-name"
              placeholder="Weather API"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSaving}
            />
            <p className="text-xs text-neutral-500">What should we call this tool?</p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="tool-description">Description</Label>
            <Textarea
              id="tool-description"
              placeholder="Gets current weather for a city"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSaving}
              rows={2}
            />
            <p className="text-xs text-neutral-500">Helps the AI understand when to use this tool</p>
          </div>

          {/* Method and URL */}
          <div className="grid grid-cols-[120px_1fr] gap-3">
            <div className="space-y-2">
              <Label>Method *</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as HttpMethod)} disabled={isSaving}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="PATCH">PATCH</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tool-url">URL *</Label>
              <Input
                id="tool-url"
                placeholder="https://api.example.com/endpoint"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isSaving}
              />
            </div>
          </div>

          {/* Advanced Options */}
          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100">
              <ChevronDown className={`h-4 w-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
              Advanced Options
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 space-y-4 border rounded-lg p-4 bg-neutral-50 dark:bg-neutral-900">
              {/* Headers */}
              <div className="space-y-2">
                <Label>Headers</Label>
                <div className="space-y-2">
                  {headers.map((header, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder="Header name"
                        value={header.key}
                        onChange={(e) => handleHeaderChange(index, 'key', e.target.value)}
                        disabled={isSaving}
                        className="flex-1"
                      />
                      <Input
                        placeholder="Value"
                        value={header.value}
                        onChange={(e) => handleHeaderChange(index, 'value', e.target.value)}
                        disabled={isSaving}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveHeader(index)}
                        disabled={isSaving}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddHeader}
                    disabled={isSaving}
                    className="mt-2"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Header
                  </Button>
                </div>
              </div>

              {/* Request Body */}
              <div className="space-y-2">
                <Label htmlFor="tool-body">Request Body</Label>
                <Textarea
                  id="tool-body"
                  placeholder='{"city": "{{city}}"}'
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  disabled={isSaving}
                  rows={3}
                  className="font-mono text-sm"
                />
              </div>

              {/* Authentication */}
              <div className="space-y-2">
                <Label>Authentication</Label>
                <Select value={authType} onValueChange={(v) => setAuthType(v as AuthType)} disabled={isSaving}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="bearer">Bearer Token</SelectItem>
                    <SelectItem value="api_key">API Key</SelectItem>
                    <SelectItem value="basic">Basic Auth</SelectItem>
                  </SelectContent>
                </Select>

                {authType === 'bearer' && (
                  <Input
                    type="password"
                    placeholder="Bearer token"
                    value={authToken}
                    onChange={(e) => setAuthToken(e.target.value)}
                    disabled={isSaving}
                    className="mt-2"
                  />
                )}

                {authType === 'api_key' && (
                  <Input
                    type="password"
                    placeholder="API key"
                    value={authApiKey}
                    onChange={(e) => setAuthApiKey(e.target.value)}
                    disabled={isSaving}
                    className="mt-2"
                  />
                )}

                {authType === 'basic' && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <Input
                      placeholder="Username"
                      value={authUsername}
                      onChange={(e) => setAuthUsername(e.target.value)}
                      disabled={isSaving}
                    />
                    <Input
                      type="password"
                      placeholder="Password"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      disabled={isSaving}
                    />
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              isEditing ? 'Save Changes' : 'Save Tool'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
