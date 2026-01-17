'use client'

import { use } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AgentEditor } from '@/components/agents/agent-editor'
import { useAgent } from '@/hooks/use-agent'

interface EditAgentPageProps {
  params: Promise<{ id: string }>
}

/**
 * Edit agent page
 */
export default function EditAgentPage({ params }: EditAgentPageProps) {
  const { id } = use(params)
  const { data: agent, isLoading } = useAgent(id)

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            {isLoading ? 'Loading...' : agent?.name || 'Edit Agent'}
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">Configure your AI agent</p>
        </div>
      </div>

      <div className="flex-1">
        <AgentEditor agent={agent} isLoading={isLoading} />
      </div>
    </div>
  )
}
