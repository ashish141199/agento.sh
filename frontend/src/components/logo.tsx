import Link from 'next/link'

interface LogoProps {
  asLink?: boolean
  href?: string
}

/**
 * Logo component
 * @param asLink - Whether to wrap in a link
 * @param href - Custom link destination (default: /dashboard)
 */
export function Logo({ asLink = false, href = '/dashboard' }: LogoProps) {
  const content = (
    <span className="text-xl font-bold tracking-tight">
      Autive
    </span>
  )

  if (asLink) {
    return (
      <Link href={href} className="hover:opacity-80 transition-opacity">
        {content}
      </Link>
    )
  }

  return content
}
