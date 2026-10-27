import { Request, Response } from 'express';
import * as projectService from '../services/project.service.js';
import { Project, ProjectParams } from '../validators/project.validator.js';
import { PaginationQuery } from '../validators/pagination.validator.js';

export const createProject = async (req: Request<unknown, unknown, Project, unknown>, res: Response) => {
    const { project_name, description, category_id, category_name, start_date, end_date, created_by_id } = req.body;
    try {
        const newProject = await projectService.createProject(
            project_name,
            description,
            category_id,
            category_name,
            start_date,
            end_date,
            created_by_id
        );
        res.status(201).json(newProject);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const updateProject = async (req: Request<ProjectParams, unknown, Project, unknown>, res: Response) => {
    const { id } = req.params;
    const { project_name, description, category_id, category_name, start_date, end_date, created_by_id } = req.body;
    try {
        const updatedProject = await projectService.updateProject(
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
            res.status(404).json({ error: `Project with id ${id} not found` });
        } else {
            res.status(200).json(updatedProject);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteProject = async (req: Request<ProjectParams, unknown, Project, unknown>, res: Response) => {
    const { id } = req.params;
    try {
        const deletedProject = await projectService.deleteProject(id);
        if (!deletedProject) {
            res.status(404).json({ error: `Project with id ${id} not found` });
        } else {
            res.status(200).json(deletedProject);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getAllProjects = async (req: Request<unknown, unknown, unknown, PaginationQuery>, res: Response) => {
    try {
        const { offset, limit } = req.query;
        const projects = await projectService.getAllProjects(offset, limit);
        res.status(200).json(projects);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getProjectById = async (req: Request<ProjectParams, unknown, unknown, unknown>, res: Response) => {
    const { id } = req.params;
    try {
        const project = await projectService.getProjectById(id);
        if (!project) {
            res.status(404).json({ error: `Project with id ${id} not found` });
        } else {
            res.status(200).json(project);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
