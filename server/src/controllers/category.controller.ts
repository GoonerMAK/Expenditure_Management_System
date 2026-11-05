import { Request, Response } from 'express';
import * as categoryService from '../services/category.service.js';
import { Category, CategoryParams } from '../validators/category.validator.js';
import { CategoryNotFoundError, DuplicateCategoryError, getCategorySaveFailedMessage } from '../categories.js';

const sendCategoryWriteError = (res: Response, error: Error) => {
    if (error instanceof DuplicateCategoryError) {
        res.status(409).json({ message: error.message });
    } else if (error instanceof CategoryNotFoundError) {
        res.status(404).json({ message: error.message });
    } else {
        console.error('Category write failed:', error);
        res.status(500).json({ message: getCategorySaveFailedMessage() });
    }
};

export const createCategory = async (req: Request<unknown, unknown, Category, unknown>, res: Response) => {
    const { category_name } = req.body;
    try {
        const category = await categoryService.createCategory(category_name);
        res.status(201).json(category);
    } catch (error) {
        sendCategoryWriteError(res, error);
    }
};

export const updateCategory = async (req: Request<CategoryParams, unknown, Category, unknown>, res: Response) => {
    const { id } = req.params;
    const { category_name } = req.body;
    try {
        const updatedCategory = await categoryService.updateCategory(id, category_name);
        res.status(200).json(updatedCategory);
    } catch (error) {
        sendCategoryWriteError(res, error);
    }
};

export const deleteCategory = async (req: Request<CategoryParams, unknown, unknown, unknown>, res: Response) => {
    const { id } = req.params;
    try {
        const deletedCategory = await categoryService.deleteCategory(id);
        res.status(200).json(deletedCategory);
    } catch (error) {
        sendCategoryWriteError(res, error);
    }
};

export const getAllCategories = async (_req: Request<unknown, unknown, unknown, unknown>, res: Response) => {
    try {
        const categories = await categoryService.getAllCategories();
        res.status(200).json(categories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getCategoryById = async (req: Request<CategoryParams, unknown, unknown, unknown>, res: Response) => {
    const { id } = req.params;
    try {
        const category = await categoryService.getCategoryById(id);
        if (!category) {
            res.status(404).json({ error: `Category with id ${id} not found` });
        } else {
            res.status(200).json(category);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
