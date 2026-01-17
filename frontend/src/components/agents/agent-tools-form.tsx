'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { ToolTypeSelector } from './tool-type-selector'
import { ApiConnectorForm } from './api-connector-form'
import { ToolCard } from './tool-card'
import { toolService, type Tool, type ToolWithAssignment, type ApiConnectorConfig } from '@/services/tool.service'
import { useAuthStore } from '@/stores/auth.store'
import { Wrench, Plus, Loader2 } from 'lucide-react'

interface AgentToolsFormProps {
  agentId: string | null
  disabled?: boolean
}

/**
 * Tools tab form for agent configuration
 * Shows list of tools assigned to the agent with add/edit/remove functionality
 */
export function AgentToolsForm({ agentId, disabled = false }: AgentToolsFormProps) {
  const queryClient = useQueryClient()
  const [showTypeSelector, setShowTypeSelector] = useState(false)
  const [showApiForm, setShowApiForm] = useState(false)
  const [editingTool, setEditingTool] = useState<Tool | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Fetch tools assigned to this agent
  const { data: agentTools = [], isLoading } = useQuery({
    queryKey: ['agent-tools', agentId],
    queryFn: async () => {
      if (!agentId) return []
      const token = useAuthStore.getState().accessToken
      if (!token) return []
      const response = await toolService.getAgentTools(agentId, token)
      return response.data?.tools || []
    },
    enabled: !!agentId,
  })

  // Create tool mutation
  const createToolMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; config: ApiConnectorConfig }) => {
      const token = useAuthStore.getState().accessToken
      if (!token || !agentId) throw new Error('No access token or agent ID')

      // First create the tool
      const toolResponse = await toolService.create({
        type: 'api_connector',
        ...data,
      }, token)

      const tool = toolResponse.data?.tool
      if (!tool) throw new Error('Failed to create tool')

      // Then assign it to the agent
      await toolService.assignToAgent(agentId, { toolId: tool.id }, token)

      return tool
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-tools', agentId] })
      setShowApiForm(false)
    },
  })

  // Update tool mutation
  const updateToolMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name?: string; description?: string; config?: ApiConnectorConfig } }) => {
      const token = useAuthStore.getState().accessToken
      if (!token) throw new Error('No access token')

      const response = await toolService.update(id, data, token)
      return response.data?.tool
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-tools', agentId] })
      setShowApiForm(false)
      setEditingTool(null)
    },
  })

  // Remove tool from agent mutation
  const removeToolMutation = useMutation({
    mutationFn: async (toolId: string) => {
      const token = useAuthStore.getState().accessToken
      if (!token || !agentId) throw new Error('No access token or agent ID')

      await toolService.removeFromAgent(agentId, toolId, token)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-tools', agentId] })
    },
  })

  const handleTypeSelect = (type: 'api_connector') => {
    if (type === 'api_connector') {
      setShowApiForm(true)
    }
  }

  const handleSaveTool = async (data: { name: string; description?: string; config: ApiConnectorConfig }) => {
    setIsSaving(true)
    try {
      if (editingTool) {
        await updateToolMutation.mutateAsync({ id: editingTool.id, data })
      } else {
        await createToolMutation.mutateAsync(data)
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleEditTool = (tool: ToolWithAssignment) => {
    setEditingTool(tool)
    setShowApiForm(true)
  }

  const handleRemoveTool = (toolId: string) => {
    removeToolMutation.mutate(toolId)
  }

  const handleCloseApiForm = (open: boolean) => {
    if (!open) {
      setShowApiForm(false)
      setEditingTool(null)
    }
  }

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    )
  }

  return (
    <div className="p-1">
      {agentTools.length === 0 ? (
        // Empty state
        <div className="h-64 flex flex-col items-center justify-center text-neutral-400 dark:text-neutral-500 border rounded-lg border-dashed">
          <Wrench className="h-10 w-10 mb-4" />
          <h3 className="text-lg font-medium text-neutral-600 dark:text-neutral-400">Tools</h3>
          <p className="text-sm mt-1 text-center max-w-xs mb-4">
            Tools let your agent connect to external services and perform actions
          </p>
          <Button onClick={() => setShowTypeSelector(true)} disabled={disabled || !agentId}>
            <Plus className="h-4 w-4 mr-2" />
            Add Tool
          </Button>
        </div>
      ) : (
        // Tools list
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">Tools</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTypeSelector(true)}
              disabled={disabled || !agentId}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Tool
            </Button>
          </div>
          <div className="space-y-2">
            {agentTools.map((tool) => (
              <ToolCard
                key={tool.id}
                tool={tool}
                onEdit={() => handleEditTool(tool)}
                onRemove={() => handleRemoveTool(tool.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Tool Type Selector Dialog */}
      <ToolTypeSelector
        open={showTypeSelector}
        onOpenChange={setShowTypeSelector}
        onSelect={handleTypeSelect}
      />

      {/* API Connector Form Dialog */}
      <ApiConnectorForm
        open={showApiForm}
        onOpenChange={handleCloseApiForm}
        onSave={handleSaveTool}
        tool={editingTool || undefined}
        isSaving={isSaving}
      />
    </div>
  )
}
