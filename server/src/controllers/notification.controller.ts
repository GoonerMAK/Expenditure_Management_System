import { Request, Response } from 'express';
import * as notificationService from '../services/notification.service.js';
import { NotificationParams } from '../validators/notification.validator.js';

export const getNotifications = async (req: Request<unknown, unknown, unknown, unknown>, res: Response) => {
    try {
        const notifications = await notificationService.getUserNotifications(req.user?.id);
        res.status(200).json(notifications);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const markNotificationRead = async (req: Request<NotificationParams, unknown, unknown, unknown>, res: Response) => {
    const { id } = req.params;
    try {
        const notification = await notificationService.markNotificationRead(id, req.user?.id);
        if (!notification) {
            res.status(404).json({ error: `Notification with id ${id} not found` });
        } else {
            res.status(200).json(notification);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const markAllNotificationsRead = async (req: Request<unknown, unknown, unknown, unknown>, res: Response) => {
    try {
        const result = await notificationService.markAllNotificationsRead(req.user?.id);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
