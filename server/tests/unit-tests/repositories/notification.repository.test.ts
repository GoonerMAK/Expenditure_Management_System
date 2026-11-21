import prisma from '../../../src/db.js';
import * as notificationRepository from '../../../src/repositories/notification.repository.js';
import { buildNotification, ID, NOW, USER_ID } from '../helpers/factories.js';

jest.mock('../../../src/db.js', () => ({
  __esModule: true,
  default: {
    notification: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

const db = prisma as unknown as {
  notification: {
    findMany: jest.Mock;
    count: jest.Mock;
    findFirst: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
  };
};

describe('notification.repository', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: NOW });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  it('lists the newest notifications of the user up to the limit', async () => {
    const notifications = [buildNotification()];
    db.notification.findMany.mockResolvedValue(notifications);

    await expect(notificationRepository.getUserNotifications(USER_ID, 50)).resolves.toEqual(notifications);

    expect(db.notification.findMany).toHaveBeenCalledWith({
      where: { user_id: USER_ID },
      orderBy: { created_at: 'desc' },
      take: 50,
    });
  });

  it('counts only the unread notifications of the user', async () => {
    db.notification.count.mockResolvedValue(3);

    await expect(notificationRepository.countUnreadNotifications(USER_ID)).resolves.toBe(3);

    expect(db.notification.count).toHaveBeenCalledWith({ where: { user_id: USER_ID, read_at: null } });
  });

  it('finds a notification only among those of the user', async () => {
    db.notification.findFirst.mockResolvedValue(null);

    await expect(notificationRepository.getUserNotificationById(ID, USER_ID)).resolves.toBeNull();

    expect(db.notification.findFirst).toHaveBeenCalledWith({ where: { id: ID, user_id: USER_ID } });
  });

  it('marks a notification as read now', async () => {
    const read = buildNotification({ read_at: NOW });
    db.notification.update.mockResolvedValue(read);

    await expect(notificationRepository.markNotificationRead(ID)).resolves.toEqual(read);

    expect(db.notification.update).toHaveBeenCalledWith({ where: { id: ID }, data: { read_at: NOW } });
  });

  it('marks every unread notification of the user as read now', async () => {
    db.notification.updateMany.mockResolvedValue({ count: 2 });

    await expect(notificationRepository.markAllNotificationsRead(USER_ID)).resolves.toEqual({ count: 2 });

    expect(db.notification.updateMany).toHaveBeenCalledWith({
      where: { user_id: USER_ID, read_at: null },
      data: { read_at: NOW },
    });
  });
});
