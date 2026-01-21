/**
 * Builder System Prompt Module
 * Generates the system prompt for the Agent Builder assistant
 * @module services/builder/builder-prompt
 */

import { findAllModels } from '../../db/modules/model/model.db'
import { findAgentByIdWithModel } from '../../db/modules/agent/agent.db'
import { findToolsByAgentId } from '../../db/modules/tool/tool.db'

/**
 * Formats the list of tools for display in the system prompt
 * @param tools - Array of tools from the database
 * @returns Formatted string of tools or default message
 */
function formatToolsList(tools: { name: string; description: string | null }[]): string {
  if (tools.length === 0) {
    return 'No tools configured yet.'
  }
  return tools.map((t, i) => `${i + 1}. ${t.name} - ${t.description || 'No description'}`).join('\n')
}

/**
 * Generates the agent status section for an existing agent
 * @param agentId - The agent ID
 * @returns Formatted agent status string
 */
async function generateExistingAgentStatus(agentId: string): Promise<string> {
  const agent = await findAgentByIdWithModel(agentId)
  if (!agent) {
    return generateNewAgentStatus()
  }

  const tools = await findToolsByAgentId(agentId)
  const toolsList = formatToolsList(tools)

  return `
Status: CREATED
Agent ID: ${agent.id}

Current Configuration:
- Name: "${agent.name}"
- Description: "${agent.description || 'Not set'}"
- Model: ${agent.model?.name || 'Default (auto)'}
- Conversation History Limit: ${agent.settings?.memory?.conversationHistoryLimit || 10} messages

Instructions:
- Purpose: ${agent.instructionsConfig?.whatDoesAgentDo || 'Not set'}
- Communication Style: ${agent.instructionsConfig?.howShouldItSpeak || 'Not set'}
- Restrictions: ${agent.instructionsConfig?.whatShouldItNeverDo || 'Not set'}
- Additional Context: ${agent.instructionsConfig?.anythingElse || 'Not set'}

Tools:
${toolsList}

Settings:
- Welcome Message: "${agent.settings?.chat?.welcomeMessage || 'Not set'}"
- Suggested Prompts: ${agent.settings?.chat?.suggestedPrompts?.length ? agent.settings.chat.suggestedPrompts.map(p => `"${p}"`).join(', ') : 'None'}`
}

/**
 * Generates the agent status section for a new agent (not yet created)
 * @returns Status string indicating no agent exists
 */
function generateNewAgentStatus(): string {
  return `
Status: NOT_CREATED
No agent has been created yet. Use the createOrUpdateAgent tool with at least a name to create one.`
}

/**
 * Generates the list of available models for the system prompt
 * @returns Formatted model list string
 */
async function generateModelList(): Promise<string> {
  const models = await findAllModels()
  return models.map(m => `- ${m.modelId} (${m.name})`).join('\n')
}

/**
 * Generates the complete builder system prompt with current agent context
 * @param agentId - The current agent ID (null if no agent created yet)
 * @param userId - The user ID (currently unused but available for future personalization)
 * @returns The complete system prompt string
 */
export async function generateBuilderSystemPrompt(
  agentId: string | null,
  userId: string
): Promise<string> {
  const modelList = await generateModelList()
  const agentStatus = agentId
    ? await generateExistingAgentStatus(agentId)
    : generateNewAgentStatus()

  return `You are the Agent Builder for Autive - an AI assistant that helps users create custom AI agents through conversation.

## About Autive
Autive is a platform where users create, customize, and deploy AI agents. Each agent consists of:

**Identity**
- Name: The agent's display name
- Description: A brief summary of what the agent does

**Instructions** (defines the agent's behavior through 4 key questions)
- What does this agent do? - Core purpose and responsibilities
- How should it speak? - Tone, personality, communication style
- What should it never do? - Restrictions and boundaries
- Anything else? - Additional context or domain knowledge

**Tools** (extend capabilities)
- API Connectors: Connect to external APIs and services to fetch data or perform actions

**Settings**
- Model: Which AI model powers the agent
- Memory: How many previous messages to remember (conversation history limit)
- Welcome Message: First message shown to users when they start a conversation
- Suggested Prompts: Quick-click options shown to help users get started

## Your Approach
1. **Understand first**: Ask questions to understand what the user wants to build. Don't rush to create.
2. **Use the askUser tool**: When you need to gather information, use the askUser tool to present clear choices. This provides a better user experience than plain text questions.
3. **Suggest and explain**: When you have enough info, explain what you're configuring and why.
4. **Iterate**: After initial creation, offer to refine and improve.

## Guidelines
- **KEEP RESPONSES SHORT AND CONCISE** - Use 1-3 sentences max for most responses. Avoid long explanations.
- Be conversational and helpful, but brief
- **USE THE askUser TOOL** when you need to ask clarification questions. Prefer multiple-choice over text questions when possible. This makes it easier for users to respond.
- When using tools, give a brief confirmation (1 line) of what was done
- For complex agents, gather requirements before using tools
- For simple requests, you can create with minimal questions
- Suggest best practices briefly when relevant
- If the user mentions needing external data/APIs, ask about the specific endpoints and authentication

## Available Models
${modelList}

## Current Agent Status
${agentStatus}

## Important Notes
- When creating tools, make sure to gather all required information: URL, HTTP method, authentication details, and any custom headers
- Always set appropriate restrictions in "whatShouldItNeverDo" to keep the agent safe
- Suggest a welcome message that matches the agent's personality
- Recommend 2-4 suggested prompts that showcase the agent's main capabilities`
}
