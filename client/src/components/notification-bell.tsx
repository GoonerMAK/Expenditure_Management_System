import { useState } from 'react';
import { AlertTriangle, Bell, Gauge } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { Notification } from './interfaces';
import { cn, formatAmount, formatTime } from '../lib/utils';
import { useGetNotificationsQuery, useMarkAllNotificationsReadMutation, useMarkNotificationReadMutation } from '../redux/notification-api';

import ErrorState from './error-state';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

const POLLING_INTERVAL_MS = 30_000;

const MAX_BADGE_COUNT = 9;

type Filter = 'all' | 'unread';

const describeNotification = ({ project_name, level, threshold, budget, spent, percent_used }: Notification) => {
  if (level === 'OverBudget') {
    return `${project_name} is over budget: ${formatAmount(spent)} spent of ${formatAmount(budget)}`;
  }
  return `${project_name} has used ${percent_used}% of its budget and reached its ${threshold}% alert`;
};

const summarizeStatus = ({ level, threshold, budget, spent, percent_used }: Notification) => {
  if (level === 'OverBudget') return `Over budget · ${formatAmount(spent)} of ${formatAmount(budget)}`;
  if (percent_used === null) return `Reached ${threshold}% alert`;
  return `${percent_used}% used · passed ${threshold}% alert`;
};

const isUnread = (notification: Notification) => notification.read_at === null;

const isToday = (date: string) => new Date(date).toDateString() === new Date().toDateString();

const toBadgeText = (count: number) => (count > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : String(count));

const toButtonLabel = (count: number) => (count > 0 ? `Notifications, ${count} unread` : 'Notifications');

const SeverityIcon = ({ level }: Pick<Notification, 'level'>) =>
  level === 'OverBudget' ? (
    <AlertTriangle aria-hidden="true" data-severity="over-budget" className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
  ) : (
    <Gauge aria-hidden="true" data-severity="threshold" className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
  );

interface NotificationItemProps {
  notification: Notification;
  onOpen: (notification: Notification) => void;
}

const NotificationItem = ({ notification, onOpen }: NotificationItemProps) => {
  const unread = isUnread(notification);
  const label = `${unread ? 'Unread: ' : ''}${describeNotification(notification)}, ${formatTime(notification.created_at)}`;

  return (
    <DropdownMenuItem
      aria-label={label}
      onSelect={() => onOpen(notification)}
      className={cn('items-start gap-2 rounded-md py-2.5', unread && 'bg-sky-50 dark:bg-sky-950/40')}
    >
      <span
        aria-hidden="true"
        data-unread-dot={unread || undefined}
        className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', unread ? 'bg-sky-600' : 'bg-transparent')}
      />
      <SeverityIcon level={notification.level} />
      <div className="grid min-w-0 flex-1 gap-0.5">
        <span title={notification.project_name} className={cn('truncate text-foreground', unread ? 'font-semibold' : 'font-medium')}>
          {notification.project_name}
        </span>
        <span className={cn(unread ? 'text-foreground' : 'text-muted-foreground')}>{summarizeStatus(notification)}</span>
        <time dateTime={notification.created_at} className="text-xs text-muted-foreground">
          {formatTime(notification.created_at)}
        </time>
      </div>
    </DropdownMenuItem>
  );
};

interface FilterTabProps {
  value: Filter;
  children: React.ReactNode;
}

const FilterTab = ({ value, children }: FilterTabProps) => (
  <DropdownMenuPrimitive.RadioItem
    value={value}
    onSelect={(event) => event.preventDefault()}
    className="cursor-default select-none rounded-sm px-2.5 py-1 text-xs font-medium text-muted-foreground outline-none transition-colors focus:bg-accent data-[state=checked]:bg-background data-[state=checked]:text-foreground data-[state=checked]:shadow-sm"
  >
    {children}
  </DropdownMenuPrimitive.RadioItem>
);

interface NotificationSectionProps {
  title: string;
  notifications: Notification[];
  onOpen: (notification: Notification) => void;
}

const NotificationSection = ({ title, notifications, onOpen }: NotificationSectionProps) => {
  if (notifications.length === 0) return null;

  return (
    <DropdownMenuGroup aria-label={title}>
      <DropdownMenuLabel className="px-2 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </DropdownMenuLabel>
      {notifications.map((notification) => (
        <NotificationItem key={notification.id} notification={notification} onOpen={onOpen} />
      ))}
    </DropdownMenuGroup>
  );
};

const NotificationBell = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('all');
  const { data, error, refetch } = useGetNotificationsQuery(undefined, { pollingInterval: POLLING_INTERVAL_MS });
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead] = useMarkAllNotificationsReadMutation();

  const notifications = data?.data ?? [];
  const unreadCount = data?.unread_count ?? 0;
  const visible = filter === 'unread' ? notifications.filter(isUnread) : notifications;

  const handleOpenChange = (open: boolean) => {
    if (open) refetch();
  };

  const openNotification = (notification: Notification) => {
    if (isUnread(notification)) markRead(notification.id);
    if (notification.project_id) navigate(`/projects/${notification.project_id}`);
  };

  const renderList = () => {
    if (error && !data) {
      return <ErrorState message="Could not load notifications." onRetry={refetch} className="p-2" />;
    }
    if (visible.length === 0) {
      const message = filter === 'unread' && notifications.length > 0 ? 'No unread notifications.' : 'No notifications yet.';
      return <p className="p-2 text-sm text-muted-foreground">{message}</p>;
    }
    return (
      <>
        <NotificationSection
          title="Today"
          notifications={visible.filter((notification) => isToday(notification.created_at))}
          onOpen={openNotification}
        />
        <NotificationSection
          title="Earlier"
          notifications={visible.filter((notification) => !isToday(notification.created_at))}
          onOpen={openNotification}
        />
      </>
    );
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
      <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] max-w-96 sm:w-96">
        <div className="flex items-center justify-between gap-2 px-2 py-1.5">
          <DropdownMenuLabel className="p-0 text-base">Notifications</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            aria-label="Show"
            value={filter}
            onValueChange={(value) => setFilter(value as Filter)}
            className="flex gap-0.5 rounded-md bg-muted p-0.5"
          >
            <FilterTab value="all">All</FilterTab>
            <FilterTab value="unread">Unread{unreadCount > 0 ? ` (${unreadCount})` : ''}</FilterTab>
          </DropdownMenuRadioGroup>
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-[28rem] overflow-y-auto">{renderList()}</div>
        {unreadCount > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => markAllRead()} className="justify-center font-medium">
              Mark all as read
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationBell;
