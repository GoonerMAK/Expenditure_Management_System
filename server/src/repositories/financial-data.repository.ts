import prisma from '../db.js';
import { AuditAction, AuditEntity, FinancialData } from '@prisma/client';
import { syncMonthIfItHasEntries } from './expense-entry.repository.js';
import { recordAudit } from './audit-log.repository.js';
import { checkBudgetAlert } from './budget-alert.repository.js';

export const createFinancialData = async (
    year: number,
    month: number,
    expenditure?: number,
    initial_budget?: number,
    revised_budget?: number,
    project_id?: string,
    project_name?: string,
    created_by_id?: string,
) => {
    return await prisma.$transaction(async (tx) => {
        const created = await tx.financialData.create({
            data: {
                year,
                month,
                expenditure,
                initial_budget,
                revised_budget,
                project_name,
                project: {
                    connect:{
                        id: project_id
                    }
                }
            },
        });
        await syncMonthIfItHasEntries(tx, created.project_id, created.year, created.month);
        const saved = await tx.financialData.findUniqueOrThrow({ where: { id: created.id } });
        await recordAudit(tx, AuditEntity.Budget, AuditAction.Created, created_by_id, null, saved);
        await checkBudgetAlert(tx, saved.project_id);
        return saved;
    });
};

export const updateFinancialData = async (
    id?: string,
    year?: number,
    month?: number,
    expenditure?: number,
    initial_budget?: number,
    revised_budget?: number,
    project_id?: string,
    project_name?: string,
    changed_by_id?: string,
) => {
    const data: any = {};
    if (year !== undefined) data.year = year;
    if (month !== undefined) data.month = month;
    if (expenditure !== undefined) data.expenditure = expenditure;
    if (initial_budget !== undefined) data.initial_budget = initial_budget;
    if (revised_budget !== undefined) data.revised_budget = revised_budget;
    if (project_id !== undefined) data.project_id = project_id;
    if (project_name !== undefined) data.project_name = project_name;

    return await prisma.$transaction(async (tx) => {
        const financialData = await tx.financialData.findFirst({
            where: { project_id: id },
        });

        const updated = await tx.financialData.update({
            where: { id: financialData.id },
            data,
        });
        // A month that has expense entries keeps their total, including the month the row moved away from.
        await syncMonthIfItHasEntries(tx, updated.project_id, updated.year, updated.month);
        await syncMonthIfItHasEntries(tx, financialData.project_id, financialData.year, financialData.month);
        const saved = await tx.financialData.findUniqueOrThrow({ where: { id: updated.id } });
        await recordAudit(tx, AuditEntity.Budget, AuditAction.Updated, changed_by_id, financialData, saved);
        await checkBudgetAlert(tx, saved.project_id);
        if (financialData.project_id !== saved.project_id) await checkBudgetAlert(tx, financialData.project_id);
        return saved;
    });
};

export const deleteFinancialData = async (id: string, deleted_by_id?: string) => {
    return await prisma.$transaction(async (tx) => {
        const deleted = await tx.financialData.delete({
            where: { id },
        });
        await recordAudit(tx, AuditEntity.Budget, AuditAction.Deleted, deleted_by_id, deleted, null);
        await checkBudgetAlert(tx, deleted.project_id);
        return deleted;
    });
};

export const getAllFinancialData = async () => {
    return await prisma.financialData.findMany();
};

export const getFinancialDataById = async (id: string) => {
    return await prisma.financialData.findFirst({
        where: { project_id: id },
    });
};
