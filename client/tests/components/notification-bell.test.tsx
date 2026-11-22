import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import NotificationBell from '../../src/components/notification-bell';
import {
  useGetNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from '../../src/redux/notification-api';
import { mutationResult, queryResult, resolvingTrigger } from '../support/rtk';

jest.mock('../../src/redux/notification-api', () => ({
  useGetNotificationsQuery: jest.fn(),
  useMarkNotificationReadMutation: jest.fn(),
  useMarkAllNotificationsReadMutation: jest.fn(),
}));

const mockedGetNotifications = jest.mocked(useGetNotificationsQuery);
const mockedMarkRead = jest.mocked(useMarkNotificationReadMutation);
const mockedMarkAllRead = jest.mocked(useMarkAllNotificationsReadMutation);

const notification = (overrides: Record<string, unknown> = {}) => ({
  id: 'n1',
  user_id: 'u1',
  project_id: 'p1',
  project_name: 'Bridge Renovation',
  level: 'Threshold',
  threshold: 80,
  budget: 12000,
  spent: 10200,
  percent_used: 85,
  read_at: null,
  created_at: '2026-03-12T10:30:00.000Z',
  ...overrides,
});

const showNotifications = (notifications: Record<string, unknown>[], unread_count = 0, overrides: Record<string, unknown> = {}) => {
  mockedGetNotifications.mockReturnValue(queryResult({ data: { data: notifications, unread_count }, ...overrides }));
};

const renderBell = () =>
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/dashboard" element={<NotificationBell />} />
        <Route path="/projects/:id" element={<p>Project page</p>} />
      </Routes>
    </MemoryRouter>,
  );

const openMenu = async (name: string | RegExp = /notifications/i) => {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name }));
  return user;
};

