import prisma from '../db.js';
import { Prisma, Project } from '@prisma/client';
import { ProjectListFilters, ProjectSort } from '../validators/project.validator.js';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const nextDay = (date: Date) => new Date(date.getTime() + DAY_IN_MS);

const buildDateRangeFilter = (from?: Date, to?: Date): Prisma.ProjectWhereInput[] => {
    if (!from && !to) {
        return [];
    }
    const conditions: Prisma.ProjectWhereInput[] = [{ start_date: { not: null } }];
    if (to) {
        conditions.push({ start_date: { lt: nextDay(to) } });
    }
    if (from) {
        conditions.push({ OR: [{ end_date: null }, { end_date: { gte: from } }] });
    }
    return conditions;
};

export const buildProjectFilter = (filters: ProjectListFilters = {}): Prisma.ProjectWhereInput => {
    const conditions: Prisma.ProjectWhereInput[] = [];
    if (filters.search) {
        conditions.push({ project_name: { contains: filters.search, mode: 'insensitive' } });
    }
    if (filters.category) {
        conditions.push({ category_id: filters.category });
    }
    if (filters.owner) {
        conditions.push({ created_by_id: filters.owner });
    }
    conditions.push(...buildDateRangeFilter(filters.from, filters.to));
    return { AND: conditions };
};

const PROJECT_ORDER: Record<Exclude<ProjectSort, 'spend_desc' | 'spend_asc'>, Prisma.ProjectOrderByWithRelationInput[]> = {
    name_asc: [{ project_name: 'asc' }],
    name_desc: [{ project_name: 'desc' }],
    start_date_desc: [{ start_date: { sort: 'desc', nulls: 'last' } }, { created_at: 'asc' }],
    start_date_asc: [{ start_date: { sort: 'asc', nulls: 'last' } }, { created_at: 'asc' }],
};

const DEFAULT_ORDER: Prisma.ProjectOrderByWithRelationInput[] = [{ created_at: 'asc' }];

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

const getProjectSpendTotals = async (where: Prisma.ProjectWhereInput) => {
    const groups = await prisma.financialData.groupBy({
        by: ['project_id'],
        where: { project: where },
        _sum: { expenditure: true },
    });
    const totals = new Map<string, number>();
    for (const group of groups) {
        totals.set(group.project_id, group._sum.expenditure ?? 0);
    }
    return totals;
};

const compareSpend = (totals: Map<string, number>, highestFirst: boolean) => (a: { id: string }, b: { id: string }) => {
    const spendA = totals.get(a.id) ?? 0;
    const spendB = totals.get(b.id) ?? 0;
    if (spendA === 0 && spendB === 0) {
        return 0;
    }
    if (spendA === 0) {
        return 1;
    }
    if (spendB === 0) {
        return -1;
    }
    return highestFirst ? spendB - spendA : spendA - spendB;
};

const getProjectsBySpend = async (where: Prisma.ProjectWhereInput, offset: number, limit: number, highestFirst: boolean) => {
    const [projectIds, totals] = await Promise.all([
        prisma.project.findMany({ where, select: { id: true }, orderBy: DEFAULT_ORDER }),
        getProjectSpendTotals(where),
    ]);
    const pageIds = [...projectIds]
        .sort(compareSpend(totals, highestFirst))
        .slice(offset, offset + limit)
        .map((project) => project.id);
    const projects = await prisma.project.findMany({ where: { id: { in: pageIds } } });
    return pageIds
        .map((id) => projects.find((project) => project.id === id))
        .filter((project): project is Project => project !== undefined);
};

export const getAllProjects = async (offset: number, limit: number, filters: ProjectListFilters = {}, sort?: ProjectSort) => {
    const where = buildProjectFilter(filters);
    if (sort === 'spend_desc' || sort === 'spend_asc') {
        return await getProjectsBySpend(where, offset, limit, sort === 'spend_desc');
    }
    return await prisma.project.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: sort ? PROJECT_ORDER[sort] : DEFAULT_ORDER,
    });
};

export const getProjectById = async (id: string) => {
    return await prisma.project.findUnique({
        where: { id },
    });
};

export const getProjectsCount = async (filters: ProjectListFilters = {}) => {
    return await prisma.project.count({ where: buildProjectFilter(filters) });
};

export const getProjectOwners = async () => {
    return await prisma.user.findMany({
        where: { projects: { some: {} } },
        select: { id: true, username: true, name: true, email: true },
    });
};
export const getProjectsWithFinancialData = async () => {
    return await prisma.project.findMany({
        select: {
            id: true,
            project_name: true,
            category_id: true,
            category: {
                select: { category_name: true },
            },
            financial_data: {
                select: { expenditure: true, initial_budget: true, revised_budget: true },
            },
        },
        orderBy: {
            created_at: 'asc'
        }
    });
};

export const getProjectFinancialData = async (id: string) => {
    return await prisma.financialData.findMany({
        where: { project_id: id },
        select: { year: true, month: true, expenditure: true, initial_budget: true, revised_budget: true },
        orderBy: [{ year: 'asc' }, { month: 'asc' }],
    });
};
