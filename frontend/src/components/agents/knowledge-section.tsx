'use client'

import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, Globe, Trash2, RefreshCw, AlertCircle, CheckCircle, Loader2, X, Cloud, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useAuthStore } from '@/stores/auth.store'
import { knowledgeService } from '@/services/knowledge.service'
import type { KnowledgeSource, KnowledgeSourceStatus, WebsiteSourceMetadata, FileSourceMetadata } from '@/types/api/knowledge'
import { cn } from '@/lib/utils'
import {
  KnowledgeProcessingDialog,
  type PendingSource,
} from './knowledge-processing-dialog'

/**
 * Accepted file types for knowledge upload
 * Keep in sync with backend FILE_UPLOAD_DEFAULTS.allowedMimeTypes
 */
const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/plain': ['.txt'],
  'text/csv': ['.csv'],
  'text/markdown': ['.md'],
  'text/typescript': ['.ts', '.tsx'],
  'text/javascript': ['.js', '.jsx'],
  'application/json': ['.json'],
}

/**
 * Max file size in bytes (5MB)
 */
const MAX_FILE_SIZE = 5 * 1024 * 1024

/**
 * Get icon for source type
 */
function getSourceIcon(type: string) {
  switch (type) {
    case 'website':
      return Globe
    case 'file':
      return FileText
    default:
      return Cloud
  }
}

/**
 * Get status color and icon
 */
