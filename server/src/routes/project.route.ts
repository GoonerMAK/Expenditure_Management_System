import { Router } from 'express';
import * as projectController from '../controllers/project.controller.js';
import { isAuthenticated } from '../middlewares/auth.middleware.js'; 
import { validateRequest, validateParams, validateQuery } from '../middlewares/validator.middleware.js';
import { projectSchema, projectParamsSchema } from '../validators/project.validator.js';
import { paginationQuerySchema } from '../validators/pagination.validator.js';

export const projectRouter = Router();

projectRouter.post('/projects', isAuthenticated, validateRequest(projectSchema), projectController.createProject);
projectRouter.put('/projects/:id', isAuthenticated, validateParams(projectParamsSchema), validateRequest(projectSchema), projectController.updateProject);
projectRouter.delete('/projects/:id', isAuthenticated, validateParams(projectParamsSchema), projectController.deleteProject);
projectRouter.get('/projects', isAuthenticated, validateQuery(paginationQuerySchema), projectController.getAllProjects);
projectRouter.get('/projects/:id', isAuthenticated, validateParams(projectParamsSchema), projectController.getProjectById);

