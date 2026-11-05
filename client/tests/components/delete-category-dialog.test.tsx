import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import DeleteCategoryDialog from '../../src/components/delete-category-dialog';
import { useDeleteCategoryMutation, useGetCategoryUsageQuery } from '../../src/redux/category-api';
import { mutationResult, queryResult, rejectingTrigger, resolvingTrigger } from '../support/rtk';

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));
jest.mock('../../src/redux/category-api', () => ({
  useDeleteCategoryMutation: jest.fn(),
  useGetCategoryUsageQuery: jest.fn(),
}));

const mockedDelete = jest.mocked(useDeleteCategoryMutation);
const mockedUsage = jest.mocked(useGetCategoryUsageQuery);

const category = { id: 'c1', category_name: 'Tech', created_at: '', updated_at: '' };

const usageOf = (projectNames: string[], financial_record_count: number) => ({
  category_id: 'c1',
  category_name: 'Tech',
  project_count: projectNames.length,
  projects: projectNames.map((project_name, i) => ({ id: `p${i}`, project_name })),
  financial_record_count,
});

const setup = (usage: Record<string, unknown>, trigger = resolvingTrigger({ id: 'c1' })) => {
  mockedUsage.mockReturnValue(queryResult(usage));
  mockedDelete.mockReturnValue(mutationResult(trigger));
  const onClose = jest.fn();
  render(<DeleteCategoryDialog category={category} roleName="Contributor" onClose={onClose} />);
  return { trigger, onClose, user: userEvent.setup() };
};

describe('DeleteCategoryDialog', () => {
  it('asks a simple question for a category nothing uses', () => {
    setup({ data: usageOf([], 0) });

    expect(screen.getByText('Delete "Tech"?')).toBeInTheDocument();
    expect(screen.getByText("This can't be undone.")).toBeInTheDocument();
  });

  it('names every affected project and says nothing else is deleted', () => {
    setup({ data: usageOf(['Website Revamp', 'Mobile App', 'Data Platform'], 14) });

    expect(screen.getByText('"Tech" is used by 3 projects')).toBeInTheDocument();
    ['Website Revamp', 'Mobile App', 'Data Platform'].forEach((name) => {
      expect(screen.getByText(name).tagName).toBe('LI');
    });
    expect(screen.getByText(/These projects and their 14 financial records/)).toBeInTheDocument();
    expect(screen.getByText("won't be deleted")).toBeInTheDocument();
    expect(screen.getByText('without a category')).toBeInTheDocument();
  });

  it('uses the singular for one project and one record', () => {
    setup({ data: usageOf(['Website Revamp'], 1) });

    expect(screen.getByText('"Tech" is used by 1 project')).toBeInTheDocument();
    expect(screen.getByText(/their 1 financial record /)).toBeInTheDocument();
  });

  it('shows the first 5 projects and how many more there are', () => {
    setup({ data: usageOf(['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7'], 9) });

    expect(screen.getAllByRole('listitem')).toHaveLength(6);
    expect(screen.getByText('A5')).toBeInTheDocument();
    expect(screen.queryByText('A6')).not.toBeInTheDocument();
    expect(screen.getByText('+2 more')).toBeInTheDocument();
  });

  it('waits for the usage check before allowing the delete', () => {
    setup({ isLoading: true });

    expect(screen.getByText('Checking where this category is used…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete category' })).toBeDisabled();
  });

  it('blocks the delete when the usage check fails', () => {
    setup({ error: { status: 500 } });

    expect(screen.getByText("Couldn't check what uses this category. Try again.")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete category' })).toBeDisabled();
  });

  it('says when the category is already gone', () => {
    setup({ error: { status: 404 } });

    expect(screen.getByText('This category no longer exists. Refresh the list.')).toBeInTheDocument();
  });

  it('deletes the category, confirms it and closes', async () => {
    const { trigger, onClose, user } = setup({ data: usageOf(['Website Revamp'], 2) });

    await user.click(screen.getByRole('button', { name: 'Delete category' }));

    expect(trigger).toHaveBeenCalledWith('c1');
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Deleted "Tech".'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows the error when the delete fails', async () => {
    const { onClose, user } = setup({ data: usageOf([], 0) }, rejectingTrigger({ status: 403 }));

    await user.click(screen.getByRole('button', { name: 'Delete category' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Your role (Contributor) can't manage categories."));
    expect(onClose).toHaveBeenCalled();
  });

  it('closes on Cancel without deleting', async () => {
    const { trigger, onClose, user } = setup({ data: usageOf([], 0) });

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(trigger).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
