'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { agentService, type Agent, type InstructionsConfig, type AgentSettings } from '@/services/agent.service'
import { useAuthStore } from '@/stores/auth.store'
import { useModels } from '@/hooks/use-models'
import { ChevronLeft, ChevronRight, Loader2, Settings, X, ArrowLeft } from 'lucide-react'

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
    conversationHistoryLimit: string
    customHistoryLimit: string
    welcomeMessage: string
    suggestedPrompts: string[]
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

      // Load settings from agent.settings
      const limit = agent.settings?.memory?.conversationHistoryLimit || 10
      const isCustomLimit = ![5, 10, 20, 50].includes(limit)
      const historyLimit = isCustomLimit ? 'custom' : limit.toString()
      const customLimit = isCustomLimit ? limit.toString() : ''
      const welcome = agent.settings?.chat?.welcomeMessage || ''
      const prompts = agent.settings?.chat?.suggestedPrompts || []

      setConversationHistoryLimit(historyLimit)
      setCustomHistoryLimit(customLimit)
      setWelcomeMessage(welcome)
      setSuggestedPrompts(prompts)

      setSavedState({
        name: agent.name,
        description: agent.description || '',
        modelId: agent.modelId,
        instructionsConfig: agent.instructionsConfig || DEFAULT_INSTRUCTIONS,
        conversationHistoryLimit: historyLimit,
        customHistoryLimit: customLimit,
        welcomeMessage: welcome,
        suggestedPrompts: prompts,
      })
    }
  }, [agent])

  // Check if there are unsaved changes
  const hasUnsavedChanges = hasCreated && savedState && (
    name !== savedState.name ||
    description !== savedState.description ||
    modelId !== savedState.modelId ||
    JSON.stringify(instructionsConfig) !== JSON.stringify(savedState.instructionsConfig) ||
    conversationHistoryLimit !== savedState.conversationHistoryLimit ||
    customHistoryLimit !== savedState.customHistoryLimit ||
    welcomeMessage !== savedState.welcomeMessage ||
    JSON.stringify(suggestedPrompts) !== JSON.stringify(savedState.suggestedPrompts)
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
          conversationHistoryLimit,
          customHistoryLimit,
          welcomeMessage,
          suggestedPrompts,
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
        settings: buildSettings(),
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
        conversationHistoryLimit,
        customHistoryLimit,
        welcomeMessage,
        suggestedPrompts,
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

  // Settings helpers
  const handleAddPrompt = () => {
    if (newPrompt.trim()) {
      setSuggestedPrompts([...suggestedPrompts, newPrompt.trim()])
      setNewPrompt('')
    }
  }

  const handleRemovePrompt = (index: number) => {
    setSuggestedPrompts(suggestedPrompts.filter((_, i) => i !== index))
  }

  const toggleSettings = () => {
    setShowSettings(!showSettings)
  }

  // Build settings object for API
  const buildSettings = (): AgentSettings => {
    const limit = conversationHistoryLimit === 'custom'
      ? parseInt(customHistoryLimit) || 10
      : parseInt(conversationHistoryLimit)

    return {
      memory: {
        conversationHistoryLimit: limit,
      },
      chat: {
        welcomeMessage,
        suggestedPrompts,
      },
    }
  }

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
              <TabsTrigger value="identity" onClick={() => setShowSettings(false)}>Identity</TabsTrigger>
              <TabsTrigger value="instructions" disabled={!hasCreated} onClick={() => setShowSettings(false)}>Instructions</TabsTrigger>
              <TabsTrigger value="tools" disabled={!hasCreated} onClick={() => setShowSettings(false)}>Tools</TabsTrigger>
            </TabsList>

            <Button
              variant={showSettings ? 'default' : 'outline'}
              size="sm"
              onClick={toggleSettings}
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>

          <div className="flex-1 mt-6 overflow-auto">
            {showSettings ? (
              <div className="border border-dashed rounded-lg p-6 relative bg-background">
                <button
                  onClick={() => setShowSettings(false)}
                  className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>

                <Tabs value={settingsTab} onValueChange={(v) => setSettingsTab(v as SettingsTabValue)}>
                  <div className="flex items-center gap-3 mb-6">
                    <button
                      onClick={() => setShowSettings(false)}
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </button>
                    <TabsList className="w-fit">
                      <TabsTrigger value="model">Model</TabsTrigger>
                      <TabsTrigger value="memory">Memory</TabsTrigger>
                      <TabsTrigger value="chat">Chat</TabsTrigger>
                    </TabsList>
                  </div>

                    <TabsContent value="model" className="mt-0 space-y-4">
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
                        <p className="text-sm text-muted-foreground">
                          Choose the AI model that powers your agent
                        </p>
                      </div>
                    </TabsContent>

                    <TabsContent value="memory" className="mt-0 space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="conversation-history">Conversation History</Label>
                        <Select
                          value={conversationHistoryLimit}
                          onValueChange={setConversationHistoryLimit}
                          disabled={isSaving}
                        >
                          <SelectTrigger id="conversation-history">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CONVERSATION_HISTORY_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {conversationHistoryLimit === 'custom' && (
                          <Input
                            type="number"
                            placeholder="Enter number of messages"
                            value={customHistoryLimit}
                            onChange={(e) => setCustomHistoryLimit(e.target.value)}
                            min={1}
                            max={100}
                            disabled={isSaving}
                          />
                        )}
                        <p className="text-sm text-muted-foreground">
                          Number of previous messages included in context. Each user message and agent response counts as one message.
                        </p>
                      </div>
                    </TabsContent>

                    <TabsContent value="chat" className="mt-0 space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="welcome-message">Welcome Message</Label>
                        <Textarea
                          id="welcome-message"
                          placeholder="Hello! How can I help you today?"
                          value={welcomeMessage}
                          onChange={(e) => setWelcomeMessage(e.target.value)}
                          disabled={isSaving}
                          rows={3}
                        />
                        <p className="text-sm text-muted-foreground">
                          First message shown when a user starts a new conversation
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Suggested Prompts</Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Add a suggested prompt..."
                            value={newPrompt}
                            onChange={(e) => setNewPrompt(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddPrompt()}
                            disabled={isSaving}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleAddPrompt}
                            disabled={!newPrompt.trim() || isSaving}
                          >
                            Add
                          </Button>
                        </div>
                        {suggestedPrompts.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {suggestedPrompts.map((prompt, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-1 bg-background px-3 py-1 rounded-full text-sm border"
                              >
                                <span className="max-w-[200px] truncate">{prompt}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemovePrompt(index)}
                                  className="text-muted-foreground hover:text-foreground ml-1"
                                  disabled={isSaving}
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <p className="text-sm text-muted-foreground">
                          Clickable prompts shown to users before they send their first message
                        </p>
                      </div>
                    </TabsContent>
                </Tabs>
              </div>
            ) : (
              <>
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
              </>
            )}
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
