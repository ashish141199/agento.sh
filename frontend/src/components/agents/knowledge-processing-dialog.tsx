'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import {
  Upload,
  FileText,
  Globe,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  Plus,
  RotateCcw,
  Search,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { knowledgeService } from '@/services/knowledge.service'
import { useAuthStore } from '@/stores/auth.store'

/**
 * Accepted file types for knowledge upload
 */
const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],
  'text/plain': ['.txt'],
  'text/csv': ['.csv'],
  'text/markdown': ['.md'],
  'application/json': ['.json'],
}

const MAX_FILE_SIZE = 5 * 1024 * 1024

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Discovered page info */
export interface DiscoveredPage {
  url: string
  title: string
  selected: boolean
}

/** Discovery status for a website */
export interface DiscoveryStatus {
  status: 'pending' | 'discovering' | 'complete' | 'failed'
  pages?: DiscoveredPage[]
  error?: string
}

/** A pending source to be processed */
export interface PendingSource {
  id: string
  type: 'file' | 'website'
  name: string
  file?: File
  url?: string
  size?: number
  /** For websites: discovered pages and discovery status */
  discovery?: DiscoveryStatus
}

/** Processing status for a source */
interface ProcessingStatus {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress?: number
  error?: string
}

/** Result of processing */
export interface ProcessingResult {
  sourceId: string
  success: boolean
  error?: string
}

/** Callback to process a single source */
export type ProcessSourceFn = (source: PendingSource) => Promise<ProcessingResult>

interface KnowledgeProcessingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialSources?: PendingSource[]
  /** Agent ID for API calls */
  agentId: string | null
  /** Process a single source - called for each source with real-time updates */
  onProcessSource: ProcessSourceFn
  onComplete?: () => void
}

type DialogStage = 'review' | 'processing' | 'complete'

/**
 * Knowledge processing dialog with staged flow
 * Stage 1 (review): Show pending sources, allow adding more
 * Stage 2 (processing): Non-closable, show real-time progress
 * Stage 3 (complete): Show results, allow closing
 */
