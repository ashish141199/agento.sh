'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { AgentGeneralForm } from './agent-general-form'
import { AgentInstructionsForm } from './agent-instructions-form'
import { AgentToolsForm } from './agent-tools-form'
import { AgentChat } from './agent-chat'
import { agentService, type Agent, type InstructionsConfig } from '@/services/agent.service'
import { useAuthStore } from '@/stores/auth.store'
import { useModels } from '@/hooks/use-models'
import { ChevronLeft, ChevronRight, Loader2, Settings } from 'lucide-react'

type TabValue = 'identity' | 'instructions' | 'tools'
type SettingsTabValue = 'model' | 'memory' | 'chat'

const TABS: TabValue[] = ['identity', 'instructions', 'tools']

const CONVERSATION_HISTORY_OPTIONS = [
  { value: '5', label: 'Last 5 messages' },
  { value: '10', label: 'Last 10 messages' },
  { value: '20', label: 'Last 20 messages' },
  { value: '50', label: 'Last 50 messages' },
  { value: 'custom', label: 'Custom' },
]

export interface PublishState {
  agentId: string | null
  agentName: string
  hasUnsavedChanges: boolean
  isFormComplete: boolean
  onSave: () => Promise<void>
  isSaving: boolean
}

interface AgentEditorProps {
  agent?: Agent | null
  isLoading?: boolean
  onPublishStateChange?: (state: PublishState) => void
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
export function AgentEditor({ agent, isLoading, onPublishStateChange }: AgentEditorProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: models = [], isLoading: isLoadingModels } = useModels()

  const [activeTab, setActiveTab] = useState<TabValue>('identity')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [modelId, setModelId] = useState<string | null>(null)
  const [instructionsConfig, setInstructionsConfig] = useState<InstructionsConfig>(DEFAULT_INSTRUCTIONS)
  const [hasCreated, setHasCreated] = useState(false)
  const [agentId, setAgentId] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [settingsTab, setSettingsTab] = useState<SettingsTabValue>('model')

  // Settings state
  const [conversationHistoryLimit, setConversationHistoryLimit] = useState<string>('10')
  const [customHistoryLimit, setCustomHistoryLimit] = useState<string>('')
  const [welcomeMessage, setWelcomeMessage] = useState('')
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([])
  const [newPrompt, setNewPrompt] = useState('')

  const [savedState, setSavedState] = useState<{
    name: string
    description: string
    modelId: string | null
    instructionsConfig: InstructionsConfig
  } | null>(null)

  // Initialize form with agent data when editing
  useEffect(() => {
    if (agent) {
      setName(agent.name)
      setDescription(agent.description || '')
      setModelId(agent.modelId)
      setInstructionsConfig(agent.instructionsConfig || DEFAULT_INSTRUCTIONS)
      setAgentId(agent.id)
      setHasCreated(true)
      setSavedState({
        name: agent.name,
        description: agent.description || '',
        modelId: agent.modelId,
        instructionsConfig: agent.instructionsConfig || DEFAULT_INSTRUCTIONS,
      })
    }
  }, [agent])

  // Check if there are unsaved changes
  const hasUnsavedChanges = hasCreated && savedState && (
    name !== savedState.name ||
    description !== savedState.description ||
    modelId !== savedState.modelId ||
    JSON.stringify(instructionsConfig) !== JSON.stringify(savedState.instructionsConfig)
  )

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
        setSavedState({
          name,
          description,
          modelId,
          instructionsConfig,
        })
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
      queryClient.invalidateQueries({ queryKey: ['publish-status', agentId] })
      // Update saved state after successful save
      setSavedState({
        name,
        description,
        modelId,
        instructionsConfig,
      })
    },
  })

  const isSaving = createMutation.isPending || updateMutation.isPending

  // Handle save for publish button
  const handleSave = async () => {
    if (hasCreated && agentId) {
      await updateMutation.mutateAsync()
    }
  }

  // Notify parent of publish state changes
  useEffect(() => {
    onPublishStateChange?.({
      agentId,
      agentName: name,
      hasUnsavedChanges: !!hasUnsavedChanges,
      isFormComplete: !!name.trim(),
      onSave: handleSave,
      isSaving,
    })
  }, [agentId, name, hasUnsavedChanges, isSaving, onPublishStateChange])

  const currentTabIndex = TABS.indexOf(activeTab)
  const isFirstTab = currentTabIndex === 0
  const isLastTab = currentTabIndex === TABS.length - 1

  const handlePrevious = () => {
    if (!isFirstTab) {
      setActiveTab(TABS[currentTabIndex - 1])
    }
  }

  const handleNext = async () => {
    // On the Identity tab, clicking Next creates the agent if not created yet
    if (activeTab === 'identity' && !hasCreated) {
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

  const isNextDisabled = activeTab === 'identity' && !name.trim()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400 dark:text-neutral-500" />
      </div>
    )
  }

  return (
    <div className="flex h-full gap-6">
      {/* Left side - Configuration (50%) */}
      <div className="w-1/2 flex flex-col">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="flex-1 flex flex-col">
          <div className="flex items-center justify-between">
            <TabsList className="w-fit">
              <TabsTrigger value="identity">Identity</TabsTrigger>
              <TabsTrigger value="instructions" disabled={!hasCreated}>Instructions</TabsTrigger>
              <TabsTrigger value="tools" disabled={!hasCreated}>Tools</TabsTrigger>
            </TabsList>

            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Agent Settings</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="settings-model">AI Model</Label>
                    <Select
                      value={modelId || ''}
                      onValueChange={(value) => setModelId(value || null)}
                      disabled={isSaving || isLoadingModels}
                    >
                      <SelectTrigger id="settings-model">
                        <SelectValue placeholder={isLoadingModels ? 'Loading models...' : 'Select a model'} />
                      </SelectTrigger>
                      <SelectContent>
                        {models.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Choose the AI model that powers your agent
                    </p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex-1 mt-6 overflow-auto">
            <TabsContent value="identity" className="mt-0 h-full">
              <AgentGeneralForm
                name={name}
                description={description}
                onNameChange={setName}
                onDescriptionChange={setDescription}
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
              <AgentToolsForm agentId={agentId} disabled={isSaving} />
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
      <div className="w-1/2 h-full min-h-0">
        <AgentChat agentId={agentId} name={name} description={description} />
      </div>
    </div>
  )
}
