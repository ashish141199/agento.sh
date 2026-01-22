import type { InstructionsConfig, AgentSettings, KnowledgeSettings } from '@/services/agent.service'

/**
 * Default instructions configuration for agents
 */
export const DEFAULT_INSTRUCTIONS_CONFIG: InstructionsConfig = {
  whatDoesAgentDo: '',
  howShouldItSpeak: '',
  whatShouldItNeverDo: '',
  anythingElse: '',
}

/**
 * Default conversation history limit
 */
export const DEFAULT_CONVERSATION_HISTORY_LIMIT = 10

/**
 * Default conversation history limit as string (for form state)
 */
export const DEFAULT_CONVERSATION_HISTORY_LIMIT_STRING = '10'

/**
 * Default welcome message
 */
export const DEFAULT_WELCOME_MESSAGE = ''

/**
 * Default suggested prompts
 */
export const DEFAULT_SUGGESTED_PROMPTS: string[] = []

/**
 * Default knowledge retrieval mode
 */
export const DEFAULT_KNOWLEDGE_RETRIEVAL_MODE: KnowledgeSettings['mode'] = 'tool'

/**
 * Default knowledge settings
 */
export const DEFAULT_KNOWLEDGE_SETTINGS: KnowledgeSettings = {
  enabled: true,
  mode: DEFAULT_KNOWLEDGE_RETRIEVAL_MODE,
  topK: 5,
  similarityThreshold: 0.5,
}

/**
 * Default agent settings
 */
export const DEFAULT_AGENT_SETTINGS: AgentSettings = {
  memory: {
    conversationHistoryLimit: DEFAULT_CONVERSATION_HISTORY_LIMIT,
  },
  chat: {
    welcomeMessage: DEFAULT_WELCOME_MESSAGE,
    suggestedPrompts: DEFAULT_SUGGESTED_PROMPTS,
  },
  knowledge: DEFAULT_KNOWLEDGE_SETTINGS,
}

/**
 * Knowledge retrieval mode options for the settings dropdown
 * Using non-technical friendly wording for semi-technical users
 */
export const KNOWLEDGE_RETRIEVAL_MODE_OPTIONS = [
  {
    value: 'tool' as const,
    label: 'Search Tool',
    description: 'Your agent will have a search tool to look up information from your knowledge base when needed.',
  },
  {
    value: 'auto_inject' as const,
    label: 'Automatic',
    description: 'Relevant information from your knowledge base will be automatically provided with each message.',
  },
] as const

/**
 * Conversation history options for the settings dropdown
 */
export const CONVERSATION_HISTORY_OPTIONS = [
  { value: '5', label: 'Last 5 messages' },
  { value: '10', label: 'Last 10 messages' },
  { value: '20', label: 'Last 20 messages' },
  { value: '50', label: 'Last 50 messages' },
  { value: 'custom', label: 'Custom' },
] as const

/**
 * Preset conversation history values (used to detect custom values)
 */
export const PRESET_HISTORY_LIMITS = [5, 10, 20, 50] as const

/**
 * Maximum values for validation
 */
export const MAX_CONVERSATION_HISTORY_LIMIT = 100
export const MAX_INSTRUCTIONS_LENGTH = 2000
export const MAX_WELCOME_MESSAGE_LENGTH = 500
export const MAX_SUGGESTED_PROMPT_LENGTH = 200
export const MAX_SUGGESTED_PROMPTS_COUNT = 10
export const MAX_AGENT_NAME_LENGTH = 100
export const MAX_AGENT_DESCRIPTION_LENGTH = 500
