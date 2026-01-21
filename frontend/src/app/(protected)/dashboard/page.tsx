'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AgentsTable } from '@/components/agents/agents-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, ArrowUp, Search } from 'lucide-react'

/**
 * Dashboard page - displays agents table with AI builder prompt
 */
export default function DashboardPage() {
  const router = useRouter()
  const [builderPrompt, setBuilderPrompt] = useState('')
  const [agentSearch, setAgentSearch] = useState('')

  // Check for stored prompt from landing page (after login redirect)
  useEffect(() => {
    const storedPrompt = sessionStorage.getItem('agentoo-builder-prompt')
    if (storedPrompt) {
      sessionStorage.removeItem('agentoo-builder-prompt')
      // Pre-fill the prompt input with the stored value
      setBuilderPrompt(storedPrompt)
    }
  }, [])

  const handleBuilderSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!builderPrompt.trim()) return

    // Navigate to create page with the prompt as a query parameter
    const encodedPrompt = encodeURIComponent(builderPrompt.trim())
    router.push(`/agents/create?builder=true&prompt=${encodedPrompt}`)
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Builder prompt section */}
      <div className="mb-6 md:mb-8">
        <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-3">
          What do you want your agent to do?
        </h2>
        <form onSubmit={handleBuilderSubmit}>
          <div className="relative">
            <textarea
              value={builderPrompt}
              onChange={(e) => setBuilderPrompt(e.target.value)}
              placeholder="Type a message or click a suggestion..."
              rows={2}
              className="w-full px-4 py-3 pr-14 text-base bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100 focus:border-transparent placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleBuilderSubmit(e)
                }
              }}
            />
            <button
              type="submit"
              disabled={!builderPrompt.trim()}
              className="absolute right-3 bottom-3 p-2 rounded-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Agents section header */}
      <div className="mb-4 md:mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl md:text-2xl font-semibold text-neutral-900 dark:text-neutral-100">My Agents</h1>

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
  )
}
