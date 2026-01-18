import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { agentService, type PublishStatus, type EmbedConfig } from '@/services/agent.service'
import { useAuthStore } from '@/stores/auth.store'

/**
 * Hook for fetching and managing agent publish status
 * @param agentId - The agent ID
 */
export function usePublishStatus(agentId: string | null) {
  const accessToken = useAuthStore((state) => state.accessToken)
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['publish-status', agentId],
    queryFn: async () => {
      if (!agentId || !accessToken) return null
      const response = await agentService.getPublishStatus(agentId, accessToken)
      return response.data as PublishStatus
    },
    enabled: !!agentId && !!accessToken,
  })

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!agentId || !accessToken) throw new Error('No agent ID or token')
      return agentService.publish(agentId, accessToken)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publish-status', agentId] })
    },
  })

  const unpublishMutation = useMutation({
    mutationFn: async () => {
      if (!agentId || !accessToken) throw new Error('No agent ID or token')
      return agentService.unpublish(agentId, accessToken)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publish-status', agentId] })
    },
  })

  const updateEmbedConfigMutation = useMutation({
    mutationFn: async (config: Partial<EmbedConfig>) => {
      if (!agentId || !accessToken) throw new Error('No agent ID or token')
      return agentService.updateEmbedConfig(agentId, config, accessToken)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publish-status', agentId] })
    },
  })

  return {
    status: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    publish: publishMutation.mutateAsync,
    isPublishing: publishMutation.isPending,
    unpublish: unpublishMutation.mutateAsync,
    isUnpublishing: unpublishMutation.isPending,
    updateEmbedConfig: updateEmbedConfigMutation.mutateAsync,
    isUpdatingEmbedConfig: updateEmbedConfigMutation.isPending,
  }
}
