import { z } from 'zod'

/**
 * Schema for requesting OTP
 */
export const requestOtpSchema = z.object({
  email: z.email('Invalid email address'),
})

/**
 * Schema for verifying OTP
 */
export const verifyOtpSchema = z.object({
  email: z.email('Invalid email address'),
  code: z.string().length(6, 'OTP must be 6 digits'),
})

/**
 * Schema for completing signup (new user)
 */
export const completeSignupSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
})

/**
 * Schema for Google OAuth callback
 */
export const googleCallbackSchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
})

/**
 * Schema for refresh token request
 */
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
})

/**
 * Type exports
 */
export type RequestOtpInput = z.infer<typeof requestOtpSchema>
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>
export type CompleteSignupInput = z.infer<typeof completeSignupSchema>
export type GoogleCallbackInput = z.infer<typeof googleCallbackSchema>
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>
