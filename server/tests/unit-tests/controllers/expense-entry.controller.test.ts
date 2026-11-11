import * as expenseEntryController from '../../../src/controllers/expense-entry.controller.js';
import * as expenseEntryService from '../../../src/services/expense-entry.service.js';
import { ID, NOW, OTHER_ID } from '../helpers/factories.js';
import { expectResponse, mockRequest, mockResponse } from '../helpers/express.js';

jest.mock('../../../src/services/expense-entry.service.js');

const service = jest.mocked(expenseEntryService);

const date = new Date('2026-03-12T00:00:00.000Z');

const USER_ID = 'c4d5e6f7-1a2b-4c3d-8e9f-0a1b2c3d4e5f';

const user = { id: USER_ID };

const entry = {
  id: ID,
  project_id: OTHER_ID,
  date,
  vendor: 'Steel Supplies Ltd',
  amount: 250.75,
  notes: null,
  receipt_name: null,
  receipt_type: null,
  status: 'Pending' as const,
  rejection_reason: null,
  reviewed_by_id: null,
  reviewed_at: null,
  has_receipt: false,
  reviewed_by_name: null,
  created_at: NOW,
  updated_at: NOW,
};

const file = {
  fieldname: 'receipt',
  originalname: 'invoice.pdf',
  mimetype: 'application/pdf',
  buffer: Buffer.from('%PDF'),
  size: 4,
} as Express.Multer.File;

const receiptResponse = () => {
  const res = mockResponse() as ReturnType<typeof mockResponse> & { type: jest.Mock; setHeader: jest.Mock; sendFile: jest.Mock; headersSent: boolean };
  res.type = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  res.sendFile = jest.fn();
  res.headersSent = false;
  return res;
};

