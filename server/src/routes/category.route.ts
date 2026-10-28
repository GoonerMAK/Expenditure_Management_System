import { Router } from 'express';
import * as categoryController from '../controllers/category.controller.js';
import { isAuthenticated, authorizeRoles } from '../middlewares/auth.middleware.js'; 
import { validateRequest, validateParams } from '../middlewares/validator.middleware.js';
import { categorySchema, categoryParamsSchema } from '../validators/category.validator.js';

export const categoryRouter = Router();

categoryRouter.post('/categories', isAuthenticated, authorizeRoles('Contributor', 'Administrator'), validateRequest(categorySchema), categoryController.createCategory);
categoryRouter.put('/categories/:id', isAuthenticated, authorizeRoles('Contributor', 'Administrator'), validateParams(categoryParamsSchema), validateRequest(categorySchema), categoryController.updateCategory);
categoryRouter.delete('/categories/:id', isAuthenticated, authorizeRoles('Contributor', 'Administrator'), validateParams(categoryParamsSchema), categoryController.deleteCategory);
categoryRouter.get('/categories', isAuthenticated, categoryController.getAllCategories);
categoryRouter.get('/categories/:id', isAuthenticated, validateParams(categoryParamsSchema), categoryController.getCategoryById);

