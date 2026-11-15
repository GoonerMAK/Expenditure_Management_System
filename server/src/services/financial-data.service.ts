import * as financialDataRepository from '../repositories/financial-data.repository.js';

export const createFinancialData = async (
    year: number,
    month: number,
    expenditure?: number,
    initial_budget?: number,
    revised_budget?: number,
    project_id?: string,
    project_name?: string,
    user_id?: string,
) => {
    try {
        const financialData = await financialDataRepository.createFinancialData(
            year,
            month,
            expenditure,
            initial_budget,
            revised_budget,
            project_id,
            project_name,
            user_id
        );
        return financialData;
    } catch (error) {
        throw new Error(`Failed to create financial data: ${error}`);
    }
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
    user_id?: string,
) => {
    try {
        const updatedFinancialData = await financialDataRepository.updateFinancialData(
            id,
            year,
            month,
            expenditure,
            initial_budget,
            revised_budget,
            project_id,
            project_name,
            user_id,
        );
        if (!updatedFinancialData) {
            throw new Error(`Financial data with id ${id} not found`);
        }
        return updatedFinancialData;
    } catch (error) {
        throw new Error(`Failed to update financial data: ${error}`);
    }
};

export const deleteFinancialData = async (id: string, user_id?: string) => {
    try {
        const deletedFinancialData = await financialDataRepository.deleteFinancialData(id, user_id);
        if (!deletedFinancialData) {
            throw new Error(`Financial data with id ${id} not found`);
        }
        return deletedFinancialData;
    } catch (error) {
        throw new Error(`Failed to delete financial data: ${error}`);
    }
};

export const getAllFinancialData = async () => {
    try {
        const financialData = await financialDataRepository.getAllFinancialData();
        return financialData;
    } catch (error) {
        throw new Error(`Failed to fetch financial data: ${error}`);
    }
};

export const getFinancialDataById = async (id: string) => {
    try {
        const financialData = await financialDataRepository.getFinancialDataById(id);
        if (!financialData) {
            throw new Error(`Financial data with id ${id} not found`);
        }
        return financialData;
    } catch (error) {
        throw new Error(`Failed to fetch financial data: ${error}`);
    }
};
