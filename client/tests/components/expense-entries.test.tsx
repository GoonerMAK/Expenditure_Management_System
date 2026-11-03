import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import ExpenseEntries from '../../src/components/expense-entries';
import {
  useAddExpenseMutation,
  useDeleteExpenseMutation,
  useGetProjectExpensesQuery,
  useUpdateExpenseMutation,
} from '../../src/redux/financial-data-api';
import { mutationResult, queryResult, rejectingTrigger, resolvingTrigger } from '../support/rtk';

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));
jest.mock('../../src/redux/financial-data-api', () => ({
  getReceiptUrl: (id: string) => `http://localhost:4000/api/expenses/${id}/receipt`,
  useGetProjectExpensesQuery: jest.fn(),
  useAddExpenseMutation: jest.fn(),
  useUpdateExpenseMutation: jest.fn(),
  useDeleteExpenseMutation: jest.fn(),
}));

const mockedGetExpenses = jest.mocked(useGetProjectExpensesQuery);
const mockedAdd = jest.mocked(useAddExpenseMutation);
const mockedUpdate = jest.mocked(useUpdateExpenseMutation);
const mockedDelete = jest.mocked(useDeleteExpenseMutation);

const entry = (overrides: Record<string, unknown> = {}) => ({
  id: 'e1',
  project_id: 'p1',
  date: '2026-03-12T00:00:00.000Z',
  vendor: 'Steel Supplies',
  amount: 250.5,
  notes: 'Rebar',
  receipt_name: 'invoice.pdf',
  receipt_type: 'application/pdf',
  has_receipt: true,
  created_at: '2026-03-12T10:00:00.000Z',
  updated_at: '2026-03-12T10:00:00.000Z',
  ...overrides,
});

const entries = [
  entry({ id: 'e3', date: '2026-04-02T00:00:00.000Z', vendor: 'Cement Co', amount: 1000, notes: null, has_receipt: false, receipt_name: null }),
  entry(),
  entry({ id: 'e2', date: '2026-03-01T00:00:00.000Z', vendor: 'Bolt Shop', amount: 0.2, notes: null }),
];

type SetupOptions = {
  canEdit?: boolean;
  query?: Record<string, unknown>;
  add?: jest.Mock;
  update?: jest.Mock;
  remove?: jest.Mock;
};

const setup = ({
  canEdit = true,
  query = { data: entries },
  add = resolvingTrigger(entry()),
  update = resolvingTrigger(entry()),
  remove = resolvingTrigger(entry()),
}: SetupOptions = {}) => {
  const result = queryResult(query) as { refetch: jest.Mock };
  mockedGetExpenses.mockReturnValue(result as never);
  mockedAdd.mockReturnValue(mutationResult(add));
  mockedUpdate.mockReturnValue(mutationResult(update));
  mockedDelete.mockReturnValue(mutationResult(remove));

  render(<ExpenseEntries projectId="p1" canEdit={canEdit} />);
  return { add, update, remove, refetch: result.refetch, user: userEvent.setup() };
};

const sentFields = (trigger: jest.Mock) => {
  const { data } = trigger.mock.calls[0][0] as { data: FormData };
  return Object.fromEntries(data.entries());
};

const fillForm = async (user: ReturnType<typeof userEvent.setup>, { date = '2026-05-03', vendor = 'Acme', amount = '42.5', notes = '' } = {}) => {
  await user.clear(screen.getByLabelText('Date'));
  await user.type(screen.getByLabelText('Date'), date);
  await user.type(screen.getByLabelText('Vendor'), vendor);
  await user.type(screen.getByLabelText('Amount'), amount);
  if (notes) await user.type(screen.getByLabelText('Notes'), notes);
};

