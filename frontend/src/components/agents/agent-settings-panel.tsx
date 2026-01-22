'use client'

/**
 * Agent Settings Panel Component
 * Settings panel with tabs for Model, Memory, and Chat configuration
 * @module components/agents/agent-settings-panel
 */

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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ArrowLeft, X } from 'lucide-react'
import { CONVERSATION_HISTORY_OPTIONS, KNOWLEDGE_RETRIEVAL_MODE_OPTIONS } from '@/lib/defaults'
import type { KnowledgeSettings } from '@/services/agent.service'

/** Model data structure */
interface Model {
  id: string
  name: string
}

/** Settings tab values */
type SettingsTabValue = 'model' | 'memory' | 'chat' | 'knowledge'

/** Props for AgentSettingsPanel */
interface AgentSettingsPanelProps {
  /** Current settings tab */
  settingsTab: SettingsTabValue
  /** Settings tab change handler */
  onSettingsTabChange: (tab: SettingsTabValue) => void
  /** Close settings handler */
  onClose: () => void
  /** Whether saving is in progress */
  isSaving: boolean
  /** Whether models are loading */
  isLoadingModels: boolean
  /** Available models list */
  models: Model[]
  /** Selected model ID */
  modelId: string | null
  /** Model change handler */
  onModelChange: (id: string | null) => void
  /** Conversation history limit setting */
  conversationHistoryLimit: string
  /** Conversation history change handler */
  onConversationHistoryLimitChange: (value: string) => void
  /** Custom history limit value */
  customHistoryLimit: string
  /** Custom history limit change handler */
  onCustomHistoryLimitChange: (value: string) => void
  /** Welcome message */
  welcomeMessage: string
  /** Welcome message change handler */
  onWelcomeMessageChange: (value: string) => void
  /** Suggested prompts list */
  suggestedPrompts: string[]
  /** New prompt input value */
  newPrompt: string
  /** New prompt change handler */
  onNewPromptChange: (value: string) => void
  /** Add prompt handler */
  onAddPrompt: () => void
  /** Remove prompt handler */
  onRemovePrompt: (index: number) => void
  /** Knowledge retrieval mode */
  knowledgeRetrievalMode: KnowledgeSettings['mode']
  /** Knowledge retrieval mode change handler */
  onKnowledgeRetrievalModeChange: (mode: KnowledgeSettings['mode']) => void
}

/**
 * Settings panel component for agent configuration
 * Contains tabs for Model, Memory, and Chat settings
 */
export function AgentSettingsPanel({
  settingsTab,
  onSettingsTabChange,
  onClose,
  isSaving,
  isLoadingModels,
  models,
  modelId,
  onModelChange,
  conversationHistoryLimit,
  onConversationHistoryLimitChange,
  customHistoryLimit,
  onCustomHistoryLimitChange,
  welcomeMessage,
  onWelcomeMessageChange,
  suggestedPrompts,
  newPrompt,
  onNewPromptChange,
  onAddPrompt,
  onRemovePrompt,
  knowledgeRetrievalMode,
  onKnowledgeRetrievalModeChange,
}: AgentSettingsPanelProps) {
  /**
   * Handle new prompt keydown for Enter key
   */
  const handlePromptKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onAddPrompt()
    }
  }

  return (
    <div className="border border-dashed rounded-lg p-6 relative bg-background">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>

      <Tabs value={settingsTab} onValueChange={(v) => onSettingsTabChange(v as SettingsTabValue)}>
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={onClose}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <TabsList className="w-fit">
            <TabsTrigger value="model">Model</TabsTrigger>
            <TabsTrigger value="memory">Memory</TabsTrigger>
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="knowledge">Knowledge</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="model" className="mt-0 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="settings-model">AI Model</Label>
            <Select
              value={modelId || ''}
              onValueChange={(value) => onModelChange(value || null)}
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
              onValueChange={onConversationHistoryLimitChange}
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
                onChange={(e) => onCustomHistoryLimitChange(e.target.value)}
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
              onChange={(e) => onWelcomeMessageChange(e.target.value)}
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
                onChange={(e) => onNewPromptChange(e.target.value)}
                onKeyDown={handlePromptKeyDown}
                disabled={isSaving}
              />
              <Button
                type="button"
                variant="outline"
                onClick={onAddPrompt}
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
                      onClick={() => onRemovePrompt(index)}
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

        <TabsContent value="knowledge" className="mt-0 space-y-4">
          <div className="space-y-4">
            <div>
              <Label>How should your agent access knowledge?</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Choose how your agent finds and uses information from your knowledge base.
              </p>
            </div>
            <RadioGroup
              value={knowledgeRetrievalMode}
              onValueChange={(value) => onKnowledgeRetrievalModeChange(value as KnowledgeSettings['mode'])}
              disabled={isSaving}
              className="space-y-3"
            >
              {KNOWLEDGE_RETRIEVAL_MODE_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-start space-x-3">
                  <RadioGroupItem value={option.value} id={`knowledge-mode-${option.value}`} className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor={`knowledge-mode-${option.value}`} className="font-medium cursor-pointer">
                      {option.label}
                    </Label>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {option.description}
                    </p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
