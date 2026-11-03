import {
  createExpenseEntrySchema,
  expenseEntryParamsSchema,
  updateExpenseEntrySchema,
} from '../../../src/validators/expense-entry.validator.js';
import { ID, OTHER_ID } from '../helpers/factories.js';

const valid = {
  project_id: OTHER_ID,
  date: '2026-03-12',
  vendor: 'Steel Supplies Ltd',
  amount: '250.75',
  notes: 'Rebar for the north pier',
};

const createIssue = (input: unknown) => createExpenseEntrySchema.safeParse(input).error?.issues[0];
const updateIssue = (input: unknown) => updateExpenseEntrySchema.safeParse(input).error?.issues[0];

describe('expense-entry.validator', () => {
  describe('expenseEntryParamsSchema', () => {
    it('accepts a UUID', () => {
      expect(expenseEntryParamsSchema.parse({ id: ID })).toEqual({ id: ID });
    });

    it('rejects a non-UUID id', () => {
      expect(expenseEntryParamsSchema.safeParse({ id: '42' }).error?.issues[0].message).toBe('Invalid ID format. Must be a UUID.');
    });
  });

  describe('createExpenseEntrySchema', () => {
    it('parses multipart strings into a date and a number', () => {
      expect(createExpenseEntrySchema.parse(valid)).toEqual({
        project_id: OTHER_ID,
        date: new Date('2026-03-12T00:00:00.000Z'),
        vendor: 'Steel Supplies Ltd',
        amount: 250.75,
        notes: 'Rebar for the north pier',
      });
    });

    it('accepts a JSON number amount', () => {
      expect(createExpenseEntrySchema.parse({ ...valid, amount: 99 }).amount).toBe(99);
    });

    it('leaves notes out when not sent', () => {
      const { notes: _notes, ...withoutNotes } = valid;
      expect(createExpenseEntrySchema.parse(withoutNotes)).not.toHaveProperty('notes');
    });

    it('turns blank notes into null', () => {
      expect(createExpenseEntrySchema.parse({ ...valid, notes: '   ' }).notes).toBeNull();
    });

    it('trims the vendor', () => {
      expect(createExpenseEntrySchema.parse({ ...valid, vendor: '  Acme  ' }).vendor).toBe('Acme');
    });

    it('requires a UUID project id', () => {
      expect(createIssue({ ...valid, project_id: 'abc' })?.message).toBe('Project ID must be a UUID');
    });

    it('requires the date in YYYY-MM-DD format', () => {
      expect(createIssue({ ...valid, date: '12/03/2026' })?.message).toBe('Date must be in YYYY-MM-DD format');
    });

    it('rejects a date that does not exist', () => {
      expect(createIssue({ ...valid, date: '2026-13-40' })?.message).toBe('Date must be a real date from 1900 or later');
    });

    it('rejects a day the month does not have', () => {
      expect(createIssue({ ...valid, date: '2026-02-30' })?.message).toBe('Date must be a real date from 1900 or later');
    });

    it('rejects a date before 1900', () => {
      expect(createIssue({ ...valid, date: '1899-12-31' })?.message).toBe('Date must be a real date from 1900 or later');
    });

    it('rejects an empty vendor', () => {
      expect(createIssue({ ...valid, vendor: '  ' })?.message).toBe('Vendor cannot be empty');
    });

    it('rejects a vendor over 200 characters', () => {
      expect(createIssue({ ...valid, vendor: 'a'.repeat(201) })?.message).toBe('Vendor must be 200 characters or fewer');
    });

    it('rejects a zero amount', () => {
      expect(createIssue({ ...valid, amount: '0' })?.message).toBe('Amount must be greater than 0');
    });

    it('rejects a blank amount', () => {
      expect(createIssue({ ...valid, amount: '' })?.message).toBe('Amount must be greater than 0');
    });

    it('rejects a negative amount', () => {
      expect(createIssue({ ...valid, amount: -5 })?.message).toBe('Amount must be greater than 0');
    });

    it('rejects an amount that is not a number', () => {
      expect(createIssue({ ...valid, amount: 'ten' })?.message).toBe('Amount must be a number');
    });

    it('rejects an amount that is too large', () => {
      expect(createIssue({ ...valid, amount: 1e13 })?.message).toBe('Amount is too large');
    });

    it('rejects notes over 1000 characters', () => {
      expect(createIssue({ ...valid, notes: 'a'.repeat(1001) })?.message).toBe('Notes must be 1000 characters or fewer');
    });

    it('requires vendor, amount and date', () => {
      expect(createExpenseEntrySchema.safeParse({ project_id: OTHER_ID }).error?.issues.map((i) => i.path[0])).toEqual([
        'date',
        'vendor',
        'amount',
      ]);
    });
  });

  describe('updateExpenseEntrySchema', () => {
    it('accepts an empty body and does not remove the receipt', () => {
      expect(updateExpenseEntrySchema.parse({})).toEqual({ remove_receipt: false });
    });

    it('parses a partial update', () => {
      expect(updateExpenseEntrySchema.parse({ amount: '12.5', remove_receipt: 'true' })).toEqual({
        amount: 12.5,
        remove_receipt: true,
      });
    });

    it('drops project_id so an entry cannot move to another project', () => {
      expect(updateExpenseEntrySchema.parse({ project_id: OTHER_ID })).toEqual({ remove_receipt: false });
    });

    it('turns blank notes into null to clear them', () => {
      expect(updateExpenseEntrySchema.parse({ notes: '' }).notes).toBeNull();
    });

    it('rejects a remove_receipt value other than true or false', () => {
      expect(updateIssue({ remove_receipt: 'yes' })?.message).toBe("remove_receipt must be 'true' or 'false'");
    });

    it('applies the same field rules as create', () => {
      expect(updateIssue({ date: '2026-3-1' })?.message).toBe('Date must be in YYYY-MM-DD format');
      expect(updateIssue({ amount: 0 })?.message).toBe('Amount must be greater than 0');
    });
  });
});
