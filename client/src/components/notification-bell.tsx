import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Notification } from './interfaces';
import { cn, formatAmount, formatDay } from '../lib/utils';
import { useGetNotificationsQuery, useMarkAllNotificationsReadMutation, useMarkNotificationReadMutation } from '../redux/notification-api';

import ErrorState from './error-state';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';

const POLLING_INTERVAL_MS = 30_000;

const MAX_BADGE_COUNT = 9;

const describeNotification = ({ project_name, level, threshold, budget, spent, percent_used }: Notification) => {
  if (level === 'OverBudget') {
    return `${project_name} is over budget: ${formatAmount(spent)} spent of ${formatAmount(budget)}`;
  }
  return `${project_name} has used ${percent_used}% of its budget, past its ${threshold}% alert`;
};

const toBadgeText = (count: number) => (count > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : String(count));

const toButtonLabel = (count: number) => (count > 0 ? `Notifications, ${count} unread` : 'Notifications');

interface NotificationItemProps {
  notification: Notification;
  onOpen: (notification: Notification) => void;
}

const NotificationItem = ({ notification, onOpen }: NotificationItemProps) => {
  const unread = notification.read_at === null;

  return (
    <DropdownMenuItem onSelect={() => onOpen(notification)} className="flex flex-col items-start gap-1">
      <span className={cn(unread ? 'font-medium' : 'text-muted-foreground')}>
        {unread && <span className="sr-only">Unread: </span>}
        {describeNotification(notification)}
      </span>
      <span className="text-xs text-muted-foreground">{formatDay(notification.created_at)}</span>
    </DropdownMenuItem>
  );
};

const NotificationBell = () => {
  const navigate = useNavigate();
  const { data, error, refetch } = useGetNotificationsQuery(undefined, { pollingInterval: POLLING_INTERVAL_MS });
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead] = useMarkAllNotificationsReadMutation();

  const notifications = data?.data ?? [];
  const unreadCount = data?.unread_count ?? 0;

  const handleOpenChange = (open: boolean) => {
    if (open) refetch();
  };

  const openNotification = (notification: Notification) => {
    if (notification.read_at === null) markRead(notification.id);
    if (notification.project_id) navigate(`/projects/${notification.project_id}`);
  };

  const renderList = () => {
    if (error) {
      return <ErrorState message="Could not load notifications." onRetry={refetch} className="p-2" />;
    }
    if (notifications.length === 0) {
      return <p className="p-2 text-sm text-muted-foreground">No notifications yet.</p>;
    }
    return notifications.map((notification) => (
      <NotificationItem key={notification.id} notification={notification} onOpen={openNotification} />
    ));
  };

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="icon" className="relative rounded-full border border-gray-400">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span
              aria-hidden="true"
              className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-xs text-destructive-foreground"
            >
              {toBadgeText(unreadCount)}
            </span>
          )}
          <span className="sr-only">{toButtonLabel(unreadCount)}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {renderList()}
        {unreadCount > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => markAllRead()}>Mark all as read</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationBell;
