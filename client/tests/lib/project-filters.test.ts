import {
  getActiveFilters,
  hasActiveFilters,
  PROJECT_SORT_LABELS,
  readPage,
  readProjectFilters,
  withFilter,
  withoutFilters,
  withPage,
} from '../../src/lib/project-filters';

const params = (query: string) => new URLSearchParams(query);

const noFilters = { search: '', category: '', owner: '', from: '', to: '', sort: '' } as const;

describe('project filters', () => {
  describe('readProjectFilters', () => {
    it('returns empty filters for an empty query', () => {
      expect(readProjectFilters(params(''))).toEqual(noFilters);
    });

    it('reads every filter', () => {
      expect(readProjectFilters(params('search=bridge&category=c1&owner=u1&from=2026-01-01&to=2026-02-01&sort=name_desc'))).toEqual({
        search: 'bridge',
        category: 'c1',
        owner: 'u1',
        from: '2026-01-01',
        to: '2026-02-01',
        sort: 'name_desc',
      });
    });

    it.each(['budget', 'toString', 'NAME_ASC'])('ignores the unknown sort %p', (sort) => {
      expect(readProjectFilters(params(`sort=${sort}`)).sort).toBe('');
    });

    it('knows a label for every sort', () => {
      expect(Object.values(PROJECT_SORT_LABELS)).toEqual([
        'Name A-Z',
        'Name Z-A',
        'Start date newest',
        'Start date oldest',
        'Total spend highest',
        'Total spend lowest',
      ]);
    });
  });

  describe('getActiveFilters and hasActiveFilters', () => {
    it('keeps only the filters with a value', () => {
      expect(getActiveFilters({ ...noFilters, owner: 'u1', sort: 'spend_asc' })).toEqual({ owner: 'u1', sort: 'spend_asc' });
    });

    it('is not active without any value', () => {
      expect(hasActiveFilters({ ...noFilters })).toBe(false);
    });

    it('is active with a sort only', () => {
      expect(hasActiveFilters({ ...noFilters, sort: 'name_asc' })).toBe(true);
    });
  });

  describe('readPage', () => {
    it.each([
      ['', 1],
      ['page=3', 3],
      ['page=1', 1],
      ['page=0', 1],
      ['page=-2', 1],
      ['page=2.5', 1],
      ['page=abc', 1],
    ])('reads %p as page %p', (query, page) => {
      expect(readPage(params(query))).toBe(page);
    });
  });

  describe('withPage', () => {
    it('sets the page and keeps the filters', () => {
      expect(withPage(params('search=a'), 2).toString()).toBe('search=a&page=2');
    });

    it('drops the page for the first page', () => {
      expect(withPage(params('search=a&page=3'), 1).toString()).toBe('search=a');
    });

    it('does not change the given params', () => {
      const original = params('search=a');

      withPage(original, 2);

      expect(original.toString()).toBe('search=a');
    });
  });

  describe('withFilter', () => {
    it('sets the filter and returns to the first page', () => {
      expect(withFilter(params('search=a&page=3'), 'owner', 'u1').toString()).toBe('search=a&owner=u1');
    });

    it('removes a filter set to an empty value', () => {
      expect(withFilter(params('search=a&owner=u1'), 'owner', '').toString()).toBe('search=a');
    });
  });

  describe('withoutFilters', () => {
    it('removes every filter and the page but keeps other params', () => {
      const query = 'search=a&category=c1&owner=u1&from=2026-01-01&to=2026-02-01&sort=name_asc&page=2&tab=x';

      expect(withoutFilters(params(query)).toString()).toBe('tab=x');
    });
  });
});
