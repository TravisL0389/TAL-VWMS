import { describe, expect, it } from 'vitest';
import { sanitizeCompactCode, sanitizeUserNotes, sanitizeUserText } from '../utils/sanitize';

describe('sanitize helpers', () => {
  it('removes control characters from plain text', () => {
    expect(sanitizeUserText('ACME\u0000 Warehouse')).toBe('ACME Warehouse');
  });

  it('preserves new lines for notes', () => {
    expect(sanitizeUserNotes('Line 1\nLine 2\u0000')).toBe('Line 1\nLine 2');
  });

  it('normalizes compact codes', () => {
    expect(sanitizeCompactCode('  ABC   123  ')).toBe('ABC 123');
  });
});
