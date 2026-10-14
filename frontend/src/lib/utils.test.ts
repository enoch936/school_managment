import { describe, expect, it } from 'vitest';
import { cn, formatCurrency, formatDate, getInitials } from '@/lib/utils';

describe('cn', () => {
  it('merges class names and resolves conflicts', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
    expect(cn('text-sm', false && 'hidden', 'font-bold')).toBe('text-sm font-bold');
  });
});

describe('formatCurrency', () => {
  it('formats minor units into a currency string', () => {
    expect(formatCurrency(123456, 'USD')).toContain('1,234.56');
  });
});

describe('formatDate', () => {
  it('formats an ISO date', () => {
    expect(formatDate('2024-01-15T00:00:00.000Z')).toMatch(/2024/);
  });

  it('handles nullish input', () => {
    expect(formatDate(null)).toBe('-');
  });
});

describe('getInitials', () => {
  it('returns up to two initials', () => {
    expect(getInitials('Ada', 'Lovelace')).toBe('AL');
    expect(getInitials('Prince')).toBe('P');
  });
});
