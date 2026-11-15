import { HistoryAction, HistoryChange, HistoryEntry, HistoryValue } from './interfaces';
import { formatAmount, formatDay, formatMonth } from '../lib/utils';
import { useGetProjectHistoryQuery } from '../redux/financial-data-api';

import ErrorState from './error-state';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface ProjectHistoryProps {
  projectId: string;
}

const FIELD_LABELS: Record<string, string> = {
  project_name: 'Name',
  description: 'Description',
  category_name: 'Category',
  start_date: 'Start date',
  end_date: 'End date',
  year: 'Year',
  month: 'Month',
  initial_budget: 'Initial budget',
  revised_budget: 'Revised budget',
  expenditure: 'Expenditure',
  date: 'Date',
  vendor: 'Vendor',
  amount: 'Amount',
  notes: 'Notes',
  receipt_name: 'Receipt',
  status: 'Status',
  rejection_reason: 'Rejection reason',
};

const DATE_FIELDS = ['start_date', 'end_date', 'date'];

const AMOUNT_FIELDS = ['initial_budget', 'revised_budget', 'expenditure', 'amount'];

const ACTION_VERBS: Record<HistoryAction, string> = {
  Created: 'added',
  Updated: 'changed',
  Deleted: 'deleted',
  Approved: 'approved',
  Rejected: 'rejected',
};

const formatValue = (field: string, value: HistoryValue) => {
  if (value === null || value === '') return 'empty';
  if (DATE_FIELDS.includes(field)) return formatDay(String(value));
  if (AMOUNT_FIELDS.includes(field) && typeof value === 'number') return formatAmount(value);
  return String(value);
};

const formatBudgetMonth = (label: string) => {
  const [year, month] = label.split('-').map(Number);
  return formatMonth(year, month);
};

const describeSubject = (entry: HistoryEntry) => {
  if (entry.entity === 'Project') return `the project ${entry.entity_label}`;
  if (entry.entity === 'Budget') return `the budget for ${formatBudgetMonth(entry.entity_label)}`;
  return `the expense from ${entry.entity_label}`;
};

const describeChange = ({ field, from, to }: HistoryChange) =>
  `${FIELD_LABELS[field] ?? field}: ${formatValue(field, from)} → ${formatValue(field, to)}`;

const formatTime = (date: string) =>
  new Date(date).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const HistoryItem = ({ entry }: { entry: HistoryEntry }) => (
  <li className="flex flex-col gap-1 border-b pb-3 last:border-b-0 last:pb-0">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <p className="text-sm">
        <span className="font-medium">{entry.user_name ?? 'A deleted user'}</span>{' '}
        {ACTION_VERBS[entry.action]} {describeSubject(entry)}
      </p>
      <time dateTime={entry.created_at} className="text-xs text-muted-foreground">
        {formatTime(entry.created_at)}
      </time>
    </div>
    {entry.changes.length > 0 && (
      <ul className="text-sm text-muted-foreground">
        {entry.changes.map((change) => (
          <li key={change.field}>{describeChange(change)}</li>
        ))}
      </ul>
    )}
  </li>
);

const ProjectHistory = ({ projectId }: ProjectHistoryProps) => {
  const { data: history, error, isLoading, refetch } = useGetProjectHistoryQuery(projectId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>History</CardTitle>
        <p className="text-sm text-muted-foreground">Who changed this project, its budgets and its expenses, newest first.</p>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-sm text-muted-foreground">Loading history...</p>}
        {error && <ErrorState message="Could not load the history." onRetry={refetch} />}
        {history && history.length === 0 && <p className="text-sm text-muted-foreground">No changes recorded yet.</p>}
        {history && history.length > 0 && (
          <ol aria-label="Project history" className="flex flex-col gap-3">
            {history.map((entry) => (
              <HistoryItem key={entry.id} entry={entry} />
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
};

export default ProjectHistory;
