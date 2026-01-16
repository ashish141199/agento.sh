'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth.store'
import { agentService, type ListAgentsOptions } from '@/services/agent.service'

/**
 * Hook to fetch agents with search and sort
 * @param options - Search and sort options
 * @returns Query result with agents data
 */
export function useAgents(options?: ListAgentsOptions) {
  const { accessToken } = useAuthStore()

  return useQuery({
    queryKey: ['agents', options],
    queryFn: async () => {
      if (!accessToken) throw new Error('No access token')
      const response = await agentService.list(accessToken, options)
      return response.data?.agents || []
    },
    enabled: !!accessToken,
  })
}
