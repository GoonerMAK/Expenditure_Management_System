import { Request, Response } from 'express';
import * as expenseEntryService from '../services/expense-entry.service.js';
import { ExpenseEntryParams, ExpenseEntryRejection, ExpenseEntryUpdate, NewExpenseEntry } from '../validators/expense-entry.validator.js';
import { ProjectParams } from '../validators/project.validator.js';

export const getProjectExpenseEntries = async (req: Request<ProjectParams, unknown, unknown, unknown>, res: Response) => {
    const { id } = req.params;
    try {
        const entries = await expenseEntryService.getProjectExpenseEntries(id);
        if (!entries) {
            res.status(404).json({ error: `Project with id ${id} not found` });
        } else {
            res.status(200).json(entries);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const createExpenseEntry = async (req: Request<unknown, unknown, NewExpenseEntry, unknown>, res: Response) => {
    const { project_id, date, vendor, amount, notes } = req.body;
    try {
        const entry = await expenseEntryService.createExpenseEntry({ project_id, date, vendor, amount, notes }, req.user?.id, req.file);
        if (!entry) {
            res.status(404).json({ error: `Project with id ${project_id} not found` });
        } else {
            res.status(201).json(entry);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const updateExpenseEntry = async (req: Request<ExpenseEntryParams, unknown, ExpenseEntryUpdate, unknown>, res: Response) => {
    const { id } = req.params;
    const { date, vendor, amount, notes, remove_receipt } = req.body;
    try {
        const entry = await expenseEntryService.updateExpenseEntry(id, { date, vendor, amount, notes, remove_receipt }, req.user?.id, req.file);
        if (!entry) {
            res.status(404).json({ error: `Expense entry with id ${id} not found` });
        } else {
            res.status(200).json(entry);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const approveExpenseEntry = async (req: Request<ExpenseEntryParams, unknown, unknown, unknown>, res: Response) => {
    const { id } = req.params;
    try {
        const entry = await expenseEntryService.approveExpenseEntry(id, req.user?.id);
        if (!entry) {
            res.status(404).json({ error: `Expense entry with id ${id} not found` });
        } else {
            res.status(200).json(entry);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const rejectExpenseEntry = async (req: Request<ExpenseEntryParams, unknown, ExpenseEntryRejection, unknown>, res: Response) => {
    const { id } = req.params;
    const { rejection_reason } = req.body;
    try {
        const entry = await expenseEntryService.rejectExpenseEntry(id, req.user?.id, rejection_reason);
        if (!entry) {
            res.status(404).json({ error: `Expense entry with id ${id} not found` });
        } else {
            res.status(200).json(entry);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteExpenseEntry = async (req: Request<ExpenseEntryParams, unknown, unknown, unknown>, res: Response) => {
    const { id } = req.params;
    try {
        const entry = await expenseEntryService.deleteExpenseEntry(id);
        if (!entry) {
            res.status(404).json({ error: `Expense entry with id ${id} not found` });
        } else {
            res.status(200).json(entry);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getExpenseReceipt = async (req: Request<ExpenseEntryParams, unknown, unknown, unknown>, res: Response) => {
    const { id } = req.params;
    try {
        const receipt = await expenseEntryService.getExpenseReceipt(id);
        if (!receipt) {
            return res.status(404).json({ error: `No receipt for expense entry ${id}` });
        }
        res.type(receipt.type);
        res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(receipt.name)}`);
        res.sendFile(receipt.path, (error) => {
            if (error && !res.headersSent) res.status(404).json({ error: `No receipt for expense entry ${id}` });
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
