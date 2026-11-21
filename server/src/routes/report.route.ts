import { Router } from 'express';
import * as reportController from '../controllers/report.controller.js';
import { isAuthenticated } from '../middlewares/auth.middleware.js';
import { validateParams, validateQuery } from '../middlewares/validator.middleware.js';
import { projectParamsSchema } from '../validators/project.validator.js';
import { categoryReportParamsSchema, reportQuerySchema } from '../validators/report.validator.js';

export const reportRouter = Router();

reportRouter.get('/reports/projects/:id', isAuthenticated, validateParams(projectParamsSchema), validateQuery(reportQuerySchema), reportController.exportProjectReport);
reportRouter.get('/reports/categories/:id', isAuthenticated, validateParams(categoryReportParamsSchema), validateQuery(reportQuerySchema), reportController.exportCategoryReport);
