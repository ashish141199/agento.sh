/**
 * AWS S3 Service
 * Handles file uploads, downloads, and management with S3
 */

import crypto from 'node:crypto'
import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type {
  AllowedFileTypes,
  PresignedUrlRequest,
  PresignedUrlResponse,
  S3Config,
  S3DeleteRequest,
  S3FileInfo,
  S3ListRequest,
  S3ListResponse,
  S3UploadRequest,
  S3UploadResponse,
} from '../types/s3'
import { S3_KNOWLEDGE_DEFAULTS, FILE_UPLOAD_DEFAULTS } from '../config/knowledge.defaults'

/**
 * AWS S3 Service class
 * Provides methods for file operations with S3
 */
export class S3Service {
  private client: S3Client
  private bucket: string
  private publicBaseUrl: string

  constructor() {
    const config = this.loadS3Config()

    this.client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    })

    this.bucket = config.bucket
    this.publicBaseUrl =
      config.publicBaseUrl ||
      `https://${config.bucket}.s3.${config.region}.amazonaws.com`

    console.log('[S3Service] Initialized', {
      bucket: this.bucket,
      region: config.region,
      publicBaseUrl: this.publicBaseUrl,
    })
  }

  /**
   * Load S3 configuration from environment
   * @returns S3 configuration object
   */
  private loadS3Config(): S3Config {
    const config = {
      region: process.env.AWS_S3_REGION || 'ap-south-1',
      bucket: process.env.AWS_S3_BUCKET || S3_KNOWLEDGE_DEFAULTS.bucket,
      accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY || '',
      publicBaseUrl: process.env.AWS_S3_PUBLIC_BASE_URL,
    }

    if (!config.bucket || !config.accessKeyId || !config.secretAccessKey) {
      throw new Error(
        'Missing required AWS S3 configuration. Please set AWS_S3_ACCESS_KEY_ID, AWS_S3_SECRET_ACCESS_KEY, and AWS_S3_BUCKET environment variables.'
      )
    }

    return config
  }

  /**
   * Upload file to S3
   * @param request - Upload request with file data
   * @returns Upload response with file URL
   */
  async uploadFile(request: S3UploadRequest): Promise<S3UploadResponse> {
    try {
      const key = this.generateFileKey(
        request.fileName,
        request.folder,
        request.agentId
      )

      if (!this.isAllowedFileType(request.contentType)) {
        return {
          success: false,
          message: `File type ${request.contentType} is not allowed`,
        }
      }

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: request.file,
        ContentType: request.contentType,
        Metadata: {
          originalName: request.fileName,
          userId: request.userId || 'anonymous',
          agentId: request.agentId || '',
          uploadedAt: new Date().toISOString(),
        },
      })

      await this.client.send(command)

      const fileInfo: S3FileInfo = {
        key,
        url: `${this.publicBaseUrl}/${key}`,
        fileName: request.fileName,
        contentType: request.contentType,
        size: request.file.length,
        folder: request.folder,
        userId: request.userId,
        agentId: request.agentId,
        uploadedAt: new Date().toISOString(),
      }

      console.log('[S3Service] File uploaded', {
        key,
        size: request.file.length,
        contentType: request.contentType,
        agentId: request.agentId,
      })

      return {
        success: true,
        message: 'File uploaded successfully',
        data: fileInfo,
      }
    } catch (error) {
      console.error('[S3Service] Upload failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        fileName: request.fileName,
        contentType: request.contentType,
      })

      return {
        success: false,
        message: error instanceof Error ? error.message : 'Upload failed',
      }
    }
  }

  /**
   * Get file from S3 as buffer
   * @param key - S3 object key
   * @returns File buffer or null if not found
   */
  async getFile(key: string): Promise<Buffer | null> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })

      const response = await this.client.send(command)

      if (!response.Body) {
        return null
      }

      const bytes = await response.Body.transformToByteArray()
      return Buffer.from(bytes)
    } catch (error) {
      console.error('[S3Service] Get file failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        key,
      })
      return null
    }
  }

  /**
   * Delete file from S3
   * @param request - Delete request
   * @returns Success status
   */
  async deleteFile(
    request: S3DeleteRequest
  ): Promise<{ success: boolean; message: string }> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: request.key,
      })

      await this.client.send(command)

      console.log('[S3Service] File deleted', {
        key: request.key,
        userId: request.userId,
      })

      return {
        success: true,
        message: 'File deleted successfully',
      }
    } catch (error) {
      console.error('[S3Service] Delete failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        key: request.key,
      })

      return {
        success: false,
        message: error instanceof Error ? error.message : 'Delete failed',
      }
    }
  }

  /**
   * List files in S3
   * @param request - List request
   * @returns List of files
   */
  async listFiles(request: S3ListRequest = {}): Promise<S3ListResponse> {
    try {
      const prefix = this.buildPrefix(request.folder, request.agentId)

      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        MaxKeys: request.limit || 50,
        ContinuationToken: request.continuationToken,
      })

      const response = await this.client.send(command)

      const files: S3FileInfo[] = (response.Contents || []).map((object) => ({
        key: object.Key!,
        url: `${this.publicBaseUrl}/${object.Key}`,
        fileName: this.extractFileName(object.Key!),
        contentType: 'application/octet-stream',
        size: object.Size || 0,
        uploadedAt: object.LastModified?.toISOString() || new Date().toISOString(),
      }))

      console.log('[S3Service] Files listed', {
        prefix,
        count: files.length,
        agentId: request.agentId,
      })

      return {
        success: true,
        message: 'Files listed successfully',
        data: files,
        continuationToken: response.NextContinuationToken || undefined,
        hasMore: response.IsTruncated || false,
      }
    } catch (error) {
      console.error('[S3Service] List failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        agentId: request.agentId,
      })

      return {
        success: false,
        message: error instanceof Error ? error.message : 'List failed',
        data: [],
        hasMore: false,
      }
    }
  }

  /**
   * Generate presigned URL for direct upload
   * @param request - Presigned URL request
   * @returns Presigned URL response
   */
  async generatePresignedUploadUrl(
    request: PresignedUrlRequest
  ): Promise<PresignedUrlResponse> {
    try {
      if (!request.fileName) {
        return {
          success: false,
          message: 'File name is required',
        }
      }

      const key = this.generateFileKey(
        request.fileName,
        request.folder,
        request.agentId
      )

      if (!this.isAllowedFileType(request.contentType)) {
        return {
          success: false,
          message: `File type ${request.contentType} is not allowed`,
        }
      }

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: request.contentType,
      })

      const uploadUrl = await getSignedUrl(this.client, command, {
        expiresIn: request.expiresIn || 3600,
      })

      const fileUrl = `${this.publicBaseUrl}/${key}`

      console.log('[S3Service] Presigned URL generated', {
        key,
        contentType: request.contentType,
        expiresIn: request.expiresIn || 3600,
        agentId: request.agentId,
      })

      return {
        success: true,
        message: 'Presigned URL generated successfully',
        data: {
          uploadUrl,
          fileUrl,
          key,
        },
      }
    } catch (error) {
      console.error('[S3Service] Presigned URL generation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        fileName: request.fileName,
      })

      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Presigned URL generation failed',
      }
    }
  }

  /**
   * Generate unique file key with agent-based folder structure
   * Format: agents/{agentId}/knowledge/{timestamp}-{random}-{sanitizedName}
   * @param fileName - Original file name
   * @param folder - Optional custom folder
   * @param agentId - Optional agent ID for folder organization
   * @returns S3 object key
   */
  private generateFileKey(
    fileName: string,
    folder?: string,
    agentId?: string
  ): string {
    const timestamp = Date.now()
    const random = crypto.randomBytes(8).toString('hex')
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')

    const uniqueName = `${timestamp}-${random}-${sanitizedName}`

    if (agentId) {
      const knowledgeFolder = folder || S3_KNOWLEDGE_DEFAULTS.knowledgeFolder
      return `${S3_KNOWLEDGE_DEFAULTS.basePath}/${agentId}/${knowledgeFolder}/${uniqueName}`
    }

    if (folder && folder.trim() !== '') {
      return `${folder}/${uniqueName}`
    }

    return uniqueName
  }

  /**
   * Build S3 prefix for listing
   * @param folder - Optional folder
   * @param agentId - Optional agent ID
   * @returns S3 prefix string
   */
  private buildPrefix(folder?: string, agentId?: string): string {
    if (agentId) {
      const knowledgeFolder = folder || S3_KNOWLEDGE_DEFAULTS.knowledgeFolder
      return `${S3_KNOWLEDGE_DEFAULTS.basePath}/${agentId}/${knowledgeFolder}/`
    }

    if (folder && folder.trim() !== '') {
      return `${folder}/`
    }

    return ''
  }

  /**
   * Extract file name from S3 key
   * @param key - S3 object key
   * @returns File name
   */
  private extractFileName(key: string): string {
    const parts = key.split('/')
    const fileName = parts[parts.length - 1]

    if (!fileName) {
      return 'unknown-file'
    }

    const match = fileName.match(/^\d+-[a-f0-9]+-(.+)$/)
    return match?.[1] || fileName
  }

  /**
   * Validate file type
   * @param contentType - MIME type
   * @returns True if allowed
   */
  private isAllowedFileType(
    contentType: string
  ): contentType is AllowedFileTypes {
    const allowedTypes = FILE_UPLOAD_DEFAULTS.allowedMimeTypes
    return (allowedTypes as readonly string[]).includes(contentType)
  }
}

/** Singleton S3 service instance */
export const s3Service = new S3Service()
