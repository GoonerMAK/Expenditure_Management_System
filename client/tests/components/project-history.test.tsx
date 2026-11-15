import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProjectHistory from '../../src/components/project-history';
import { useGetProjectHistoryQuery } from '../../src/redux/financial-data-api';
import { queryResult } from '../support/rtk';

jest.mock('../../src/redux/financial-data-api', () => ({
  useGetProjectHistoryQuery: jest.fn(),
}));

const mockedGetHistory = jest.mocked(useGetProjectHistoryQuery);

const historyEntry = (overrides: Record<string, unknown> = {}) => ({
  id: 'h1',
  project_id: 'p1',
  entity: 'Project',
  entity_label: 'Bridge Renovation',
  action: 'Updated',
  changes: [{ field: 'project_name', from: 'Bridge', to: 'Bridge Renovation' }],
  user_id: 'u1',
  user_name: 'jdoe',
  created_at: '2026-03-12T10:30:00.000Z',
  ...overrides,
});

const showHistory = (entries: Record<string, unknown>[]) => {
  mockedGetHistory.mockReturnValue(queryResult({ data: entries }));
  render(<ProjectHistory projectId="p1" />);
  return within(screen.getByRole('list', { name: 'Project history' }));
};

describe('ProjectHistory', () => {
  it('loads the history of the given project', () => {
    mockedGetHistory.mockReturnValue(queryResult({ data: [] }));

    render(<ProjectHistory projectId="p1" />);

    expect(mockedGetHistory).toHaveBeenCalledWith('p1');
  });

  it('shows a loading message while the history loads', () => {
    mockedGetHistory.mockReturnValue(queryResult({ isLoading: true }));

    render(<ProjectHistory projectId="p1" />);

    expect(screen.getByText('Loading history...')).toBeInTheDocument();
  });

  it('shows an empty message when nothing has changed yet', () => {
    mockedGetHistory.mockReturnValue(queryResult({ data: [] }));

    render(<ProjectHistory projectId="p1" />);

    expect(screen.getByText('No changes recorded yet.')).toBeInTheDocument();
  });

  it('offers a retry when the history fails to load', async () => {
    const refetch = jest.fn();
    mockedGetHistory.mockReturnValue(queryResult({ error: { status: 500 }, refetch }));

    render(<ProjectHistory projectId="p1" />);
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Could not load the history.');
    expect(refetch).toHaveBeenCalled();
  });

  it('shows who changed what, with the old and new values', () => {
    const list = showHistory([historyEntry()]);

    expect(list.getByText(/jdoe/).closest('p')).toHaveTextContent('jdoe changed the project Bridge Renovation');
    expect(list.getByText('Name: Bridge → Bridge Renovation')).toBeInTheDocument();
  });

  it('shows when the change was made', () => {
    const list = showHistory([historyEntry()]);

    expect(list.getByText((_content, element) => element?.tagName === 'TIME')).toHaveAttribute('dateTime', '2026-03-12T10:30:00.000Z');
  });

  it('names a budget by its month and formats amounts', () => {
    const list = showHistory([
      historyEntry({
        entity: 'Budget',
        entity_label: '2026-03',
        changes: [{ field: 'initial_budget', from: 10000, to: 12500.5 }],
      }),
    ]);

    expect(list.getByText(/jdoe/).closest('p')).toHaveTextContent('jdoe changed the budget for Mar 2026');
    expect(list.getByText('Initial budget: 10,000 → 12,500.5')).toBeInTheDocument();
  });

  it('shows an approval as its own action', () => {
    const list = showHistory([
      historyEntry({
        entity: 'Expense',
        entity_label: 'Steel Supplies',
        action: 'Approved',
        changes: [{ field: 'status', from: 'Pending', to: 'Approved' }],
      }),
    ]);

    expect(list.getByText(/jdoe/).closest('p')).toHaveTextContent('jdoe approved the expense from Steel Supplies');
    expect(list.getByText('Status: Pending → Approved')).toBeInTheDocument();
  });

  it('shows a rejection with its reason', () => {
    const list = showHistory([
      historyEntry({
        entity: 'Expense',
        entity_label: 'Steel Supplies',
        action: 'Rejected',
        changes: [
          { field: 'status', from: 'Pending', to: 'Rejected' },
          { field: 'rejection_reason', from: null, to: 'No receipt' },
        ],
      }),
    ]);

    expect(list.getByText(/jdoe/).closest('p')).toHaveTextContent('jdoe rejected the expense from Steel Supplies');
    expect(list.getByText('Rejection reason: empty → No receipt')).toBeInTheDocument();
  });

  it('shows an added record as values filled in from empty', () => {
    const list = showHistory([
      historyEntry({
        entity: 'Expense',
        entity_label: 'Steel Supplies',
        action: 'Created',
        changes: [
          { field: 'date', from: null, to: '2026-03-12T00:00:00.000Z' },
          { field: 'amount', from: null, to: 250.75 },
        ],
      }),
    ]);

    expect(list.getByText(/jdoe/).closest('p')).toHaveTextContent('jdoe added the expense from Steel Supplies');
    expect(list.getByText('Date: empty → 12 Mar 2026')).toBeInTheDocument();
    expect(list.getByText('Amount: empty → 250.75')).toBeInTheDocument();
  });

  it('shows a deleted record as values going to empty', () => {
    const list = showHistory([
      historyEntry({
        action: 'Deleted',
        changes: [{ field: 'project_name', from: 'Bridge Renovation', to: null }],
      }),
    ]);

    expect(list.getByText(/jdoe/).closest('p')).toHaveTextContent('jdoe deleted the project Bridge Renovation');
    expect(list.getByText('Name: Bridge Renovation → empty')).toBeInTheDocument();
  });

  it('names a user who has since been deleted', () => {
    const list = showHistory([historyEntry({ user_id: null, user_name: null })]);

    expect(list.getByText('A deleted user').closest('p')).toHaveTextContent('A deleted user changed the project Bridge Renovation');
  });

  it('lists the entries in the order the server sends them', () => {
    const list = showHistory([
      historyEntry({ id: 'h2', user_name: 'admin' }),
      historyEntry({ id: 'h1', user_name: 'jdoe' }),
    ]);

    const items = list.getAllByRole('listitem').filter((item) => item.parentElement?.tagName === 'OL');
    expect(items.map((item) => item.querySelector('span')?.textContent)).toEqual(['admin', 'jdoe']);
  });
});
