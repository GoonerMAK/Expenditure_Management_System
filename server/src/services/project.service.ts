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
