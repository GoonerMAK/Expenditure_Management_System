import { paginationQuerySchema } from '../../../src/validators/pagination.validator.js';

const issue = (input: unknown) => paginationQuerySchema.safeParse(input).error?.issues[0];

describe('pagination.validator paginationQuerySchema', () => {
  it('converts string offset and limit to numbers', () => {
    expect(paginationQuerySchema.parse({ offset: '12', limit: '6' })).toEqual({ offset: 12, limit: 6 });
  });

  it.failing('defaults offset to 0 and limit to 6 when omitted', () => {
    expect(paginationQuerySchema.parse({})).toEqual({ offset: 0, limit: 6 });
  });

  it('currently leaves offset and limit undefined when omitted', () => {
    expect(paginationQuerySchema.parse({})).toEqual({});
  });

  describe('offset', () => {
    it('accepts 0', () => {
      expect(paginationQuerySchema.parse({ offset: '0' })).toEqual({ offset: 0 });
    });

    it.each(['-1', 'abc', ''])('rejects %p', (offset) => {
      expect(issue({ offset })?.message).toBe('Offset must be a non-negative number');
    });

    it('truncates a decimal value', () => {
      expect(paginationQuerySchema.parse({ offset: '6.9' })).toEqual({ offset: 6 });
    });

    it('accepts a value with trailing characters because parseInt is lenient', () => {
      expect(paginationQuerySchema.parse({ offset: '6abc' })).toEqual({ offset: 6 });
    });

    it('rejects a repeated query parameter', () => {
      expect(paginationQuerySchema.safeParse({ offset: ['0', '6'] }).success).toBe(false);
    });
  });

  describe('limit', () => {
    it.each([
      ['1', 1],
      ['100', 100],
    ])('accepts the boundary %p', (limit, expected) => {
      expect(paginationQuerySchema.parse({ limit })).toEqual({ limit: expected });
    });

    it.each(['0', '101', '-5', 'all', ''])('rejects %p', (limit) => {
      expect(issue({ limit })?.message).toBe('Limit must be between 1 and 100');
    });

    it('rejects a decimal below 1 after truncation', () => {
      expect(issue({ limit: '0.5' })?.message).toBe('Limit must be between 1 and 100');
    });
  });
});
