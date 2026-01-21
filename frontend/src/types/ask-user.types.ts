/**
 * Types for the askUser tool - client-side tool for agent clarification questions
 * Used by both the Agent Builder and Agent Chat interfaces
 * @module types/ask-user
 */

/**
 * Question types supported by the askUser tool
 * - single_choice: Radio button selection (one answer)
 * - multiple_choice: Checkbox selection (multiple answers)
 * - text: Free-form text input
 */
export type QuestionType = 'single_choice' | 'multiple_choice' | 'text'

/**
 * Option for MCQ (multiple choice) questions
 */
export interface QuestionOption {
  /** Display label shown to the user */
  label: string
  /** Value returned when this option is selected */
  value: string
}

/**
 * Individual question structure in an askUser tool call
 */
export interface AskUserQuestion {
  /** Unique identifier for this question (used to match answers) */
  id: string
  /** The question text displayed to the user */
  text: string
  /** Type of input expected from the user */
  type: QuestionType
  /** Available options for MCQ questions */
  options?: QuestionOption[]
  /** If true, adds an "Other" option with free text input */
  allowOther?: boolean
}

/**
 * User's answer to a single question
 */
export interface QuestionAnswer {
  /** ID of the question being answered */
  questionId: string
  /** Selected option values for MCQ questions */
  selectedOptions?: string[]
  /** Text entered when "Other" option is selected */
  otherText?: string
  /** Text response for text-type questions */
  text?: string
}

/**
 * Input payload for the askUser tool (what the agent sends)
 */
export interface AskUserInput {
  /** Array of 1-5 questions to ask the user */
  questions: AskUserQuestion[]
}

/**
 * Response payload from the askUser tool (what the user returns)
 */
export interface AskUserResponse {
  /** Array of answers corresponding to the questions */
  answers: QuestionAnswer[]
  /** True if the user chose to skip all questions */
  skipped: boolean
}

/**
 * Tool call part structure from the AI SDK for askUser
 */
export interface AskUserToolPart {
  type: string
  toolCallId: string
  toolName: string
  state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error'
  input?: AskUserInput
  output?: AskUserResponse
}

/**
 * Check if a question has been answered
 * @param answer - The answer object to check
 * @returns True if the answer contains a response
 */
export function isQuestionAnswered(answer: QuestionAnswer): boolean {
  if (answer.text) return true
  if (answer.selectedOptions && answer.selectedOptions.length > 0) return true
  return false
}

/**
 * Format an answer for display
 * @param question - The original question
 * @param answer - The user's answer
 * @returns Formatted string representation of the answer
 */
export function formatAnswerForDisplay(
  question: AskUserQuestion,
  answer: QuestionAnswer
): string {
  if (question.type === 'text') {
    return answer.text || 'No answer'
  }

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

  return selectedLabels.join(', ') || 'No selection'
}
