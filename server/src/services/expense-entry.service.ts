import { ExpenseEntry } from '@prisma/client';
import * as expenseEntryRepository from '../repositories/expense-entry.repository.js';
import * as projectRepository from '../repositories/project.repository.js';
import * as receiptStorage from '../storage/receipt.storage.js';
import { ExpenseEntryUpdate } from '../validators/expense-entry.validator.js';

type NewExpenseEntry = Pick<expenseEntryRepository.ExpenseEntryData, 'project_id' | 'date' | 'vendor' | 'amount' | 'notes'>;

const noReceipt = { receipt_file: null, receipt_name: null, receipt_type: null };

const toPublicEntry = ({ receipt_file, ...entry }: ExpenseEntry) => ({ ...entry, has_receipt: receipt_file !== null });

const storeReceipt = async (receipt: Express.Multer.File) => ({
    receipt_file: await receiptStorage.saveReceipt(receipt.buffer, receipt.mimetype),
    receipt_name: receipt.originalname,
    receipt_type: receipt.mimetype,
});

// A leftover file is better than failing a request that already changed the database.
const removeReceiptQuietly = async (file?: string | null) => {
    if (!file) return;
    await receiptStorage.deleteReceipt(file).catch(() => undefined);
};

export const getProjectExpenseEntries = async (project_id: string) => {
    try {
        const project = await projectRepository.getProjectById(project_id);
        if (!project) return null;
        const entries = await expenseEntryRepository.getExpenseEntriesByProject(project_id);
        return entries.map(toPublicEntry);
    } catch (error) {
        throw new Error(`Failed to fetch expense entries: ${error}`);
    }
};

export const createExpenseEntry = async (entry: NewExpenseEntry, receipt?: Express.Multer.File) => {
    let savedFile: string | undefined;
    try {
        const project = await projectRepository.getProjectById(entry.project_id);
        if (!project) return null;

        const stored = receipt ? await storeReceipt(receipt) : undefined;
        savedFile = stored?.receipt_file;
        const created = await expenseEntryRepository.createExpenseEntry({ ...entry, ...stored });
        return toPublicEntry(created);
    } catch (error) {
        await removeReceiptQuietly(savedFile);
        throw new Error(`Failed to create expense entry: ${error}`);
    }
};

export const updateExpenseEntry = async (id: string, changes: ExpenseEntryUpdate, receipt?: Express.Multer.File) => {
    const { remove_receipt, ...fields } = changes;
    let savedFile: string | undefined;
    try {
        const existing = await expenseEntryRepository.getExpenseEntryById(id);
        if (!existing) return null;

        const stored = receipt ? await storeReceipt(receipt) : undefined;
        savedFile = stored?.receipt_file;
        const receiptFields = stored ?? (remove_receipt ? noReceipt : {});

        const updated = await expenseEntryRepository.updateExpenseEntry(id, { ...fields, ...receiptFields });
        if (!updated) {
            await removeReceiptQuietly(savedFile);
            return null;
        }
        if (receipt || remove_receipt) await removeReceiptQuietly(existing.receipt_file);
        return toPublicEntry(updated);
    } catch (error) {
        await removeReceiptQuietly(savedFile);
        throw new Error(`Failed to update expense entry: ${error}`);
    }
};

export const deleteExpenseEntry = async (id: string) => {
    try {
        const deleted = await expenseEntryRepository.deleteExpenseEntry(id);
        if (!deleted) return null;
        await removeReceiptQuietly(deleted.receipt_file);
        return toPublicEntry(deleted);
    } catch (error) {
        throw new Error(`Failed to delete expense entry: ${error}`);
    }
};

export const getExpenseReceipt = async (id: string) => {
    try {
        const entry = await expenseEntryRepository.getExpenseEntryById(id);
        if (!entry?.receipt_file) return null;
        return {
            path: receiptStorage.getReceiptPath(entry.receipt_file),
            name: entry.receipt_name ?? 'receipt',
            type: entry.receipt_type ?? 'application/octet-stream',
        };
    } catch (error) {
        throw new Error(`Failed to fetch receipt: ${error}`);
    }
};