describe('NotificationBell', () => {
  let markRead: jest.Mock;
  let markAllRead: jest.Mock;

  beforeEach(() => {
    markRead = resolvingTrigger();
    markAllRead = resolvingTrigger();
    mockedMarkRead.mockReturnValue(mutationResult(markRead));
    mockedMarkAllRead.mockReturnValue(mutationResult(markAllRead));
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('checks for new notifications every 30 seconds', () => {
    showNotifications([]);

    renderBell();

    expect(mockedGetNotifications).toHaveBeenCalledWith(undefined, { pollingInterval: 30000 });
  });

  it('shows the unread count on the bell', () => {
    showNotifications([notification()], 3);

    renderBell();

    expect(screen.getByRole('button', { name: 'Notifications, 3 unread' })).toHaveTextContent('3');
  });

  it('caps the count shown on the bell at 9+', () => {
    showNotifications([notification()], 12);

    renderBell();

    expect(screen.getByRole('button', { name: 'Notifications, 12 unread' })).toHaveTextContent('9+');
  });

  it('shows no count when everything is read', () => {
    showNotifications([notification({ read_at: '2026-03-12T11:00:00.000Z' })], 0);

    renderBell();

    expect(screen.getByRole('button', { name: 'Notifications' })).toHaveTextContent(/^Notifications$/);
  });

  it('shows nothing on the bell while the notifications load', () => {
    mockedGetNotifications.mockReturnValue(queryResult({ isLoading: true }));

    renderBell();

    expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument();
  });

  it('refreshes the list when the bell is opened', async () => {
    const refetch = jest.fn();
    showNotifications([], 0, { refetch });
    renderBell();

    await openMenu();

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('says so when there are no notifications', async () => {
    showNotifications([]);
    renderBell();

    await openMenu();

    expect(await screen.findByText('No notifications yet.')).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Mark all as read' })).not.toBeInTheDocument();
  });

  it('describes a project that reached its alert threshold', async () => {
    showNotifications([notification()], 1);
    renderBell();

    await openMenu();

    const item = await screen.findByRole('menuitem', { name: /Bridge Renovation has used 85% of its budget and reached its 80% alert/ });
    expect(item).toHaveTextContent('12 Mar 2026');
    expect(item.querySelector('time')).toHaveAttribute('dateTime', '2026-03-12T10:30:00.000Z');
  });

  it('describes a project that went over budget', async () => {
    showNotifications([notification({ level: 'OverBudget', spent: 12500.5, percent_used: 104.2 })], 1);
    renderBell();

    await openMenu();

    expect(await screen.findByRole('menuitem', { name: /Bridge Renovation is over budget: 12,500.5 spent of 12,000/ }))
      .toBeInTheDocument();
  });

  it('marks unread notifications for screen readers', async () => {
    showNotifications([notification(), notification({ id: 'n2', project_name: 'Road', read_at: '2026-03-12T11:00:00.000Z' })], 1);
    renderBell();

    await openMenu();

    expect(await screen.findByRole('menuitem', { name: /^Unread: Bridge Renovation/ })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /^Road/ })).toBeInTheDocument();
  });

  it('marks an unread notification as read and opens its project', async () => {
    showNotifications([notification()], 1);
    renderBell();

    const user = await openMenu();
    await user.click(await screen.findByRole('menuitem', { name: /Bridge Renovation/ }));

    expect(markRead).toHaveBeenCalledWith('n1');
    expect(await screen.findByText('Project page')).toBeInTheDocument();
  });

  it('opens the project of a read notification without marking it again', async () => {
    showNotifications([notification({ read_at: '2026-03-12T11:00:00.000Z' })], 0);
    renderBell();

    const user = await openMenu();
    await user.click(await screen.findByRole('menuitem', { name: /Bridge Renovation/ }));

    expect(markRead).not.toHaveBeenCalled();
    expect(await screen.findByText('Project page')).toBeInTheDocument();
  });

  it('stays on the page for a notification whose project was deleted', async () => {
    showNotifications([notification({ project_id: null })], 1);
    renderBell();

    const user = await openMenu();
    await user.click(await screen.findByRole('menuitem', { name: /Bridge Renovation/ }));

    expect(markRead).toHaveBeenCalledWith('n1');
    expect(screen.queryByText('Project page')).not.toBeInTheDocument();
  });

  it('marks every notification as read', async () => {
    showNotifications([notification()], 1);
    renderBell();

    const user = await openMenu();
    await user.click(await screen.findByRole('menuitem', { name: 'Mark all as read' }));

    expect(markAllRead).toHaveBeenCalledTimes(1);
  });

  it('offers a retry when the notifications fail to load', async () => {
    const refetch = jest.fn();
    mockedGetNotifications.mockReturnValue(queryResult({ error: { status: 500 }, refetch }));
    renderBell();

    const user = await openMenu();
    await user.click(await screen.findByRole('button', { name: 'Try again' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Could not load notifications.');
    expect(refetch).toHaveBeenCalledTimes(2);
  });

  it('leads with the project name and a short status', async () => {
    showNotifications([
      notification(),
      notification({ id: 'n2', project_name: 'Road', level: 'OverBudget', spent: 900, budget: 800, percent_used: 112.5 }),
    ], 2);
    renderBell();

    await openMenu();

    const threshold = await screen.findByRole('menuitem', { name: /Bridge Renovation/ });
    expect(threshold).toHaveTextContent('85% used · passed 80% alert');
    expect(threshold.querySelector('[data-severity="threshold"]')).toBeInTheDocument();
    const over = screen.getByRole('menuitem', { name: /^Unread: Road/ });
    expect(over).toHaveTextContent('Over budget · 900 of 800');
    expect(over.querySelector('[data-severity="over-budget"]')).toBeInTheDocument();
  });

  it('flags only unread notifications with a dot', async () => {
    showNotifications([notification(), notification({ id: 'n2', project_name: 'Road', read_at: '2026-03-12T11:00:00.000Z' })], 1);
    renderBell();

    await openMenu();

    expect((await screen.findByRole('menuitem', { name: /^Unread: Bridge/ })).querySelector('[data-unread-dot]')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /^Road/ }).querySelector('[data-unread-dot]')).not.toBeInTheDocument();
  });

  it('groups notifications into today and earlier', async () => {
    showNotifications([notification({ id: 'n2', project_name: 'Fresh', created_at: new Date().toISOString() }), notification()], 2);
    renderBell();

    await openMenu();

    const today = await screen.findByRole('group', { name: 'Today' });
    const earlier = screen.getByRole('group', { name: 'Earlier' });
    expect(today).toHaveTextContent('Fresh');
    expect(earlier).toHaveTextContent('Bridge Renovation');
  });

  it('filters to unread notifications and keeps the menu open', async () => {
    showNotifications([notification(), notification({ id: 'n2', project_name: 'Road', read_at: '2026-03-12T11:00:00.000Z' })], 1);
    renderBell();

    const user = await openMenu();
    await user.click(await screen.findByRole('menuitemradio', { name: 'Unread (1)' }));

    expect(screen.getByRole('menuitemradio', { name: 'Unread (1)' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('menuitem', { name: /Bridge Renovation/ })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /^Road/ })).not.toBeInTheDocument();
  });

  it('says so when nothing is unread under the unread filter', async () => {
    showNotifications([notification({ read_at: '2026-03-12T11:00:00.000Z' })], 0);
    renderBell();

    const user = await openMenu();
    await user.click(await screen.findByRole('menuitemradio', { name: 'Unread' }));

    expect(screen.getByText('No unread notifications.')).toBeInTheDocument();
  });

  it('keeps showing the last loaded notifications when a later refresh fails', async () => {
    showNotifications([notification()], 1, { error: { status: 500 } });
    renderBell();

    await openMenu(/1 unread/);

    expect(await screen.findByRole('menuitem', { name: /Bridge Renovation has used 85%/ })).toBeInTheDocument();
    expect(screen.queryByText('Could not load notifications.')).not.toBeInTheDocument();
  });
});
