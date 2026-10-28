import { cn, formatAmount, formatPercent, getServerMessage } from '../../src/lib/utils';

describe('cn', () => {
  it('joins class names', () => {
    expect(cn('px-2', 'py-1')).toBe('px-2 py-1');
  });

  it('drops falsy values', () => {
    expect(cn('base', false, null, undefined, 0, '', 'end')).toBe('base end');
  });

  it('applies conditional object syntax', () => {
    expect(cn('btn', { 'btn-active': true, 'btn-disabled': false })).toBe('btn btn-active');
  });

  it('lets later Tailwind classes override conflicting earlier ones', () => {
    expect(cn('px-2 text-sm', 'px-4')).toBe('text-sm px-4');
  });

  it('keeps non-conflicting Tailwind classes', () => {
    expect(cn('text-red-500', 'bg-red-500')).toBe('text-red-500 bg-red-500');
  });

  it('returns an empty string with no input', () => {
    expect(cn()).toBe('');
  });
});

describe('formatAmount', () => {
  it('adds thousand separators', () => {
    expect(formatAmount(1234567)).toBe('1,234,567');
  });

  it('keeps at most two decimals', () => {
    expect(formatAmount(10.456)).toBe('10.46');
  });

  it('formats negative amounts', () => {
    expect(formatAmount(-200)).toBe('-200');
  });
});

describe('formatPercent', () => {
  it('adds a percent sign', () => {
    expect(formatPercent(43.3)).toBe('43.3%');
  });

  it('shows N/A when there is no budget to compare against', () => {
    expect(formatPercent(null)).toBe('N/A');
  });
});

describe('getServerMessage', () => {
  it('reads the message from an axios error response', () => {
    expect(getServerMessage({ response: { data: { message: 'Wrong Password' } } })).toBe('Wrong Password');
  });

  it('reads the message from an RTK Query error', () => {
    expect(getServerMessage({ status: 400, data: { message: 'Category exists' } })).toBe('Category exists');
  });

  it('returns undefined when there is no server message', () => {
    expect(getServerMessage(new Error('Network Error'))).toBeUndefined();
    expect(getServerMessage(null)).toBeUndefined();
  });
});
