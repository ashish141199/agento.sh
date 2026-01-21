'use client'

import { useRef } from 'react'
import { ArrowUp, Loader2, Headphones, ShoppingCart, Calendar, HelpCircle } from 'lucide-react'

/**
 * Suggestion prompts for the prompt box
 */
export const SUGGESTIONS = [
  {
    icon: Headphones,
    label: 'Support Agent',
    prompt: 'Create a customer support agent that can answer questions about my product, handle complaints professionally, and escalate issues when needed.',
  },
  {
    icon: ShoppingCart,
    label: 'Sales Assistant',
    prompt: 'Build a sales assistant that can recommend products based on customer needs, answer pricing questions, and guide users through the purchase process.',
  },
  {
    icon: Calendar,
    label: 'Booking Agent',
    prompt: 'Create an appointment booking agent that can check availability, schedule meetings, and send confirmation details to users.',
  },
  {
    icon: HelpCircle,
    label: 'FAQ Bot',
    prompt: 'Build an FAQ bot that answers common questions about my business, provides helpful resources, and directs users to the right information.',
  },
]

interface PromptBoxProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  placeholder?: string
  rows?: number
  showSuggestions?: boolean
  isLoading?: boolean
  disabled?: boolean
  autoFocus?: boolean
}

/**
 * Reusable prompt box component with optional suggestions
 */
export function PromptBox({
  value,
  onChange,
  onSubmit,
  placeholder = 'Type a message or click a suggestion...',
  rows = 3,
  showSuggestions = false,
  isLoading = false,
  disabled = false,
  autoFocus = false,
}: PromptBoxProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSuggestionClick = (suggestionPrompt: string) => {
    onChange(suggestionPrompt)
    // Focus the textarea after setting the prompt
    textareaRef.current?.focus()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!value.trim() || isLoading || disabled) return
    onSubmit()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            autoFocus={autoFocus}
            disabled={isLoading || disabled}
            className="w-full px-4 py-4 pr-14 text-base bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100 focus:border-transparent placeholder:text-neutral-400 dark:placeholder:text-neutral-500 disabled:opacity-50"
            onKeyDown={handleKeyDown}
          />
          <button
            type="submit"
            disabled={!value.trim() || isLoading || disabled}
            className="absolute right-3 bottom-3 p-2.5 rounded-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ArrowUp className="h-5 w-5" />
            )}
          </button>
        </div>
      </form>

      {/* Suggestions */}
      {showSuggestions && (
        <div className="mt-4 flex flex-wrap gap-2 justify-center">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion.label}
              type="button"
              onClick={() => handleSuggestionClick(suggestion.prompt)}
              disabled={isLoading || disabled}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-neutral-600 dark:text-neutral-400 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-full hover:border-neutral-400 dark:hover:border-neutral-600 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <suggestion.icon className="h-3.5 w-3.5" />
              {suggestion.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
