import * as notificationController from '../../../src/controllers/notification.controller.js';
import * as notificationService from '../../../src/services/notification.service.js';
import { buildNotification, ID, NOW, USER_ID } from '../helpers/factories.js';
import { expectResponse, mockRequest, mockResponse } from '../helpers/express.js';

jest.mock('../../../src/services/notification.service.js');

const service = jest.mocked(notificationService);

describe('notification.controller', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('passes no user id on to the service when the request has no user', async () => {
    service.getUserNotifications.mockResolvedValue({ data: [], unread_count: 0 });
    service.markNotificationRead.mockResolvedValue(null);
    service.markAllNotificationsRead.mockResolvedValue({ count: 0 });

    await notificationController.getNotifications(mockRequest(), mockResponse());
    await notificationController.markNotificationRead(mockRequest({ params: { id: ID } }), mockResponse());
    await notificationController.markAllNotificationsRead(mockRequest(), mockResponse());

    expect(service.getUserNotifications).toHaveBeenCalledWith(undefined);
    expect(service.markNotificationRead).toHaveBeenCalledWith(ID, undefined);
    expect(service.markAllNotificationsRead).toHaveBeenCalledWith(undefined);
  });

  describe('getNotifications', () => {
    it('responds 200 with the notifications of the signed-in user', async () => {
      const result = { data: [buildNotification()], unread_count: 1 };
      service.getUserNotifications.mockResolvedValue(result);
      const res = mockResponse();

      await notificationController.getNotifications(mockRequest({ user: { id: USER_ID } }), res);

      expect(service.getUserNotifications).toHaveBeenCalledWith(USER_ID);
      expectResponse(res, 200, result);
    });

    it('responds 500 with the service error message', async () => {
      service.getUserNotifications.mockRejectedValue(new Error('boom'));
      const res = mockResponse();

      await notificationController.getNotifications(mockRequest({ user: { id: USER_ID } }), res);

      expectResponse(res, 500, { error: 'boom' });
    });
  });

  describe('markNotificationRead', () => {
    it('responds 200 with the read notification', async () => {
      const read = buildNotification({ read_at: NOW });
      service.markNotificationRead.mockResolvedValue(read);
      const res = mockResponse();

      await notificationController.markNotificationRead(mockRequest({ params: { id: ID }, user: { id: USER_ID } }), res);

      expect(service.markNotificationRead).toHaveBeenCalledWith(ID, USER_ID);
      expectResponse(res, 200, read);
    });

    it('responds 404 when the notification is not one of the user', async () => {
      service.markNotificationRead.mockResolvedValue(null);
      const res = mockResponse();

      await notificationController.markNotificationRead(mockRequest({ params: { id: ID }, user: { id: USER_ID } }), res);

      expectResponse(res, 404, { error: `Notification with id ${ID} not found` });
    });

    it('responds 500 when the service throws', async () => {
      service.markNotificationRead.mockRejectedValue(new Error('boom'));
      const res = mockResponse();

      await notificationController.markNotificationRead(mockRequest({ params: { id: ID }, user: { id: USER_ID } }), res);

      expectResponse(res, 500, { error: 'boom' });
    });
  });

  describe('markAllNotificationsRead', () => {
    it('responds 200 with how many were marked as read', async () => {
      service.markAllNotificationsRead.mockResolvedValue({ count: 2 });
      const res = mockResponse();

      await notificationController.markAllNotificationsRead(mockRequest({ user: { id: USER_ID } }), res);

      expect(service.markAllNotificationsRead).toHaveBeenCalledWith(USER_ID);
      expectResponse(res, 200, { count: 2 });
    });

    it('responds 500 when the service throws', async () => {
      service.markAllNotificationsRead.mockRejectedValue(new Error('boom'));
      const res = mockResponse();

      await notificationController.markAllNotificationsRead(mockRequest({ user: { id: USER_ID } }), res);

      expectResponse(res, 500, { error: 'boom' });
    });
  });
});
