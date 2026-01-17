import { toast } from 'sonner'

type NotificationType = 'success' | 'error' | 'info' | 'warning'

interface NotificationOptions {
  description?: string
  duration?: number
}

/**
 * Show a notification toast
 * @param type - Type of notification (success, error, info, warning)
 * @param message - Main message to display
 * @param options - Optional description and duration
 */
export function notify(
  type: NotificationType,
  message: string,
  options?: NotificationOptions
) {
  const { description, duration = 4000 } = options || {}

  toast[type](message, {
    description,
    duration,
  })
}

/**
 * Convenience functions for common notification types
 */
export const notification = {
  success: (message: string, options?: NotificationOptions) =>
    notify('success', message, options),

  error: (message: string, options?: NotificationOptions) =>
    notify('error', message, options),

  info: (message: string, options?: NotificationOptions) =>
    notify('info', message, options),

  warning: (message: string, options?: NotificationOptions) =>
    notify('warning', message, options),
}
