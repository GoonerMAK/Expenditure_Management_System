import { financialDataSchema } from '../../../src/validators/financial-data.validator.js';
import { OTHER_ID } from '../helpers/factories.js';

const valid = {
  year: 2026,
  month: 3,
  expenditure: 1500.5,
  initial_budget: 10000,
  revised_budget: 12000,
  project_id: OTHER_ID,
  project_name: 'Bridge Renovation',
};

const issue = (input: unknown) => financialDataSchema.safeParse(input).error?.issues[0];

describe('financial-data.validator financialDataSchema', () => {
  it('accepts a complete record', () => {
    expect(financialDataSchema.parse(valid)).toEqual(valid);
  });

  it('accepts an empty object because every field is optional', () => {
    expect(financialDataSchema.parse({})).toEqual({});
  });

  describe('year', () => {
    it('accepts 1900', () => {
      expect(financialDataSchema.safeParse({ year: 1900 }).success).toBe(true);
    });

    it('rejects 1899 with the custom message', () => {
      expect(issue({ year: 1899 })?.message).toBe('Year must be 1900 or later');
    });

    it('rejects a fractional year', () => {
      expect(issue({ year: 2026.5 })?.path).toEqual(['year']);
    });

    it('rejects a numeric string', () => {
      expect(issue({ year: '2026' })?.message).toBe('Expected number, received string');
    });
  });

  describe('month', () => {
    it.each([1, 12])('accepts %d', (month) => {
      expect(financialDataSchema.safeParse({ month }).success).toBe(true);
    });

    it('rejects 13 with the custom message', () => {
      expect(issue({ month: 13 })?.message).toBe('Month must be between 1 and 12');
    });

    it('rejects 0', () => {
      expect(issue({ month: 0 })?.path).toEqual(['month']);
    });

    it('rejects a fractional month', () => {
      expect(issue({ month: 2.5 })?.path).toEqual(['month']);
    });
  });

  describe.each(['expenditure', 'initial_budget', 'revised_budget'])('%s', (field) => {
    it('accepts zero', () => {
      expect(financialDataSchema.safeParse({ [field]: 0 }).success).toBe(true);
    });

    it('accepts a decimal amount', () => {
      expect(financialDataSchema.safeParse({ [field]: 99.99 }).success).toBe(true);
    });

    it('rejects a negative amount', () => {
      expect(issue({ [field]: -0.01 })?.path).toEqual([field]);
    });

    it('rejects a string amount', () => {
      expect(issue({ [field]: '100' })?.path).toEqual([field]);
    });

    it('rejects NaN', () => {
      expect(issue({ [field]: NaN })?.path).toEqual([field]);
    });
  });

  it('accepts a null revised budget to mean the budget was not revised', () => {
    expect(financialDataSchema.safeParse({ revised_budget: null }).success).toBe(true);
  });

  it.each(['expenditure', 'initial_budget'])('rejects a null %s', (field) => {
    expect(issue({ [field]: null })?.path).toEqual([field]);
  });

  describe('project reference', () => {
    it('rejects a non-UUID project_id', () => {
      expect(issue({ project_id: 'project-1' })?.path).toEqual(['project_id']);
    });

    it('rejects an empty project_name with the custom message', () => {
      expect(issue({ project_name: '' })?.message).toBe('Project name cannot be empty');
    });
  });
});
