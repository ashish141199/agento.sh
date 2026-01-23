'use client'

/**
 * Embed Page
 * Dedicated page for embedded agents in iframes
 * No authentication required, minimal UI, stateless chat
 */

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useTheme } from 'next-themes'
import { Loader2 } from 'lucide-react'
import { EmbedChat } from '@/components/agents/embed-chat'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface EmbedAgent {
  id: string
  name: string
  description: string | null
}

export default function EmbedPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const { setTheme } = useTheme()
  const id = params.id as string

  // Read theme from URL param
  const themeParam = searchParams.get('theme') as 'light' | 'dark' | null

  const [agent, setAgent] = useState<EmbedAgent | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Apply theme from URL parameter
  useEffect(() => {
    if (themeParam) {
      setTheme(themeParam)
    }
  }, [themeParam, setTheme])

  // Fetch agent info from embed endpoint
  useEffect(() => {
    async function fetchAgent() {
      try {
        setIsLoading(true)
        const response = await fetch(`${API_BASE_URL}/embed/${id}`)
        const data = await response.json()

        if (data.success && data.data?.agent) {
          setAgent(data.data.agent)
        } else {
          setError(data.message || 'Agent not found')
        }
      } catch (err) {
        console.error('Failed to fetch agent:', err)
        setError('Failed to load agent')
      } finally {
        setIsLoading(false)
      }
    }

    if (id) {
      fetchAgent()
    }
  }, [id])

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !agent) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">
          {error || 'Agent not found'}
        </p>
      </div>
    )
  }

  return (
    <div className="h-screen">
      <EmbedChat
        agentId={agent.id}
        agentName={agent.name}
        agentDescription={agent.description}
      />
    </div>
  )
}
