/**
 * MCP (Model Context Protocol) Client Service
 * Handles communication with MCP servers for tool discovery and execution
 * Uses the official @modelcontextprotocol/sdk
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import type { Tool as McpTool } from '@modelcontextprotocol/sdk/types.js'
import type { ToolInputSchema, ToolInput, ToolInputType } from '../db/schema/tools'

/**
 * MCP Authentication
 */
export interface McpAuth {
  type: 'none' | 'bearer'
  token?: string
}

/**
 * Discovered tool with our schema format
 */
export interface DiscoveredTool {
  name: string
  description: string
  inputSchema: ToolInputSchema
}

/**
 * JSON Schema property type (from MCP tools)
 */
interface JsonSchemaProperty {
  type?: string | string[]
  description?: string
  default?: unknown
  enum?: unknown[]
  items?: JsonSchemaProperty
  properties?: Record<string, JsonSchemaProperty>
  required?: string[]
}

/**
 * JSON Schema (from MCP tools)
 */
interface JsonSchema {
  type?: string
  properties?: Record<string, JsonSchemaProperty>
  required?: string[]
}

/**
 * MCP Client for communicating with MCP servers
 * Uses the official @modelcontextprotocol/sdk
 */
export class McpClient {
  private serverUrl: string
  private auth?: McpAuth
  private client: Client | null = null
  private transport: StreamableHTTPClientTransport | SSEClientTransport | null = null

  constructor(serverUrl: string, auth?: McpAuth) {
    this.serverUrl = serverUrl
    this.auth = auth
  }

  /**
   * Build request init with authentication headers
   */
  private buildRequestInit(): RequestInit {
    const headers: Record<string, string> = {}

    if (this.auth?.type === 'bearer' && this.auth.token) {
      headers['Authorization'] = `Bearer ${this.auth.token}`
    }

    return { headers }
  }

  /**
   * Connect to the MCP server
   * Tries StreamableHTTPClientTransport first, falls back to SSEClientTransport
   */
  async connect(): Promise<void> {
    const url = new URL(this.serverUrl)
    const requestInit = this.buildRequestInit()

    this.client = new Client({
      name: 'agento',
      version: '1.0.0',
    })

    // Try Streamable HTTP transport first
    try {
      this.transport = new StreamableHTTPClientTransport(url, {
        requestInit,
      })
      await this.client.connect(this.transport)
      console.log('[MCP] Connected via Streamable HTTP transport')
      return
    } catch (error) {
      console.log('[MCP] Streamable HTTP failed, trying SSE transport...', error)
      // Reset client for retry with SSE
      this.client = new Client({
        name: 'agento',
        version: '1.0.0',
      })
    }

    // Fall back to SSE transport for legacy servers
    try {
      // Note: SSE transport auth is limited - headers need custom fetch for SSE connection
      // For servers requiring auth, StreamableHTTP (above) should work
      this.transport = new SSEClientTransport(url, {
        requestInit, // This handles POST requests; SSE connection may not have auth headers
      })
      await this.client.connect(this.transport)
      console.log('[MCP] Connected via SSE transport')
    } catch (error) {
      throw new Error(`Failed to connect to MCP server: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Disconnect from the MCP server
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close()
      this.client = null
      this.transport = null
    }
  }

  /**
   * List available tools from the server
   */
  async listTools(): Promise<McpTool[]> {
    if (!this.client) {
      throw new Error('Not connected to MCP server')
    }

    const result = await this.client.listTools()
    return result.tools || []
  }

  /**
   * Discover tools from the server
   * Connects, fetches tool list, and disconnects
   */
  async discoverTools(): Promise<DiscoveredTool[]> {
    try {
      // Connect to server
      await this.connect()

      // Get tools list
      const tools = await this.listTools()

      // Convert to our format
      return tools.map(tool => ({
        name: tool.name,
        description: tool.description || `Tool: ${tool.name}`,
        inputSchema: convertMcpSchemaToToolInputSchema(tool.inputSchema as JsonSchema | undefined),
      }))
    } finally {
      // Always disconnect
      await this.disconnect()
    }
  }
}

/**
 * Convert MCP JSON Schema to our ToolInputSchema format
 */
function convertMcpSchemaToToolInputSchema(schema?: JsonSchema): ToolInputSchema {
  if (!schema || !schema.properties) {
    return { inputs: [] }
  }

  const inputs: ToolInput[] = []
  const required = schema.required || []

  for (const [name, prop] of Object.entries(schema.properties)) {
    const input = convertPropertyToToolInput(name, prop, required.includes(name))
    inputs.push(input)
  }

  return { inputs }
}

/**
 * Convert a JSON Schema property to a ToolInput
 */
function convertPropertyToToolInput(
  name: string,
  prop: JsonSchemaProperty,
  isRequired: boolean
): ToolInput {
  const type = getToolInputType(prop)

  const input: ToolInput = {
    name,
    description: prop.description || `Input: ${name}`,
    type,
    required: isRequired,
  }

  if (prop.default !== undefined) {
    input.default = prop.default
  }

  // Handle array items
  if (type === 'list' && prop.items) {
    input.listItemType = getToolInputType(prop.items)

    // If list contains objects, convert nested properties
    if (input.listItemType === 'object' && prop.items.properties) {
      input.listItemProperties = []
      const itemRequired = prop.items.required || []
      for (const [itemName, itemProp] of Object.entries(prop.items.properties)) {
        input.listItemProperties.push(
          convertPropertyToToolInput(itemName, itemProp, itemRequired.includes(itemName))
        )
      }
    }
  }

  // Handle object properties
  if (type === 'object' && prop.properties) {
    input.properties = []
    const objRequired = prop.required || []
    for (const [propName, propSchema] of Object.entries(prop.properties)) {
      input.properties.push(
        convertPropertyToToolInput(propName, propSchema, objRequired.includes(propName))
      )
    }
  }

  return input
}

/**
 * Map JSON Schema type to ToolInputType
 */
function getToolInputType(prop: JsonSchemaProperty): ToolInputType {
  const type = Array.isArray(prop.type) ? prop.type[0] : prop.type

  switch (type) {
    case 'string':
      return 'text'
    case 'number':
    case 'integer':
      return 'number'
    case 'boolean':
      return 'boolean'
    case 'array':
      return 'list'
    case 'object':
      return 'object'
    default:
      return 'text' // Default to text for unknown types
  }
}

/**
 * Discover tools from an MCP server
 */
export async function discoverMcpTools(
  serverUrl: string,
  auth?: McpAuth
): Promise<DiscoveredTool[]> {
  const client = new McpClient(serverUrl, auth)
  return client.discoverTools()
}
