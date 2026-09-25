/**
 * Removes control characters and trims user input before persistence.
 */
export function sanitizeUserText(value: string, maxLength = 120): string {
  return Array.from(value)
    .filter((char) => !/[\p{Cc}]/u.test(char))
    .join('')
    .trim()
    .slice(0, maxLength);
}

/**
 * Allows short multiline notes while still removing dangerous control chars.
 */
export function sanitizeUserNotes(value: string, maxLength = 1000): string {
  return Array.from(value)
    .filter((char) => char === '\n' || char === '\r' || char === '\t' || !/[\p{Cc}]/u.test(char))
    .join('')
    .trim()
    .slice(0, maxLength);
}

/**
 * Normalizes compact identifiers such as SKU, reference, and prefixes.
 */
export function sanitizeCompactCode(value: string, maxLength = 64): string {
  return sanitizeUserText(value, maxLength).replace(/\s+/g, ' ');
}

/**
 * Coerces a number to a safe integer within a bounded range.
 */
export function sanitizeInteger(value: number, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, Math.round(value)));
}
