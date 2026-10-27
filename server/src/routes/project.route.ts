import { Router } from 'express';
import * as projectController from '../controllers/project.controller.js';
import { isAuthenticated, authorizeRoles } from '../middlewares/auth.middleware.js'; 
import { validateRequest, validateParams, validateQuery } from '../middlewares/validator.middleware.js';
import { projectSchema, projectParamsSchema } from '../validators/project.validator.js';
import { paginationQuerySchema } from '../validators/pagination.validator.js';

export const projectRouter = Router();

projectRouter.post('/projects', isAuthenticated, authorizeRoles('Contributor', 'Administrator'), validateRequest(projectSchema), projectController.createProject);
projectRouter.put('/projects/:id', isAuthenticated, authorizeRoles('Contributor', 'Administrator'), validateParams(projectParamsSchema), validateRequest(projectSchema), projectController.updateProject);
projectRouter.delete('/projects/:id', isAuthenticated, authorizeRoles('Contributor', 'Administrator'), validateParams(projectParamsSchema), projectController.deleteProject);
projectRouter.get('/projects', isAuthenticated, validateQuery(paginationQuerySchema), projectController.getAllProjects);
projectRouter.get('/projects/:id', isAuthenticated, validateParams(projectParamsSchema), projectController.getProjectById);

