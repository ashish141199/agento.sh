'use client'

import { useQuery } from '@tanstack/react-query'
import { agentService, type Agent } from '@/services/agent.service'
import { useAuthStore } from '@/stores/auth.store'

/**
 * Hook to fetch a single agent by ID
 */
export function useAgent(id: string | null | undefined) {
  const accessToken = useAuthStore((state) => state.accessToken)

  return useQuery<Agent | null>({
    queryKey: ['agent', id],
    queryFn: async () => {
      if (!accessToken || !id) return null
      const response = await agentService.get(id, accessToken)
      return response.data?.agent || null
    },
    enabled: !!accessToken && !!id,
  })
}
