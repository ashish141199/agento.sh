'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { Sparkles, Wrench, ArrowUp, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth.store'
import { agentService } from '@/services/agent.service'
import { notification } from '@/lib/notifications'

/**
 * Agent creation onboarding page
 * Allows users to choose between manual creation and AI-assisted building
 */
export default function NewAgentPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { accessToken } = useAuthStore()
  const [aiPrompt, setAiPrompt] = useState('')
  const [selectedOption, setSelectedOption] = useState<'manual' | 'ai' | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const handleManualCreate = async () => {
    if (isCreating || !accessToken) return

    setIsCreating(true)
    try {
      const response = await agentService.create({}, accessToken)
      if (response.data?.agent) {
        queryClient.invalidateQueries({ queryKey: ['agents'] })
        router.push(`/agents/${response.data.agent.id}`)
      }
    } catch (error) {
      notification.error('Failed to create agent')
      setIsCreating(false)
    }
  }

  const handleAICreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!aiPrompt.trim() || isCreating || !accessToken) return

    setIsCreating(true)
    try {
      const response = await agentService.create({}, accessToken)
      if (response.data?.agent) {
        queryClient.invalidateQueries({ queryKey: ['agents'] })
        const encodedPrompt = encodeURIComponent(aiPrompt.trim())
        router.push(`/agents/${response.data.agent.id}?builder=true&prompt=${encodedPrompt}`)
      }
    } catch (error) {
      notification.error('Failed to create agent')
      setIsCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-neutral-50 dark:bg-neutral-950 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8 md:mb-10">
          <h1 className="text-xl md:text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
            Create a New Agent
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Choose how you want to get started
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 md:gap-6">
          {/* Build with AI option */}
          <div
            onClick={() => !isCreating && setSelectedOption('ai')}
            className={`relative group cursor-pointer rounded-xl border transition-all ${
              selectedOption === 'ai'
                ? 'border-neutral-400 dark:border-neutral-500 bg-white dark:bg-neutral-900'
                : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-700'
            } ${isCreating ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <div className="p-5 md:p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-medium text-neutral-900 dark:text-neutral-100">
                    Build with AI
                  </h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Recommended
                  </p>
                </div>
              </div>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed">
                Describe what you want and let AI help you create and configure your agent automatically.
              </p>

              {selectedOption === 'ai' && (
                <form onSubmit={handleAICreate} className="mt-4">
                  <div className="relative">
                    <textarea
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="Describe your agent..."
                      rows={3}
                      autoFocus
                      disabled={isCreating}
                      className="w-full px-4 py-3 pr-12 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100 focus:border-transparent placeholder:text-neutral-400 dark:placeholder:text-neutral-500 disabled:opacity-50"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleAICreate(e)
                        }
                      }}
                    />
                    <button
                      type="submit"
                      disabled={!aiPrompt.trim() || isCreating}
                      className="absolute right-2 bottom-2 p-2 rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                    >
                      {isCreating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ArrowUp className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Create Manually option */}
          <div
            onClick={handleManualCreate}
            className={`relative group cursor-pointer rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all ${isCreating ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <div className="p-5 md:p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900">
                  {isCreating && selectedOption !== 'ai' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wrench className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <h2 className="text-base font-medium text-neutral-900 dark:text-neutral-100">
                    Create Manually
                  </h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Full control
                  </p>
                </div>
              </div>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed">
                Configure every detail yourself using our step-by-step editor with complete customization options.
              </p>
              {isCreating && selectedOption !== 'ai' && (
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-4">
                  Creating agent...
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Back button */}
        <div className="mt-8 text-center">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard')}
            disabled={isCreating}
            className="text-neutral-600 dark:text-neutral-400"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}
