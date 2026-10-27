import prisma from '../db.js';
import { Project } from '@prisma/client';

export const createProject = async (
    project_name: string,
    description?: string,
    category_id?: string,
    category_name?: string,
    start_date?: Date,
    end_date?: Date,
    created_by_id?: string
) => {
    return await prisma.project.create({
        data: {
            project_name,
            description,
            start_date,
            end_date,
            category_name,
            created_by:{
                connect:{
                    id:created_by_id
                }
            },
            category: {
                connect: {
                    id: category_id
                }
            }
        },
    });
};

export const updateProject = async (
    id: string,
    project_name?: string,
    description?: string,
    category_id?: string,
    category_name?: string,
    start_date?: Date,
    end_date?: Date,
    created_by_id?: string
) => {
    const data: any = {};
    if (project_name !== undefined) data.project_name = project_name;
    if (description !== undefined) data.description = description;
    if (category_id !== undefined) data.category_id = category_id;
    if (category_name !== undefined) data.category_name = category_name;
    if (start_date !== undefined) data.start_date = start_date;
    if (end_date !== undefined) data.end_date = end_date;
    if (created_by_id !== undefined) data.created_by_id = created_by_id;

    return await prisma.project.update({
        where: { id },
        data,
    });
};

export const deleteProject = async (id: string) => {
    return await prisma.project.delete({
        where: { id },
    });
};

export const getAllProjects = async (offset: number, limit: number) => {
    return await prisma.project.findMany({
        skip: offset,
        take: limit,
        orderBy: {
            created_at: 'asc'
        }
    });
};

export const getProjectById = async (id: string) => {
    return await prisma.project.findUnique({
        where: { id },
    });
};

export const getProjectsCount = async () => {
    return await prisma.project.count();
};