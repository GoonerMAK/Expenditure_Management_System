import prisma from '../db.js';
import { FinancialData } from '@prisma/client';
import { syncMonthIfItHasEntries } from './expense-entry.repository.js';

export const createFinancialData = async (
    year: number,
    month: number,
    expenditure?: number,
    initial_budget?: number,
    revised_budget?: number,
    project_id?: string,
    project_name?: string,
) => {
    const created = await prisma.financialData.create({
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
    await syncMonthIfItHasEntries(prisma, created.project_id, created.year, created.month);
    return await prisma.financialData.findUniqueOrThrow({ where: { id: created.id } });
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
) => {
    const data: any = {};
    if (year !== undefined) data.year = year;
    if (month !== undefined) data.month = month;
    if (expenditure !== undefined) data.expenditure = expenditure;
    if (initial_budget !== undefined) data.initial_budget = initial_budget;
    if (revised_budget !== undefined) data.revised_budget = revised_budget;
    if (project_id !== undefined) data.project_id = project_id;
    if (project_name !== undefined) data.project_name = project_name;

    const financialData = await prisma.financialData.findFirst({
        where: { project_id: id },
    });

    const updated = await prisma.financialData.update({
        where: { id: financialData.id },
        data,
    });
    // A month that has expense entries keeps their total, including the month the row moved away from.
    await syncMonthIfItHasEntries(prisma, updated.project_id, updated.year, updated.month);
    await syncMonthIfItHasEntries(prisma, financialData.project_id, financialData.year, financialData.month);
    return await prisma.financialData.findUniqueOrThrow({ where: { id: updated.id } });
};

export const deleteFinancialData = async (id: string) => {
    return await prisma.financialData.delete({
        where: { id },
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
