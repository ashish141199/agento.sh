/**
 * Tool Utilities Module
 * Provides interpolation and Zod schema building for tool inputs
 * @module utils/tool-utils
 */

import { z } from 'zod'
import type { ToolInput, ToolInputSchema } from '../db/schema/tools'

/**
 * Interpolates {{inputName}} placeholders in a string with actual values
 * Supports nested paths like {{location.city}}
 *
 * @param template - String containing {{placeholder}} patterns
 * @param inputs - Object containing input values
 * @returns Interpolated string with placeholders replaced
 *
 * @example
 * interpolate('Hello {{name}}!', { name: 'World' }) // 'Hello World!'
 * interpolate('/api/{{user.id}}', { user: { id: 123 } }) // '/api/123'
 */
export function interpolate(template: string, inputs: Record<string, unknown>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, path: string) => {
    const value = getNestedValue(inputs, path.trim())
    if (value === undefined || value === null) {
      return ''
    }
    // For objects/arrays, JSON stringify them
    if (typeof value === 'object') {
      return JSON.stringify(value)
    }
    return String(value)
  })
}

/**
 * Gets a nested value from an object using dot notation
 *
 * @param obj - Object to get value from
 * @param path - Dot-separated path (e.g., 'user.address.city')
 * @returns The value at the path, or undefined if not found
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.')
  let current: unknown = obj

  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined
    }
    if (typeof current !== 'object') {
      return undefined
    }
    current = (current as Record<string, unknown>)[key]
  }

  return current
}

/**
 * Converts a ToolInput to a Zod schema
 * Handles all input types including nested objects and lists
 *
 * @param input - The tool input definition
 * @returns Zod schema for the input
 */
function toolInputToZod(input: ToolInput): z.ZodType {
  let schema: z.ZodType

  switch (input.type) {
    case 'text':
      schema = z.string()
      break

    case 'number':
      schema = z.number()
      break

    case 'boolean':
      schema = z.boolean()
      break

    case 'list': {
      // Determine the item type
      let itemSchema: z.ZodType

      if (input.listItemType === 'object' && input.listItemProperties) {
        // List of objects
        itemSchema = buildObjectSchema(input.listItemProperties)
      } else if (input.listItemType) {
        // List of primitives
        itemSchema = getPrimitiveSchema(input.listItemType)
      } else {
        // Default to list of strings
        itemSchema = z.string()
      }

      schema = z.array(itemSchema)
      break
    }

    case 'object': {
      if (input.properties && input.properties.length > 0) {
        schema = buildObjectSchema(input.properties)
      } else {
        // Empty object or unknown structure
        schema = z.record(z.string(), z.unknown())
      }
      break
    }

    default:
      schema = z.unknown()
  }

  // Add description (critical for AI to understand the input)
  schema = schema.describe(input.description)

  // Handle required/optional and defaults
  if (!input.required) {
    if (input.default !== undefined) {
      schema = schema.optional().default(input.default)
    } else {
      schema = schema.optional()
    }
  }

  return schema
}

/**
 * Gets a Zod schema for a primitive type
 *
 * @param type - The primitive type
 * @returns Zod schema for the type
 */
function getPrimitiveSchema(type: string): z.ZodType {
  switch (type) {
    case 'text':
      return z.string()
    case 'number':
      return z.number()
    case 'boolean':
      return z.boolean()
    default:
      return z.unknown()
  }
}

/**
 * Builds a Zod object schema from an array of tool inputs
 *
 * @param inputs - Array of tool input definitions
 * @returns Zod object schema
 */
function buildObjectSchema(inputs: ToolInput[]): z.ZodObject<Record<string, z.ZodType>> {
  const shape: Record<string, z.ZodType> = {}

  for (const input of inputs) {
    shape[input.name] = toolInputToZod(input)
  }

  return z.object(shape)
}

/**
 * Builds a complete Zod schema from a ToolInputSchema
 * This is the main function to use for converting tool inputs to a Zod schema
 *
 * @param inputSchema - The tool input schema definition
 * @returns Zod object schema for all inputs
 *
 * @example
 * const schema = buildToolInputZodSchema({
 *   inputs: [
 *     { name: 'city', type: 'text', required: true, description: 'City name' },
 *     { name: 'days', type: 'number', required: false, default: 5, description: 'Forecast days' }
 *   ]
 * })
 * // Returns z.object({ city: z.string(), days: z.number().optional().default(5) })
 */
export function buildToolInputZodSchema(inputSchema: ToolInputSchema | null | undefined): z.ZodObject<Record<string, z.ZodType>> {
  if (!inputSchema || !inputSchema.inputs || inputSchema.inputs.length === 0) {
    // Return empty object schema if no inputs defined
    return z.object({})
  }

  return buildObjectSchema(inputSchema.inputs)
}

/**
 * Validates inputs against a tool input schema
 * Returns validated data or throws an error
 *
 * @param inputSchema - The tool input schema
 * @param inputs - The inputs to validate
 * @returns Validated inputs
 * @throws ZodError if validation fails
 */
export function validateToolInputs(
  inputSchema: ToolInputSchema | null | undefined,
  inputs: Record<string, unknown>
): Record<string, unknown> {
  const zodSchema = buildToolInputZodSchema(inputSchema)
  return zodSchema.parse(inputs)
}

/**
 * Safely validates inputs and returns result with success flag
 *
 * @param inputSchema - The tool input schema
 * @param inputs - The inputs to validate
 * @returns Object with success flag and either data or error
 */
export function safeValidateToolInputs(
  inputSchema: ToolInputSchema | null | undefined,
  inputs: Record<string, unknown>
): { success: true; data: Record<string, unknown> } | { success: false; error: z.ZodError } {
  const zodSchema = buildToolInputZodSchema(inputSchema)
  const result = zodSchema.safeParse(inputs)

  if (result.success) {
    return { success: true, data: result.data }
  } else {
    return { success: false, error: result.error }
  }
}

/**
 * Extracts all input names from a template string
 * Useful for showing which inputs are used in a configuration
 *
 * @param template - String containing {{placeholder}} patterns
 * @returns Array of unique input names found
 *
 * @example
 * extractInputNames('Hello {{name}}, your id is {{user.id}}')
 * // Returns ['name', 'user.id']
 */
export function extractInputNames(template: string): string[] {
  const matches = template.match(/\{\{([^}]+)\}\}/g) || []
  const names = matches.map(match => match.replace(/^\{\{|\}\}$/g, '').trim())
  return [...new Set(names)]
}

/**
 * Checks if a template string contains any interpolation placeholders
 *
 * @param template - String to check
 * @returns True if template contains {{...}} patterns
 */
export function hasInterpolation(template: string): boolean {
  return /\{\{[^}]+\}\}/.test(template)
}
