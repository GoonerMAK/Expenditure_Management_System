import * as expenseEntryService from '../../../src/services/expense-entry.service.js';
import * as expenseEntryRepository from '../../../src/repositories/expense-entry.repository.js';
import * as projectRepository from '../../../src/repositories/project.repository.js';
import * as userRepository from '../../../src/repositories/user.repository.js';
import * as receiptStorage from '../../../src/storage/receipt.storage.js';
import { buildExpenseEntry, buildProject, buildRole, buildUser, ID, NOW, OTHER_ID, withReviewer } from '../helpers/factories.js';

jest.mock('../../../src/repositories/expense-entry.repository.js');
jest.mock('../../../src/repositories/project.repository.js');
jest.mock('../../../src/repositories/user.repository.js');
jest.mock('../../../src/storage/receipt.storage.js');

const repo = jest.mocked(expenseEntryRepository);
const projects = jest.mocked(projectRepository);
const users = jest.mocked(userRepository);
const storage = jest.mocked(receiptStorage);

const USER_ID = 'c4d5e6f7-1a2b-4c3d-8e9f-0a1b2c3d4e5f';
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

const userWithRole = (role_name: string) => ({ ...buildUser({ id: USER_ID, role_name }), role: buildRole({ role_name }) });

const contributor = userWithRole('Contributor');
const administrator = userWithRole('Administrator');

const pending = { status: 'Pending', rejection_reason: null, reviewed_by_id: null, reviewed_at: null };

const publicEntry = (overrides = {}) => ({
  id: ID,
  project_id: OTHER_ID,
  date: new Date('2026-03-12T00:00:00.000Z'),
  vendor: 'Steel Supplies Ltd',
  amount: 250.75,
  notes: 'Rebar for the north pier',
  receipt_name: 'invoice-1042.pdf',
  receipt_type: 'application/pdf',
  status: 'Approved',
  rejection_reason: null,
  reviewed_by_id: null,
  reviewed_at: null,
  has_receipt: true,
  reviewed_by_name: null,
  created_at: NOW,
  updated_at: NOW,
  ...overrides,
});

