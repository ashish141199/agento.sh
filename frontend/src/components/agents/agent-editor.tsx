'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AgentGeneralForm } from './agent-general-form'
import { AgentInstructionsForm } from './agent-instructions-form'
import { AgentToolsPlaceholder } from './agent-tools-placeholder'
import { AgentChat } from './agent-chat'
import { agentService, type Agent, type InstructionsConfig } from '@/services/agent.service'
import { useAuthStore } from '@/stores/auth.store'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'

type TabValue = 'general' | 'instructions' | 'tools'

const TABS: TabValue[] = ['general', 'instructions', 'tools']

interface AgentEditorProps {
  agent?: Agent | null
  isLoading?: boolean
}

const DEFAULT_INSTRUCTIONS: InstructionsConfig = {
  whatDoesAgentDo: '',
  howShouldItSpeak: '',
  whatShouldItNeverDo: '',
  anythingElse: '',
}

/**
 * Agent editor component with tabs for General, Instructions, and Tools
 * Handles both creation and editing of agents
 */
export function AgentEditor({ agent, isLoading }: AgentEditorProps) {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<TabValue>('general')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [modelId, setModelId] = useState<string | null>(null)
  const [instructionsConfig, setInstructionsConfig] = useState<InstructionsConfig>(DEFAULT_INSTRUCTIONS)
  const [hasCreated, setHasCreated] = useState(false)
  const [agentId, setAgentId] = useState<string | null>(null)

  // Initialize form with agent data when editing
  useEffect(() => {
    if (agent) {
      setName(agent.name)
      setDescription(agent.description || '')
      setModelId(agent.modelId)
      setInstructionsConfig(agent.instructionsConfig || DEFAULT_INSTRUCTIONS)
      setAgentId(agent.id)
      setHasCreated(true)
    }
  }, [agent])

  // Create agent mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const token = useAuthStore.getState().accessToken
      if (!token) throw new Error('No access token')
      return agentService.create({ name, description: description || undefined, modelId: modelId || undefined }, token)
    },
    onSuccess: (response) => {
      const createdAgent = response.data?.agent
      if (createdAgent) {
        setAgentId(createdAgent.id)
        setHasCreated(true)
        queryClient.invalidateQueries({ queryKey: ['agents'] })
        // Update URL to the agent's ID
        router.replace(`/agents/${createdAgent.id}`)
      }
    },
  })

  // Update agent mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      const token = useAuthStore.getState().accessToken
      if (!token || !agentId) throw new Error('No access token or agent ID')
      return agentService.update(agentId, {
        name,
        description: description || undefined,
        modelId,
        instructionsConfig,
      }, token)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] })
      queryClient.invalidateQueries({ queryKey: ['agent', agentId] })
    },
  })

  const currentTabIndex = TABS.indexOf(activeTab)
  const isFirstTab = currentTabIndex === 0
  const isLastTab = currentTabIndex === TABS.length - 1

  const handlePrevious = () => {
    if (!isFirstTab) {
      setActiveTab(TABS[currentTabIndex - 1])
    }
  }

  const handleNext = async () => {
    // On the General tab, clicking Next creates the agent if not created yet
    if (activeTab === 'general' && !hasCreated) {
      if (!name.trim()) return
      await createMutation.mutateAsync()
    }

    // Save current changes when moving between tabs
    if (hasCreated && agentId) {
      await updateMutation.mutateAsync()
    }

    if (!isLastTab) {
      setActiveTab(TABS[currentTabIndex + 1])
    }
  }

  const isNextDisabled = activeTab === 'general' && !name.trim()
  const isSaving = createMutation.isPending || updateMutation.isPending

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    )
  }

  return (
    <div className="flex h-full gap-6">
      {/* Left side - Configuration (50%) */}
      <div className="w-1/2 flex flex-col">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="flex-1 flex flex-col">
          <TabsList className="w-fit">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="instructions" disabled={!hasCreated}>Instructions</TabsTrigger>
            <TabsTrigger value="tools" disabled={!hasCreated}>Tools</TabsTrigger>
          </TabsList>

          <div className="flex-1 mt-6 overflow-auto">
            <TabsContent value="general" className="mt-0 h-full">
              <AgentGeneralForm
                name={name}
                description={description}
                modelId={modelId}
                onNameChange={setName}
                onDescriptionChange={setDescription}
                onModelIdChange={setModelId}
                disabled={isSaving}
              />
            </TabsContent>

            <TabsContent value="instructions" className="mt-0 h-full">
              <AgentInstructionsForm
                instructionsConfig={instructionsConfig}
                onInstructionsChange={setInstructionsConfig}
                disabled={isSaving}
              />
            </TabsContent>

            <TabsContent value="tools" className="mt-0 h-full">
              <AgentToolsPlaceholder />
            </TabsContent>
          </div>

          {/* Navigation buttons */}
          <div className="flex justify-between pt-6 border-t mt-6">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={isFirstTab || isSaving}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            <Button
              onClick={handleNext}
              disabled={isNextDisabled || isSaving || isLastTab}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </Tabs>
      </div>

      {/* Right side - Chat (50%) */}
      <div className="w-1/2">
        <AgentChat agentId={agentId} name={name} description={description} />
      </div>
    </div>
  )
}
