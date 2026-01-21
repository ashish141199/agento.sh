'use client'

/**
 * Agent Editor State Hook
 * Manages all state and mutations for the agent editor
 * @module hooks/use-agent-editor
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { agentService, type Agent, type InstructionsConfig, type AgentSettings } from '@/services/agent.service'
import { useAuthStore } from '@/stores/auth.store'
import {
  DEFAULT_INSTRUCTIONS_CONFIG,
  DEFAULT_CONVERSATION_HISTORY_LIMIT,
  DEFAULT_CONVERSATION_HISTORY_LIMIT_STRING,
  PRESET_HISTORY_LIMITS,
} from '@/lib/defaults'

/** Saved form state for change detection */
interface SavedState {
  name: string
  description: string
  modelId: string | null
  instructionsConfig: InstructionsConfig
  conversationHistoryLimit: string
  customHistoryLimit: string
  welcomeMessage: string
  suggestedPrompts: string[]
}

/** Settings tab values */
type SettingsTabValue = 'model' | 'memory' | 'chat'

/** Return type for useAgentEditor hook */
export interface UseAgentEditorReturn {
  // Form state
  name: string
  setName: (name: string) => void
  description: string
  setDescription: (description: string) => void
  modelId: string | null
  setModelId: (id: string | null) => void
  instructionsConfig: InstructionsConfig
  setInstructionsConfig: (config: InstructionsConfig) => void

  // Agent state
  agentId: string | null
  hasCreated: boolean

  // Settings state
  showSettings: boolean
  setShowSettings: (show: boolean) => void
  settingsTab: SettingsTabValue
  setSettingsTab: (tab: SettingsTabValue) => void
  conversationHistoryLimit: string
  setConversationHistoryLimit: (limit: string) => void
  customHistoryLimit: string
  setCustomHistoryLimit: (limit: string) => void
  welcomeMessage: string
  setWelcomeMessage: (message: string) => void
  suggestedPrompts: string[]
  newPrompt: string
  setNewPrompt: (prompt: string) => void

  // Handlers
  handleAddPrompt: () => void
  handleRemovePrompt: (index: number) => void
  handleSave: () => Promise<void>
  handleCreate: () => Promise<void>
  handleUpdate: () => Promise<void>

  // Status
  isSaving: boolean
  hasUnsavedChanges: boolean
}

/**
 * Hook for managing agent editor state and mutations
 * @param agent - Existing agent data (for editing mode)
 */
export function useAgentEditor(agent?: Agent | null): UseAgentEditorReturn {
  const router = useRouter()
  const queryClient = useQueryClient()

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [modelId, setModelId] = useState<string | null>(null)
  const [instructionsConfig, setInstructionsConfig] = useState<InstructionsConfig>(DEFAULT_INSTRUCTIONS_CONFIG)
  const [hasCreated, setHasCreated] = useState(false)
  const [agentId, setAgentId] = useState<string | null>(null)

  // Settings state
  const [showSettings, setShowSettings] = useState(false)
  const [settingsTab, setSettingsTab] = useState<SettingsTabValue>('model')
  const [conversationHistoryLimit, setConversationHistoryLimit] = useState<string>(DEFAULT_CONVERSATION_HISTORY_LIMIT_STRING)
  const [customHistoryLimit, setCustomHistoryLimit] = useState<string>('')
  const [welcomeMessage, setWelcomeMessage] = useState('')
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([])
  const [newPrompt, setNewPrompt] = useState('')
  const [savedState, setSavedState] = useState<SavedState | null>(null)

  /**
   * Build settings object for API calls
   */
  const buildSettings = useCallback((): AgentSettings => {
    const limit = conversationHistoryLimit === 'custom'
      ? parseInt(customHistoryLimit) || DEFAULT_CONVERSATION_HISTORY_LIMIT
      : parseInt(conversationHistoryLimit)

    return {
      memory: { conversationHistoryLimit: limit },
      chat: { welcomeMessage, suggestedPrompts },
    }
  }, [conversationHistoryLimit, customHistoryLimit, welcomeMessage, suggestedPrompts])

  /**
   * Create current state snapshot for saved state comparison
   */
  const createStateSnapshot = useCallback((): SavedState => ({
    name,
    description,
    modelId,
    instructionsConfig,
    conversationHistoryLimit,
    customHistoryLimit,
    welcomeMessage,
    suggestedPrompts,
  }), [name, description, modelId, instructionsConfig, conversationHistoryLimit, customHistoryLimit, welcomeMessage, suggestedPrompts])

  // Initialize form with agent data when editing
  useEffect(() => {
    if (agent) {
      setName(agent.name)
      setDescription(agent.description || '')
      setModelId(agent.modelId)
      setInstructionsConfig(agent.instructionsConfig || DEFAULT_INSTRUCTIONS_CONFIG)
      setAgentId(agent.id)
      setHasCreated(true)

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

  // Check for unsaved changes
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
        setSavedState(createStateSnapshot())
        queryClient.invalidateQueries({ queryKey: ['agents'] })
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
      setSavedState(createStateSnapshot())
    },
  })

  const isSaving = createMutation.isPending || updateMutation.isPending

  // Store mutation refs for stable callbacks
  const updateMutationRef = useRef(updateMutation)
  const createMutationRef = useRef(createMutation)
  const stateRef = useRef({ hasCreated, agentId })

  // Keep refs up to date
  useEffect(() => {
    updateMutationRef.current = updateMutation
    createMutationRef.current = createMutation
    stateRef.current = { hasCreated, agentId }
  })

  /**
   * Add a new suggested prompt
   */
  const handleAddPrompt = useCallback(() => {
    if (newPrompt.trim()) {
      setSuggestedPrompts(prev => [...prev, newPrompt.trim()])
      setNewPrompt('')
    }
  }, [newPrompt])

  /**
   * Remove a suggested prompt by index
   */
  const handleRemovePrompt = useCallback((index: number) => {
    setSuggestedPrompts(prev => prev.filter((_, i) => i !== index))
  }, [])

  /**
   * Save current changes (update if agent exists)
   * Uses ref pattern for stable function reference
   */
  const handleSave = useCallback(async () => {
    if (stateRef.current.hasCreated && stateRef.current.agentId) {
      await updateMutationRef.current.mutateAsync()
    }
  }, [])

  /**
   * Create a new agent
   * Uses ref pattern for stable function reference
   */
  const handleCreate = useCallback(async () => {
    await createMutationRef.current.mutateAsync()
  }, [])

  /**
   * Update existing agent
   * Uses ref pattern for stable function reference
   */
  const handleUpdate = useCallback(async () => {
    await updateMutationRef.current.mutateAsync()
  }, [])

  return {
    name,
    setName,
    description,
    setDescription,
    modelId,
    setModelId,
    instructionsConfig,
    setInstructionsConfig,
    agentId,
    hasCreated,
    showSettings,
    setShowSettings,
    settingsTab,
    setSettingsTab,
    conversationHistoryLimit,
    setConversationHistoryLimit,
    customHistoryLimit,
    setCustomHistoryLimit,
    welcomeMessage,
    setWelcomeMessage,
    suggestedPrompts,
    newPrompt,
    setNewPrompt,
    handleAddPrompt,
    handleRemovePrompt,
    handleSave,
    handleCreate,
    handleUpdate,
    isSaving,
    hasUnsavedChanges: !!hasUnsavedChanges,
  }
}
