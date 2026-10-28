import { Router } from 'express';
import * as financialDataController from '../controllers/financial-data.controller.js';
import { isAuthenticated, authorizeRoles } from '../middlewares/auth.middleware.js'; 
import { validateRequest, validateParams } from '../middlewares/validator.middleware.js';
import { financialDataSchema, financialDataParamsSchema } from '../validators/financial-data.validator.js';

export const financialDataRouter = Router();

financialDataRouter.post('/financialData', isAuthenticated, authorizeRoles('Contributor', 'Administrator'), validateRequest(financialDataSchema), financialDataController.createFinancialData);
financialDataRouter.put('/financialData/:id', isAuthenticated, authorizeRoles('Contributor', 'Administrator'), validateParams(financialDataParamsSchema), validateRequest(financialDataSchema), financialDataController.updateFinancialData);
financialDataRouter.delete('/financialData/:id', isAuthenticated, authorizeRoles('Contributor', 'Administrator'), validateParams(financialDataParamsSchema), financialDataController.deleteFinancialData);
financialDataRouter.get('/financialData', isAuthenticated, financialDataController.getAllFinancialData);
financialDataRouter.get('/financialData/:id', isAuthenticated, validateParams(financialDataParamsSchema), financialDataController.getFinancialDataById);

