'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useTheme } from 'next-themes'
import { Loader2 } from 'lucide-react'
import { agentService, type PublicAgent } from '@/services/agent.service'
import { PublicChat } from '@/components/agents/public-chat'

export default function PublicChatPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const { setTheme } = useTheme()
  const slug = params.slug as string

  // Read embed parameters
  const isEmbed = searchParams.get('embed') === 'true'
  const themeParam = searchParams.get('theme') as 'light' | 'dark' | null

  const [agent, setAgent] = useState<PublicAgent | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Apply theme when in embed mode
  useEffect(() => {
    if (isEmbed && themeParam) {
      setTheme(themeParam)
    }
  }, [isEmbed, themeParam, setTheme])

  useEffect(() => {
    async function fetchAgent() {
      try {
        setIsLoading(true)
        const response = await agentService.getPublishedBySlug(slug)
        if (response.data?.agent) {
          setAgent(response.data.agent)
        } else {
          setError('Agent not found')
        }
      } catch (err) {
        console.error('Failed to fetch agent:', err)
        setError('Agent not found')
      } finally {
        setIsLoading(false)
      }
    }

    if (slug) {
      fetchAgent()
    }
  }, [slug])

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white dark:bg-neutral-900">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    )
  }

  if (error || !agent) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-white dark:bg-neutral-900">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
          Agent Not Found
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400">
          This agent doesn&apos;t exist or may have been unpublished.
        </p>
      </div>
    )
  }

  return (
    <div className="h-screen">
      <PublicChat
        agentId={agent.id}
        agentSlug={slug}
        agentName={agent.name}
        agentDescription={agent.description}
        isEmbed={isEmbed}
      />
    </div>
  )
}
