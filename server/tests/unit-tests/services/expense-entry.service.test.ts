import * as expenseEntryService from '../../../src/services/expense-entry.service.js';
import * as expenseEntryRepository from '../../../src/repositories/expense-entry.repository.js';
import * as projectRepository from '../../../src/repositories/project.repository.js';
import * as receiptStorage from '../../../src/storage/receipt.storage.js';
import { buildExpenseEntry, buildProject, ID, NOW, OTHER_ID } from '../helpers/factories.js';

jest.mock('../../../src/repositories/expense-entry.repository.js');
jest.mock('../../../src/repositories/project.repository.js');
jest.mock('../../../src/storage/receipt.storage.js');

const repo = jest.mocked(expenseEntryRepository);
const projects = jest.mocked(projectRepository);
const storage = jest.mocked(receiptStorage);

const NEW_FILE = 'new-receipt.png';
const OLD_FILE = 'b6d1c1e2-0f4a-4e7b-9a55-3c2d1e0f9a8b.pdf';

const input = {
  project_id: OTHER_ID,
  date: new Date('2026-03-12T00:00:00.000Z'),
  vendor: 'Steel Supplies Ltd',
  amount: 250.75,
  notes: 'Rebar for the north pier',
};

const upload = { buffer: Buffer.from('png-bytes'), mimetype: 'image/png', originalname: 'photo.png' } as Express.Multer.File;

const publicEntry = (overrides = {}) => ({
  id: ID,
  project_id: OTHER_ID,
  date: new Date('2026-03-12T00:00:00.000Z'),
  vendor: 'Steel Supplies Ltd',
  amount: 250.75,
  notes: 'Rebar for the north pier',
  receipt_name: 'invoice-1042.pdf',
  receipt_type: 'application/pdf',
  has_receipt: true,
  created_at: NOW,
  updated_at: NOW,
  ...overrides,
});

