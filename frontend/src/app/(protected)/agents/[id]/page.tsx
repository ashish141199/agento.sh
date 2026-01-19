'use client'

import { use, useState, useCallback, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AgentEditor, type PublishState } from '@/components/agents/agent-editor'
import { PublishButton } from '@/components/agents/publish-button'
import { BuilderSidebar } from '@/components/agents/builder-sidebar'
import { useAgent } from '@/hooks/use-agent'
import { useQueryClient } from '@tanstack/react-query'
import type { Agent } from '@/services/agent.service'

interface EditAgentPageProps {
  params: Promise<{ id: string }>
}

/**
 * Inner component that uses search params
 */
function EditAgentPageInner({ id }: { id: string }) {
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const { data: agent, isLoading, refetch } = useAgent(id)

  const [publishState, setPublishState] = useState<PublishState | null>(null)
  const [isBuilderOpen, setIsBuilderOpen] = useState(false)

  // Check URL params on mount
  useEffect(() => {
    const builderParam = searchParams.get('builder')
    if (builderParam === 'true') {
      setIsBuilderOpen(true)
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

  return (
    <div className="h-full flex flex-col xl:flex-row gap-4">
      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 xl:min-w-[600px]">
        <div className="mb-4 md:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 md:gap-4">
            <Link href="/">
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
