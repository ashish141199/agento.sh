'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAgents } from '@/hooks/use-agents'
import { ArrowUpDown } from 'lucide-react'
import type { Agent } from '@/services/agent.service'

type SortField = 'name' | 'createdAt' | 'updatedAt'
type SortOrder = 'asc' | 'desc'

interface AgentsTableProps {
  search?: string
}

/**
 * Agents data table with search and sort
 */
export function AgentsTable({ search = '' }: AgentsTableProps) {
  const router = useRouter()
  const [sortBy, setSortBy] = useState<SortField>('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  const { data: agents = [], isLoading } = useAgents({
    search: search || undefined,
    sortBy,
    sortOrder,
  })

  /**
   * Handle sort column click
   */
  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  /**
   * Handle row click - navigate to agent details
   */
  const handleRowClick = (agent: Agent) => {
    router.push(`/agents/${agent.id}`)
  }

  /**
   * Format date for display
   */
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  /**
   * Sort header component
   */
  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 hover:text-neutral-900 dark:hover:text-neutral-100"
    >
      {children}
      <ArrowUpDown className="h-4 w-4" />
    </button>
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-neutral-500 dark:text-neutral-400">Loading agents...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Mobile card view */}
      <div className="md:hidden space-y-3">
        {agents.length === 0 ? (
          <div className="text-center py-12 text-neutral-500 dark:text-neutral-400 border rounded-lg bg-white dark:bg-neutral-900">
            {search ? 'No agents found' : 'No agents yet. Create your first agent!'}
          </div>
        ) : (
          agents.map((agent) => (
            <div
              key={agent.id}
              onClick={() => handleRowClick(agent)}
              className="border rounded-lg bg-white dark:bg-neutral-900 p-4 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              <div className="font-medium text-neutral-900 dark:text-neutral-100">{agent.name}</div>
              {agent.description && (
                <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1 line-clamp-2">
                  {agent.description}
                </div>
              )}
              <div className="flex items-center gap-4 mt-2 text-xs text-neutral-500 dark:text-neutral-500">
                {agent.model?.name && <span>{agent.model.name}</span>}
                <span>{formatDate(agent.createdAt)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop table view */}
      <div className="hidden md:block border rounded-lg bg-white dark:bg-neutral-900">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">
                <SortHeader field="name">Name</SortHeader>
              </TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[120px]">Model</TableHead>
              <TableHead className="w-[140px]">
                <SortHeader field="createdAt">Created</SortHeader>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12 text-neutral-500 dark:text-neutral-400">
                  {search ? 'No agents found' : 'No agents yet. Create your first agent!'}
                </TableCell>
              </TableRow>
            ) : (
              agents.map((agent) => (
                <TableRow
                  key={agent.id}
                  onClick={() => handleRowClick(agent)}
                  className="cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800"
                >
                  <TableCell className="font-medium">{agent.name}</TableCell>
                  <TableCell className="text-neutral-600 dark:text-neutral-400 truncate max-w-[400px]">
                    {agent.description || '-'}
                  </TableCell>
                  <TableCell className="text-neutral-600 dark:text-neutral-400">{agent.model?.name || '-'}</TableCell>
                  <TableCell className="text-neutral-600 dark:text-neutral-400">{formatDate(agent.createdAt)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
