'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
import {
  DEFAULT_INSTRUCTIONS_CONFIG,
  DEFAULT_CONVERSATION_HISTORY_LIMIT,
  DEFAULT_CONVERSATION_HISTORY_LIMIT_STRING,
  CONVERSATION_HISTORY_OPTIONS,
  PRESET_HISTORY_LIMITS,
} from '@/lib/defaults'
import { ChevronLeft, ChevronRight, Loader2, Settings, X, ArrowLeft, GripVertical, MessageSquare, FileText } from 'lucide-react'

type TabValue = 'identity' | 'instructions' | 'tools'
type MobileView = 'form' | 'chat'
type SettingsTabValue = 'model' | 'memory' | 'chat'

const TABS: TabValue[] = ['identity', 'instructions', 'tools']

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

/**
 * Agent editor component with tabs for General, Instructions, and Tools
 * Handles both creation and editing of agents
 */
export function AgentEditor({ agent, isLoading, onPublishStateChange }: AgentEditorProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: models = [], isLoading: isLoadingModels } = useModels()

  const [activeTab, setActiveTab] = useState<TabValue>('identity')
  const [mobileView, setMobileView] = useState<MobileView>('form')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [modelId, setModelId] = useState<string | null>(null)
  const [instructionsConfig, setInstructionsConfig] = useState<InstructionsConfig>(DEFAULT_INSTRUCTIONS_CONFIG)
  const [hasCreated, setHasCreated] = useState(false)
  const [agentId, setAgentId] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [settingsTab, setSettingsTab] = useState<SettingsTabValue>('model')

  // Resizable panel state
  const [leftPanelWidth, setLeftPanelWidth] = useState(50) // percentage
  const [isDesktop, setIsDesktop] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const isResizing = useRef(false)

  // Detect desktop/mobile
  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 768)
    checkDesktop()
    window.addEventListener('resize', checkDesktop)
    return () => window.removeEventListener('resize', checkDesktop)
  }, [])

  // Handle panel resize
  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isResizing.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current || !containerRef.current) return
      const containerRect = containerRef.current.getBoundingClientRect()
      const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100
      // Clamp between 30% and 70%
      setLeftPanelWidth(Math.min(Math.max(newWidth, 30), 70))
    }

    const handleMouseUp = () => {
      isResizing.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [])

  // Settings state
  const [conversationHistoryLimit, setConversationHistoryLimit] = useState<string>(DEFAULT_CONVERSATION_HISTORY_LIMIT_STRING)
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
      setInstructionsConfig(agent.instructionsConfig || DEFAULT_INSTRUCTIONS_CONFIG)
      setAgentId(agent.id)
      setHasCreated(true)

      // Load settings from agent.settings
      const limit = agent.settings?.memory?.conversationHistoryLimit || DEFAULT_CONVERSATION_HISTORY_LIMIT
      const isCustomLimit = !PRESET_HISTORY_LIMITS.includes(limit as typeof PRESET_HISTORY_LIMITS[number])
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
        instructionsConfig: agent.instructionsConfig || DEFAULT_INSTRUCTIONS_CONFIG,
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
      ? parseInt(customHistoryLimit) || DEFAULT_CONVERSATION_HISTORY_LIMIT
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
    <div ref={containerRef} className="flex flex-col md:flex-row h-full">
      {/* Mobile view toggle */}
      <div className="md:hidden flex border-b mb-4">
        <button
          onClick={() => setMobileView('form')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors ${
            mobileView === 'form'
              ? 'border-neutral-900 dark:border-neutral-100 text-neutral-900 dark:text-neutral-100'
              : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
          }`}
        >
          <FileText className="h-4 w-4" />
          Configure
        </button>
        <button
          onClick={() => setMobileView('chat')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors ${
            mobileView === 'chat'
              ? 'border-neutral-900 dark:border-neutral-100 text-neutral-900 dark:text-neutral-100'
              : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          Test Chat
        </button>
      </div>

      {/* Left side - Configuration */}
      <div
        className={`flex-1 md:flex-none flex flex-col min-w-0 md:min-w-[320px] ${mobileView === 'form' ? 'flex' : 'hidden'} md:flex`}
        style={isDesktop ? { width: `${leftPanelWidth}%`, maxWidth: '700px' } : undefined}
      >
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="flex-1 flex flex-col">
          <div className="flex items-center justify-between gap-2 flex-wrap">
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
              <Settings className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Settings</span>
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

      {/* Resize handle - desktop only */}
      <div
        className="hidden md:flex w-4 flex-shrink-0 items-center justify-center cursor-col-resize group"
        onMouseDown={handleResizeMouseDown}
      >
        <div className="w-1 h-full hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors relative">
          <GripVertical className="h-4 w-4 text-neutral-300 dark:text-neutral-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {/* Right side - Chat */}
      <div className={`h-full min-h-0 flex-1 min-w-0 md:min-w-[280px] w-full ${mobileView === 'chat' ? 'flex' : 'hidden'} md:flex`}>
        <div className="w-full h-full">
          <AgentChat
            agentId={agentId}
            name={name}
            description={description}
            welcomeMessage={welcomeMessage}
            suggestedPrompts={suggestedPrompts}
          />
        </div>
      </div>
    </div>
  )
}
