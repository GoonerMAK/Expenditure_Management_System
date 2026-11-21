import { Router } from 'express';
import * as notificationController from '../controllers/notification.controller.js';
import { isAuthenticated } from '../middlewares/auth.middleware.js';
import { validateParams } from '../middlewares/validator.middleware.js';
import { notificationParamsSchema } from '../validators/notification.validator.js';

export const notificationRouter = Router();

notificationRouter.get('/notifications', isAuthenticated, notificationController.getNotifications);
notificationRouter.post('/notifications/read-all', isAuthenticated, notificationController.markAllNotificationsRead);
notificationRouter.post('/notifications/:id/read', isAuthenticated, validateParams(notificationParamsSchema), notificationController.markNotificationRead);
