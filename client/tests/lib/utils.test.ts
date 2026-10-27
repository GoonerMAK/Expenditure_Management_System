import { cn } from '../../src/lib/utils';

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