describe('expense-entry.controller', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('getProjectExpenseEntries', () => {
    it('responds 200 with the entries', async () => {
      service.getProjectExpenseEntries.mockResolvedValue([entry]);
      const res = mockResponse();

      await expenseEntryController.getProjectExpenseEntries(mockRequest({ params: { id: OTHER_ID } }), res);

      expect(service.getProjectExpenseEntries).toHaveBeenCalledWith(OTHER_ID);
      expectResponse(res, 200, [entry]);
    });

    it('responds 404 when the project does not exist', async () => {
      service.getProjectExpenseEntries.mockResolvedValue(null);
      const res = mockResponse();

      await expenseEntryController.getProjectExpenseEntries(mockRequest({ params: { id: OTHER_ID } }), res);

      expectResponse(res, 404, { error: `Project with id ${OTHER_ID} not found` });
    });

    it('responds 500 with the service error message', async () => {
      service.getProjectExpenseEntries.mockRejectedValue(new Error('boom'));
      const res = mockResponse();

      await expenseEntryController.getProjectExpenseEntries(mockRequest({ params: { id: OTHER_ID } }), res);

      expectResponse(res, 500, { error: 'boom' });
    });
  });

  describe('createExpenseEntry', () => {
    const body = { project_id: OTHER_ID, date, vendor: 'Steel Supplies Ltd', amount: 250.75, notes: 'Rebar' };

    it('responds 201 and passes the fields and the uploaded receipt', async () => {
      service.createExpenseEntry.mockResolvedValue(entry);
      const res = mockResponse();
      const req = mockRequest({ body: { ...body, extra: 'ignored' }, user });
      req.file = file;

      await expenseEntryController.createExpenseEntry(req, res);

      expect(service.createExpenseEntry).toHaveBeenCalledWith(body, USER_ID, file);
      expectResponse(res, 201, entry);
    });

    it('passes no receipt when no file was uploaded', async () => {
      service.createExpenseEntry.mockResolvedValue(entry);

      await expenseEntryController.createExpenseEntry(mockRequest({ body, user }), mockResponse());

      expect(service.createExpenseEntry).toHaveBeenCalledWith(body, USER_ID, undefined);
    });

    it('responds 404 when the project does not exist', async () => {
      service.createExpenseEntry.mockResolvedValue(null);
      const res = mockResponse();

      await expenseEntryController.createExpenseEntry(mockRequest({ body }), res);

      expectResponse(res, 404, { error: `Project with id ${OTHER_ID} not found` });
    });

    it('responds 500 with the service error message', async () => {
      service.createExpenseEntry.mockRejectedValue(new Error('boom'));
      const res = mockResponse();

      await expenseEntryController.createExpenseEntry(mockRequest({ body }), res);

      expectResponse(res, 500, { error: 'boom' });
    });
  });

  describe('updateExpenseEntry', () => {
    it('responds 200 and passes the id, changes and receipt', async () => {
      service.updateExpenseEntry.mockResolvedValue(entry);
      const res = mockResponse();
      const req = mockRequest({ params: { id: ID }, body: { amount: 300, remove_receipt: false }, user });
      req.file = file;

      await expenseEntryController.updateExpenseEntry(req, res);

      expect(service.updateExpenseEntry).toHaveBeenCalledWith(
        ID,
        { date: undefined, vendor: undefined, amount: 300, notes: undefined, remove_receipt: false },
        USER_ID,
        file,
      );
      expectResponse(res, 200, entry);
    });

    it('responds 404 when the entry does not exist', async () => {
      service.updateExpenseEntry.mockResolvedValue(null);
      const res = mockResponse();

      await expenseEntryController.updateExpenseEntry(mockRequest({ params: { id: ID }, body: {} }), res);

      expectResponse(res, 404, { error: `Expense entry with id ${ID} not found` });
    });

    it('responds 500 with the service error message', async () => {
      service.updateExpenseEntry.mockRejectedValue(new Error('boom'));
      const res = mockResponse();

      await expenseEntryController.updateExpenseEntry(mockRequest({ params: { id: ID }, body: {} }), res);

      expectResponse(res, 500, { error: 'boom' });
    });
  });

  describe('approveExpenseEntry', () => {
    it('responds 200 and passes the id and the reviewer', async () => {
      const approved = { ...entry, status: 'Approved' as const };
      service.approveExpenseEntry.mockResolvedValue(approved);
      const res = mockResponse();

      await expenseEntryController.approveExpenseEntry(mockRequest({ params: { id: ID }, user }), res);

      expect(service.approveExpenseEntry).toHaveBeenCalledWith(ID, USER_ID);
      expectResponse(res, 200, approved);
    });

    it('responds 404 when the entry does not exist', async () => {
      service.approveExpenseEntry.mockResolvedValue(null);
      const res = mockResponse();

      await expenseEntryController.approveExpenseEntry(mockRequest({ params: { id: ID }, user }), res);

      expectResponse(res, 404, { error: `Expense entry with id ${ID} not found` });
    });

    it('responds 500 with the service error message', async () => {
      service.approveExpenseEntry.mockRejectedValue(new Error('boom'));
      const res = mockResponse();

      await expenseEntryController.approveExpenseEntry(mockRequest({ params: { id: ID }, user }), res);

      expectResponse(res, 500, { error: 'boom' });
    });
  });

  describe('rejectExpenseEntry', () => {
    it('responds 200 and passes the id, the reviewer and the reason', async () => {
      const rejected = { ...entry, status: 'Rejected' as const, rejection_reason: 'No receipt' };
      service.rejectExpenseEntry.mockResolvedValue(rejected);
      const res = mockResponse();

      await expenseEntryController.rejectExpenseEntry(mockRequest({ params: { id: ID }, body: { rejection_reason: 'No receipt' }, user }), res);

      expect(service.rejectExpenseEntry).toHaveBeenCalledWith(ID, USER_ID, 'No receipt');
      expectResponse(res, 200, rejected);
    });

    it('passes no reason when none was given', async () => {
      service.rejectExpenseEntry.mockResolvedValue(entry);

      await expenseEntryController.rejectExpenseEntry(mockRequest({ params: { id: ID }, user }), mockResponse());

      expect(service.rejectExpenseEntry).toHaveBeenCalledWith(ID, USER_ID, undefined);
    });

    it('responds 404 when the entry does not exist', async () => {
      service.rejectExpenseEntry.mockResolvedValue(null);
      const res = mockResponse();

      await expenseEntryController.rejectExpenseEntry(mockRequest({ params: { id: ID }, user }), res);

      expectResponse(res, 404, { error: `Expense entry with id ${ID} not found` });
    });

    it('responds 500 with the service error message', async () => {
      service.rejectExpenseEntry.mockRejectedValue(new Error('boom'));
      const res = mockResponse();

      await expenseEntryController.rejectExpenseEntry(mockRequest({ params: { id: ID }, user }), res);

      expectResponse(res, 500, { error: 'boom' });
    });
  });

  describe('deleteExpenseEntry', () => {
    it('responds 200 with the deleted entry', async () => {
      service.deleteExpenseEntry.mockResolvedValue(entry);
      const res = mockResponse();

      await expenseEntryController.deleteExpenseEntry(mockRequest({ params: { id: ID } }), res);

      expect(service.deleteExpenseEntry).toHaveBeenCalledWith(ID);
      expectResponse(res, 200, entry);
    });

    it('responds 404 when the entry does not exist', async () => {
      service.deleteExpenseEntry.mockResolvedValue(null);
      const res = mockResponse();

      await expenseEntryController.deleteExpenseEntry(mockRequest({ params: { id: ID } }), res);

      expectResponse(res, 404, { error: `Expense entry with id ${ID} not found` });
    });

    it('responds 500 with the service error message', async () => {
      service.deleteExpenseEntry.mockRejectedValue(new Error('boom'));
      const res = mockResponse();

      await expenseEntryController.deleteExpenseEntry(mockRequest({ params: { id: ID } }), res);

      expectResponse(res, 500, { error: 'boom' });
    });
  });

  describe('getExpenseReceipt', () => {
    const receipt = { path: '/srv/uploads/receipts/a.pdf', name: 'invoice 1042.pdf', type: 'application/pdf' };

    it('sends the file inline with its type and original name', async () => {
      service.getExpenseReceipt.mockResolvedValue(receipt);
      const res = receiptResponse();

      await expenseEntryController.getExpenseReceipt(mockRequest({ params: { id: ID } }), res);

      expect(res.type).toHaveBeenCalledWith('application/pdf');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', "inline; filename*=UTF-8''invoice%201042.pdf");
      expect(res.sendFile).toHaveBeenCalledWith(receipt.path, expect.any(Function));
      expect(res.status).not.toHaveBeenCalled();
    });

    it('responds 404 when the file is missing on disk', async () => {
      service.getExpenseReceipt.mockResolvedValue(receipt);
      const res = receiptResponse();
      res.sendFile.mockImplementation((_path: string, done: (error?: Error) => void) => done(new Error('ENOENT')));

      await expenseEntryController.getExpenseReceipt(mockRequest({ params: { id: ID } }), res);

      expectResponse(res, 404, { error: `No receipt for expense entry ${ID}` });
    });

    it('does nothing more when sending fails after the headers went out', async () => {
      service.getExpenseReceipt.mockResolvedValue(receipt);
      const res = receiptResponse();
      res.headersSent = true;
      res.sendFile.mockImplementation((_path: string, done: (error?: Error) => void) => done(new Error('aborted')));

      await expenseEntryController.getExpenseReceipt(mockRequest({ params: { id: ID } }), res);

      expect(res.status).not.toHaveBeenCalled();
    });

    it('does nothing more when the file was sent', async () => {
      service.getExpenseReceipt.mockResolvedValue(receipt);
      const res = receiptResponse();
      res.sendFile.mockImplementation((_path: string, done: (error?: Error) => void) => done());

      await expenseEntryController.getExpenseReceipt(mockRequest({ params: { id: ID } }), res);

      expect(res.status).not.toHaveBeenCalled();
    });

    it('responds 404 when the entry has no receipt', async () => {
      service.getExpenseReceipt.mockResolvedValue(null);
      const res = receiptResponse();

      await expenseEntryController.getExpenseReceipt(mockRequest({ params: { id: ID } }), res);

      expectResponse(res, 404, { error: `No receipt for expense entry ${ID}` });
      expect(res.sendFile).not.toHaveBeenCalled();
    });

    it('responds 500 with the service error message', async () => {
      service.getExpenseReceipt.mockRejectedValue(new Error('boom'));
      const res = receiptResponse();

      await expenseEntryController.getExpenseReceipt(mockRequest({ params: { id: ID } }), res);

      expectResponse(res, 500, { error: 'boom' });
    });
  });
});
