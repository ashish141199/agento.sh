'use client'

import Link from 'next/link'
import { AgentsTable } from '@/components/agents/agents-table'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

/**
 * Home page - displays agents table
 */
export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Agents</h1>
          <p className="text-neutral-600 mt-1">Manage your AI agents</p>
        </div>
        <Link href="/agents/create">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Agent
          </Button>
        </Link>
      </div>

      <AgentsTable />
    </div>
  )
}
