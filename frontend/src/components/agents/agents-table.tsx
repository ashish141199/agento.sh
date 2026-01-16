'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { useAgents } from '@/hooks/use-agents'
import { ArrowUpDown, Search } from 'lucide-react'
import type { Agent } from '@/services/agent.service'

type SortField = 'name' | 'createdAt' | 'updatedAt'
type SortOrder = 'asc' | 'desc'

/**
 * Agents data table with search and sort
 */
export function AgentsTable() {
  const router = useRouter()
  const [search, setSearch] = useState('')
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
      className="flex items-center gap-1 hover:text-neutral-900"
    >
      {children}
      <ArrowUpDown className="h-4 w-4" />
    </button>
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-neutral-500">Loading agents...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
        <Input
          placeholder="Search agents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="border rounded-lg">
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
                <TableCell colSpan={4} className="text-center py-12 text-neutral-500">
                  {search ? 'No agents found' : 'No agents yet. Create your first agent!'}
                </TableCell>
              </TableRow>
            ) : (
              agents.map((agent) => (
                <TableRow
                  key={agent.id}
                  onClick={() => handleRowClick(agent)}
                  className="cursor-pointer hover:bg-neutral-50"
                >
                  <TableCell className="font-medium">{agent.name}</TableCell>
                  <TableCell className="text-neutral-600 truncate max-w-[400px]">
                    {agent.description || '-'}
                  </TableCell>
                  <TableCell className="text-neutral-600">{agent.model}</TableCell>
                  <TableCell className="text-neutral-600">{formatDate(agent.createdAt)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
