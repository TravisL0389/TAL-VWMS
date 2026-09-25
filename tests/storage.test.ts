import { describe, expect, it } from 'vitest';
import { toCSV } from '../utils/storage';

describe('toCSV', () => {
  it('quotes values with commas and new lines', () => {
    const csv = toCSV([{ name: 'Widget, Large', notes: 'line 1\nline 2' }]);
    expect(csv).toContain('"Widget, Large"');
    expect(csv).toContain('"line 1\nline 2"');
  });

  it('guards against spreadsheet formula injection', () => {
    const csv = toCSV([{ sku: '=cmd()', name: '+SUM(A1:A2)', barcode: '@danger' }]);
    expect(csv).toContain("'=cmd()");
    expect(csv).toContain("'+SUM(A1:A2)");
    expect(csv).toContain("'@danger");
  });
});
