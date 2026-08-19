/**
 * Sanitize feedback text input:
 * - Trim whitespace
 * - Strip null bytes
 * - Normalize newlines
 * - Limit max length
 */
export function sanitizeFeedback(input: string, maxLength = 5000): string {
  return input
    .replace(/\0/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim()
    .slice(0, maxLength);
}

/**
 * Sanitize a name field — strip HTML-like chars, limit length
 */
export function sanitizeName(input: string, maxLength = 120): string {
  return input
    .replace(/[<>"']/g, '')
    .replace(/\0/g, '')
    .trim()
    .slice(0, maxLength);
}
