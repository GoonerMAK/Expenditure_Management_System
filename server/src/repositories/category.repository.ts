import prisma from '../db.js';

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
    if (category_name === undefined) {
        return await prisma.category.update({ where: { id }, data: {} });
    }

    return await prisma.$transaction(async (tx) => {
        const category = await tx.category.update({
            where: { id },
            data: { category_name },
        });
        await tx.project.updateMany({
            where: { category_id: id },
            data: { category_name },
        });
        return category;
    });
};

export const deleteCategory = async (id: string) => {
    return await prisma.$transaction(async (tx) => {
        await tx.project.updateMany({
            where: { category_id: id },
            data: { category_id: null, category_name: '' },
        });
        return await tx.category.delete({
            where: { id },
        });
    });
};

export const getCategoryUsage = async (id: string) => {
    const category = await prisma.category.findUnique({
        where: { id },
        select: {
            id: true,
            category_name: true,
            projects: {
                select: { id: true, project_name: true },
                orderBy: { project_name: 'asc' },
            },
        },
    });

    if (!category) {
        return null;
    }

    const financial_record_count = await prisma.financialData.count({
        where: { project: { category_id: id } },
    });

    return { ...category, financial_record_count };
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
