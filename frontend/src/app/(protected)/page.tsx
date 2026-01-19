'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AgentsTable } from '@/components/agents/agents-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Sparkles, ArrowRight } from 'lucide-react'

/**
 * Home page - displays agents table
 */
export default function HomePage() {
  const router = useRouter()
  const [builderPrompt, setBuilderPrompt] = useState('')

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
      <div className="mb-6 md:mb-8 p-4 md:p-6 rounded-xl border bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 rounded-lg bg-neutral-900 dark:bg-neutral-100 shrink-0">
            <Sparkles className="h-5 w-5 text-white dark:text-neutral-900" />
          </div>
          <div>
            <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">Build with AI</h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Describe the agent you want to create and let AI help you build it
            </p>
          </div>
        </div>
        <form onSubmit={handleBuilderSubmit} className="flex flex-col sm:flex-row gap-2">
          <Input
            value={builderPrompt}
            onChange={(e) => setBuilderPrompt(e.target.value)}
            placeholder="I want to create an agent that helps customers..."
            className="flex-1 bg-white dark:bg-neutral-900"
          />
          <Button type="submit" disabled={!builderPrompt.trim()} className="sm:w-auto">
            <ArrowRight className="h-4 w-4 sm:mr-0" />
            <span className="sm:hidden ml-2">Create</span>
          </Button>
        </form>
      </div>

      {/* Agents section */}
      <div className="mb-4 md:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Agents</h1>
          <p className="text-sm md:text-base text-neutral-600 dark:text-neutral-400 mt-1">Manage your AI agents</p>
        </div>
        <Link href="/agents/create" className="self-start sm:self-auto">
          <Button variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Create Agent
          </Button>
        </Link>
      </div>

      <AgentsTable />
    </div>
  )
}
