import { cn } from "@/lib/utils"

interface BackgroundDotsProps {
  className?: string
  children?: React.ReactNode
}

/**
 * Subtle dotted background pattern
 * Works in both light and dark modes
 */
export function BackgroundDots({
  className,
  children,
}: BackgroundDotsProps) {
  return (
    <div className={cn("relative w-full h-full", className)}>
      {/* Dotted pattern */}
      <div
        className="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(#a3a3a3_1px,transparent_1px)] dark:bg-[radial-gradient(#525252_1px,transparent_1px)] [background-size:16px_16px] opacity-40"
      />
      {/* Content */}
      {children && <div className="relative z-10">{children}</div>}
    </div>
  )
}