describe('ExpenseEntries', () => {
  it('loads the entries for the project', () => {
    setup();

    expect(mockedGetExpenses).toHaveBeenCalledWith('p1');
  });

  it('groups entries by month with each month total', () => {
    setup();

    const rows = screen.getAllByRole('row').slice(1);
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining('Apr 2026'),
      expect.stringContaining('Cement Co'),
      expect.stringContaining('Mar 2026'),
      expect.stringContaining('Steel Supplies'),
      expect.stringContaining('Bolt Shop'),
    ]);
    expect(within(rows[0]).getByText('1,000')).toBeInTheDocument();
    expect(within(rows[2]).getByText('250.7')).toBeInTheDocument();
  });

  it('shows the date in UTC so it does not shift a day', () => {
    setup();

    expect(screen.getByText('12 Mar 2026')).toBeInTheDocument();
    expect(screen.getByText('1 Mar 2026')).toBeInTheDocument();
  });

  it('links to the receipt and marks entries without one', () => {
    setup();

    expect(screen.getAllByRole('link', { name: 'invoice.pdf' })[0]).toHaveAttribute(
      'href',
      'http://localhost:4000/api/expenses/e1/receipt',
    );
    expect(screen.getByText('None')).toBeInTheDocument();
  });

  it('falls back to "View" when the receipt has no name', () => {
    setup({ query: { data: [entry({ receipt_name: null })] } });

    expect(screen.getByRole('link', { name: 'View' })).toBeInTheDocument();
  });

  it('shows a loading message', () => {
    setup({ query: { isLoading: true } });

    expect(screen.getByText('Loading expense entries...')).toBeInTheDocument();
    expect(screen.queryByText('No expense entries yet.')).not.toBeInTheDocument();
  });

  it('shows an error with a retry button', async () => {
    const { refetch, user } = setup({ query: { error: { status: 500 } } });

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(screen.getByText('Could not load expense entries.')).toBeInTheDocument();
    expect(refetch).toHaveBeenCalled();
  });

  it('shows an empty message when there are no entries', () => {
    setup({ query: { data: [] } });

    expect(screen.getByText('No expense entries yet.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('hides the form and row actions from Read-only users', () => {
    setup({ canEdit: false });

    expect(screen.queryByRole('form')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Edit/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Delete/ })).not.toBeInTheDocument();
  });

  describe('adding', () => {
    it('sends the entry as form data with the project id', async () => {
      const { add, user } = setup();

      await fillForm(user, { notes: 'Paint' });
      await user.click(screen.getByRole('button', { name: 'Add entry' }));

      await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Expense entry added'));
      expect(add).toHaveBeenCalledWith({ projectId: 'p1', data: expect.any(FormData) });
      expect(sentFields(add)).toEqual({ project_id: 'p1', date: '2026-05-03', vendor: 'Acme', amount: '42.5', notes: 'Paint' });
    });

    it('attaches the chosen receipt', async () => {
      const { add, user } = setup();
      const file = new File(['%PDF'], 'bill.pdf', { type: 'application/pdf' });

      await fillForm(user);
      await user.upload(screen.getByLabelText('Receipt'), file);
      await user.click(screen.getByRole('button', { name: 'Add entry' }));

      await waitFor(() => expect(add).toHaveBeenCalled());
      expect(sentFields(add).receipt).toEqual(expect.objectContaining({ name: 'bill.pdf' }));
    });

    it('clears the form after adding', async () => {
      const { user } = setup();

      await fillForm(user);
      await user.click(screen.getByRole('button', { name: 'Add entry' }));

      await waitFor(() => expect(screen.getByLabelText('Vendor')).toHaveValue(''));
      expect(screen.getByLabelText('Amount')).toHaveValue(null);
    });

    it('checks the vendor and amount before sending', async () => {
      const { add, user } = setup();

      await user.type(screen.getByLabelText('Vendor'), '   ');
      await user.type(screen.getByLabelText('Amount'), '0');
      await user.click(screen.getByRole('button', { name: 'Add entry' }));

      expect(await screen.findByText('Vendor is required')).toBeInTheDocument();
      expect(screen.getByText('Amount must be greater than 0')).toBeInTheDocument();
      expect(add).not.toHaveBeenCalled();
    });

    it('requires a date', async () => {
      const { add, user } = setup();

      await user.clear(screen.getByLabelText('Date'));
      await user.type(screen.getByLabelText('Vendor'), 'Acme');
      await user.type(screen.getByLabelText('Amount'), '5');
      await user.click(screen.getByRole('button', { name: 'Add entry' }));

      expect(await screen.findByText('Date is required')).toBeInTheDocument();
      expect(add).not.toHaveBeenCalled();
    });

    it('shows the server message when adding fails', async () => {
      const { user } = setup({ add: rejectingTrigger({ status: 400, data: { message: 'Receipt must be 5 MB or smaller.' } }) });

      await fillForm(user);
      await user.click(screen.getByRole('button', { name: 'Add entry' }));

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Receipt must be 5 MB or smaller.'));
      expect(screen.getByLabelText('Vendor')).toHaveValue('Acme');
    });

    it('shows a fallback message when adding fails without one', async () => {
      const { user } = setup({ add: rejectingTrigger({ status: 500 }) });

      await fillForm(user);
      await user.click(screen.getByRole('button', { name: 'Add entry' }));

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to add expense entry'));
    });
  });

  describe('editing', () => {
    it('loads the entry into the form', async () => {
      const { user } = setup();

      await user.click(screen.getByRole('button', { name: 'Edit Steel Supplies entry' }));

      expect(screen.getByRole('form', { name: 'Edit expense entry' })).toBeInTheDocument();
      expect(screen.getByLabelText('Date')).toHaveValue('2026-03-12');
      expect(screen.getByLabelText('Vendor')).toHaveValue('Steel Supplies');
      expect(screen.getByLabelText('Amount')).toHaveValue(250.5);
      expect(screen.getByLabelText('Notes')).toHaveValue('Rebar');
    });

    it('saves the changes without a project id', async () => {
      const { update, user } = setup();

      await user.click(screen.getByRole('button', { name: 'Edit Steel Supplies entry' }));
      await user.clear(screen.getByLabelText('Amount'));
      await user.type(screen.getByLabelText('Amount'), '300');
      await user.click(screen.getByRole('button', { name: 'Save entry' }));

      await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Expense entry updated'));
      expect(update).toHaveBeenCalledWith({ id: 'e1', projectId: 'p1', data: expect.any(FormData) });
      expect(sentFields(update)).toEqual({ date: '2026-03-12', vendor: 'Steel Supplies', amount: '300', notes: 'Rebar' });
      expect(screen.getByRole('form', { name: 'Add expense entry' })).toBeInTheDocument();
    });

    it('can remove the current receipt', async () => {
      const { update, user } = setup();

      await user.click(screen.getByRole('button', { name: 'Edit Steel Supplies entry' }));
      await user.click(screen.getByLabelText('Remove the current receipt (invoice.pdf)'));
      await user.click(screen.getByRole('button', { name: 'Save entry' }));

      await waitFor(() => expect(update).toHaveBeenCalled());
      expect(sentFields(update).remove_receipt).toBe('true');
    });

    it('sends a new receipt instead of removing when both are chosen', async () => {
      const { update, user } = setup();

      await user.click(screen.getByRole('button', { name: 'Edit Steel Supplies entry' }));
      await user.click(screen.getByLabelText('Remove the current receipt (invoice.pdf)'));
      await user.upload(screen.getByLabelText('Receipt'), new File(['png'], 'new.png', { type: 'image/png' }));
      await user.click(screen.getByRole('button', { name: 'Save entry' }));

      await waitFor(() => expect(update).toHaveBeenCalled());
      const fields = sentFields(update);
      expect(fields.receipt).toEqual(expect.objectContaining({ name: 'new.png' }));
      expect(fields).not.toHaveProperty('remove_receipt');
    });

    it('does not offer to remove a receipt the entry does not have', async () => {
      const { user } = setup();

      await user.click(screen.getByRole('button', { name: 'Edit Cement Co entry' }));

      expect(screen.queryByLabelText(/Remove the current receipt/)).not.toBeInTheDocument();
    });

    it('cancels back to an empty add form', async () => {
      const { update, user } = setup();

      await user.click(screen.getByRole('button', { name: 'Edit Steel Supplies entry' }));
      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(screen.getByRole('form', { name: 'Add expense entry' })).toBeInTheDocument();
      expect(screen.getByLabelText('Vendor')).toHaveValue('');
      expect(update).not.toHaveBeenCalled();
    });

    it('shows a fallback message when saving fails', async () => {
      const { user } = setup({ update: rejectingTrigger({ status: 500 }) });

      await user.click(screen.getByRole('button', { name: 'Edit Steel Supplies entry' }));
      await user.click(screen.getByRole('button', { name: 'Save entry' }));

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to update expense entry'));
      expect(screen.getByRole('form', { name: 'Edit expense entry' })).toBeInTheDocument();
    });
  });

  describe('deleting', () => {
    it('asks first and deletes on confirm', async () => {
      const { remove, user } = setup();

      await user.click(screen.getByRole('button', { name: 'Delete Steel Supplies entry' }));
      const dialog = screen.getByRole('alertdialog');
      expect(dialog).toHaveTextContent('Steel Supplies, 250.5 on 12 Mar 2026');
      await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

      await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Expense entry deleted'));
      expect(remove).toHaveBeenCalledWith({ id: 'e1', projectId: 'p1' });
    });

    it('does nothing when cancelled', async () => {
      const { remove, user } = setup();

      await user.click(screen.getByRole('button', { name: 'Delete Steel Supplies entry' }));
      await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancel' }));

      await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
      expect(remove).not.toHaveBeenCalled();
    });

    it('resets the form when the entry being edited is deleted', async () => {
      const { user } = setup();

      await user.click(screen.getByRole('button', { name: 'Edit Steel Supplies entry' }));
      await user.click(screen.getByRole('button', { name: 'Delete Steel Supplies entry' }));
      await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' }));

      await waitFor(() => expect(screen.getByRole('form', { name: 'Add expense entry' })).toBeInTheDocument());
    });

    it('keeps editing another entry when a different one is deleted', async () => {
      const { user } = setup();

      await user.click(screen.getByRole('button', { name: 'Edit Steel Supplies entry' }));
      await user.click(screen.getByRole('button', { name: 'Delete Bolt Shop entry' }));
      await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' }));

      await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Expense entry deleted'));
      expect(screen.getByRole('form', { name: 'Edit expense entry' })).toBeInTheDocument();
    });

    it('shows the server message when deleting fails', async () => {
      const { user } = setup({ remove: rejectingTrigger({ status: 403, data: { message: 'Access denied. Insufficient permissions.' } }) });

      await user.click(screen.getByRole('button', { name: 'Delete Steel Supplies entry' }));
      await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' }));

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Access denied. Insufficient permissions.'));
    });

    it('shows a fallback message when deleting fails without one', async () => {
      const { user } = setup({ remove: rejectingTrigger({ status: 500 }) });

      await user.click(screen.getByRole('button', { name: 'Delete Steel Supplies entry' }));
      await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' }));

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to delete expense entry'));
    });
  });
});
