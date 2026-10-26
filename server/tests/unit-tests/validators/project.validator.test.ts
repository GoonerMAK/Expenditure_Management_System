import { projectSchema } from '../../../src/validators/project.validator.js';
import { OTHER_ID } from '../helpers/factories.js';

const issue = (input: unknown) => projectSchema.safeParse(input).error?.issues[0];

describe('project.validator projectSchema', () => {
  it('accepts a minimal project with only a name', () => {
    expect(projectSchema.parse({ project_name: 'Bridge' })).toEqual({
      project_name: 'Bridge',
      start_date: undefined,
      end_date: undefined,
    });
  });

  it('accepts a complete project', () => {
    const result = projectSchema.parse({
      project_name: 'Bridge Renovation',
      description: 'Renovate the river bridge',
      category_id: OTHER_ID,
      category_name: 'Infrastructure',
      start_date: '2026-02-01',
      end_date: '2026-12-31T00:00:00.000Z',
      created_by_id: OTHER_ID,
    });

    expect(result).toEqual(
      expect.objectContaining({
        project_name: 'Bridge Renovation',
        category_id: OTHER_ID,
        start_date: new Date('2026-02-01'),
        end_date: new Date('2026-12-31T00:00:00.000Z'),
      }),
    );
  });

  describe('project_name', () => {
    it('accepts exactly 3 characters', () => {
      expect(projectSchema.safeParse({ project_name: 'abc' }).success).toBe(true);
    });

    it('rejects 2 characters with the custom message', () => {
      expect(issue({ project_name: 'ab' })?.message).toBe('Project name must be at least 3 characters long');
    });

    it('is required', () => {
      expect(issue({})?.path).toEqual(['project_name']);
    });
  });

  describe('dates', () => {
    it('converts an ISO string into a Date', () => {
      const { start_date } = projectSchema.parse({ project_name: 'Bridge', start_date: '2026-02-01T09:30:00.000Z' });

      expect(start_date).toBeInstanceOf(Date);
      expect(start_date?.toISOString()).toBe('2026-02-01T09:30:00.000Z');
    });

    it('keeps a Date instance as a Date', () => {
      const date = new Date('2026-02-01T00:00:00.000Z');

      expect(projectSchema.parse({ project_name: 'Bridge', end_date: date }).end_date).toEqual(date);
    });

    it('rejects an unparseable date string', () => {
      expect(issue({ project_name: 'Bridge', start_date: 'next tuesday' })?.message).toBe('Invalid date');
    });

    it('rejects an empty date string', () => {
      expect(issue({ project_name: 'Bridge', end_date: '' })?.path).toEqual(['end_date']);
    });

    it('silently drops a numeric timestamp instead of converting it', () => {
      expect(projectSchema.parse({ project_name: 'Bridge', start_date: 1767225600000 }).start_date).toBeUndefined();
    });

    it('accepts an end date before the start date because no cross-field rule exists', () => {
      expect(
        projectSchema.safeParse({ project_name: 'Bridge', start_date: '2026-12-31', end_date: '2026-01-01' }).success,
      ).toBe(true);
    });
  });

  describe('references', () => {
    it.each(['category_id', 'created_by_id'])('rejects a non-UUID %s', (field) => {
      expect(issue({ project_name: 'Bridge', [field]: 'abc' })?.path).toEqual([field]);
    });
  });
});
