import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import CategoryList from '../../src/components/category-list';
import { Table } from '../../src/components/ui/table';
import {
  useDeleteCategoryMutation,
  useGetCategoryUsageQuery,
  useUpdateCategoryMutation,
} from '../../src/redux/category-api';
import { mutationResult, queryResult, rejectingTrigger, resolvingTrigger } from '../support/rtk';

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));
jest.mock('../../src/redux/category-api', () => ({
  useUpdateCategoryMutation: jest.fn(),
  useDeleteCategoryMutation: jest.fn(),
  useGetCategoryUsageQuery: jest.fn(),
}));

const mockedUpdate = jest.mocked(useUpdateCategoryMutation);
const mockedDelete = jest.mocked(useDeleteCategoryMutation);
const mockedUsage = jest.mocked(useGetCategoryUsageQuery);

const categories = [
  { id: 'c1', category_name: 'Tech', created_at: '', updated_at: '' },
  { id: 'c2', category_name: 'Healthcare', created_at: '', updated_at: '' },
];

const setup = ({ update = resolvingTrigger({ id: 'c1', category_name: 'Technology' }), canManage = true } = {}) => {
  mockedUpdate.mockReturnValue(mutationResult(update));
  mockedDelete.mockReturnValue(mutationResult(resolvingTrigger()));
  mockedUsage.mockReturnValue(queryResult({ isLoading: true }));
  render(
    <Table>
      <CategoryList categories={categories} canManage={canManage} roleName="Contributor" />
    </Table>,
  );
  return { update, user: userEvent.setup() };
};

const startRename = async (user: ReturnType<typeof userEvent.setup>, name = 'Tech') => {
  await user.click(screen.getByRole('button', { name: `Rename ${name}` }));
  return screen.getByRole('textbox', { name: 'Category name' });
};

describe('CategoryList', () => {
  it('shows an edit and a red delete icon on every row', () => {
    setup();

    categories.forEach(({ category_name }) => {
      expect(screen.getByRole('button', { name: `Rename ${category_name}` })).not.toHaveClass('text-destructive');
      expect(screen.getByRole('button', { name: `Delete ${category_name}` })).toHaveClass('text-destructive');
    });
  });

  it('shows no icons when the user cannot manage categories', () => {
    setup({ canManage: false });

    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.getByText('Tech')).toBeInTheDocument();
  });

  it('turns the name into a text box with save and cancel buttons', async () => {
    const { user } = setup();

    const input = await startRename(user);

    expect(input).toHaveValue('Tech');
    expect(input).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Save name' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel rename' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rename Tech' })).not.toBeInTheDocument();
  });

  it('saves the new name with the tick', async () => {
    const { update, user } = setup();

    const input = await startRename(user);
    await user.clear(input);
    await user.type(input, 'Technology');
    await user.click(screen.getByRole('button', { name: 'Save name' }));

    expect(update).toHaveBeenCalledWith({ id: 'c1', category_name: 'Technology' });
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Renamed to "Technology".'));
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('saves with Enter', async () => {
    const { update, user } = setup();

    const input = await startRename(user);
    await user.clear(input);
    await user.type(input, 'Technology{Enter}');

    expect(update).toHaveBeenCalledWith({ id: 'c1', category_name: 'Technology' });
  });

  it('cancels with the cross and keeps the original name', async () => {
    const { update, user } = setup();

    const input = await startRename(user);
    await user.clear(input);
    await user.type(input, 'Typo');
    await user.click(screen.getByRole('button', { name: 'Cancel rename' }));

    expect(update).not.toHaveBeenCalled();
    expect(screen.getByText('Tech')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('cancels with Esc', async () => {
    const { update, user } = setup();

    const input = await startRename(user);
    await user.type(input, 'Typo{Escape}');

    expect(update).not.toHaveBeenCalled();
    expect(screen.getByText('Tech')).toBeInTheDocument();
  });

  it('closes without saving when the name did not change', async () => {
    const { update, user } = setup();

    await startRename(user);
    await user.click(screen.getByRole('button', { name: 'Save name' }));

    expect(update).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('edits only one row at a time', async () => {
    const { user } = setup();

    await startRename(user, 'Tech');
    await user.click(screen.getByRole('button', { name: 'Rename Healthcare' }));

    expect(screen.getAllByRole('textbox')).toHaveLength(1);
    expect(screen.getByRole('textbox')).toHaveValue('Healthcare');
    expect(screen.getByText('Tech')).toBeInTheDocument();
  });

  it('shows the error and stays in edit mode when the rename fails', async () => {
    const { user } = setup({
      update: rejectingTrigger({ status: 409, data: { message: 'A category named "Healthcare" already exists.' } }),
    });

    const input = await startRename(user);
    await user.clear(input);
    await user.type(input, 'healthcare{Enter}');

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('A category named "Healthcare" already exists.'));
    expect(screen.getByRole('textbox', { name: 'Category name' })).toHaveValue('healthcare');
  });

  it('opens the delete confirmation for the chosen category', async () => {
    const { user } = setup();

    await user.click(screen.getByRole('button', { name: 'Delete Healthcare' }));

    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('Delete "Healthcare"?')).toBeInTheDocument();
    expect(mockedUsage).toHaveBeenCalledWith('c2');
  });
});
