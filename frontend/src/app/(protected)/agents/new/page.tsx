'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Wrench, ArrowUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Agent creation onboarding page
 * Allows users to choose between manual creation and AI-assisted building
 */
export default function NewAgentPage() {
  const router = useRouter()
  const [aiPrompt, setAiPrompt] = useState('')
  const [selectedOption, setSelectedOption] = useState<'manual' | 'ai' | null>(null)

  const handleManualCreate = () => {
    router.push('/agents/create')
  }

  const handleAICreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!aiPrompt.trim()) return

    const encodedPrompt = encodeURIComponent(aiPrompt.trim())
    router.push(`/agents/create?builder=true&prompt=${encodedPrompt}`)
  }

  return (
    <div className="fixed inset-0 bg-neutral-50 dark:bg-neutral-950 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-2xl md:text-3xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
            Create a New Agent
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Choose how you want to get started
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 md:gap-6">
          {/* Build with AI option */}
          <div
            onClick={() => setSelectedOption('ai')}
            className={`relative group cursor-pointer rounded-2xl border-2 transition-all ${
              selectedOption === 'ai'
                ? 'border-neutral-900 dark:border-neutral-100 bg-white dark:bg-neutral-900'
                : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-400 dark:hover:border-neutral-600'
            }`}
          >
            <div className="p-6 md:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                    Build with AI
                  </h2>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Recommended
                  </p>
                </div>
              </div>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
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
                      className="w-full px-4 py-3 pr-12 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100 focus:border-transparent placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleAICreate(e)
                        }
                      }}
                    />
                    <button
                      type="submit"
                      disabled={!aiPrompt.trim()}
                      className="absolute right-2 bottom-2 p-2 rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                  </div>
                </form>
              )}

              {selectedOption !== 'ai' && (
                <div className="text-sm text-neutral-500 dark:text-neutral-400 italic">
                  Click to get started
                </div>
              )}
            </div>
          </div>

          {/* Create Manually option */}
          <div
            onClick={handleManualCreate}
            className="relative group cursor-pointer rounded-2xl border-2 border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-400 dark:hover:border-neutral-600 transition-all"
          >
            <div className="p-6 md:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900">
                  <Wrench className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                    Create Manually
                  </h2>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Full control
                  </p>
                </div>
              </div>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Configure every detail yourself using our step-by-step editor with complete customization options.
              </p>
              <div className="text-sm text-neutral-500 dark:text-neutral-400 italic">
                Click to get started
              </div>
            </div>
          </div>
        </div>

        {/* Back button */}
        <div className="mt-8 text-center">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard')}
            className="text-neutral-600 dark:text-neutral-400"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}
