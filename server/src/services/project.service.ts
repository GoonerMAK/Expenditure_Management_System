import * as projectRepository from '../repositories/project.repository.js';
import * as auditLogRepository from '../repositories/audit-log.repository.js';
import { getUncategorisedLabel } from '../categories.js';
import { FinancialEntry, groupEntriesByPeriod, sumBudget, sumSpent, toBudgetTotals } from '../budget.js';
import { ProjectListFilters, ProjectSort } from '../validators/project.validator.js';

export const createProject = async (
    project_name: string,
    description?: string,
    category_id?: string,
    category_name?: string,
    start_date?: Date,
    end_date?: Date,
    created_by_id?: string
) => {
    try {
        const project = await projectRepository.createProject(
            project_name,
            description,
            category_id,
            category_name,
            start_date,
            end_date,
            created_by_id
        );
        return project;
    } catch (error) {
        throw new Error(`Failed to create project: ${error}`);
    }
};

export const updateProject = async (
    id: string,
    project_name?: string,
    description?: string,
    category_id?: string,
    category_name?: string,
    start_date?: Date,
    end_date?: Date,
    created_by_id?: string,
    changed_by_id?: string
) => {
    try {
        const updatedProject = await projectRepository.updateProject(
            id,
            project_name,
            description,
            category_id,
            category_name,
            start_date,
            end_date,
            created_by_id,
            changed_by_id
        );
        if (!updatedProject) {
            throw new Error(`Project with id ${id} not found`);
        }
        return updatedProject;
    } catch (error) {
        throw new Error(`Failed to update project: ${error}`);
    }
};

export const deleteProject = async (id: string, deleted_by_id?: string) => {
    try {
        const deletedProject = await projectRepository.deleteProject(id, deleted_by_id);
        if (!deletedProject) {
            throw new Error(`Project with id ${id} not found`);
        }
        return deletedProject;
    } catch (error) {
        throw new Error(`Failed to delete project: ${error}`);
    }
};

export const getAllProjects = async (offset: number, limit: number, filters: ProjectListFilters = {}, sort?: ProjectSort) => {
    try {
        const [projects, totalCount] = await Promise.all([
            projectRepository.getAllProjects(offset, limit, filters, sort),
            projectRepository.getProjectsCount(filters)
        ]);

        const result = {
            data: projects,
            pagination: {
                offset,
                limit,
                totalItems: totalCount,
                totalPages: Math.ceil(totalCount / limit),
                hasMore: (offset + limit) < totalCount,
            }
        }
        return result;
    } catch (error) {
        throw new Error(`Failed to fetch projects: ${error}`);
    }
};

type UserName = {
    username: string | null;
    name: string | null;
    email: string;
};

type ProjectOwner = UserName & { id: string };

const toDisplayName = (user: UserName) => user.username || user.name || user.email;

const toOwnerOption = (owner: ProjectOwner) => ({
    id: owner.id,
    display_name: toDisplayName(owner),
});

export const getProjectOwners = async () => {
    try {
        const owners = await projectRepository.getProjectOwners();
        return owners
            .map(toOwnerOption)
            .sort((a, b) => a.display_name.localeCompare(b.display_name));
    } catch (error) {
        throw new Error(`Failed to fetch project owners: ${error}`);
    }
};

type StoredAuditEntry = Awaited<ReturnType<typeof auditLogRepository.getProjectAuditLog>>[number];

const toHistoryEntry = ({ user, ...entry }: StoredAuditEntry) => ({
    ...entry,
    user_name: user ? toDisplayName(user) : null,
});

export const getProjectHistory = async (id: string) => {
    try {
        const project = await projectRepository.getProjectById(id);
        if (!project) {
            return null;
        }
        const entries = await auditLogRepository.getProjectAuditLog(id);
        return entries.map(toHistoryEntry);
    } catch (error) {
        throw new Error(`Failed to fetch project history: ${error}`);
    }
};

export const getProjectById = async (id: string) => {
    try {
        const project = await projectRepository.getProjectById(id);
        if (!project) {
            throw new Error(`Project with id ${id} not found`);
        }
        return project;
    } catch (error) {
        throw new Error(`Failed to fetch project: ${error}`);
    }
};


const toTrendPoint = (entries: FinancialEntry[]) => ({
    budget: sumBudget(entries),
    spent: sumSpent(entries),
});

export const getBudgetSummary = async () => {
    try {
        const projects = await projectRepository.getProjectsWithFinancialData();

        const projectTotals = projects.map((project) => ({
            project_id: project.id,
            project_name: project.project_name,
            ...toBudgetTotals(sumBudget(project.financial_data), sumSpent(project.financial_data)),
        }));

        const budget = projectTotals.reduce((sum, project) => sum + project.budget, 0);
        const spent = projectTotals.reduce((sum, project) => sum + project.spent, 0);

        return {
            overall: {
                ...toBudgetTotals(budget, spent),
                over_budget_count: projectTotals.filter((project) => project.over_budget).length,
            },
            projects: projectTotals,
        };
    } catch (error) {
        throw new Error(`Failed to fetch budget summary: ${error}`);
    }
};


export const getBudgetByCategory = async () => {
    try {
        const projects = await projectRepository.getProjectsWithFinancialData();
        const categories = new Map<string | null, { category_id: string | null; category_name: string; budget: number; spent: number }>();

        for (const project of projects) {
            const category = categories.get(project.category_id)
                ?? {
                    category_id: project.category_id,
                    category_name: project.category?.category_name ?? getUncategorisedLabel(),
                    budget: 0,
                    spent: 0,
                };
            category.budget += sumBudget(project.financial_data);
            category.spent += sumSpent(project.financial_data);
            categories.set(project.category_id, category);
        }

        return [...categories.values()].sort((a, b) => a.category_name.localeCompare(b.category_name));
    } catch (error) {
        throw new Error(`Failed to fetch budget by category: ${error}`);
    }
};

export const getProjectTrend = async (id: string) => {
    try {
        const project = await projectRepository.getProjectById(id);
        if (!project) {
            return null;
        }

        const entries = await projectRepository.getProjectFinancialData(id);

        // Entries come sorted by year and month, so the groups keep that order
        const monthly = groupEntriesByPeriod(entries, (entry) => `${entry.year}-${entry.month}`).map((items) => ({
            year: items[0].year,
            month: items[0].month,
            ...toTrendPoint(items),
        }));
        const yearly = groupEntriesByPeriod(entries, (entry) => `${entry.year}`).map((items) => ({
            year: items[0].year,
            ...toTrendPoint(items),
        }));

        return { project_id: project.id, project_name: project.project_name, monthly, yearly };
    } catch (error) {
        throw new Error(`Failed to fetch project trend: ${error}`);
    }
};
