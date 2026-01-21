'use client'

import { use, useState, useCallback, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Sparkles, MoreVertical, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AgentEditor, type PublishState } from '@/components/agents/agent-editor'
import { PublishButton } from '@/components/agents/publish-button'
import { BuilderSidebar } from '@/components/agents/builder-sidebar'
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog'
import { useAgent } from '@/hooks/use-agent'
import { useAuthStore } from '@/stores/auth.store'
import { agentService } from '@/services/agent.service'
import { notification } from '@/lib/notifications'
import { useQueryClient } from '@tanstack/react-query'
import type { Agent } from '@/services/agent.service'

interface EditAgentPageProps {
  params: Promise<{ id: string }>
}

/**
 * Inner component that uses search params
 */
function EditAgentPageInner({ id }: { id: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const { accessToken } = useAuthStore()
  const { data: agent, isLoading, refetch } = useAgent(id)

  const [publishState, setPublishState] = useState<PublishState | null>(null)
  const [isBuilderOpen, setIsBuilderOpen] = useState(false)
  const [initialPrompt, setInitialPrompt] = useState<string | undefined>(undefined)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Check URL params on mount
  useEffect(() => {
    const builderParam = searchParams.get('builder')
    const promptParam = searchParams.get('prompt')

    if (builderParam === 'true') {
      setIsBuilderOpen(true)
      if (promptParam) {
        setInitialPrompt(decodeURIComponent(promptParam))
      }
    }
  }, [searchParams])

  const handlePublishStateChange = useCallback((state: PublishState) => {
    setPublishState(state)
  }, [])

  const handleAgentUpdate = useCallback((updatedAgent: Agent) => {
    // Refetch agent data to update the form
    refetch()
    queryClient.invalidateQueries({ queryKey: ['agent', id] })
    queryClient.invalidateQueries({ queryKey: ['agents'] })
  }, [refetch, queryClient, id])

  const toggleBuilder = () => {
    setIsBuilderOpen(!isBuilderOpen)
  }

  const handleDeleteAgent = async () => {
    if (!accessToken) return

    setIsDeleting(true)
    try {
      await agentService.delete(id, accessToken)
      queryClient.invalidateQueries({ queryKey: ['agents'] })
      notification.success('Agent deleted successfully')
      router.push('/dashboard')
    } catch (error) {
      notification.error('Failed to delete agent')
      setIsDeleting(false)
    }
  }

  return (
    <div className="h-full flex flex-col xl:flex-row gap-4">
      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 xl:min-w-[600px]">
        <div className="mb-4 md:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 md:gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon" className="shrink-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                {isLoading ? 'Loading...' : agent?.name || 'Edit Agent'}
              </h1>
              <p className="text-sm md:text-base text-neutral-600 dark:text-neutral-400 mt-0.5 md:mt-1">Configure your AI agent</p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              variant={isBuilderOpen ? 'default' : 'outline'}
              onClick={toggleBuilder}
            >
              <Sparkles className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">AI Builder</span>
            </Button>
            {publishState && (
              <PublishButton
                agentId={publishState.agentId}
                agentName={publishState.agentName}
                hasUnsavedChanges={publishState.hasUnsavedChanges}
                isFormComplete={publishState.isFormComplete}
                onSave={publishState.onSave}
                isSaving={publishState.isSaving}
              />
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Agent
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex-1 min-h-0">
          <AgentEditor
            agent={agent}
            isLoading={isLoading}
            onPublishStateChange={handlePublishStateChange}
          />
        </div>
      </div>

      {/* Builder sidebar */}
      <BuilderSidebar
        isOpen={isBuilderOpen}
        onClose={() => setIsBuilderOpen(false)}
        onAgentUpdate={handleAgentUpdate}
        agentId={id}
        initialMessage={initialPrompt}
      />

      {/* Delete confirmation dialog */}
      <DeleteConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteAgent}
        title="Delete Agent"
        description="This will permanently delete this agent and all its data. This action cannot be undone."
        confirmText="delete"
        isDeleting={isDeleting}
      />
    </div>
  )
}

/**
 * Edit agent page
 */
export default function EditAgentPage({ params }: EditAgentPageProps) {
  const { id } = use(params)

  return (
    <Suspense fallback={<div className="h-full flex items-center justify-center">Loading...</div>}>
      <EditAgentPageInner id={id} />
    </Suspense>
  )
}
