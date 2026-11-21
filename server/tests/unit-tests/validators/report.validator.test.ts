import { categoryReportParamsSchema, reportQuerySchema } from '../../../src/validators/report.validator.js';
import { ID } from '../helpers/factories.js';

const queryIssue = (input: unknown) => reportQuerySchema.safeParse(input).error?.issues[0];
const paramsIssue = (input: unknown) => categoryReportParamsSchema.safeParse(input).error?.issues[0];

describe('report.validator', () => {
  describe('reportQuerySchema', () => {
    it('defaults to a monthly CSV over all years', () => {
      expect(reportQuerySchema.parse({})).toEqual({ period: 'monthly', format: 'csv' });
    });

    it('accepts a yearly PDF for one year', () => {
      expect(reportQuerySchema.parse({ period: 'yearly', format: 'pdf', year: '2026' })).toEqual({
        period: 'yearly',
        format: 'pdf',
        year: 2026,
      });
    });

    it('rejects an unknown period', () => {
      expect(queryIssue({ period: 'weekly' })?.message).toBe('Period must be one of: monthly, yearly');
    });

    it('rejects an unknown format', () => {
      expect(queryIssue({ format: 'xlsx' })?.message).toBe('Format must be one of: csv, pdf');
    });

    it.each(['abc', '1899', '10000', ''])('rejects the year %p', (year) => {
      expect(queryIssue({ year })?.message).toBe('Year must be between 1900 and 9999');
    });
  });

  describe('categoryReportParamsSchema', () => {
    it.each([ID, 'uncategorised'])('accepts %p', (id) => {
      expect(categoryReportParamsSchema.parse({ id })).toEqual({ id });
    });

    it('rejects any other id', () => {
      expect(paramsIssue({ id: 'roads' })?.message).toBe('Invalid ID format. Must be a UUID or uncategorised.');
    });
  });
});
