'use client'

/**
 * Ask User Card Component
 * Renders clarification questions from an AI agent and collects user responses
 * Used in both Agent Builder and Agent Chat interfaces
 * @module components/agents/ask-user-card
 */

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { CheckCircle2, ChevronDown, HelpCircle, SkipForward } from 'lucide-react'
import {
  type AskUserQuestion,
  type AskUserInput,
  type AskUserResponse,
  type QuestionAnswer,
  formatAnswerForDisplay,
  isQuestionAnswered,
} from '@/types/ask-user.types'

// Re-export types for consumers
export type { AskUserInput, AskUserResponse, QuestionAnswer, AskUserQuestion }

/** Props for the QuestionItem component */
interface QuestionItemProps {
  question: AskUserQuestion
  answer: QuestionAnswer
  onAnswerChange: (answer: QuestionAnswer) => void
}

/**
 * Renders a single question with appropriate input type
 * @param props - Question item props
 */
function QuestionItem({ question, answer, onAnswerChange }: QuestionItemProps) {
  const [showOtherInput, setShowOtherInput] = useState(false)

  /**
   * Handles option selection for MCQ questions
   * @param value - The selected option value
   */
  const handleOptionClick = useCallback(
    (value: string) => {
      if (question.type === 'single_choice') {
        handleSingleChoiceSelect(value)
      } else if (question.type === 'multiple_choice') {
        handleMultipleChoiceSelect(value)
      }
    },
    [question.type, answer, onAnswerChange]
  )

  /**
   * Handles single choice selection (radio behavior)
   */
  const handleSingleChoiceSelect = (value: string) => {
    if (value === '__other__') {
      setShowOtherInput(true)
      onAnswerChange({ ...answer, selectedOptions: [value] })
    } else {
      setShowOtherInput(false)
      onAnswerChange({ ...answer, selectedOptions: [value], otherText: undefined })
    }
  }

  /**
   * Handles multiple choice selection (checkbox behavior)
   */
  const handleMultipleChoiceSelect = (value: string) => {
    const current = answer.selectedOptions || []
    const isSelected = current.includes(value)

    if (value === '__other__') {
      if (isSelected) {
        setShowOtherInput(false)
        onAnswerChange({
          ...answer,
          selectedOptions: current.filter((v) => v !== value),
          otherText: undefined,
        })
      } else {
        setShowOtherInput(true)
        onAnswerChange({ ...answer, selectedOptions: [...current, value] })
      }
    } else {
      onAnswerChange({
        ...answer,
        selectedOptions: isSelected
          ? current.filter((v) => v !== value)
          : [...current, value],
      })
    }
  }

  /**
   * Checks if an option is currently selected
   */
  const isOptionSelected = (value: string): boolean => {
    return answer.selectedOptions?.includes(value) ?? false
  }

  // Render text input question
  if (question.type === 'text') {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
          {question.text}
        </p>
        <Input
          value={answer.text || ''}
          onChange={(e) => onAnswerChange({ ...answer, text: e.target.value })}
          placeholder="Type your answer..."
          className="text-sm"
        />
      </div>
    )
  }

  // Render MCQ question
  const options = question.options || []
  const allOptions = question.allowOther
    ? [...options, { label: 'Other', value: '__other__' }]
    : options

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
        {question.text}
        {question.type === 'multiple_choice' && (
          <span className="text-xs text-neutral-500 dark:text-neutral-400 ml-2">
            (Select multiple)
          </span>
        )}
      </p>
      <div className="flex flex-wrap gap-2">
        {allOptions.map((option) => (
          <OptionButton
            key={option.value}
            label={option.label}
            selected={isOptionSelected(option.value)}
            onClick={() => handleOptionClick(option.value)}
          />
        ))}
      </div>
      {showOtherInput && (
        <Input
          value={answer.otherText || ''}
          onChange={(e) => onAnswerChange({ ...answer, otherText: e.target.value })}
          placeholder="Please specify..."
          className="text-sm mt-2"
          autoFocus
        />
      )}
    </div>
  )
}

/** Props for the OptionButton component */
interface OptionButtonProps {
  label: string
  selected: boolean
  onClick: () => void
}

/**
 * Renders a selectable option button (pill style)
 */
