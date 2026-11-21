import prisma from '../db.js';

export const getUserNotifications = async (user_id: string, limit: number) => {
    return await prisma.notification.findMany({
        where: { user_id },
        orderBy: { created_at: 'desc' },
        take: limit,
    });
};

export const countUnreadNotifications = async (user_id: string) => {
    return await prisma.notification.count({ where: { user_id, read_at: null } });
};

export const getUserNotificationById = async (id: string, user_id: string) => {
    return await prisma.notification.findFirst({ where: { id, user_id } });
};

export const markNotificationRead = async (id: string) => {
    return await prisma.notification.update({ where: { id }, data: { read_at: new Date() } });
};

export const markAllNotificationsRead = async (user_id: string) => {
    return await prisma.notification.updateMany({
        where: { user_id, read_at: null },
        data: { read_at: new Date() },
    });
};
