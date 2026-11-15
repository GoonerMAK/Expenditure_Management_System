import { Router } from 'express';
import * as expenseEntryController from '../controllers/expense-entry.controller.js';
import { isAuthenticated, authorizeRoles } from '../middlewares/auth.middleware.js';
import { validateRequest, validateParams } from '../middlewares/validator.middleware.js';
import { uploadReceipt } from '../middlewares/upload.middleware.js';
import { createExpenseEntrySchema, updateExpenseEntrySchema, expenseEntryParamsSchema, rejectExpenseEntrySchema } from '../validators/expense-entry.validator.js';
import { projectParamsSchema } from '../validators/project.validator.js';

export const expenseEntryRouter = Router();

expenseEntryRouter.get('/projects/:id/expenses', isAuthenticated, validateParams(projectParamsSchema), expenseEntryController.getProjectExpenseEntries);
expenseEntryRouter.post('/expenses', isAuthenticated, authorizeRoles('Contributor', 'Administrator'), uploadReceipt, validateRequest(createExpenseEntrySchema), expenseEntryController.createExpenseEntry);
expenseEntryRouter.put('/expenses/:id', isAuthenticated, authorizeRoles('Contributor', 'Administrator'), validateParams(expenseEntryParamsSchema), uploadReceipt, validateRequest(updateExpenseEntrySchema), expenseEntryController.updateExpenseEntry);
expenseEntryRouter.post('/expenses/:id/approve', isAuthenticated, authorizeRoles('Administrator'), validateParams(expenseEntryParamsSchema), expenseEntryController.approveExpenseEntry);
expenseEntryRouter.post('/expenses/:id/reject', isAuthenticated, authorizeRoles('Administrator'), validateParams(expenseEntryParamsSchema), validateRequest(rejectExpenseEntrySchema), expenseEntryController.rejectExpenseEntry);
expenseEntryRouter.delete('/expenses/:id', isAuthenticated, authorizeRoles('Contributor', 'Administrator'), validateParams(expenseEntryParamsSchema), expenseEntryController.deleteExpenseEntry);
expenseEntryRouter.get('/expenses/:id/receipt', isAuthenticated, validateParams(expenseEntryParamsSchema), expenseEntryController.getExpenseReceipt);