describe('expense-entry.service', () => {
  beforeEach(() => {
    storage.saveReceipt.mockResolvedValue(NEW_FILE);
    storage.deleteReceipt.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('getProjectExpenseEntries', () => {
    it('returns the entries without the stored file name', async () => {
      projects.getProjectById.mockResolvedValue(buildProject({ id: OTHER_ID }));
      repo.getExpenseEntriesByProject.mockResolvedValue([
        buildExpenseEntry(),
        buildExpenseEntry({ receipt_file: null, receipt_name: null, receipt_type: null }),
      ]);

      const result = await expenseEntryService.getProjectExpenseEntries(OTHER_ID);

      expect(repo.getExpenseEntriesByProject).toHaveBeenCalledWith(OTHER_ID);
      expect(result).toEqual([
        publicEntry(),
        publicEntry({ receipt_name: null, receipt_type: null, has_receipt: false }),
      ]);
      expect(result?.[0]).not.toHaveProperty('receipt_file');
    });

    it('returns null when the project does not exist', async () => {
      projects.getProjectById.mockResolvedValue(null);

      expect(await expenseEntryService.getProjectExpenseEntries(OTHER_ID)).toBeNull();
      expect(repo.getExpenseEntriesByProject).not.toHaveBeenCalled();
    });

    it('wraps repository errors', async () => {
      projects.getProjectById.mockRejectedValue(new Error('db down'));

      await expect(expenseEntryService.getProjectExpenseEntries(OTHER_ID)).rejects.toThrow(
        'Failed to fetch expense entries: Error: db down',
      );
    });
  });

  describe('createExpenseEntry', () => {
    it('creates an entry without a receipt', async () => {
      projects.getProjectById.mockResolvedValue(buildProject({ id: OTHER_ID }));
      repo.createExpenseEntry.mockResolvedValue(buildExpenseEntry({ receipt_file: null, receipt_name: null, receipt_type: null }));

      const result = await expenseEntryService.createExpenseEntry(input);

      expect(storage.saveReceipt).not.toHaveBeenCalled();
      expect(repo.createExpenseEntry).toHaveBeenCalledWith(input);
      expect(result).toEqual(publicEntry({ receipt_name: null, receipt_type: null, has_receipt: false }));
    });

    it('saves the receipt and stores its file, name and type', async () => {
      projects.getProjectById.mockResolvedValue(buildProject({ id: OTHER_ID }));
      repo.createExpenseEntry.mockResolvedValue(
        buildExpenseEntry({ receipt_file: NEW_FILE, receipt_name: 'photo.png', receipt_type: 'image/png' }),
      );

      const result = await expenseEntryService.createExpenseEntry(input, upload);

      expect(storage.saveReceipt).toHaveBeenCalledWith(upload.buffer, 'image/png');
      expect(repo.createExpenseEntry).toHaveBeenCalledWith({
        ...input,
        receipt_file: NEW_FILE,
        receipt_name: 'photo.png',
        receipt_type: 'image/png',
      });
      expect(result).toEqual(publicEntry({ receipt_name: 'photo.png', receipt_type: 'image/png' }));
    });

    it('returns null without saving anything when the project does not exist', async () => {
      projects.getProjectById.mockResolvedValue(null);

      expect(await expenseEntryService.createExpenseEntry(input, upload)).toBeNull();
      expect(storage.saveReceipt).not.toHaveBeenCalled();
      expect(repo.createExpenseEntry).not.toHaveBeenCalled();
    });

    it('removes the saved receipt when the database write fails', async () => {
      projects.getProjectById.mockResolvedValue(buildProject({ id: OTHER_ID }));
      repo.createExpenseEntry.mockRejectedValue(new Error('constraint failed'));

      await expect(expenseEntryService.createExpenseEntry(input, upload)).rejects.toThrow(
        'Failed to create expense entry: Error: constraint failed',
      );
      expect(storage.deleteReceipt).toHaveBeenCalledWith(NEW_FILE);
    });

    it('still reports the original error when removing the receipt fails', async () => {
      projects.getProjectById.mockResolvedValue(buildProject({ id: OTHER_ID }));
      repo.createExpenseEntry.mockRejectedValue(new Error('constraint failed'));
      storage.deleteReceipt.mockRejectedValue(new Error('EACCES'));

      await expect(expenseEntryService.createExpenseEntry(input, upload)).rejects.toThrow(
        'Failed to create expense entry: Error: constraint failed',
      );
    });

    it('does not try to remove a receipt when none was saved', async () => {
      projects.getProjectById.mockRejectedValue(new Error('db down'));

      await expect(expenseEntryService.createExpenseEntry(input)).rejects.toThrow('Failed to create expense entry: Error: db down');
      expect(storage.deleteReceipt).not.toHaveBeenCalled();
    });
  });

  describe('updateExpenseEntry', () => {
    it('updates the fields and keeps the receipt', async () => {
      repo.getExpenseEntryById.mockResolvedValue(buildExpenseEntry());
      repo.updateExpenseEntry.mockResolvedValue(buildExpenseEntry({ amount: 300 }));

      const result = await expenseEntryService.updateExpenseEntry(ID, { amount: 300, remove_receipt: false });

      expect(repo.updateExpenseEntry).toHaveBeenCalledWith(ID, { amount: 300 });
      expect(storage.deleteReceipt).not.toHaveBeenCalled();
      expect(result).toEqual(publicEntry({ amount: 300 }));
    });

    it('replaces the receipt and removes the old file', async () => {
      repo.getExpenseEntryById.mockResolvedValue(buildExpenseEntry());
      repo.updateExpenseEntry.mockResolvedValue(
        buildExpenseEntry({ receipt_file: NEW_FILE, receipt_name: 'photo.png', receipt_type: 'image/png' }),
      );

      await expenseEntryService.updateExpenseEntry(ID, { remove_receipt: false }, upload);

      expect(repo.updateExpenseEntry).toHaveBeenCalledWith(ID, {
        receipt_file: NEW_FILE,
        receipt_name: 'photo.png',
        receipt_type: 'image/png',
      });
      expect(storage.deleteReceipt).toHaveBeenCalledWith(OLD_FILE);
    });

    it('removes the receipt when asked', async () => {
      repo.getExpenseEntryById.mockResolvedValue(buildExpenseEntry());
      repo.updateExpenseEntry.mockResolvedValue(buildExpenseEntry({ receipt_file: null, receipt_name: null, receipt_type: null }));

      const result = await expenseEntryService.updateExpenseEntry(ID, { remove_receipt: true });

      expect(repo.updateExpenseEntry).toHaveBeenCalledWith(ID, { receipt_file: null, receipt_name: null, receipt_type: null });
      expect(storage.deleteReceipt).toHaveBeenCalledWith(OLD_FILE);
      expect(result?.has_receipt).toBe(false);
    });

    it('does not try to delete a file when the entry had no receipt', async () => {
      repo.getExpenseEntryById.mockResolvedValue(buildExpenseEntry({ receipt_file: null }));
      repo.updateExpenseEntry.mockResolvedValue(buildExpenseEntry({ receipt_file: null }));

      await expenseEntryService.updateExpenseEntry(ID, { remove_receipt: true });

      expect(storage.deleteReceipt).not.toHaveBeenCalled();
    });

    it('returns null when the entry does not exist', async () => {
      repo.getExpenseEntryById.mockResolvedValue(null);

      expect(await expenseEntryService.updateExpenseEntry(ID, { remove_receipt: false }, upload)).toBeNull();
      expect(storage.saveReceipt).not.toHaveBeenCalled();
      expect(repo.updateExpenseEntry).not.toHaveBeenCalled();
    });

    it('removes the new receipt when the entry is deleted before the update lands', async () => {
      repo.getExpenseEntryById.mockResolvedValue(buildExpenseEntry());
      repo.updateExpenseEntry.mockResolvedValue(null);

      expect(await expenseEntryService.updateExpenseEntry(ID, { remove_receipt: false }, upload)).toBeNull();
      expect(storage.deleteReceipt).toHaveBeenCalledTimes(1);
      expect(storage.deleteReceipt).toHaveBeenCalledWith(NEW_FILE);
    });

    it('removes the new receipt and keeps the old one when the update fails', async () => {
      repo.getExpenseEntryById.mockResolvedValue(buildExpenseEntry());
      repo.updateExpenseEntry.mockRejectedValue(new Error('db down'));

      await expect(expenseEntryService.updateExpenseEntry(ID, { remove_receipt: false }, upload)).rejects.toThrow(
        'Failed to update expense entry: Error: db down',
      );
      expect(storage.deleteReceipt).toHaveBeenCalledTimes(1);
      expect(storage.deleteReceipt).toHaveBeenCalledWith(NEW_FILE);
    });
  });

  describe('deleteExpenseEntry', () => {
    it('deletes the entry and its receipt file', async () => {
      repo.deleteExpenseEntry.mockResolvedValue(buildExpenseEntry());

      const result = await expenseEntryService.deleteExpenseEntry(ID);

      expect(repo.deleteExpenseEntry).toHaveBeenCalledWith(ID);
      expect(storage.deleteReceipt).toHaveBeenCalledWith(OLD_FILE);
      expect(result).toEqual(publicEntry());
    });

    it('returns the entry even if the file cannot be removed', async () => {
      repo.deleteExpenseEntry.mockResolvedValue(buildExpenseEntry());
      storage.deleteReceipt.mockRejectedValue(new Error('EACCES'));

      expect(await expenseEntryService.deleteExpenseEntry(ID)).toEqual(publicEntry());
    });

    it('returns null when the entry does not exist', async () => {
      repo.deleteExpenseEntry.mockResolvedValue(null);

      expect(await expenseEntryService.deleteExpenseEntry(ID)).toBeNull();
      expect(storage.deleteReceipt).not.toHaveBeenCalled();
    });

    it('wraps repository errors', async () => {
      repo.deleteExpenseEntry.mockRejectedValue(new Error('db down'));

      await expect(expenseEntryService.deleteExpenseEntry(ID)).rejects.toThrow('Failed to delete expense entry: Error: db down');
    });
  });

  describe('getExpenseReceipt', () => {
    it('returns the file path, name and type', async () => {
      repo.getExpenseEntryById.mockResolvedValue(buildExpenseEntry());
      storage.getReceiptPath.mockReturnValue(`/srv/uploads/receipts/${OLD_FILE}`);

      expect(await expenseEntryService.getExpenseReceipt(ID)).toEqual({
        path: `/srv/uploads/receipts/${OLD_FILE}`,
        name: 'invoice-1042.pdf',
        type: 'application/pdf',
      });
      expect(storage.getReceiptPath).toHaveBeenCalledWith(OLD_FILE);
    });

    it('falls back to a default name and type', async () => {
      repo.getExpenseEntryById.mockResolvedValue(buildExpenseEntry({ receipt_name: null, receipt_type: null }));
      storage.getReceiptPath.mockReturnValue('/srv/file');

      expect(await expenseEntryService.getExpenseReceipt(ID)).toEqual({
        path: '/srv/file',
        name: 'receipt',
        type: 'application/octet-stream',
      });
    });

    it('returns null when the entry has no receipt', async () => {
      repo.getExpenseEntryById.mockResolvedValue(buildExpenseEntry({ receipt_file: null }));

      expect(await expenseEntryService.getExpenseReceipt(ID)).toBeNull();
    });

    it('returns null when the entry does not exist', async () => {
      repo.getExpenseEntryById.mockResolvedValue(null);

      expect(await expenseEntryService.getExpenseReceipt(ID)).toBeNull();
    });

    it('wraps repository errors', async () => {
      repo.getExpenseEntryById.mockRejectedValue(new Error('db down'));

      await expect(expenseEntryService.getExpenseReceipt(ID)).rejects.toThrow('Failed to fetch receipt: Error: db down');
    });
  });
});
