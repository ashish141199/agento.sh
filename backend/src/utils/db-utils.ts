/**
 * Database utility functions
 * This file provides common database operation helpers
 */

/**
 * Generate expiration date from now
 * @param minutes - Number of minutes until expiration
 * @returns Date object for expiration time
 */
export function getExpirationDate(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000)
}

/**
 * Check if a date has expired
 * @param date - Date to check
 * @returns True if the date is in the past
 */
export function isExpired(date: Date): boolean {
  return new Date() > date
}
