import { Prisma } from '@prisma/client';
import * as categoryRepository from '../repositories/category.repository.js';
import { CategoryNotFoundError, DuplicateCategoryError } from '../categories.js';

const isPrismaError = (error: unknown, code: string) =>
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;

const toCategoryError = (error: unknown, category_name?: string) => {
    if (error instanceof DuplicateCategoryError || error instanceof CategoryNotFoundError) return error;
    if (category_name !== undefined && isPrismaError(error, 'P2002')) return new DuplicateCategoryError(category_name);
    if (isPrismaError(error, 'P2025')) return new CategoryNotFoundError();
    return null;
};

const ensureNameIsFree = async (category_name: string, excludeId?: string) => {
    const existing = await categoryRepository.findCategoryByName(category_name, excludeId);
    if (existing) {
        throw new DuplicateCategoryError(existing.category_name);
    }
};

export const createCategory = async (category_name: string) => {
    try {
        await ensureNameIsFree(category_name);
        const category = await categoryRepository.createCategory(category_name);
        return category;
    } catch (error) {
        throw toCategoryError(error, category_name) ?? new Error(`Failed to create category: ${error}`);
    }
};

export const updateCategory = async (id: string, category_name?: string) => {
    try {
        if (category_name !== undefined) {
            await ensureNameIsFree(category_name, id);
        }
        const updatedCategory = await categoryRepository.updateCategory(id, category_name);
        if (!updatedCategory) {
            throw new CategoryNotFoundError();
        }
        return updatedCategory;
    } catch (error) {
        throw toCategoryError(error, category_name) ?? new Error(`Failed to update category: ${error}`);
    }
};

export const deleteCategory = async (id: string) => {
    try {
        const deletedCategory = await categoryRepository.deleteCategory(id);
        if (!deletedCategory) {
            throw new CategoryNotFoundError();
        }
        return deletedCategory;
    } catch (error) {
        throw toCategoryError(error) ?? new Error(`Failed to delete category: ${error}`);
    }
};

export const getCategoryUsage = async (id: string) => {
    try {
        const usage = await categoryRepository.getCategoryUsage(id);
        if (!usage) {
            throw new CategoryNotFoundError();
        }
        return {
            category_id: usage.id,
            category_name: usage.category_name,
            project_count: usage.projects.length,
            projects: usage.projects,
            financial_record_count: usage.financial_record_count,
        };
    } catch (error) {
        throw toCategoryError(error) ?? new Error(`Failed to fetch category usage: ${error}`);
    }
};

export const getAllCategories = async () => {
    try {
        const categories = await categoryRepository.getAllCategories();
        return categories;
    } catch (error) {
        throw new Error(`Failed to fetch categories: ${error}`);
    }
};

export const getCategoryById = async (id: string) => {
    try {
        const category = await categoryRepository.getCategoryById(id);
        if (!category) {
            throw new Error(`Category with id ${id} not found`);
        }
        return category;
    } catch (error) {
        throw new Error(`Failed to fetch category: ${error}`);
    }
};
