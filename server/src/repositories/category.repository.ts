import prisma from '../db.js';
import { Category } from '@prisma/client';

export const createCategory = async (category_name: string) => {
    return await prisma.category.create({
        data: {
            category_name,
        },
    });
};

export const updateCategory = async (
    id: string,
    category_name?: string
) => {
    const data: any = {};
    if (category_name !== undefined) data.category_name = category_name;

    return await prisma.category.update({
        where: { id },
        data,
    });
};

export const deleteCategory = async (id: string) => {
    return await prisma.category.delete({
        where: { id },
    });
};

export const getAllCategories = async () => {
    return await prisma.category.findMany();
};

export const findCategoryByName = async (category_name: string, excludeId?: string) => {
    return await prisma.category.findFirst({
        where: {
            category_name: { equals: category_name, mode: 'insensitive' },
            ...(excludeId ? { NOT: { id: excludeId } } : {}),
        },
    });
};

export const getCategoryById = async (id: string) => {
    return await prisma.category.findUnique({
        where: { id },
    });
};
