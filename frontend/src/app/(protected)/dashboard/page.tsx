'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { AgentsTable } from '@/components/agents/agents-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PromptBox } from '@/components/prompt-box'
import { Plus, Search } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { agentService } from '@/services/agent.service'
import { notification } from '@/lib/notifications'
import { BackgroundDots } from '@/components/ui/background-dots'

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
    const storedPrompt = sessionStorage.getItem('autive-builder-prompt')
    if (storedPrompt) {
      sessionStorage.removeItem('autive-builder-prompt')
      // Pre-fill the prompt input with the stored value
      setBuilderPrompt(storedPrompt)
    }
  }, [])

  const handleBuilderSubmit = async () => {
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
    <div className="min-h-full">
      {/* Full-screen dotted background */}
      <BackgroundDots className="fixed inset-0 z-0" />

      {/* Builder prompt section - centered */}
      <div className="flex items-center justify-center min-h-[308px] md:min-h-[352px] relative z-10">
        <div className="w-full max-w-2xl px-4">
          <h1 className="text-2xl md:text-3xl font-semibold text-center text-neutral-900 dark:text-neutral-100 mb-6">
            What do you want your agent to do?
          </h1>
          <PromptBox
            value={builderPrompt}
            onChange={setBuilderPrompt}
            onSubmit={handleBuilderSubmit}
            isLoading={isCreating}
            showSuggestions
          />
        </div>
      </div>

      {/* Agents section */}
      <div className="border-t bg-white dark:bg-neutral-900 rounded-t-3xl -mx-4 md:-mx-6 px-4 md:px-6 pt-6 pb-4 relative z-10">
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
