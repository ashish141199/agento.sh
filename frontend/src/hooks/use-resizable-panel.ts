/**
 * useResizablePanel Hook
 * Provides resize functionality for panel components
 * @module hooks/use-resizable-panel
 */

import { useState, useCallback, useRef } from 'react'

/** Options for the resizable panel hook */
interface UseResizablePanelOptions {
  /** Initial width in pixels */
  initialWidth?: number
  /** Minimum allowed width */
  minWidth?: number
  /** Maximum allowed width */
  maxWidth?: number
  /** Direction of resize (left or right) */
  direction?: 'left' | 'right'
}

/** Return type for useResizablePanel */
interface UseResizablePanelReturn {
  /** Current width value */
  width: number
  /** Whether currently resizing */
  isResizing: boolean
  /** Mouse down handler to start resize */
  handleMouseDown: (e: React.MouseEvent) => void
}

/**
 * Hook for making panels horizontally resizable
 * @param options - Configuration options
 * @returns Width state and resize handler
 */
export function useResizablePanel({
  initialWidth = 380,
  minWidth = 320,
  maxWidth = 600,
  direction = 'left',
}: UseResizablePanelOptions = {}): UseResizablePanelReturn {
  const [width, setWidth] = useState(initialWidth)
  const isResizing = useRef(false)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      isResizing.current = true
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'

      const startX = e.clientX
      const startWidth = width

      const handleMouseMove = (e: MouseEvent) => {
        if (!isResizing.current) return

        // Calculate delta based on resize direction
        const delta = direction === 'left'
          ? startX - e.clientX
          : e.clientX - startX

        const newWidth = Math.min(Math.max(startWidth + delta, minWidth), maxWidth)
        setWidth(newWidth)
      }

      const handleMouseUp = () => {
        isResizing.current = false
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [width, minWidth, maxWidth, direction]
  )

  return {
    width,
    isResizing: isResizing.current,
    handleMouseDown,
  }
}
