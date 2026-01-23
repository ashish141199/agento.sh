import type { InstructionsConfig, AgentSettings, KnowledgeSettings } from '../db/schema/agents'
import type { EmbedConfig } from '../db/schema/agents'

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
 * Default welcome message
 */
export const DEFAULT_WELCOME_MESSAGE = ''

/**
 * Default suggested prompts
 */
export const DEFAULT_SUGGESTED_PROMPTS: string[] = []

/**
 * Default knowledge settings
 */
export const DEFAULT_KNOWLEDGE_SETTINGS: KnowledgeSettings = {
  enabled: true,
  mode: 'tool',
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
 * Default embed widget position
 */
export const DEFAULT_EMBED_POSITION: EmbedConfig['position'] = 'expanded'

/**
 * Default embed widget theme
 */
export const DEFAULT_EMBED_THEME: EmbedConfig['theme'] = 'light'

/**
 * Default allowed domains for embedding (empty = allow all)
 */
export const DEFAULT_EMBED_ALLOWED_DOMAINS: string[] = []

/**
 * Default embed configuration
 */
export const DEFAULT_EMBED_CONFIG: EmbedConfig = {
  position: DEFAULT_EMBED_POSITION,
  theme: DEFAULT_EMBED_THEME,
  allowedDomains: DEFAULT_EMBED_ALLOWED_DOMAINS,
}

/**
 * Default model ID when none is specified
 */
export const DEFAULT_MODEL_ID = 'openrouter/auto'

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