function OptionButton({ label, selected, onClick }: OptionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 text-xs rounded-full border transition-all text-left',
        selected
          ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900'
          : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
      )}
    >
      {label}
    </button>
  )
}

/** Props for AnsweredSummary component */
interface AnsweredSummaryProps {
  input: AskUserInput
  response: AskUserResponse
}

/**
 * Displays a compact summary of answered questions
 * Expandable to show full question/answer details
 */
export function AnsweredSummary({ input, response }: AnsweredSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Skipped questions - simple display
  if (response.skipped) {
    return (
      <div className="flex items-center gap-2 py-1.5 px-3 bg-neutral-50 dark:bg-neutral-700 rounded text-xs my-1 min-w-[200px]">
        <SkipForward className="h-3 w-3 text-neutral-500 dark:text-neutral-400 shrink-0" />
        <span className="text-neutral-600 dark:text-neutral-300 flex-1">
          Questions skipped
        </span>
      </div>
    )
  }

  // Count answered questions
  const answeredCount = response.answers.filter(isQuestionAnswered).length

  return (
    <div className="bg-neutral-50 dark:bg-neutral-700 rounded text-xs my-1 min-w-[200px]">
      {/* Collapsed header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 py-1.5 px-3"
      >
        <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
        <span className="text-neutral-600 dark:text-neutral-300 flex-1 text-left">
          {answeredCount} question{answeredCount !== 1 ? 's' : ''} answered
        </span>
        <ChevronDown
          className={cn(
            'h-3 w-3 text-neutral-400 shrink-0 transition-transform',
            isExpanded && 'rotate-180'
          )}
        />
      </button>

      {/* Expanded details */}
      {isExpanded && (
        <div className="px-3 pb-2 pt-1 border-t border-neutral-200 dark:border-neutral-600 space-y-1.5">
          {input.questions.map((question) => {
            const answer = response.answers.find((a) => a.questionId === question.id)
            if (!answer) return null

            return (
              <div key={question.id}>
                <span className="text-neutral-500 dark:text-neutral-400">
                  {question.text}
                </span>
                <p className="text-neutral-700 dark:text-neutral-200 font-medium">
                  {formatAnswerForDisplay(question, answer)}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/** Props for AskUserCard component */
interface AskUserCardProps {
  input: AskUserInput
  onSubmit: (response: AskUserResponse) => void
  isSubmitting?: boolean
}

/**
 * Main component for displaying askUser questions and collecting responses
 * Shows a card with all questions and submit/skip actions
 */
export function AskUserCard({ input, onSubmit, isSubmitting }: AskUserCardProps) {
  // Initialize answers state with empty answer for each question
  const [answers, setAnswers] = useState<Record<string, QuestionAnswer>>(() => {
    const initial: Record<string, QuestionAnswer> = {}
    for (const q of input.questions) {
      initial[q.id] = { questionId: q.id }
    }
    return initial
  })

  /**
   * Updates the answer for a specific question
   */
  const handleAnswerChange = useCallback((questionId: string, answer: QuestionAnswer) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }))
  }, [])

  /**
   * Submits all answers
   */
  const handleSubmit = useCallback(() => {
    onSubmit({
      answers: Object.values(answers),
      skipped: false,
    })
  }, [answers, onSubmit])

  /**
   * Skips all questions
   */
  const handleSkip = useCallback(() => {
    onSubmit({
      answers: [],
      skipped: true,
    })
  }, [onSubmit])

  // Check if at least one answer is provided
  const hasAnyAnswer = Object.values(answers).some(isQuestionAnswered)

  return (
    <div className="p-4 border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-900/20">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <HelpCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
          Clarification needed
        </span>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        {input.questions.map((question) => (
          <QuestionItem
            key={question.id}
            question={question}
            answer={answers[question.id]}
            onAnswerChange={(answer) => handleAnswerChange(question.id, answer)}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !hasAnyAnswer}
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isSubmitting ? 'Submitting...' : 'Submit answers'}
        </Button>
        <Button
          onClick={handleSkip}
          disabled={isSubmitting}
          variant="ghost"
          size="sm"
          className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
        >
          <SkipForward className="h-4 w-4 mr-1" />
          Skip
        </Button>
      </div>
    </div>
  )
}
