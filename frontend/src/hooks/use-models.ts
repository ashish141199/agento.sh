'use client'

import { useQuery } from '@tanstack/react-query'
import { modelService, type Model } from '@/services/model.service'
import { useAuthStore } from '@/stores/auth.store'

/**
 * Hook to fetch all available models
 */
export function useModels() {
  const accessToken = useAuthStore((state) => state.accessToken)

  return useQuery<Model[]>({
    queryKey: ['models'],
    queryFn: async () => {
      if (!accessToken) throw new Error('No access token')
      const response = await modelService.list(accessToken)
      return response.data?.models || []
    },
    enabled: !!accessToken,
  })
}
