import prisma from '../db.js';
import { AuditAction, AuditEntity, ExpenseStatus, Prisma } from '@prisma/client';
import { recordAudit } from './audit-log.repository.js';
import { checkBudgetAlert } from './budget-alert.repository.js';
import { lockProjects } from './project-lock.repository.js';

type Db = Prisma.TransactionClient;

export type ExpenseEntryData = {
    project_id: string;
    date: Date;
    vendor: string;
    amount: number;
    notes?: string | null;
    receipt_file?: string | null;
    receipt_name?: string | null;
    receipt_type?: string | null;
    status?: ExpenseStatus;
    rejection_reason?: string | null;
    reviewed_by_id?: string | null;
    reviewed_at?: Date | null;
};

export type ExpenseEntryChanges = Partial<Omit<ExpenseEntryData, 'project_id'>>;

const reviewer = { reviewed_by: { select: { username: true } } };

const monthOf = (date: Date) => ({ year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 });

const monthRange = (year: number, month: number) => ({
    gte: new Date(Date.UTC(year, month - 1, 1)),
    lt: new Date(Date.UTC(year, month, 1)),
});

const roundAmount = (amount: number) => Math.round(amount * 100) / 100;

// Sets the month's expenditure to the sum of its approved expense entries, creating the month row if needed.
export const syncMonthlyExpenditure = async (db: Db, project_id: string, year: number, month: number) => {
    const { _sum } = await db.expenseEntry.aggregate({
        where: { project_id, date: monthRange(year, month), status: ExpenseStatus.Approved },
        _sum: { amount: true },
    });
    const expenditure = roundAmount(_sum.amount ?? 0);

    const { count } = await db.financialData.updateMany({ where: { project_id, year, month }, data: { expenditure } });
    if (count > 0) return;

    const project = await db.project.findUniqueOrThrow({ where: { id: project_id }, select: { project_name: true } });
    await db.financialData.create({ data: { year, month, expenditure, project_id, project_name: project.project_name } });
};

// Keeps a manually edited month in line with its expense entries, if it has any.
export const syncMonthIfItHasEntries = async (db: Db, project_id: string, year: number, month: number) => {
    const entries = await db.expenseEntry.count({
        where: { project_id, date: monthRange(year, month) },
    });
    if (entries > 0) await syncMonthlyExpenditure(db, project_id, year, month);
};

export const createExpenseEntry = async (data: ExpenseEntryData, created_by_id?: string) => {
    return await prisma.$transaction(async (tx) => {
        await lockProjects(tx, data.project_id);
        const entry = await tx.expenseEntry.create({ data, include: reviewer });
        const { year, month } = monthOf(entry.date);
        await syncMonthlyExpenditure(tx, entry.project_id, year, month);
        await recordAudit(tx, AuditEntity.Expense, AuditAction.Created, created_by_id, null, entry);
        await checkBudgetAlert(tx, entry.project_id);
        return entry;
    });
};

export const updateExpenseEntry = async (
    id: string,
    changes: ExpenseEntryChanges,
    changed_by_id?: string,
    action: AuditAction = AuditAction.Updated
) => {
    return await prisma.$transaction(async (tx) => {
        const before = await tx.expenseEntry.findUnique({ where: { id } });
        if (!before) return null;
        await lockProjects(tx, before.project_id);

        const entry = await tx.expenseEntry.update({ where: { id }, data: changes, include: reviewer });
        const after = monthOf(entry.date);
        const previous = monthOf(before.date);
        await syncMonthlyExpenditure(tx, entry.project_id, after.year, after.month);
        if (after.year !== previous.year || after.month !== previous.month) {
            await syncMonthlyExpenditure(tx, entry.project_id, previous.year, previous.month);
        }
        await recordAudit(tx, AuditEntity.Expense, action, changed_by_id, before, entry);
        await checkBudgetAlert(tx, entry.project_id);
        return entry;
    });
};

export const deleteExpenseEntry = async (id: string, deleted_by_id?: string) => {
    return await prisma.$transaction(async (tx) => {
        const entry = await tx.expenseEntry.findUnique({ where: { id } });
        if (!entry) return null;
        await lockProjects(tx, entry.project_id);

        await tx.expenseEntry.delete({ where: { id } });
        const { year, month } = monthOf(entry.date);
        await syncMonthlyExpenditure(tx, entry.project_id, year, month);
        await recordAudit(tx, AuditEntity.Expense, AuditAction.Deleted, deleted_by_id, entry, null);
        await checkBudgetAlert(tx, entry.project_id);
        return entry;
    });
};

export const getExpenseEntryById = async (id: string) => {
    return await prisma.expenseEntry.findUnique({ where: { id } });
};

export const getExpenseEntriesByProject = async (project_id: string) => {
    return await prisma.expenseEntry.findMany({
        where: { project_id },
        include: reviewer,
        orderBy: [{ date: 'desc' }, { created_at: 'desc' }],
    });
};
