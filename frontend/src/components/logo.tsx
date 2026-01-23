import Link from 'next/link'

interface LogoProps {
  asLink?: boolean
  href?: string
  showEarlyAccess?: boolean
}

/**
 * Logo component
 * @param asLink - Whether to wrap in a link
 * @param href - Custom link destination (default: /dashboard)
 * @param showEarlyAccess - Whether to show the "Early Access" badge (default: true)
 */
export function Logo({ asLink = false, href = '/dashboard', showEarlyAccess = true }: LogoProps) {
  const content = (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="text-xl font-bold tracking-tight leading-none">Autive</span>
      {showEarlyAccess && (
        <span className="px-1.5 py-0.5 text-[9px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 rounded tracking-wide uppercase translate-y-[-1px]">
          Preview
        </span>
      )}
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
