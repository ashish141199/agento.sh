import Link from 'next/link'

/**
 * Logo component
 * @param asLink - Whether to wrap in a link to home
 */
export function Logo({ asLink = false }: { asLink?: boolean }) {
  const content = (
    <span className="text-xl font-bold tracking-tight">
      Agentoo
    </span>
  )

  if (asLink) {
    return (
      <Link href="/" className="hover:opacity-80 transition-opacity">
        {content}
      </Link>
    )
  }

  return content
}