function getStatusDisplay(status: KnowledgeSourceStatus) {
  switch (status) {
    case 'ready':
      return { color: 'text-green-600', bgColor: 'bg-green-50 dark:bg-green-950/30', Icon: CheckCircle, label: 'Ready' }
    case 'processing':
      return { color: 'text-amber-600', bgColor: 'bg-amber-50 dark:bg-amber-950/30', Icon: Loader2, label: 'Processing', spin: true }
    case 'failed':
      return { color: 'text-red-600', bgColor: 'bg-red-50 dark:bg-red-950/30', Icon: AlertCircle, label: 'Failed' }
    default:
      return { color: 'text-neutral-600', bgColor: 'bg-neutral-50 dark:bg-neutral-800', Icon: Loader2, label: 'Pending', spin: true }
  }
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Get additional metadata display for a source
 */
function getSourceMetadataDisplay(source: KnowledgeSource): string | null {
  if (source.type === 'website' && source.metadata) {
    const meta = source.metadata as WebsiteSourceMetadata
    if (meta.pagesCrawled) {
      return `${meta.pagesCrawled} page${meta.pagesCrawled !== 1 ? 's' : ''}`
    }
  } else if (source.type === 'file' && source.metadata) {
    const meta = source.metadata as FileSourceMetadata
    const parts: string[] = []
    if (meta.totalFiles && meta.totalFiles > 1) {
      parts.push(`${meta.totalFiles} files`)
    }
    if (meta.totalSizeBytes) {
      parts.push(formatFileSize(meta.totalSizeBytes))
    }
    return parts.length > 0 ? parts.join(' · ') : null
  }
  return null
}

interface KnowledgeSectionProps {
  agentId: string | null
  disabled?: boolean
}

/**
 * Knowledge section component for agent instructions form
 * Uses a staged confirmation flow before processing sources
 */
export function KnowledgeSection({ agentId, disabled = false }: KnowledgeSectionProps) {
  const { accessToken } = useAuthStore()
  const [sources, setSources] = useState<KnowledgeSource[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retrainingId, setRetrainingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Delete confirmation dialog state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [sourceToDelete, setSourceToDelete] = useState<KnowledgeSource | null>(null)

  // Pending sources for the confirmation dialog
  const [pendingSources, setPendingSources] = useState<PendingSource[]>([])
  const [showProcessingDialog, setShowProcessingDialog] = useState(false)

  // URL input state
  const [urlInput, setUrlInput] = useState('')

  /**
   * Load knowledge sources for the agent
   */
  const loadSources = useCallback(async () => {
    if (!agentId || !accessToken) return

    setIsLoading(true)
    try {
      const response = await knowledgeService.list(agentId, accessToken)
      if (response.success && response.data) {
        setSources(response.data.sources)
      }
    } catch (error) {
      console.error('Failed to load knowledge sources:', error)
    } finally {
      setIsLoading(false)
    }
  }, [agentId, accessToken])

  /**
   * Load sources when agent ID changes
   */
  useEffect(() => {
    if (agentId) {
      loadSources()
    }
  }, [agentId, loadSources])

  /**
   * Handle file drop - add to pending sources instead of immediate upload
   */
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (disabled) return

    const validFiles = acceptedFiles.filter(file => {
      if (file.size > MAX_FILE_SIZE) {
        setError(`File "${file.name}" exceeds 5MB limit`)
        return false
      }
      return true
    })

    if (validFiles.length === 0) return

    // Add files to pending sources
    const newSources: PendingSource[] = validFiles.map(file => ({
      id: `file-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type: 'file',
      name: file.name,
      file,
      size: file.size,
    }))

    setPendingSources(prev => [...prev, ...newSources])
    setError(null)

    // Automatically open the dialog when files are added
    setShowProcessingDialog(true)
  }, [disabled])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    disabled: disabled || !agentId,
    multiple: true,
    maxSize: MAX_FILE_SIZE,
  })

  /**
   * Handle adding a URL to pending sources
   */
  const handleAddUrl = useCallback(() => {
    if (!urlInput.trim()) return

    try {
      new URL(urlInput)
    } catch {
      setError('Please enter a valid URL')
      return
    }

    const domain = new URL(urlInput).hostname.replace('www.', '')
    const newSource: PendingSource = {
      id: `url-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type: 'website',
      name: `Website: ${domain}`,
      url: urlInput,
    }

    setPendingSources(prev => [...prev, newSource])
    setUrlInput('')
    setError(null)

    // Automatically open the dialog when URL is added
    setShowProcessingDialog(true)
  }, [urlInput])

  /**
   * Process a single source - called by the dialog for each source
   */
  const handleProcessSource = useCallback(async (source: PendingSource) => {
    if (!agentId || !accessToken) {
      return { sourceId: source.id, success: false, error: 'Not authenticated' }
    }

    if (source.type === 'file' && source.file) {
      try {
        const response = await knowledgeService.uploadFiles(agentId, [source.file], accessToken)

        if (response.success && response.data) {
          const fileResult = response.data.files[0]
          return {
            sourceId: source.id,
            success: fileResult?.success ?? false,
            error: fileResult?.error,
          }
        } else {
          return {
            sourceId: source.id,
            success: false,
            error: response.message || 'Upload failed',
          }
        }
      } catch (error) {
        return {
          sourceId: source.id,
          success: false,
          error: error instanceof Error ? error.message : 'Upload failed',
        }
      }
    } else if (source.type === 'website' && source.url) {
      try {
        const response = await knowledgeService.addWebsite(agentId, source.url, accessToken)
        return {
          sourceId: source.id,
          success: response.success,
          error: response.success ? undefined : response.message,
        }
      } catch (error) {
        return {
          sourceId: source.id,
          success: false,
          error: error instanceof Error ? error.message : 'Failed to add website',
        }
      }
    }

    return { sourceId: source.id, success: false, error: 'Unknown source type' }
  }, [agentId, accessToken])

  /**
   * Handle dialog close and cleanup
   */
  const handleProcessingComplete = useCallback(() => {
    setPendingSources([])
    loadSources()
  }, [loadSources])

  /**
   * Handle retrain
   */
  const handleRetrain = async (sourceId: string) => {
    if (!agentId || !accessToken) return

    setRetrainingId(sourceId)
    try {
      const result = await knowledgeService.retrain(agentId, sourceId, accessToken)
      if (result.success) {
        await loadSources()
      }
    } catch (error) {
      console.error('Retrain failed:', error)
    } finally {
      setRetrainingId(null)
    }
  }

  /**
   * Open delete confirmation dialog
   */
  const handleDeleteClick = (source: KnowledgeSource) => {
    setSourceToDelete(source)
    setDeleteConfirmOpen(true)
  }

  /**
   * Confirm and execute delete
   */
  const confirmDelete = async () => {
    if (!agentId || !accessToken || !sourceToDelete) return

    setDeletingId(sourceToDelete.id)
    setDeleteConfirmOpen(false)

    try {
      const result = await knowledgeService.delete(agentId, sourceToDelete.id, accessToken)
      if (result.success) {
        setSources(prev => prev.filter(s => s.id !== sourceToDelete.id))
      }
    } catch (error) {
      console.error('Delete failed:', error)
    } finally {
      setDeletingId(null)
      setSourceToDelete(null)
    }
  }

  // If no agent ID, show message to save agent first
  if (!agentId) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label>Knowledge</Label>
          <span className="text-xs text-neutral-400 dark:text-neutral-500">optional</span>
        </div>
        <div className="rounded-lg border border-dashed border-neutral-200 dark:border-neutral-800 p-6 text-center">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Save your agent first to add knowledge
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Label>Knowledge</Label>
        <span className="text-xs text-neutral-400 dark:text-neutral-500">optional</span>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 rounded-md bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto hover:text-red-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* File drop zone */}
      <div
        {...getRootProps()}
        className={cn(
          'relative rounded-lg border-2 border-dashed p-6 transition-colors cursor-pointer',
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center gap-2 text-center">
          <Upload className="h-8 w-8 text-neutral-400" />
          <p className="text-sm font-medium">
            {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
          </p>
          <p className="text-xs text-neutral-500">
            PDF, Word, Excel, CSV, TXT, MD, TS, JS, JSON - Max 5MB per file
          </p>
        </div>
      </div>

      {/* URL input and buttons */}
      <div className="flex gap-2">
        <Input
          placeholder="https://example.com"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleAddUrl()
            }
          }}
          disabled={disabled}
          className="flex-1"
        />
        <Button
          variant="outline"
          size="icon"
          onClick={handleAddUrl}
          disabled={disabled || !urlInput.trim()}
          title="Add website"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled className="cursor-not-allowed">
          <Cloud className="h-4 w-4 mr-2" />
          Google Drive
          <span className="ml-2 text-xs text-neutral-400">(Coming soon)</span>
        </Button>
      </div>

      {/* Knowledge sources list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
        </div>
      ) : sources.length > 0 ? (
        <div className="space-y-2">
          {sources.map((source) => {
            const SourceIcon = getSourceIcon(source.type)
            const statusDisplay = getStatusDisplay(source.status)
            const StatusIcon = statusDisplay.Icon
            const metadataDisplay = getSourceMetadataDisplay(source)

            return (
              <div
                key={source.id}
                className="flex items-center gap-3 rounded-lg border border-neutral-200 dark:border-neutral-800 p-3"
              >
                <div className={cn('rounded-md p-2', statusDisplay.bgColor)}>
                  <SourceIcon className={cn('h-4 w-4', statusDisplay.color)} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{source.name}</p>
                  <div className="flex items-center gap-1 flex-wrap text-xs text-neutral-500">
                    <StatusIcon
                      className={cn(
                        'h-3 w-3',
                        statusDisplay.color,
                        statusDisplay.spin && 'animate-spin'
                      )}
                    />
                    <span>{statusDisplay.label}</span>
                    {source.status === 'ready' && (
                      <>
                        <span>·</span>
                        <span>{source.chunkCount} chunks</span>
                        {metadataDisplay && (
                          <>
                            <span>·</span>
                            <span>{metadataDisplay}</span>
                          </>
                        )}
                      </>
                    )}
                    {source.status === 'failed' && source.errorMessage && (
                      <span className="text-red-500 truncate">· {source.errorMessage}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRetrain(source.id)}
                    disabled={retrainingId === source.id || source.status === 'processing'}
                    title="Retrain"
                  >
                    <RefreshCw
                      className={cn(
                        'h-4 w-4',
                        retrainingId === source.id && 'animate-spin'
                      )}
                    />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteClick(source)}
                    disabled={deletingId === source.id}
                    title="Delete"
                  >
                    {deletingId === source.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-red-500" />
                    )}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      ) : null}

      {/* Processing Dialog */}
      <KnowledgeProcessingDialog
        open={showProcessingDialog}
        onOpenChange={setShowProcessingDialog}
        initialSources={pendingSources}
        agentId={agentId}
        onProcessSource={handleProcessSource}
        onComplete={handleProcessingComplete}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Knowledge Source</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{sourceToDelete?.name}&rdquo;? This will remove all indexed content and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
