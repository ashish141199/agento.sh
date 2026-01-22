'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChevronDown, Loader2, CheckCircle2, XCircle, Link2 } from 'lucide-react'
import { toolService } from '@/services/tool.service'
import { useAuthStore } from '@/stores/auth.store'
import type { McpConnectorConfig, McpDiscoveredTool } from '@/services/tool.service'

type AuthType = 'none' | 'bearer'

interface McpConnectorConfigFormProps {
  serverUrl: string
  onServerUrlChange: (url: string) => void
  authentication?: McpConnectorConfig['authentication']
  onAuthenticationChange: (auth: McpConnectorConfig['authentication']) => void
  discoveredTools: McpDiscoveredTool[]
  onDiscoveredToolsChange: (tools: McpDiscoveredTool[]) => void
  selectedTools: string[]
  onSelectedToolsChange: (tools: string[]) => void
  isConnected: boolean
  onIsConnectedChange: (connected: boolean) => void
  disabled?: boolean
}

/**
 * Form for configuring MCP Connector
 * Handles server connection, tool discovery, and selection
 */
export function McpConnectorConfigForm({
  serverUrl,
  onServerUrlChange,
  authentication,
  onAuthenticationChange,
  discoveredTools,
  onDiscoveredToolsChange,
  selectedTools,
  onSelectedToolsChange,
  isConnected,
  onIsConnectedChange,
  disabled = false,
}: McpConnectorConfigFormProps) {
  const [authOpen, setAuthOpen] = useState(!!authentication?.token)
  const [authType, setAuthType] = useState<AuthType>(authentication?.type || 'none')
  const [authToken, setAuthToken] = useState(authentication?.token || '')
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  // Handle auth type change
  const handleAuthTypeChange = (type: AuthType) => {
    setAuthType(type)
    if (type === 'none') {
      onAuthenticationChange(undefined)
    } else {
      onAuthenticationChange({ type, token: authToken })
    }
  }

  // Handle auth token change
  const handleAuthTokenChange = (token: string) => {
    setAuthToken(token)
    if (authType !== 'none') {
      onAuthenticationChange({ type: authType, token })
    }
  }

  // Connect to MCP server
  const handleConnect = async () => {
    if (!serverUrl.trim()) return

    setIsConnecting(true)
    setConnectionError(null)

    try {
      const token = useAuthStore.getState().accessToken
      if (!token) throw new Error('Not authenticated')

      const response = await toolService.discoverMcpTools(
        serverUrl.trim(),
        authType !== 'none' ? { type: authType, token: authToken } : undefined,
        token
      )

      if (response.data?.tools) {
        onDiscoveredToolsChange(response.data.tools)
        onIsConnectedChange(true)
        onSelectedToolsChange([]) // Reset selection
      }
    } catch (error) {
      setConnectionError(
        error instanceof Error ? error.message : 'Failed to connect to server'
      )
      onIsConnectedChange(false)
      onDiscoveredToolsChange([])
    } finally {
      setIsConnecting(false)
    }
  }

  // Disconnect
  const handleDisconnect = () => {
    onIsConnectedChange(false)
    onDiscoveredToolsChange([])
    onSelectedToolsChange([])
    setConnectionError(null)
  }

  // Toggle tool selection
  const handleToggleTool = (toolName: string) => {
    if (selectedTools.includes(toolName)) {
      onSelectedToolsChange(selectedTools.filter(t => t !== toolName))
    } else {
      onSelectedToolsChange([...selectedTools, toolName])
    }
  }

  // Select all tools
  const handleSelectAll = () => {
    if (selectedTools.length === discoveredTools.length) {
      onSelectedToolsChange([])
    } else {
      onSelectedToolsChange(discoveredTools.map(t => t.name))
    }
  }

  const allSelected = discoveredTools.length > 0 && selectedTools.length === discoveredTools.length

  return (
    <div className="space-y-4">
      {/* Server URL */}
      <div className="space-y-2">
        <Label>Server URL *</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              placeholder="https://mcp.example.com/server"
              value={serverUrl}
              onChange={(e) => {
                onServerUrlChange(e.target.value)
                // Reset connection state when URL changes
                if (isConnected) {
                  handleDisconnect()
                }
              }}
              disabled={disabled || isConnected}
              className="pr-8"
            />
            {isConnected && (
              <CheckCircle2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
            )}
          </div>
          {!isConnected ? (
            <Button
              type="button"
              onClick={handleConnect}
              disabled={disabled || isConnecting || !serverUrl.trim()}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4 mr-2" />
                  Connect
                </>
              )}
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={handleDisconnect}
              disabled={disabled}
            >
              Disconnect
            </Button>
          )}
        </div>
        {isConnected && (
          <p className="text-xs text-green-600 dark:text-green-400">
            Connected · {discoveredTools.length} tool{discoveredTools.length !== 1 ? 's' : ''} found
          </p>
        )}
        {connectionError && (
          <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
            <XCircle className="h-3.5 w-3.5" />
            {connectionError}
          </div>
        )}
      </div>

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
            disabled={disabled || isConnected}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="bearer">Bearer Token</SelectItem>
            </SelectContent>
          </Select>

          {authType === 'bearer' && (
            <Input
              type="password"
              placeholder="Bearer token"
              value={authToken}
              onChange={(e) => handleAuthTokenChange(e.target.value)}
              disabled={disabled || isConnected}
            />
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Discovered Tools */}
      {isConnected && discoveredTools.length > 0 && (
        <>
          <div className="border-t pt-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <Label>Select Tools to Import</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                disabled={disabled}
                className="text-xs h-7"
              >
                {allSelected ? 'Deselect All' : 'Select All'}
              </Button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {discoveredTools.map((tool) => (
                <label
                  key={tool.name}
                  className={`
                    flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                    ${selectedTools.includes(tool.name)
                      ? 'border-primary bg-primary/5'
                      : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
                    }
                  `}
                >
                  <Checkbox
                    checked={selectedTools.includes(tool.name)}
                    onCheckedChange={() => handleToggleTool(tool.name)}
                    disabled={disabled}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{tool.name}</div>
                    <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">
                      {tool.description}
                    </p>
                    {tool.inputSchema?.inputs && tool.inputSchema.inputs.length > 0 && (
                      <div className="mt-1.5 text-xs text-neutral-400">
                        {tool.inputSchema.inputs.map(i => i.name).join(' · ')}
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Empty state when connected but no tools */}
      {isConnected && discoveredTools.length === 0 && (
        <div className="text-center py-8 text-neutral-500">
          <p>No tools found on this server.</p>
        </div>
      )}
    </div>
  )
}
