'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { CheckCircle2, ChevronDown, HelpCircle, SkipForward } from 'lucide-react'

/**
 * Question types
 */
export type QuestionType = 'single_choice' | 'multiple_choice' | 'text'

/**
 * Option for MCQ questions
 */
export interface QuestionOption {
  label: string
  value: string
}

/**
 * Question structure from the agent
 */
export interface AskUserQuestion {
  id: string
  text: string
  type: QuestionType
  options?: QuestionOption[]
  allowOther?: boolean
}

/**
 * Answer structure to send back
 */
export interface QuestionAnswer {
  questionId: string
  selectedOptions?: string[]
  otherText?: string
  text?: string
}

/**
 * Full response to send back to agent
 */
export interface AskUserResponse {
  answers: QuestionAnswer[]
  skipped: boolean
}

/**
 * Input from the askUser tool
 */
export interface AskUserInput {
  questions: AskUserQuestion[]
}

interface AskUserCardProps {
  input: AskUserInput
  onSubmit: (response: AskUserResponse) => void
  isSubmitting?: boolean
}

/**
 * Single question component
 */
function QuestionItem({
  question,
  answer,
  onAnswerChange,
}: {
  question: AskUserQuestion
  answer: QuestionAnswer
  onAnswerChange: (answer: QuestionAnswer) => void
}) {
  const [showOtherInput, setShowOtherInput] = useState(false)

  const handleOptionClick = useCallback(
    (value: string) => {
      if (question.type === 'single_choice') {
        if (value === '__other__') {
          setShowOtherInput(true)
          onAnswerChange({ ...answer, selectedOptions: [value] })
        } else {
          setShowOtherInput(false)
          onAnswerChange({ ...answer, selectedOptions: [value], otherText: undefined })
        }
      } else if (question.type === 'multiple_choice') {
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
            selectedOptions: isSelected ? current.filter((v) => v !== value) : [...current, value],
          })
        }
      }
    },
    [question.type, answer, onAnswerChange]
  )

  const isOptionSelected = (value: string) => {
    return answer.selectedOptions?.includes(value) ?? false
  }

  // Text question
  if (question.type === 'text') {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{question.text}</p>
        <Input
          value={answer.text || ''}
          onChange={(e) => onAnswerChange({ ...answer, text: e.target.value })}
          placeholder="Type your answer..."
          className="text-sm"
        />
      </div>
    )
  }

  // MCQ question (single or multiple choice)
  const options = question.options || []
  const allOptions = question.allowOther
    ? [...options, { label: 'Other', value: '__other__' }]
    : options

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
        {question.text}
        {question.type === 'multiple_choice' && (
          <span className="text-xs text-neutral-500 dark:text-neutral-400 ml-2">(Select multiple)</span>
        )}
      </p>
      <div className="flex flex-wrap gap-2">
        {allOptions.map((option) => {
          const selected = isOptionSelected(option.value)
          return (
            <button
              key={option.value}
              onClick={() => handleOptionClick(option.value)}
              className={cn(
                'px-3 py-1.5 text-sm rounded-full border transition-all',
                selected
                  ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900'
                  : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
              )}
            >
              {option.label}
            </button>
          )
        })}
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

/**
 * Answered summary component - compact version matching ToolCallCard style
 */
export function AnsweredSummary({
  input,
  response,
  compact = false,
}: {
  input: AskUserInput
  response: AskUserResponse
  compact?: boolean
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (response.skipped) {
    return (
      <div className="flex items-center gap-2 py-1.5 px-3 bg-neutral-50 dark:bg-neutral-700 rounded text-xs my-1 min-w-[200px]">
        <SkipForward className="h-3 w-3 text-neutral-500 dark:text-neutral-400 shrink-0" />
        <span className="text-neutral-600 dark:text-neutral-300 flex-1">Questions skipped</span>
      </div>
    )
  }

  // Build answers summary for compact view
  const answeredCount = response.answers.filter(a =>
    a.text || (a.selectedOptions && a.selectedOptions.length > 0)
  ).length

  return (
    <div className="bg-neutral-50 dark:bg-neutral-700 rounded text-xs my-1 min-w-[200px]">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 py-1.5 px-3"
      >
        <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
        <span className="text-neutral-600 dark:text-neutral-300 flex-1 text-left">
          {answeredCount} question{answeredCount !== 1 ? 's' : ''} answered
        </span>
        <ChevronDown className={cn(
          "h-3 w-3 text-neutral-400 shrink-0 transition-transform",
          isExpanded && "rotate-180"
        )} />
      </button>

      {isExpanded && (
        <div className="px-3 pb-2 pt-1 border-t border-neutral-200 dark:border-neutral-600 space-y-1.5">
          {input.questions.map((question) => {
            const answer = response.answers.find((a) => a.questionId === question.id)
            if (!answer) return null

            let displayAnswer = ''
            if (question.type === 'text') {
              displayAnswer = answer.text || 'No answer'
            } else {
              const selectedLabels =
                answer.selectedOptions
                  ?.filter((v) => v !== '__other__')
                  .map((v) => {
                    const opt = question.options?.find((o) => o.value === v)
                    return opt?.label || v
                  }) || []

              if (answer.otherText) {
                selectedLabels.push(`Other: ${answer.otherText}`)
              }

              displayAnswer = selectedLabels.join(', ') || 'No selection'
            }

            return (
              <div key={question.id}>
                <span className="text-neutral-500 dark:text-neutral-400">{question.text}</span>
                <p className="text-neutral-700 dark:text-neutral-200 font-medium">{displayAnswer}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/**
 * AskUserCard component
 * Renders questions from the agent and collects user responses
 */
export function AskUserCard({ input, onSubmit, isSubmitting }: AskUserCardProps) {
  const [answers, setAnswers] = useState<Record<string, QuestionAnswer>>(() => {
    const initial: Record<string, QuestionAnswer> = {}
    for (const q of input.questions) {
      initial[q.id] = { questionId: q.id }
    }
    return initial
  })

  const handleAnswerChange = useCallback((questionId: string, answer: QuestionAnswer) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }))
  }, [])

  const handleSubmit = useCallback(() => {
    onSubmit({
      answers: Object.values(answers),
      skipped: false,
    })
  }, [answers, onSubmit])

  const handleSkip = useCallback(() => {
    onSubmit({
      answers: [],
      skipped: true,
    })
  }, [onSubmit])

  // Check if any answer is provided
  const hasAnyAnswer = Object.values(answers).some((a) => {
    if (a.text) return true
    if (a.selectedOptions && a.selectedOptions.length > 0) return true
    return false
  })

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