describe('expense-entry.service', () => {
  beforeEach(() => {
    users.getUserWithRole.mockResolvedValue(contributor);
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
        withReviewer(buildExpenseEntry()),
        withReviewer(buildExpenseEntry({ receipt_file: null, receipt_name: null, receipt_type: null })),
      ]);

      const result = await expenseEntryService.getProjectExpenseEntries(OTHER_ID);

      expect(repo.getExpenseEntriesByProject).toHaveBeenCalledWith(OTHER_ID);
      expect(result).toEqual([
        publicEntry(),
        publicEntry({ receipt_name: null, receipt_type: null, has_receipt: false }),
      ]);
      expect(result?.[0]).not.toHaveProperty('receipt_file');
    });

    it('shows who reviewed each entry', async () => {
      projects.getProjectById.mockResolvedValue(buildProject({ id: OTHER_ID }));
      repo.getExpenseEntriesByProject.mockResolvedValue([withReviewer(buildExpenseEntry({ reviewed_by_id: USER_ID }), 'admin')]);

      const result = await expenseEntryService.getProjectExpenseEntries(OTHER_ID);

      expect(result).toEqual([publicEntry({ reviewed_by_id: USER_ID, reviewed_by_name: 'admin' })]);
      expect(result?.[0]).not.toHaveProperty('reviewed_by');
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
      repo.createExpenseEntry.mockResolvedValue(withReviewer(buildExpenseEntry({ receipt_file: null, receipt_name: null, receipt_type: null })));

      const result = await expenseEntryService.createExpenseEntry(input, USER_ID);

      expect(storage.saveReceipt).not.toHaveBeenCalled();
      expect(repo.createExpenseEntry).toHaveBeenCalledWith({ ...input, ...pending });
      expect(result).toEqual(publicEntry({ receipt_name: null, receipt_type: null, has_receipt: false }));
    });

    it('starts a Contributor entry as Pending', async () => {
      projects.getProjectById.mockResolvedValue(buildProject({ id: OTHER_ID }));
      repo.createExpenseEntry.mockResolvedValue(withReviewer(buildExpenseEntry({ status: 'Pending' })));

      const result = await expenseEntryService.createExpenseEntry(input, USER_ID);

      expect(users.getUserWithRole).toHaveBeenCalledWith(USER_ID);
      expect(repo.createExpenseEntry).toHaveBeenCalledWith(expect.objectContaining(pending));
      expect(result?.status).toBe('Pending');
    });

    it('approves an Administrator entry straight away and records the reviewer', async () => {
      users.getUserWithRole.mockResolvedValue(administrator);
      projects.getProjectById.mockResolvedValue(buildProject({ id: OTHER_ID }));
      repo.createExpenseEntry.mockResolvedValue(withReviewer(buildExpenseEntry({ reviewed_by_id: USER_ID }), 'admin'));

      await expenseEntryService.createExpenseEntry(input, USER_ID);

      expect(repo.createExpenseEntry).toHaveBeenCalledWith({
        ...input,
        status: 'Approved',
        rejection_reason: null,
        reviewed_by_id: USER_ID,
        reviewed_at: expect.any(Date),
      });
    });

    it('treats a user without a role as a Contributor', async () => {
      users.getUserWithRole.mockResolvedValue(null);
      projects.getProjectById.mockResolvedValue(buildProject({ id: OTHER_ID }));
      repo.createExpenseEntry.mockResolvedValue(withReviewer(buildExpenseEntry({ status: 'Pending' })));

      await expenseEntryService.createExpenseEntry(input, USER_ID);

      expect(repo.createExpenseEntry).toHaveBeenCalledWith(expect.objectContaining(pending));
    });

    it('saves the receipt and stores its file, name and type', async () => {
      projects.getProjectById.mockResolvedValue(buildProject({ id: OTHER_ID }));
      repo.createExpenseEntry.mockResolvedValue(
        withReviewer(buildExpenseEntry({ receipt_file: NEW_FILE, receipt_name: 'photo.png', receipt_type: 'image/png' })),
      );

      const result = await expenseEntryService.createExpenseEntry(input, USER_ID, upload);

      expect(storage.saveReceipt).toHaveBeenCalledWith(upload.buffer, 'image/png');
      expect(repo.createExpenseEntry).toHaveBeenCalledWith({
        ...input,
        receipt_file: NEW_FILE,
        receipt_name: 'photo.png',
        receipt_type: 'image/png',
        ...pending,
      });
      expect(result).toEqual(publicEntry({ receipt_name: 'photo.png', receipt_type: 'image/png' }));
    });

    it('returns null without saving anything when the project does not exist', async () => {
      projects.getProjectById.mockResolvedValue(null);

      expect(await expenseEntryService.createExpenseEntry(input, USER_ID, upload)).toBeNull();
      expect(storage.saveReceipt).not.toHaveBeenCalled();
      expect(repo.createExpenseEntry).not.toHaveBeenCalled();
    });

    it('removes the saved receipt when the database write fails', async () => {
      projects.getProjectById.mockResolvedValue(buildProject({ id: OTHER_ID }));
      repo.createExpenseEntry.mockRejectedValue(new Error('constraint failed'));

      await expect(expenseEntryService.createExpenseEntry(input, USER_ID, upload)).rejects.toThrow(
        'Failed to create expense entry: Error: constraint failed',
      );
      expect(storage.deleteReceipt).toHaveBeenCalledWith(NEW_FILE);
    });

    it('still reports the original error when removing the receipt fails', async () => {
      projects.getProjectById.mockResolvedValue(buildProject({ id: OTHER_ID }));
      repo.createExpenseEntry.mockRejectedValue(new Error('constraint failed'));
      storage.deleteReceipt.mockRejectedValue(new Error('EACCES'));

      await expect(expenseEntryService.createExpenseEntry(input, USER_ID, upload)).rejects.toThrow(
        'Failed to create expense entry: Error: constraint failed',
      );
    });

    it('does not try to remove a receipt when none was saved', async () => {
      projects.getProjectById.mockRejectedValue(new Error('db down'));

      await expect(expenseEntryService.createExpenseEntry(input, USER_ID)).rejects.toThrow('Failed to create expense entry: Error: db down');
      expect(storage.deleteReceipt).not.toHaveBeenCalled();
    });
  });

  describe('updateExpenseEntry', () => {
    it('updates the fields and keeps the receipt', async () => {
      repo.getExpenseEntryById.mockResolvedValue(buildExpenseEntry());
      repo.updateExpenseEntry.mockResolvedValue(withReviewer(buildExpenseEntry({ amount: 300 })));

      const result = await expenseEntryService.updateExpenseEntry(ID, { amount: 300, remove_receipt: false }, USER_ID);

      expect(repo.updateExpenseEntry).toHaveBeenCalledWith(ID, { amount: 300, ...pending });
      expect(storage.deleteReceipt).not.toHaveBeenCalled();
      expect(result).toEqual(publicEntry({ amount: 300 }));
    });

    it('sends a Rejected entry back to Pending when a Contributor edits it', async () => {
      repo.getExpenseEntryById.mockResolvedValue(buildExpenseEntry({ status: 'Rejected', rejection_reason: 'No receipt' }));
      repo.updateExpenseEntry.mockResolvedValue(withReviewer(buildExpenseEntry({ status: 'Pending' })));

      const result = await expenseEntryService.updateExpenseEntry(ID, { vendor: 'Acme', remove_receipt: false }, USER_ID);

      expect(repo.updateExpenseEntry).toHaveBeenCalledWith(ID, { vendor: 'Acme', ...pending });
      expect(result?.status).toBe('Pending');
    });

    it('keeps the status when an Administrator edits the entry', async () => {
      users.getUserWithRole.mockResolvedValue(administrator);
      repo.getExpenseEntryById.mockResolvedValue(buildExpenseEntry({ status: 'Rejected' }));
      repo.updateExpenseEntry.mockResolvedValue(withReviewer(buildExpenseEntry({ status: 'Rejected' })));

      await expenseEntryService.updateExpenseEntry(ID, { amount: 300, remove_receipt: false }, USER_ID);

      expect(repo.updateExpenseEntry).toHaveBeenCalledWith(ID, { amount: 300 });
    });

    it('replaces the receipt and removes the old file', async () => {
      repo.getExpenseEntryById.mockResolvedValue(buildExpenseEntry());
      repo.updateExpenseEntry.mockResolvedValue(
        withReviewer(buildExpenseEntry({ receipt_file: NEW_FILE, receipt_name: 'photo.png', receipt_type: 'image/png' })),
      );

      await expenseEntryService.updateExpenseEntry(ID, { remove_receipt: false }, USER_ID, upload);

      expect(repo.updateExpenseEntry).toHaveBeenCalledWith(ID, {
        receipt_file: NEW_FILE,
        receipt_name: 'photo.png',
        receipt_type: 'image/png',
        ...pending,
      });
      expect(storage.deleteReceipt).toHaveBeenCalledWith(OLD_FILE);
    });

    it('removes the receipt when asked', async () => {
      repo.getExpenseEntryById.mockResolvedValue(buildExpenseEntry());
      repo.updateExpenseEntry.mockResolvedValue(withReviewer(buildExpenseEntry({ receipt_file: null, receipt_name: null, receipt_type: null })));

      const result = await expenseEntryService.updateExpenseEntry(ID, { remove_receipt: true }, USER_ID);

      expect(repo.updateExpenseEntry).toHaveBeenCalledWith(ID, { receipt_file: null, receipt_name: null, receipt_type: null, ...pending });
      expect(storage.deleteReceipt).toHaveBeenCalledWith(OLD_FILE);
      expect(result?.has_receipt).toBe(false);
    });

    it('does not try to delete a file when the entry had no receipt', async () => {
      repo.getExpenseEntryById.mockResolvedValue(buildExpenseEntry({ receipt_file: null }));
      repo.updateExpenseEntry.mockResolvedValue(withReviewer(buildExpenseEntry({ receipt_file: null })));

      await expenseEntryService.updateExpenseEntry(ID, { remove_receipt: true }, USER_ID);

      expect(storage.deleteReceipt).not.toHaveBeenCalled();
    });

    it('returns null when the entry does not exist', async () => {
      repo.getExpenseEntryById.mockResolvedValue(null);

      expect(await expenseEntryService.updateExpenseEntry(ID, { remove_receipt: false }, USER_ID, upload)).toBeNull();
      expect(storage.saveReceipt).not.toHaveBeenCalled();
      expect(repo.updateExpenseEntry).not.toHaveBeenCalled();
    });

    it('removes the new receipt when the entry is deleted before the update lands', async () => {
      repo.getExpenseEntryById.mockResolvedValue(buildExpenseEntry());
      repo.updateExpenseEntry.mockResolvedValue(null);

      expect(await expenseEntryService.updateExpenseEntry(ID, { remove_receipt: false }, USER_ID, upload)).toBeNull();
      expect(storage.deleteReceipt).toHaveBeenCalledTimes(1);
      expect(storage.deleteReceipt).toHaveBeenCalledWith(NEW_FILE);
    });

    it('removes the new receipt and keeps the old one when the update fails', async () => {
      repo.getExpenseEntryById.mockResolvedValue(buildExpenseEntry());
      repo.updateExpenseEntry.mockRejectedValue(new Error('db down'));

      await expect(expenseEntryService.updateExpenseEntry(ID, { remove_receipt: false }, USER_ID, upload)).rejects.toThrow(
        'Failed to update expense entry: Error: db down',
      );
      expect(storage.deleteReceipt).toHaveBeenCalledTimes(1);
      expect(storage.deleteReceipt).toHaveBeenCalledWith(NEW_FILE);
    });
  });

  describe('approveExpenseEntry', () => {
    it('approves the entry and records who did it and when', async () => {
      repo.updateExpenseEntry.mockResolvedValue(withReviewer(buildExpenseEntry({ reviewed_by_id: USER_ID }), 'admin'));

      const result = await expenseEntryService.approveExpenseEntry(ID, USER_ID);

      expect(repo.updateExpenseEntry).toHaveBeenCalledWith(ID, {
        status: 'Approved',
        rejection_reason: null,
        reviewed_by_id: USER_ID,
        reviewed_at: expect.any(Date),
      });
      expect(result).toEqual(publicEntry({ reviewed_by_id: USER_ID, reviewed_by_name: 'admin' }));
    });

    it('returns null when the entry does not exist', async () => {
      repo.updateExpenseEntry.mockResolvedValue(null);

      expect(await expenseEntryService.approveExpenseEntry(ID, USER_ID)).toBeNull();
    });

    it('wraps repository errors', async () => {
      repo.updateExpenseEntry.mockRejectedValue(new Error('db down'));

      await expect(expenseEntryService.approveExpenseEntry(ID, USER_ID)).rejects.toThrow('Failed to approve expense entry: Error: db down');
    });
  });

  describe('rejectExpenseEntry', () => {
    it('rejects the entry with the reason and records who did it and when', async () => {
      repo.updateExpenseEntry.mockResolvedValue(
        withReviewer(buildExpenseEntry({ status: 'Rejected', rejection_reason: 'No receipt', reviewed_by_id: USER_ID }), 'admin'),
      );

      const result = await expenseEntryService.rejectExpenseEntry(ID, USER_ID, 'No receipt');

      expect(repo.updateExpenseEntry).toHaveBeenCalledWith(ID, {
        status: 'Rejected',
        rejection_reason: 'No receipt',
        reviewed_by_id: USER_ID,
        reviewed_at: expect.any(Date),
      });
      expect(result).toEqual(
        publicEntry({ status: 'Rejected', rejection_reason: 'No receipt', reviewed_by_id: USER_ID, reviewed_by_name: 'admin' }),
      );
    });

    it('rejects without a reason', async () => {
      repo.updateExpenseEntry.mockResolvedValue(withReviewer(buildExpenseEntry({ status: 'Rejected' })));

      await expenseEntryService.rejectExpenseEntry(ID, USER_ID);

      expect(repo.updateExpenseEntry).toHaveBeenCalledWith(ID, expect.objectContaining({ status: 'Rejected', rejection_reason: null }));
    });

    it('returns null when the entry does not exist', async () => {
      repo.updateExpenseEntry.mockResolvedValue(null);

      expect(await expenseEntryService.rejectExpenseEntry(ID, USER_ID, 'No receipt')).toBeNull();
    });

    it('wraps repository errors', async () => {
      repo.updateExpenseEntry.mockRejectedValue(new Error('db down'));

      await expect(expenseEntryService.rejectExpenseEntry(ID, USER_ID)).rejects.toThrow('Failed to reject expense entry: Error: db down');
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
