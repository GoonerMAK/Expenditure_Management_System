import * as notificationService from '../../../src/services/notification.service.js';
import * as notificationRepository from '../../../src/repositories/notification.repository.js';
import { buildNotification, ID, NOW, USER_ID } from '../helpers/factories.js';

jest.mock('../../../src/repositories/notification.repository.js');

const repo = jest.mocked(notificationRepository);

describe('notification.service', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('getUserNotifications', () => {
    it('returns the latest 50 notifications with the unread count', async () => {
      const notifications = [buildNotification()];
      repo.getUserNotifications.mockResolvedValue(notifications);
      repo.countUnreadNotifications.mockResolvedValue(1);

      await expect(notificationService.getUserNotifications(USER_ID)).resolves.toEqual({
        data: notifications,
        unread_count: 1,
      });

      expect(repo.getUserNotifications).toHaveBeenCalledWith(USER_ID, 50);
      expect(repo.countUnreadNotifications).toHaveBeenCalledWith(USER_ID);
    });

    it('wraps repository errors', async () => {
      repo.getUserNotifications.mockRejectedValue(new Error('db down'));

      await expect(notificationService.getUserNotifications(USER_ID)).rejects.toThrow(
        'Failed to fetch notifications: Error: db down',
      );
    });
  });

  describe('markNotificationRead', () => {
    it('marks an unread notification of the user as read', async () => {
      const read = buildNotification({ read_at: NOW });
      repo.getUserNotificationById.mockResolvedValue(buildNotification());
      repo.markNotificationRead.mockResolvedValue(read);

      await expect(notificationService.markNotificationRead(ID, USER_ID)).resolves.toEqual(read);

      expect(repo.getUserNotificationById).toHaveBeenCalledWith(ID, USER_ID);
      expect(repo.markNotificationRead).toHaveBeenCalledWith(ID);
    });

    it('keeps the first read time of a notification already read', async () => {
      const read = buildNotification({ read_at: NOW });
      repo.getUserNotificationById.mockResolvedValue(read);

      await expect(notificationService.markNotificationRead(ID, USER_ID)).resolves.toEqual(read);

      expect(repo.markNotificationRead).not.toHaveBeenCalled();
    });

    it('returns null for a notification of another user or one that does not exist', async () => {
      repo.getUserNotificationById.mockResolvedValue(null);

      await expect(notificationService.markNotificationRead(ID, USER_ID)).resolves.toBeNull();

      expect(repo.markNotificationRead).not.toHaveBeenCalled();
    });

    it('wraps repository errors', async () => {
      repo.getUserNotificationById.mockRejectedValue(new Error('db down'));

      await expect(notificationService.markNotificationRead(ID, USER_ID)).rejects.toThrow(
        'Failed to mark the notification as read: Error: db down',
      );
    });
  });

  describe('markAllNotificationsRead', () => {
    it('returns how many notifications were marked as read', async () => {
      repo.markAllNotificationsRead.mockResolvedValue({ count: 4 });

      await expect(notificationService.markAllNotificationsRead(USER_ID)).resolves.toEqual({ count: 4 });

      expect(repo.markAllNotificationsRead).toHaveBeenCalledWith(USER_ID);
    });

    it('wraps repository errors', async () => {
      repo.markAllNotificationsRead.mockRejectedValue(new Error('db down'));

      await expect(notificationService.markAllNotificationsRead(USER_ID)).rejects.toThrow(
        'Failed to mark notifications as read: Error: db down',
      );
    });
  });
});
