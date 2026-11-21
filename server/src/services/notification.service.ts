import * as notificationRepository from '../repositories/notification.repository.js';

const NOTIFICATION_LIMIT = 50;

export const getUserNotifications = async (user_id: string) => {
    try {
        const [data, unread_count] = await Promise.all([
            notificationRepository.getUserNotifications(user_id, NOTIFICATION_LIMIT),
            notificationRepository.countUnreadNotifications(user_id),
        ]);
        return { data, unread_count };
    } catch (error) {
        throw new Error(`Failed to fetch notifications: ${error}`);
    }
};

export const markNotificationRead = async (id: string, user_id: string) => {
    try {
        const notification = await notificationRepository.getUserNotificationById(id, user_id);
        if (!notification) return null;
        if (notification.read_at) return notification;
        return await notificationRepository.markNotificationRead(id);
    } catch (error) {
        throw new Error(`Failed to mark the notification as read: ${error}`);
    }
};

export const markAllNotificationsRead = async (user_id: string) => {
    try {
        const { count } = await notificationRepository.markAllNotificationsRead(user_id);
        return { count };
    } catch (error) {
        throw new Error(`Failed to mark notifications as read: ${error}`);
    }
};
