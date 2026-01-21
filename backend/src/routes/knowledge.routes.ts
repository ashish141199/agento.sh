/**
 * Knowledge routes
 * API endpoints for managing agent knowledge sources
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { authMiddleware } from '../middleware/auth.middleware'
import { agentBelongsToUser } from '../db/modules/agent/agent.db'
import {
  createFileKnowledgeSource,
  createWebsiteKnowledgeSource,
  deleteKnowledgeSourceWithFiles,
  retrainKnowledgeSource,
  searchKnowledge,
  findKnowledgeSourcesByAgentId,
  findKnowledgeSourceById,
  findKnowledgeFilesBySourceId,
  knowledgeSourceBelongsToUser,
  discoverWebsitePages,
  indexWebsitePages,
} from '../services/knowledge.service'
import { FILE_UPLOAD_DEFAULTS } from '../config/knowledge.defaults'

/**
 * Multipart file structure from Fastify
 */
interface MultipartFile {
  filename: string
  mimetype: string
  toBuffer(): Promise<Buffer>
}

/**
 * Register knowledge routes
 * @param fastify - Fastify instance
 */
export async function knowledgeRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * Get all knowledge sources for an agent
   * GET /agents/:agentId/knowledge
   */
  fastify.get(
    '/agents/:agentId/knowledge',
    { preHandler: authMiddleware },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.userId!
      const { agentId } = request.params as { agentId: string }

      // Check agent ownership
      const belongsToUser = await agentBelongsToUser(agentId, userId)
      if (!belongsToUser) {
        return reply.status(404).send({
          success: false,
          message: 'Agent not found',
        })
      }

      const sources = await findKnowledgeSourcesByAgentId(agentId)

      return reply.send({
        success: true,
        message: 'Knowledge sources retrieved',
        data: { sources },
      })
    }
  )

  /**
   * Get a specific knowledge source with files
   * GET /agents/:agentId/knowledge/:sourceId
   */
  fastify.get(
    '/agents/:agentId/knowledge/:sourceId',
    { preHandler: authMiddleware },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.userId!
      const { agentId, sourceId } = request.params as {
        agentId: string
        sourceId: string
      }

      // Check agent ownership
      const belongsToUser = await agentBelongsToUser(agentId, userId)
      if (!belongsToUser) {
        return reply.status(404).send({
          success: false,
          message: 'Agent not found',
        })
      }

      const source = await findKnowledgeSourceById(sourceId)
      if (!source || source.agentId !== agentId) {
        return reply.status(404).send({
          success: false,
          message: 'Knowledge source not found',
        })
      }

      const files = await findKnowledgeFilesBySourceId(sourceId)

      return reply.send({
        success: true,
        message: 'Knowledge source retrieved',
        data: { source, files },
      })
    }
  )

  /**
   * Upload files to create a knowledge source
   * POST /agents/:agentId/knowledge/files
   * Content-Type: multipart/form-data
   */
  fastify.post(
    '/agents/:agentId/knowledge/files',
    { preHandler: authMiddleware },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.userId!
      const { agentId } = request.params as { agentId: string }

      // Check agent ownership
      const belongsToUser = await agentBelongsToUser(agentId, userId)
      if (!belongsToUser) {
        return reply.status(404).send({
          success: false,
          message: 'Agent not found',
        })
      }

      // Get files from multipart request
      const parts = request.parts()
      const files: Array<{
        buffer: Buffer
        fileName: string
        mimeType: string
        size: number
      }> = []

      for await (const part of parts) {
        if (part.type === 'file') {
          const file = part as unknown as MultipartFile
          const buffer = await file.toBuffer()

          // Validate file size
          if (buffer.length > FILE_UPLOAD_DEFAULTS.maxFileSizeBytes) {
            return reply.status(400).send({
              success: false,
              message: `File "${file.filename}" exceeds maximum size of ${FILE_UPLOAD_DEFAULTS.maxFileSizeBytes / 1024 / 1024}MB`,
            })
          }

          // Validate file type
          if (
            !(FILE_UPLOAD_DEFAULTS.allowedMimeTypes as readonly string[]).includes(
              file.mimetype
            )
          ) {
            return reply.status(400).send({
              success: false,
              message: `File type "${file.mimetype}" is not supported`,
            })
          }

          files.push({
            buffer,
            fileName: file.filename,
            mimeType: file.mimetype,
            size: buffer.length,
          })
        }
      }

      if (files.length === 0) {
        return reply.status(400).send({
          success: false,
          message: 'No files provided',
        })
      }

      try {
        const result = await createFileKnowledgeSource(agentId, userId, files)

        return reply.send({
          success: true,
          message: 'Knowledge source created',
          data: result,
        })
      } catch (error) {
        console.error('[KnowledgeRoutes] File upload error:', error)
        return reply.status(400).send({
          success: false,
          message: error instanceof Error ? error.message : 'Upload failed',
        })
      }
    }
  )

  /**
   * Add a website as knowledge source
   * POST /agents/:agentId/knowledge/website
   */
  fastify.post(
    '/agents/:agentId/knowledge/website',
    { preHandler: authMiddleware },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.userId!
      const { agentId } = request.params as { agentId: string }
      const { url } = request.body as { url: string }

      // Check agent ownership
      const belongsToUser = await agentBelongsToUser(agentId, userId)
      if (!belongsToUser) {
        return reply.status(404).send({
          success: false,
          message: 'Agent not found',
        })
      }

      if (!url) {
        return reply.status(400).send({
          success: false,
          message: 'URL is required',
        })
      }

      try {
        // Validate URL
        new URL(url)
      } catch {
        return reply.status(400).send({
          success: false,
          message: 'Invalid URL',
        })
      }

      try {
        const source = await createWebsiteKnowledgeSource(agentId, userId, url)

        return reply.send({
          success: true,
          message: 'Website knowledge source created',
          data: { source },
        })
      } catch (error) {
        console.error('[KnowledgeRoutes] Website crawl error:', error)
        return reply.status(400).send({
          success: false,
          message: error instanceof Error ? error.message : 'Crawl failed',
        })
      }
    }
  )

  /**
   * Discover pages of a website (fast, no indexing)
   * POST /agents/:agentId/knowledge/website/discover
   */
  fastify.post(
    '/agents/:agentId/knowledge/website/discover',
    { preHandler: authMiddleware },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.userId!
      const { agentId } = request.params as { agentId: string }
      const { url } = request.body as { url: string }

      // Check agent ownership
      const belongsToUser = await agentBelongsToUser(agentId, userId)
      if (!belongsToUser) {
        return reply.status(404).send({
          success: false,
          message: 'Agent not found',
        })
      }

      if (!url) {
        return reply.status(400).send({
          success: false,
          message: 'URL is required',
        })
      }

      try {
        // Validate URL
        new URL(url)
      } catch {
        return reply.status(400).send({
          success: false,
          message: 'Invalid URL',
        })
      }

      try {
        const result = await discoverWebsitePages(url)

        return reply.send({
          success: true,
          message: 'Website pages discovered',
          data: result,
        })
      } catch (error) {
        console.error('[KnowledgeRoutes] Website discovery error:', error)
        return reply.status(400).send({
          success: false,
          message: error instanceof Error ? error.message : 'Discovery failed',
        })
      }
    }
  )

  /**
   * Index specific pages of a website
   * POST /agents/:agentId/knowledge/website/index
   */
  fastify.post(
    '/agents/:agentId/knowledge/website/index',
    { preHandler: authMiddleware },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.userId!
      const { agentId } = request.params as { agentId: string }
      const { url, pageUrls } = request.body as { url: string; pageUrls: string[] }

      // Check agent ownership
      const belongsToUser = await agentBelongsToUser(agentId, userId)
      if (!belongsToUser) {
        return reply.status(404).send({
          success: false,
          message: 'Agent not found',
        })
      }

      if (!url) {
        return reply.status(400).send({
          success: false,
          message: 'URL is required',
        })
      }

      if (!pageUrls || !Array.isArray(pageUrls) || pageUrls.length === 0) {
        return reply.status(400).send({
          success: false,
          message: 'At least one page URL is required',
        })
      }

      try {
        const source = await indexWebsitePages(agentId, userId, url, pageUrls)

        return reply.send({
          success: true,
          message: 'Website indexed successfully',
          data: { source },
        })
      } catch (error) {
        console.error('[KnowledgeRoutes] Website index error:', error)
        return reply.status(400).send({
          success: false,
          message: error instanceof Error ? error.message : 'Indexing failed',
        })
      }
    }
  )

  /**
   * Retrain a knowledge source
   * POST /agents/:agentId/knowledge/:sourceId/retrain
   */
  fastify.post(
    '/agents/:agentId/knowledge/:sourceId/retrain',
    { preHandler: authMiddleware },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.userId!
      const { agentId, sourceId } = request.params as {
        agentId: string
        sourceId: string
      }

      // Check agent ownership
      const belongsToUser = await agentBelongsToUser(agentId, userId)
      if (!belongsToUser) {
        return reply.status(404).send({
          success: false,
          message: 'Agent not found',
        })
      }

      try {
        const source = await retrainKnowledgeSource(sourceId, userId)

        return reply.send({
          success: true,
          message: 'Knowledge source retrained',
          data: { source },
        })
      } catch (error) {
        console.error('[KnowledgeRoutes] Retrain error:', error)
        return reply.status(400).send({
          success: false,
          message: error instanceof Error ? error.message : 'Retrain failed',
        })
      }
    }
  )

  /**
   * Delete a knowledge source
   * DELETE /agents/:agentId/knowledge/:sourceId
   */
  fastify.delete(
    '/agents/:agentId/knowledge/:sourceId',
    { preHandler: authMiddleware },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.userId!
      const { agentId, sourceId } = request.params as {
        agentId: string
        sourceId: string
      }

      // Check agent ownership
      const belongsToUser = await agentBelongsToUser(agentId, userId)
      if (!belongsToUser) {
        return reply.status(404).send({
          success: false,
          message: 'Agent not found',
        })
      }

      try {
        await deleteKnowledgeSourceWithFiles(sourceId, userId)

        return reply.send({
          success: true,
          message: 'Knowledge source deleted',
        })
      } catch (error) {
        console.error('[KnowledgeRoutes] Delete error:', error)
        return reply.status(400).send({
          success: false,
          message: error instanceof Error ? error.message : 'Delete failed',
        })
      }
    }
  )

  /**
   * Search knowledge for an agent
   * POST /agents/:agentId/knowledge/search
   */
  fastify.post(
    '/agents/:agentId/knowledge/search',
    { preHandler: authMiddleware },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.userId!
      const { agentId } = request.params as { agentId: string }
      const { query, limit = 5, similarityThreshold = 0.7 } = request.body as {
        query: string
        limit?: number
        similarityThreshold?: number
      }

      // Check agent ownership
      const belongsToUser = await agentBelongsToUser(agentId, userId)
      if (!belongsToUser) {
        return reply.status(404).send({
          success: false,
          message: 'Agent not found',
        })
      }

      if (!query) {
        return reply.status(400).send({
          success: false,
          message: 'Query is required',
        })
      }

      try {
        const results = await searchKnowledge(
          agentId,
          query,
          Math.min(limit, 20),
          Math.max(0, Math.min(1, similarityThreshold))
        )

        return reply.send({
          success: true,
          message: 'Search completed',
          data: { results },
        })
      } catch (error) {
        console.error('[KnowledgeRoutes] Search error:', error)
        return reply.status(400).send({
          success: false,
          message: error instanceof Error ? error.message : 'Search failed',
        })
      }
    }
  )
}
