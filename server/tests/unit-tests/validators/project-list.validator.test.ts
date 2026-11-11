import { projectListQuerySchema, PROJECT_SORT_OPTIONS } from '../../../src/validators/project.validator.js';
import { ID, OTHER_ID } from '../helpers/factories.js';

const issue = (input: unknown) => projectListQuerySchema.safeParse(input).error?.issues[0];

describe('project.validator projectListQuerySchema', () => {
  it('keeps the pagination defaults when no filter is given', () => {
    expect(projectListQuerySchema.parse({})).toEqual({ offset: 0, limit: 6 });
  });

  it('still validates the pagination fields', () => {
    expect(issue({ limit: '101' })?.message).toBe('Limit must be between 1 and 100');
  });

  it('accepts every filter together', () => {
    const result = projectListQuerySchema.parse({
      offset: '6',
      limit: '6',
      search: 'bridge',
      category: ID,
      owner: OTHER_ID,
      from: '2026-01-01',
      to: '2026-06-30',
      sort: 'spend_desc',
    });

    expect(result).toEqual({
      offset: 6,
      limit: 6,
      search: 'bridge',
      category: ID,
      owner: OTHER_ID,
      from: new Date('2026-01-01'),
      to: new Date('2026-06-30'),
      sort: 'spend_desc',
    });
  });

  describe('search', () => {
    it('trims the text', () => {
      expect(projectListQuerySchema.parse({ search: '  bridge ' }).search).toBe('bridge');
    });

    it.each(['', '   '])('treats %p as no search', (search) => {
      expect(projectListQuerySchema.parse({ search }).search).toBeUndefined();
    });

    it('rejects text longer than 100 characters', () => {
      expect(issue({ search: 'a'.repeat(101) })?.message).toBe('Search must be at most 100 characters long');
    });
  });

  describe('category and owner', () => {
    it('rejects a category that is not a UUID', () => {
      expect(issue({ category: 'infrastructure' })?.message).toBe('Category must be a valid ID');
    });

    it('rejects an owner that is not a UUID', () => {
      expect(issue({ owner: 'jdoe' })?.message).toBe('Owner must be a valid ID');
    });
  });

  describe('dates', () => {
    it('accepts only a from date', () => {
      expect(projectListQuerySchema.parse({ from: '2026-03-01' }).from).toEqual(new Date('2026-03-01'));
    });

    it('accepts only a to date', () => {
      expect(projectListQuerySchema.parse({ to: '2026-03-01' }).to).toEqual(new Date('2026-03-01'));
    });

    it('accepts the same from and to date', () => {
      expect(projectListQuerySchema.safeParse({ from: '2026-03-01', to: '2026-03-01' }).success).toBe(true);
    });

    it.each(['yesterday', '2026-13-01', '2026-02-30', '01/03/2026', ''])('rejects the from date %p', (from) => {
      expect(issue({ from })?.message).toBe('From date must be a valid date in YYYY-MM-DD format');
    });

    it('rejects a bad to date', () => {
      expect(issue({ to: 'tomorrow' })?.message).toBe('To date must be a valid date in YYYY-MM-DD format');
    });

    it('rejects a from date after the to date', () => {
      const result = projectListQuerySchema.safeParse({ from: '2026-04-01', to: '2026-03-31' });

      expect(result.error?.issues[0]).toEqual(expect.objectContaining({
        message: 'From date must be on or before the To date',
        path: ['from'],
      }));
    });
  });

  describe('sort', () => {
    it.each(PROJECT_SORT_OPTIONS)('accepts %p', (sort) => {
      expect(projectListQuerySchema.parse({ sort }).sort).toBe(sort);
    });

    it.each(['spend', 'NAME_ASC', ''])('rejects %p', (sort) => {
      expect(issue({ sort })?.message).toBe(
        'Sort must be one of: name_asc, name_desc, start_date_desc, start_date_asc, spend_desc, spend_asc',
      );
    });
  });

  it('rejects a repeated filter parameter', () => {
    expect(projectListQuerySchema.safeParse({ search: ['a', 'b'] }).success).toBe(false);
  });
});
