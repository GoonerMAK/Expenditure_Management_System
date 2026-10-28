import * as projectRepository from '../repositories/project.repository.js';

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
    created_by_id?: string
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
            created_by_id
        );
        if (!updatedProject) {
            throw new Error(`Project with id ${id} not found`);
        }
        return updatedProject;
    } catch (error) {
        throw new Error(`Failed to update project: ${error}`);
    }
};

export const deleteProject = async (id: string) => {
    try {
        const deletedProject = await projectRepository.deleteProject(id);
        if (!deletedProject) {
            throw new Error(`Project with id ${id} not found`);
        }
        return deletedProject;
    } catch (error) {
        throw new Error(`Failed to delete project: ${error}`);
    }
};

export const getAllProjects = async (offset: number, limit: number) => {
    try {
        const [projects, totalCount] = await Promise.all([
            projectRepository.getAllProjects(offset, limit),
            projectRepository.getProjectsCount()
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


type FinancialEntry = {
    expenditure: number | null;
    initial_budget: number | null;
    revised_budget: number | null;
};

// A revised budget replaces the initial one for that entry
const sumBudget = (entries: FinancialEntry[]) =>
    entries.reduce((sum, entry) => sum + (entry.revised_budget ?? entry.initial_budget ?? 0), 0);

const sumSpent = (entries: FinancialEntry[]) =>
    entries.reduce((sum, entry) => sum + (entry.expenditure || 0), 0);

const toBudgetTotals = (budget: number, spent: number) => ({
    budget,
    spent,
    remaining: budget - spent,
    percent_used: budget > 0 ? Math.round((spent / budget) * 1000) / 10 : null,
    over_budget: spent > budget,
});

const toTrendPoint = (entries: FinancialEntry[]) => ({
    budget: sumBudget(entries),
    spent: sumSpent(entries),
});

const groupEntriesByPeriod = <T extends FinancialEntry>(entries: T[], periodOf: (entry: T) => string) => {
    const groups = new Map<string, T[]>();
    for (const entry of entries) {
        const period = periodOf(entry);
        const group = groups.get(period);
        if (group) {
            group.push(entry);
        } else {
            groups.set(period, [entry]);
        }
    }
    return [...groups.values()];
};

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
        const categories = new Map<string, { category_id: string; category_name: string; budget: number; spent: number }>();

        for (const project of projects) {
            const category = categories.get(project.category_id)
                ?? { category_id: project.category_id, category_name: project.category.category_name, budget: 0, spent: 0 };
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
