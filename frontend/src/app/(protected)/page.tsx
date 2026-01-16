'use client'

import { AgentsTable } from '@/components/agents/agents-table'

/**
 * Home page - displays agents table
 */
export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-neutral-900">Agents</h1>
        <p className="text-neutral-600 mt-1">Manage your AI agents</p>
      </div>

      <AgentsTable />
    </div>
  )
}
