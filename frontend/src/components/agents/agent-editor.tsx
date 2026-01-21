'use client'

/**
 * Agent Editor Component
 * Main editor interface for creating and editing agents
 * @module components/agents/agent-editor
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AgentGeneralForm } from './agent-general-form'
import { AgentInstructionsForm } from './agent-instructions-form'
import { AgentToolsForm } from './agent-tools-form'
import { AgentSettingsPanel } from './agent-settings-panel'
import { AgentEditorNavigation } from './agent-editor-navigation'
import { AgentEditorMobileToggle } from './agent-editor-mobile-toggle'
import { AgentChat } from './agent-chat'
import { type Agent } from '@/services/agent.service'
import { useModels } from '@/hooks/use-models'
import { useAgentEditor } from '@/hooks/use-agent-editor'
import { Loader2, Settings, GripVertical } from 'lucide-react'

type TabValue = 'identity' | 'instructions' | 'tools'
type MobileView = 'form' | 'chat'

const TABS: TabValue[] = ['identity', 'instructions', 'tools']

/** Publish state for parent communication */
export interface PublishState {
  agentId: string | null
  agentName: string
  hasUnsavedChanges: boolean
  isFormComplete: boolean
  onSave: () => Promise<void>
  isSaving: boolean
}

/** Props for AgentEditor component */
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
  const { data: models = [], isLoading: isLoadingModels } = useModels()

  // Use the agent editor hook for state management
  const editor = useAgentEditor(agent)

  // Tab and view state
  const [activeTab, setActiveTab] = useState<TabValue>('identity')
  const [mobileView, setMobileView] = useState<MobileView>('form')

  // Resizable panel state
  const [leftPanelWidth, setLeftPanelWidth] = useState(50)
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

  /**
   * Handle panel resize mouse down
   */
  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isResizing.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current || !containerRef.current) return
      const containerRect = containerRef.current.getBoundingClientRect()
      const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100
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

  // Track previous publish state to avoid unnecessary updates
  const prevPublishStateRef = useRef<string>('')

  // Notify parent of publish state changes only when values actually change
  useEffect(() => {
    const stateKey = `${editor.agentId}-${editor.name}-${editor.hasUnsavedChanges}-${editor.isSaving}`
    if (prevPublishStateRef.current !== stateKey) {
      prevPublishStateRef.current = stateKey
      onPublishStateChange?.({
        agentId: editor.agentId,
        agentName: editor.name,
        hasUnsavedChanges: editor.hasUnsavedChanges,
        isFormComplete: !!editor.name.trim(),
        onSave: editor.handleSave,
        isSaving: editor.isSaving,
      })
    }
  }, [editor.agentId, editor.name, editor.hasUnsavedChanges, editor.isSaving, onPublishStateChange, editor.handleSave])

  // Tab navigation
  const currentTabIndex = TABS.indexOf(activeTab)
  const isFirstTab = currentTabIndex === 0
  const isLastTab = currentTabIndex === TABS.length - 1

  /**
   * Navigate to previous tab
   */
  const handlePrevious = () => {
    if (!isFirstTab) {
      setActiveTab(TABS[currentTabIndex - 1])
    }
  }

  /**
   * Navigate to next tab (creates agent on first tab if needed)
   */
  const handleNext = async () => {
    if (activeTab === 'identity' && !editor.hasCreated) {
      if (!editor.name.trim()) return
      await editor.handleCreate()
    }

    if (editor.hasCreated && editor.agentId) {
      await editor.handleUpdate()
    }

    if (!isLastTab) {
      setActiveTab(TABS[currentTabIndex + 1])
    }
  }

  const isNextDisabled = activeTab === 'identity' && !editor.name.trim()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400 dark:text-neutral-500" />
      </div>
    )
  }

  return (
    <div ref={containerRef} className="flex flex-col md:flex-row h-full">
      <AgentEditorMobileToggle mobileView={mobileView} onViewChange={setMobileView} />

      {/* Left side - Configuration */}
      <div
        className={`flex-1 md:flex-none flex flex-col min-w-0 min-h-0 md:min-w-[320px] ${mobileView === 'form' ? 'flex' : 'hidden'} md:flex`}
        style={isDesktop ? { width: `${leftPanelWidth}%`, maxWidth: '700px' } : undefined}
      >
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <TabsList className="w-fit">
              <TabsTrigger value="identity" onClick={() => editor.setShowSettings(false)}>Identity</TabsTrigger>
              <TabsTrigger value="instructions" disabled={!editor.hasCreated} onClick={() => editor.setShowSettings(false)}>Instructions</TabsTrigger>
              <TabsTrigger value="tools" disabled={!editor.hasCreated} onClick={() => editor.setShowSettings(false)}>Tools</TabsTrigger>
            </TabsList>

            <Button
              variant={editor.showSettings ? 'default' : 'outline'}
              size="sm"
              onClick={() => editor.setShowSettings(!editor.showSettings)}
            >
              <Settings className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Settings</span>
            </Button>
          </div>

          <div className="flex-1 mt-6 min-h-0 overflow-auto">
            {editor.showSettings ? (
              <AgentSettingsPanel
                settingsTab={editor.settingsTab}
                onSettingsTabChange={editor.setSettingsTab}
                onClose={() => editor.setShowSettings(false)}
                isSaving={editor.isSaving}
                isLoadingModels={isLoadingModels}
                models={models}
                modelId={editor.modelId}
                onModelChange={editor.setModelId}
                conversationHistoryLimit={editor.conversationHistoryLimit}
                onConversationHistoryLimitChange={editor.setConversationHistoryLimit}
                customHistoryLimit={editor.customHistoryLimit}
                onCustomHistoryLimitChange={editor.setCustomHistoryLimit}
                welcomeMessage={editor.welcomeMessage}
                onWelcomeMessageChange={editor.setWelcomeMessage}
                suggestedPrompts={editor.suggestedPrompts}
                newPrompt={editor.newPrompt}
                onNewPromptChange={editor.setNewPrompt}
                onAddPrompt={editor.handleAddPrompt}
                onRemovePrompt={editor.handleRemovePrompt}
              />
            ) : (
              <>
                <TabsContent value="identity" className="mt-0 h-full">
                  <AgentGeneralForm
                    name={editor.name}
                    description={editor.description}
                    onNameChange={editor.setName}
                    onDescriptionChange={editor.setDescription}
                    disabled={editor.isSaving}
                  />
                </TabsContent>

                <TabsContent value="instructions" className="mt-0 h-full">
                  <AgentInstructionsForm
                    instructionsConfig={editor.instructionsConfig}
                    onInstructionsChange={editor.setInstructionsConfig}
                    disabled={editor.isSaving}
                    agentId={editor.agentId}
                  />
                </TabsContent>

                <TabsContent value="tools" className="mt-0 h-full">
                  <AgentToolsForm agentId={editor.agentId} disabled={editor.isSaving} />
                </TabsContent>
              </>
            )}
          </div>

          <AgentEditorNavigation
            isFirstTab={isFirstTab}
            isLastTab={isLastTab}
            isNextDisabled={isNextDisabled}
            isSaving={editor.isSaving}
            onPrevious={handlePrevious}
            onNext={handleNext}
          />
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
            agentId={editor.agentId}
            name={editor.name}
            description={editor.description}
            welcomeMessage={editor.welcomeMessage}
            suggestedPrompts={editor.suggestedPrompts}
          />
        </div>
      </div>
    </div>
  )
}
