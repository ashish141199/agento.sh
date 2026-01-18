'use client'

import { useState, useRef } from 'react'
import confetti from 'canvas-confetti'
import { Button } from '@/components/ui/button'
import { usePublishStatus } from '@/hooks/use-publish-status'
import { PublishConfirmationModal } from './publish-confirmation-modal'
import { PublishSuccessModal } from './publish-success-modal'
import { UnpublishConfirmationModal } from './unpublish-confirmation-modal'
import { EmbedModal } from './embed-modal'
import { Upload, Link, Loader2 } from 'lucide-react'
import type { EmbedConfig } from '@/services/agent.service'

function triggerConfetti(origin: { x: number; y: number }) {
  // First burst
  confetti({
    particleCount: 100,
    spread: 70,
    origin,
    colors: ['#6366f1', '#8b5cf6', '#a855f7', '#c084fc'],
    zIndex: 9999,
  })

  // Second burst slightly delayed
  setTimeout(() => {
    confetti({
      particleCount: 50,
      spread: 100,
      origin,
      colors: ['#6366f1', '#8b5cf6', '#a855f7', '#c084fc'],
      zIndex: 9999,
    })
  }, 150)
}

interface PublishButtonProps {
  agentId: string | null
  agentName: string
  hasUnsavedChanges: boolean
  isFormComplete: boolean
  onSave: () => Promise<void>
  isSaving: boolean
}

export function PublishButton({
  agentId,
  agentName,
  hasUnsavedChanges,
  isFormComplete,
  onSave,
  isSaving,
}: PublishButtonProps) {
  const {
    status,
    isLoading,
    publish,
    isPublishing,
    unpublish,
    isUnpublishing,
    updateEmbedConfig,
  } = usePublishStatus(agentId)

  const buttonRef = useRef<HTMLButtonElement>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showEmbed, setShowEmbed] = useState(false)
  const [showUnpublishConfirmation, setShowUnpublishConfirmation] = useState(false)

  // Determine button state
  const isDisabled = !isFormComplete || !agentId
  const showSaveButton = hasUnsavedChanges && !isDisabled
  const isPublished = status?.isPublished
  const hasChanges = status?.hasChanges

  const handleButtonClick = async () => {
    if (showSaveButton) {
      await onSave()
      return
    }

    if (isPublished && !hasChanges) {
      // Show success modal to view links
      setShowSuccess(true)
      return
    }

    // Show confirmation modal
    setShowConfirmation(true)
  }

  const handleConfirmPublish = async (origin: { x: number; y: number }) => {
    try {
      await publish()
      setShowConfirmation(false)
      // Trigger confetti from the Publish button in the modal
      triggerConfetti(origin)
      setShowSuccess(true)
    } catch (error) {
      console.error('Failed to publish:', error)
    }
  }

  const handleOpenEmbed = () => {
    setShowSuccess(false)
    setShowEmbed(true)
  }

  const handleBackFromSuccess = () => {
    setShowSuccess(false)
  }

  const handleBackFromEmbed = () => {
    setShowEmbed(false)
    setShowSuccess(true)
  }

  const handleUnpublishClick = () => {
    setShowSuccess(false)
    setShowUnpublishConfirmation(true)
  }

  const handleConfirmUnpublish = async () => {
    try {
      await unpublish()
      setShowUnpublishConfirmation(false)
    } catch (error) {
      console.error('Failed to unpublish:', error)
    }
  }

  const handleCancelUnpublish = () => {
    setShowUnpublishConfirmation(false)
    setShowSuccess(true)
  }

  const handleEmbedConfigChange = async (config: Partial<EmbedConfig>) => {
    try {
      await updateEmbedConfig(config)
    } catch (error) {
      console.error('Failed to update embed config:', error)
    }
  }

  // Render button content based on state
  const renderButtonContent = () => {
    if (isSaving) {
      return (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Saving...
        </>
      )
    }

    if (showSaveButton) {
      return 'Save'
    }

    if (isLoading) {
      return (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Loading...
        </>
      )
    }

    if (isPublished && !hasChanges) {
      return (
        <>
          <Link className="h-4 w-4 mr-2" />
          View Links
        </>
      )
    }

    if (isPublished && hasChanges) {
      return (
        <>
          <Upload className="h-4 w-4 mr-2" />
          Publish Changes
        </>
      )
    }

    return (
      <>
        <Upload className="h-4 w-4 mr-2" />
        Publish
      </>
    )
  }

  return (
    <>
      <Button
        ref={buttonRef}
        onClick={handleButtonClick}
        disabled={isDisabled || isSaving || isLoading || isPublishing}
        variant={showSaveButton ? 'default' : isPublished && !hasChanges ? 'outline' : 'default'}
      >
        {renderButtonContent()}
      </Button>

      <PublishConfirmationModal
        open={showConfirmation}
        onOpenChange={setShowConfirmation}
        agentName={agentName}
        modelName={status?.modelName || null}
        toolsCount={status?.toolsCount || 0}
        isPublishing={isPublishing}
        onConfirm={handleConfirmPublish}
        onCancel={() => setShowConfirmation(false)}
      />

      <PublishSuccessModal
        open={showSuccess}
        onOpenChange={setShowSuccess}
        slug={status?.slug || ''}
        onOpenEmbed={handleOpenEmbed}
        onBack={handleBackFromSuccess}
        onUnpublish={handleUnpublishClick}
        isUnpublishing={false}
      />

      <UnpublishConfirmationModal
        open={showUnpublishConfirmation}
        onOpenChange={setShowUnpublishConfirmation}
        agentName={agentName}
        isUnpublishing={isUnpublishing}
        onConfirm={handleConfirmUnpublish}
        onCancel={handleCancelUnpublish}
      />

      <EmbedModal
        open={showEmbed}
        onOpenChange={setShowEmbed}
        slug={status?.slug || ''}
        embedConfig={status?.embedConfig || { position: 'bottom-right', theme: 'light' }}
        onConfigChange={handleEmbedConfigChange}
        onBack={handleBackFromEmbed}
      />
    </>
  )
}
