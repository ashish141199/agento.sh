'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
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
import { ChevronDown, Plus, Trash2, Eye, EyeOff } from 'lucide-react'
import type { ApiConnectorConfig, ApiConnectorAuth } from '@/services/tool.service'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
type AuthType = 'none' | 'bearer' | 'api_key' | 'basic'

interface KeyValue {
  key: string
  value: string
}

interface ApiConnectorConfigFormProps {
  value: ApiConnectorConfig
  onChange: (config: ApiConnectorConfig) => void
  disabled?: boolean
  availableInputs?: string[]
}

/**
 * Form for configuring an API Connector
 * Supports {{input}} interpolation in URL, headers, query params, and body
 */
export function ApiConnectorConfigForm({
  value,
  onChange,
  disabled = false,
  availableInputs = [],
}: ApiConnectorConfigFormProps) {
  const [headersOpen, setHeadersOpen] = useState(false)
  const [queryParamsOpen, setQueryParamsOpen] = useState(
    (value.queryParams?.length ?? 0) > 0
  )
  const [authOpen, setAuthOpen] = useState(!!value.authentication)
  const [bodyOpen, setBodyOpen] = useState(!!value.body)

  // Local state for key-value pairs
  const [headers, setHeaders] = useState<KeyValue[]>(value.headers || [])
  const [queryParams, setQueryParams] = useState<KeyValue[]>(value.queryParams || [])

  // Auth state
  const [authType, setAuthType] = useState<AuthType>(
    value.authentication?.type || 'none'
  )
  const [authToken, setAuthToken] = useState(value.authentication?.token || '')
  const [authApiKey, setAuthApiKey] = useState(value.authentication?.apiKey || '')
  const [authUsername, setAuthUsername] = useState(value.authentication?.username || '')
  const [authPassword, setAuthPassword] = useState(value.authentication?.password || '')

  // Password visibility state
  const [showToken, setShowToken] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Update parent when values change
  const updateConfig = (updates: Partial<ApiConnectorConfig>) => {
    const newConfig = { ...value, ...updates }
    onChange(newConfig)
  }

  // Headers management
  const handleAddHeader = () => {
    const newHeaders = [...headers, { key: '', value: '' }]
    setHeaders(newHeaders)
    updateConfig({ headers: newHeaders.filter((h) => h.key.trim()) })
  }

  const handleRemoveHeader = (index: number) => {
    const newHeaders = headers.filter((_, i) => i !== index)
    setHeaders(newHeaders)
    updateConfig({ headers: newHeaders.filter((h) => h.key.trim()) })
  }

  const handleHeaderChange = (index: number, field: 'key' | 'value', val: string) => {
    const newHeaders = [...headers]
    newHeaders[index] = { ...newHeaders[index], [field]: val }
    setHeaders(newHeaders)
    updateConfig({ headers: newHeaders.filter((h) => h.key.trim()) })
  }

  // Query params management
  const handleAddQueryParam = () => {
    const newParams = [...queryParams, { key: '', value: '' }]
    setQueryParams(newParams)
    updateConfig({ queryParams: newParams.filter((p) => p.key.trim()) })
  }

  const handleRemoveQueryParam = (index: number) => {
    const newParams = queryParams.filter((_, i) => i !== index)
    setQueryParams(newParams)
    updateConfig({ queryParams: newParams.filter((p) => p.key.trim()) })
  }

  const handleQueryParamChange = (index: number, field: 'key' | 'value', val: string) => {
    const newParams = [...queryParams]
    newParams[index] = { ...newParams[index], [field]: val }
    setQueryParams(newParams)
    updateConfig({ queryParams: newParams.filter((p) => p.key.trim()) })
  }

  // Auth management
  const handleAuthTypeChange = (type: AuthType) => {
    setAuthType(type)
    if (type === 'none') {
      updateConfig({ authentication: undefined })
    } else {
      const auth: ApiConnectorAuth = { type }
      if (type === 'bearer') auth.token = authToken
      if (type === 'api_key') auth.apiKey = authApiKey
      if (type === 'basic') {
        auth.username = authUsername
        auth.password = authPassword
      }
      updateConfig({ authentication: auth })
    }
  }

  const handleAuthValueChange = (field: string, val: string) => {
    if (field === 'token') setAuthToken(val)
    if (field === 'apiKey') setAuthApiKey(val)
    if (field === 'username') setAuthUsername(val)
    if (field === 'password') setAuthPassword(val)

    const auth: ApiConnectorAuth = { type: authType }
    if (authType === 'bearer') auth.token = field === 'token' ? val : authToken
    if (authType === 'api_key') auth.apiKey = field === 'apiKey' ? val : authApiKey
    if (authType === 'basic') {
      auth.username = field === 'username' ? val : authUsername
      auth.password = field === 'password' ? val : authPassword
    }
    updateConfig({ authentication: auth })
  }

  const showBody = ['POST', 'PUT', 'PATCH'].includes(value.method)

  return (
    <div className="space-y-4">
      {/* Method and URL */}
      <div className="space-y-2">
        <Label>Method & URL</Label>
        <div className="flex gap-2">
          <Select
            value={value.method}
            onValueChange={(v) => updateConfig({ method: v as HttpMethod })}
            disabled={disabled}
          >
            <SelectTrigger className="w-[100px]">
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
          <Input
            placeholder="https://api.example.com/{{city}}/weather"
            value={value.url}
            onChange={(e) => updateConfig({ url: e.target.value })}
            disabled={disabled}
            className="flex-1 font-mono text-sm"
          />
        </div>
      </div>

      {/* Query Parameters */}
      <Collapsible open={queryParamsOpen} onOpenChange={setQueryParamsOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100">
          <ChevronDown
            className={`h-4 w-4 transition-transform ${queryParamsOpen ? 'rotate-180' : ''}`}
          />
          Query Parameters
          {queryParams.length > 0 && (
            <span className="text-xs text-neutral-400">({queryParams.length})</span>
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-2">
          {queryParams.map((param, index) => (
            <div key={index} className="flex gap-2">
              <Input
                placeholder="Key"
                value={param.key}
                onChange={(e) => handleQueryParamChange(index, 'key', e.target.value)}
                disabled={disabled}
                className="flex-1"
              />
              <Input
                placeholder="Value (e.g. {{days}})"
                value={param.value}
                onChange={(e) => handleQueryParamChange(index, 'value', e.target.value)}
                disabled={disabled}
                className="flex-1 font-mono text-sm"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveQueryParam(index)}
                disabled={disabled}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddQueryParam}
            disabled={disabled}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Parameter
          </Button>
        </CollapsibleContent>
      </Collapsible>

      {/* Headers */}
      <Collapsible open={headersOpen} onOpenChange={setHeadersOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100">
          <ChevronDown
            className={`h-4 w-4 transition-transform ${headersOpen ? 'rotate-180' : ''}`}
          />
          Headers
          {headers.length > 0 && (
            <span className="text-xs text-neutral-400">({headers.length})</span>
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-2">
          {headers.map((header, index) => (
            <div key={index} className="flex gap-2">
              <Input
                placeholder="Header name"
                value={header.key}
                onChange={(e) => handleHeaderChange(index, 'key', e.target.value)}
                disabled={disabled}
                className="flex-1"
              />
              <Input
                placeholder="Value"
                value={header.value}
                onChange={(e) => handleHeaderChange(index, 'value', e.target.value)}
                disabled={disabled}
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveHeader(index)}
                disabled={disabled}
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
            disabled={disabled}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Header
          </Button>
        </CollapsibleContent>
      </Collapsible>

      {/* Authentication */}
      <Collapsible open={authOpen} onOpenChange={setAuthOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100">
          <ChevronDown
            className={`h-4 w-4 transition-transform ${authOpen ? 'rotate-180' : ''}`}
          />
          Authentication
          {authType !== 'none' && (
            <span className="text-xs text-neutral-400">({authType})</span>
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-2">
          <Select
            value={authType}
            onValueChange={(v) => handleAuthTypeChange(v as AuthType)}
            disabled={disabled}
          >
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
            <div className="relative">
              <Input
                type={showToken ? 'text' : 'password'}
                placeholder="Bearer token"
                value={authToken}
                onChange={(e) => handleAuthValueChange('token', e.target.value)}
                disabled={disabled}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                disabled={disabled}
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          )}

          {authType === 'api_key' && (
            <div className="relative">
              <Input
                type={showApiKey ? 'text' : 'password'}
                placeholder="API key"
                value={authApiKey}
                onChange={(e) => handleAuthValueChange('apiKey', e.target.value)}
                disabled={disabled}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                disabled={disabled}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          )}

          {authType === 'basic' && (
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Username"
                value={authUsername}
                onChange={(e) => handleAuthValueChange('username', e.target.value)}
                disabled={disabled}
              />
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={authPassword}
                  onChange={(e) => handleAuthValueChange('password', e.target.value)}
                  disabled={disabled}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                  disabled={disabled}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Request Body (only for POST/PUT/PATCH) */}
      {showBody && (
        <Collapsible open={bodyOpen} onOpenChange={setBodyOpen}>
          <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100">
            <ChevronDown
              className={`h-4 w-4 transition-transform ${bodyOpen ? 'rotate-180' : ''}`}
            />
            Request Body
            {value.body && <span className="text-xs text-neutral-400">(configured)</span>}
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <Textarea
              placeholder={`{
  "city": "{{city}}",
  "days": {{days}}
}`}
              value={value.body || ''}
              onChange={(e) => updateConfig({ body: e.target.value || undefined })}
              disabled={disabled}
              rows={5}
              className="font-mono text-sm"
            />
            <p className="mt-1 text-xs text-neutral-500">
              JSON body to send with the request. Use {`{{inputName}}`} for interpolation.
            </p>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  )
}