export function KnowledgeProcessingDialog({
  open,
  onOpenChange,
  initialSources = [],
  agentId,
  onProcessSource,
  onComplete,
}: KnowledgeProcessingDialogProps) {
  const { accessToken } = useAuthStore()
  const [stage, setStage] = useState<DialogStage>('review')
  const [sources, setSources] = useState<PendingSource[]>(initialSources)
  const [urlInput, setUrlInput] = useState('')
  const [processingStatus, setProcessingStatus] = useState<Map<string, ProcessingStatus>>(new Map())
  const [results, setResults] = useState<ProcessingResult[]>([])
  const [overallProgress, setOverallProgress] = useState(0)
  const [showAddMore, setShowAddMore] = useState(false)
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set())

  // Track which sources have been discovered to avoid re-discovery
  const discoveredSourcesRef = useRef<Set<string>>(new Set())

  // Discover pages for a website source
  const discoverWebsite = useCallback(async (sourceId: string, url: string) => {
    if (!agentId || !accessToken) return

    // Mark as discovering
    setSources(prev => prev.map(s =>
      s.id === sourceId
        ? { ...s, discovery: { status: 'discovering' as const } }
        : s
    ))

    try {
      const response = await knowledgeService.discoverWebsite(agentId, url, accessToken)

      if (response.success && response.data) {
        const pages: DiscoveredPage[] = response.data.pages.map(p => ({
          url: p.url,
          title: p.title,
          selected: true, // Select all by default
        }))

        setSources(prev => prev.map(s =>
          s.id === sourceId
            ? {
                ...s,
                discovery: {
                  status: 'complete' as const,
                  pages
                },
                name: `Website: ${new URL(url).hostname.replace('www.', '')} (${pages.length} pages)`
              }
            : s
        ))

        // Auto-expand to show discovered pages
        setExpandedSources(prev => new Set([...prev, sourceId]))
      } else {
        setSources(prev => prev.map(s =>
          s.id === sourceId
            ? {
                ...s,
                discovery: {
                  status: 'failed' as const,
                  error: response.message || 'Discovery failed'
                }
              }
            : s
        ))
      }
    } catch (error) {
      setSources(prev => prev.map(s =>
        s.id === sourceId
          ? {
              ...s,
              discovery: {
                status: 'failed' as const,
                error: error instanceof Error ? error.message : 'Discovery failed'
              }
            }
          : s
      ))
    }
  }, [agentId, accessToken])

  // Sync sources when dialog opens or initialSources change while in review stage
  useEffect(() => {
    if (open && stage === 'review') {
      setSources(initialSources)
      // Clear discovered sources ref when dialog opens fresh
      discoveredSourcesRef.current = new Set()
    }
  }, [open, initialSources, stage])

  // Trigger discovery for new website sources
  useEffect(() => {
    if (stage !== 'review') return

    sources.forEach(source => {
      if (
        source.type === 'website' &&
        source.url &&
        !source.discovery &&
        !discoveredSourcesRef.current.has(source.id)
      ) {
        // Mark as discovered to prevent duplicate calls
        discoveredSourcesRef.current.add(source.id)
        discoverWebsite(source.id, source.url)
      }
    })
  }, [sources, stage, discoverWebsite])

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setStage('review')
      setProcessingStatus(new Map())
      setResults([])
      setOverallProgress(0)
      setShowAddMore(false)
      setExpandedSources(new Set())
    }
  }, [open])

  // Handle dialog close
  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen && stage !== 'processing') {
      // Only allow closing when not processing
      onOpenChange(false)
    }
  }, [stage, onOpenChange])

  // Handle file drop
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newSources: PendingSource[] = acceptedFiles
      .filter(file => file.size <= MAX_FILE_SIZE)
      .map(file => ({
        id: `file-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type: 'file' as const,
        name: file.name,
        file,
        size: file.size,
      }))
    setSources(prev => [...prev, ...newSources])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    disabled: stage !== 'review',
    multiple: true,
    maxSize: MAX_FILE_SIZE,
  })

  // Add URL
  const handleAddUrl = useCallback(() => {
    if (!urlInput.trim()) return

    try {
      new URL(urlInput)
    } catch {
      return
    }

    const domain = new URL(urlInput).hostname.replace('www.', '')
    setSources(prev => [
      ...prev,
      {
        id: `url-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type: 'website',
        name: `Website: ${domain}`,
        url: urlInput,
      },
    ])
    setUrlInput('')
  }, [urlInput])

  // Remove source
  const handleRemoveSource = useCallback((id: string) => {
    setSources(prev => prev.filter(s => s.id !== id))
    discoveredSourcesRef.current.delete(id)
  }, [])

  // Toggle source expansion
  const toggleExpanded = useCallback((id: string) => {
    setExpandedSources(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  // Toggle page selection for a website
  const togglePageSelection = useCallback((sourceId: string, pageUrl: string) => {
    setSources(prev => prev.map(s => {
      if (s.id !== sourceId || !s.discovery?.pages) return s
      return {
        ...s,
        discovery: {
          ...s.discovery,
          pages: s.discovery.pages.map(p =>
            p.url === pageUrl ? { ...p, selected: !p.selected } : p
          )
        }
      }
    }))
  }, [])

  // Toggle all pages for a website
  const toggleAllPages = useCallback((sourceId: string, selected: boolean) => {
    setSources(prev => prev.map(s => {
      if (s.id !== sourceId || !s.discovery?.pages) return s
      return {
        ...s,
        discovery: {
          ...s.discovery,
          pages: s.discovery.pages.map(p => ({ ...p, selected }))
        }
      }
    }))
  }, [])

  // Check if any websites are still discovering
  const isAnyDiscovering = sources.some(
    s => s.type === 'website' && s.discovery?.status === 'discovering'
  )

  // Check if any sources have content to index
  const hasContentToIndex = sources.some(s => {
    if (s.type === 'file') return true
    if (s.type === 'website' && s.discovery?.status === 'complete') {
      return s.discovery.pages?.some(p => p.selected) ?? false
    }
    return false
  })

  // Get count of items to index
  const getIndexCount = () => {
    let count = 0
    for (const s of sources) {
      if (s.type === 'file') {
        count++
      } else if (s.type === 'website' && s.discovery?.status === 'complete') {
        const selectedPages = s.discovery.pages?.filter(p => p.selected).length ?? 0
        if (selectedPages > 0) count++
      }
    }
    return count
  }

  // Start processing - process sources one by one with real-time updates
  const handleStartProcessing = useCallback(async () => {
    if (!hasContentToIndex || !agentId || !accessToken) return

    // Filter to only sources with content to index
    const sourcesToProcess = sources.filter(s => {
      if (s.type === 'file') return true
      if (s.type === 'website' && s.discovery?.status === 'complete') {
        return s.discovery.pages?.some(p => p.selected) ?? false
      }
      return false
    })

    if (sourcesToProcess.length === 0) return

    setStage('processing')
    const totalSources = sourcesToProcess.length
    const processingResults: ProcessingResult[] = []

    // Initialize processing status for all sources
    const initialStatus = new Map<string, ProcessingStatus>()
    sourcesToProcess.forEach(source => {
      initialStatus.set(source.id, { id: source.id, status: 'pending' })
    })
    setProcessingStatus(new Map(initialStatus))

    // Process each source one by one
    for (let i = 0; i < sourcesToProcess.length; i++) {
      const source = sourcesToProcess[i]!

      // Mark current source as processing
      setProcessingStatus(prev => {
        const updated = new Map(prev)
        updated.set(source.id, { id: source.id, status: 'processing' })
        return updated
      })

      // Update overall progress
      setOverallProgress(Math.round((i / totalSources) * 100))

      try {
        let result: ProcessingResult

        // For websites with discovered pages, use the index endpoint
        if (source.type === 'website' && source.url && source.discovery?.pages) {
          const selectedUrls = source.discovery.pages
            .filter(p => p.selected)
            .map(p => p.url)

          const response = await knowledgeService.indexWebsite(
            agentId,
            source.url,
            selectedUrls,
            accessToken
          )

          result = {
            sourceId: source.id,
            success: response.success,
            error: response.success ? undefined : response.message,
          }
        } else {
          // For files, use the existing onProcessSource
          result = await onProcessSource(source)
        }

        processingResults.push(result)

        // Update status based on result
        setProcessingStatus(prev => {
          const updated = new Map(prev)
          updated.set(source.id, {
            id: source.id,
            status: result.success ? 'completed' : 'failed',
            error: result.error,
          })
          return updated
        })
      } catch (error) {
        const errorResult: ProcessingResult = {
          sourceId: source.id,
          success: false,
          error: error instanceof Error ? error.message : 'Processing failed',
        }
        processingResults.push(errorResult)

        // Mark as failed
        setProcessingStatus(prev => {
          const updated = new Map(prev)
          updated.set(source.id, {
            id: source.id,
            status: 'failed',
            error: errorResult.error,
          })
          return updated
        })
      }
    }

    setResults(processingResults)
    setOverallProgress(100)
    setStage('complete')
  }, [sources, hasContentToIndex, agentId, accessToken, onProcessSource])

  // Handle close after complete
  const handleClose = useCallback(() => {
    onOpenChange(false)
    onComplete?.()
  }, [onOpenChange, onComplete])

  // Handle retry failed sources
  const handleRetryFailed = useCallback(() => {
    // Get failed sources
    const failedSources = sources.filter(s => {
      const status = processingStatus.get(s.id)
      return status?.status === 'failed'
    })

    if (failedSources.length > 0) {
      // Reset to review stage with only failed sources
      setSources(failedSources)
      setStage('review')
      setProcessingStatus(new Map())
      setResults([])
      setOverallProgress(0)
    }
  }, [sources, processingStatus])

  const canClose = stage !== 'processing'
  const successCount = results.filter(r => r.success).length
  const failCount = results.filter(r => !r.success).length

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-2xl max-h-[90vh]"
        showCloseButton={canClose}
        onPointerDownOutside={(e) => {
          if (!canClose) e.preventDefault()
        }}
        onEscapeKeyDown={(e) => {
          if (!canClose) e.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {stage === 'review' && 'Review Knowledge Sources'}
            {stage === 'processing' && 'Processing Knowledge'}
            {stage === 'complete' && 'Processing Complete'}
          </DialogTitle>
          <DialogDescription>
            {stage === 'review' && 'Review the sources below before indexing. You can add more sources or remove existing ones.'}
            {stage === 'processing' && 'Please wait while we process your knowledge sources. This may take a moment.'}
            {stage === 'complete' && `Successfully indexed ${successCount} source${successCount !== 1 ? 's' : ''}.${failCount > 0 ? ` ${failCount} failed.` : ''}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Review Stage */}
          {stage === 'review' && (
            <>
              {/* Sources list */}
              {sources.length > 0 && (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {sources.map((source) => {
                    const isExpanded = expandedSources.has(source.id)
                    const hasDiscoveredPages = source.type === 'website' &&
                      source.discovery?.status === 'complete' &&
                      source.discovery.pages &&
                      source.discovery.pages.length > 0
                    const selectedCount = source.discovery?.pages?.filter(p => p.selected).length ?? 0
                    const totalPages = source.discovery?.pages?.length ?? 0

                    return (
                      <div
                        key={source.id}
                        className="rounded-lg border border-neutral-200 dark:border-neutral-800"
                      >
                        <div className="flex items-center gap-3 p-3">
                          {/* Expand/collapse button for websites with pages */}
                          {hasDiscoveredPages ? (
                            <button
                              onClick={() => toggleExpanded(source.id)}
                              className="rounded-md p-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                              )}
                            </button>
                          ) : (
                            <div className="rounded-md p-2 bg-neutral-100 dark:bg-neutral-800">
                              {source.type === 'file' ? (
                                <FileText className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                              ) : source.discovery?.status === 'discovering' ? (
                                <Search className="h-4 w-4 text-primary animate-pulse" />
                              ) : source.discovery?.status === 'failed' ? (
                                <AlertCircle className="h-4 w-4 text-red-500" />
                              ) : (
                                <Globe className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                              )}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{source.name}</p>
                            {source.size && (
                              <p className="text-xs text-neutral-500">{formatFileSize(source.size)}</p>
                            )}
                            {source.type === 'website' && (
                              <p className="text-xs text-neutral-500">
                                {source.discovery?.status === 'discovering' && (
                                  <span className="text-primary">Discovering pages...</span>
                                )}
                                {source.discovery?.status === 'complete' && (
                                  <span>{selectedCount} of {totalPages} pages selected</span>
                                )}
                                {source.discovery?.status === 'failed' && (
                                  <span className="text-red-500">{source.discovery.error || 'Discovery failed'}</span>
                                )}
                                {!source.discovery && (
                                  <span className="truncate">{source.url}</span>
                                )}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => handleRemoveSource(source.id)}
                            className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded"
                          >
                            <X className="h-4 w-4 text-neutral-400" />
                          </button>
                        </div>

                        {/* Discovered pages list */}
                        {hasDiscoveredPages && isExpanded && (
                          <div className="border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
                            <div className="px-3 py-2 flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800">
                              <span className="text-xs text-neutral-500">
                                {selectedCount} of {totalPages} pages selected
                              </span>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => toggleAllPages(source.id, true)}
                                  className="text-xs text-primary hover:underline"
                                >
                                  Select all
                                </button>
                                <button
                                  onClick={() => toggleAllPages(source.id, false)}
                                  className="text-xs text-neutral-500 hover:underline"
                                >
                                  Deselect all
                                </button>
                              </div>
                            </div>
                            <div className="max-h-[200px] overflow-y-auto">
                              {source.discovery?.pages?.map((page) => (
                                <label
                                  key={page.url}
                                  className="flex items-center gap-3 px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={page.selected}
                                    onChange={() => togglePageSelection(source.id, page.url)}
                                    className="h-4 w-4 rounded border-neutral-300 text-primary focus:ring-primary"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm truncate">{page.title}</p>
                                    <p className="text-xs text-neutral-500 truncate">{page.url}</p>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {sources.length === 0 && (
                <div className="text-center py-8 text-sm text-neutral-500">
                  No sources added yet. Add files or websites below.
                </div>
              )}

              {/* Add more sources */}
              <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800">
                {!showAddMore ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddMore(true)}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add More Sources
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Add more sources</Label>
                      <button
                        onClick={() => setShowAddMore(false)}
                        className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded"
                      >
                        <X className="h-4 w-4 text-neutral-400" />
                      </button>
                    </div>

                    {/* File drop zone */}
                    <div
                      {...getRootProps()}
                      className={cn(
                        'rounded-lg border-2 border-dashed p-4 transition-colors cursor-pointer text-center',
                        isDragActive
                          ? 'border-primary bg-primary/5'
                          : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
                      )}
                    >
                      <input {...getInputProps()} />
                      <div className="flex flex-col items-center gap-1">
                        <Upload className="h-5 w-5 text-neutral-400" />
                        <p className="text-xs text-neutral-500">
                          {isDragActive ? 'Drop files here' : 'Drop files or click to upload'}
                        </p>
                      </div>
                    </div>

                    {/* URL input */}
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
                        className="text-sm"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAddUrl}
                        disabled={!urlInput.trim()}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Processing Stage */}
          {stage === 'processing' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-600 dark:text-neutral-400">Processing...</span>
                  <span className="text-neutral-500">{sources.length} source{sources.length !== 1 ? 's' : ''}</span>
                </div>
                <Progress value={overallProgress} className="h-2" />
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {sources.map((source) => {
                  const status = processingStatus.get(source.id)
                  return (
                    <div
                      key={source.id}
                      className="flex items-center gap-3 rounded-lg border border-neutral-200 dark:border-neutral-800 p-3"
                    >
                      <div className="rounded-md p-2 bg-neutral-100 dark:bg-neutral-800">
                        {status?.status === 'processing' ? (
                          <Loader2 className="h-4 w-4 text-primary animate-spin" />
                        ) : status?.status === 'completed' ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : status?.status === 'failed' ? (
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        ) : source.type === 'file' ? (
                          <FileText className="h-4 w-4 text-neutral-400" />
                        ) : (
                          <Globe className="h-4 w-4 text-neutral-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{source.name}</p>
                        <p className="text-xs text-neutral-500">
                          {status?.status === 'processing' && 'Processing...'}
                          {status?.status === 'completed' && 'Completed'}
                          {status?.status === 'failed' && (status.error || 'Failed')}
                          {status?.status === 'pending' && 'Waiting...'}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Complete Stage */}
          {stage === 'complete' && (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 py-4">
                {failCount === 0 ? (
                  <CheckCircle className="h-12 w-12 text-green-600" />
                ) : successCount === 0 ? (
                  <AlertCircle className="h-12 w-12 text-red-600" />
                ) : (
                  <AlertCircle className="h-12 w-12 text-amber-600" />
                )}
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {sources.map((source) => {
                  const status = processingStatus.get(source.id)
                  return (
                    <div
                      key={source.id}
                      className={cn(
                        'flex items-center gap-3 rounded-lg border p-3',
                        status?.status === 'completed'
                          ? 'border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30'
                          : 'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30'
                      )}
                    >
                      <div className="rounded-md p-2">
                        {status?.status === 'completed' ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{source.name}</p>
                        {status?.error && (
                          <p className="text-xs text-red-600 truncate">{status.error}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {stage === 'review' && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleStartProcessing}
                disabled={!hasContentToIndex || isAnyDiscovering}
              >
                {isAnyDiscovering ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Discovering...
                  </>
                ) : (
                  <>Index {getIndexCount()} Source{getIndexCount() !== 1 ? 's' : ''}</>
                )}
              </Button>
            </>
          )}
          {stage === 'processing' && (
            <div className="flex items-center gap-2 text-sm text-neutral-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing... Please don&apos;t close this window.
            </div>
          )}
          {stage === 'complete' && (
            <div className="flex gap-2">
              {failCount > 0 && (
                <Button variant="outline" onClick={handleRetryFailed}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Retry Failed ({failCount})
                </Button>
              )}
              <Button onClick={handleClose}>Done</Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
