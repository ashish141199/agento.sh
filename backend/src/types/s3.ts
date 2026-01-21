/**
 * S3 service type definitions
 */

/**
 * S3 configuration
 */
export interface S3Config {
  /** AWS region */
  region: string
  /** S3 bucket name */
  bucket: string
  /** AWS access key ID */
  accessKeyId: string
  /** AWS secret access key */
  secretAccessKey: string
  /** Optional public base URL for the bucket */
  publicBaseUrl?: string
}

/**
 * Allowed file types for upload
 */
export type AllowedFileTypes =
  // Documents
  | 'application/pdf'
  | 'text/plain'
  | 'text/csv'
  | 'text/markdown'
  | 'application/json'
  | 'application/msword'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  | 'application/vnd.ms-excel'
  | 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

/**
 * File information stored in S3
 */
export interface S3FileInfo {
  /** S3 object key */
  key: string
  /** Public URL */
  url: string
  /** Original file name */
  fileName: string
  /** MIME type */
  contentType: string
  /** File size in bytes */
  size: number
  /** Optional folder path */
  folder?: string
  /** Optional user ID */
  userId?: string
  /** Optional agent ID */
  agentId?: string
  /** Upload timestamp */
  uploadedAt: string
}

/**
 * Upload request
 */
export interface S3UploadRequest {
  /** File buffer */
  file: Buffer
  /** Original file name */
  fileName: string
  /** MIME type */
  contentType: string
  /** Optional folder */
  folder?: string
  /** Optional user ID */
  userId?: string
  /** Optional agent ID */
  agentId?: string
}

/**
 * Upload response
 */
export interface S3UploadResponse {
  success: boolean
  message: string
  data?: S3FileInfo
}

/**
 * Delete request
 */
export interface S3DeleteRequest {
  /** S3 object key */
  key: string
  /** Optional user ID for logging */
  userId?: string
}

/**
 * List request
 */
export interface S3ListRequest {
  /** Folder to list */
  folder?: string
  /** User ID */
  userId?: string
  /** Agent ID */
  agentId?: string
  /** Maximum results */
  limit?: number
  /** Continuation token for pagination */
  continuationToken?: string
}

/**
 * List response
 */
export interface S3ListResponse {
  success: boolean
  message: string
  data: S3FileInfo[]
  /** Token for next page */
  continuationToken?: string
  /** Whether more results exist */
  hasMore: boolean
}

/**
 * Presigned URL request
 */
export interface PresignedUrlRequest {
  /** File name */
  fileName: string
  /** MIME type */
  contentType: string
  /** Optional folder */
  folder?: string
  /** Optional user ID */
  userId?: string
  /** Optional agent ID */
  agentId?: string
  /** URL expiration in seconds (default: 3600) */
  expiresIn?: number
}

/**
 * Presigned URL response
 */
export interface PresignedUrlResponse {
  success: boolean
  message: string
  data?: {
    /** Presigned upload URL */
    uploadUrl: string
    /** Final file URL after upload */
    fileUrl: string
    /** S3 object key */
    key: string
  }
}
