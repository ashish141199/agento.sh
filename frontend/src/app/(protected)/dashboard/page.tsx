'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { AgentsTable } from '@/components/agents/agents-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, ArrowUp, Search, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { agentService } from '@/services/agent.service'
import { notification } from '@/lib/notifications'

/**
 * Dashboard page - displays agents table with AI builder prompt
 */
export default function DashboardPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { accessToken } = useAuthStore()
  const [builderPrompt, setBuilderPrompt] = useState('')
  const [agentSearch, setAgentSearch] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  // Check for stored prompt from landing page (after login redirect)
  useEffect(() => {
    const storedPrompt = sessionStorage.getItem('agentoo-builder-prompt')
    if (storedPrompt) {
      sessionStorage.removeItem('agentoo-builder-prompt')
      // Pre-fill the prompt input with the stored value
      setBuilderPrompt(storedPrompt)
    }
  }, [])

  const handleBuilderSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!builderPrompt.trim() || isCreating || !accessToken) return

    setIsCreating(true)
    try {
      // Create agent first, then redirect to edit page with builder
      const response = await agentService.create({}, accessToken)
      if (response.data?.agent) {
        queryClient.invalidateQueries({ queryKey: ['agents'] })
        const encodedPrompt = encodeURIComponent(builderPrompt.trim())
        router.push(`/agents/${response.data.agent.id}?builder=true&prompt=${encodedPrompt}`)
      }
    } catch (error) {
      notification.error('Failed to create agent')
      setIsCreating(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Builder prompt section - centered */}
      <div className="flex-1 flex items-center justify-center min-h-[280px] md:min-h-[320px]">
        <div className="w-full max-w-2xl px-4">
          <h1 className="text-2xl md:text-3xl font-semibold text-center text-neutral-900 dark:text-neutral-100 mb-6">
            What do you want your agent to do?
          </h1>
          <form onSubmit={handleBuilderSubmit}>
            <div className="relative">
              <textarea
                value={builderPrompt}
                onChange={(e) => setBuilderPrompt(e.target.value)}
                placeholder="Type a message or click a suggestion..."
                rows={3}
                disabled={isCreating}
                className="w-full px-4 py-4 pr-14 text-base bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100 focus:border-transparent placeholder:text-neutral-400 dark:placeholder:text-neutral-500 disabled:opacity-50"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleBuilderSubmit(e)
                  }
                }}
              />
              <button
                type="submit"
                disabled={!builderPrompt.trim() || isCreating}
                className="absolute right-3 bottom-3 p-2.5 rounded-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
              >
                {isCreating ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <ArrowUp className="h-5 w-5" />
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Agents section */}
      <div className="border-t bg-white dark:bg-neutral-900 rounded-t-3xl -mx-4 md:-mx-6 px-4 md:px-6 pt-6 pb-4">
        <div className="max-w-6xl mx-auto">
          {/* Agents section header */}
          <div className="mb-4 md:mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl md:text-2xl font-semibold text-neutral-900 dark:text-neutral-100">My Agents</h2>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 dark:text-neutral-500" />
                <Input
                  placeholder="Search agents..."
                  value={agentSearch}
                  onChange={(e) => setAgentSearch(e.target.value)}
                  className="pl-9 w-full sm:w-[200px] md:w-[250px]"
                />
              </div>
              <Link href="/agents/new">
                <Button variant="outline" className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Agent
                </Button>
              </Link>
            </div>
          </div>

          <AgentsTable search={agentSearch} />
        </div>
      </div>
    </div>
  )
}
