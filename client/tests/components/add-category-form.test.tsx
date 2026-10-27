import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import AddCategoryForm from '../../src/components/add-category-form';
import { useAddCategoryMutation, useGetCategoriesQuery } from '../../src/redux/category-api';
import { mutationResult, queryResult, rejectingTrigger, resolvingTrigger } from '../support/rtk';

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
  Toaster: () => null,
}));
jest.mock('../../src/redux/category-api', () => ({
  useGetCategoriesQuery: jest.fn(),
  useAddCategoryMutation: jest.fn(),
}));

const mockedGetCategories = jest.mocked(useGetCategoriesQuery);
const mockedAddCategory = jest.mocked(useAddCategoryMutation);

const categories = [
  { id: 'c1', category_name: 'Infrastructure', created_at: '', updated_at: '' },
  { id: 'c2', category_name: 'Healthcare', created_at: '', updated_at: '' },
];

type SetupOptions = { trigger?: jest.Mock; isLoading?: boolean; data?: typeof categories };

const setup = (options: SetupOptions = {}) => {
  const { trigger = resolvingTrigger({ id: 'c3' }), isLoading = false } = options;
  const data = 'data' in options ? options.data : categories;
  const refetch = jest.fn();
  mockedGetCategories.mockReturnValue(queryResult({ data, refetch }));
  mockedAddCategory.mockReturnValue(mutationResult(trigger, { isLoading }));
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
  render(<AddCategoryForm />);
  return { trigger, refetch, user: userEvent.setup() };
};

describe('AddCategoryForm', () => {
  it('lists the existing categories', () => {
    setup();

    expect(screen.getByRole('cell', { name: 'Infrastructure' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Healthcare' })).toBeInTheDocument();
  });

  it('renders an empty table when categories have not loaded', () => {
    setup({ data: undefined });

    expect(screen.queryAllByRole('cell')).toHaveLength(0);
  });

  it('creates the category, confirms it and refetches the list', async () => {
    const { trigger, refetch, user } = setup();

    await user.type(screen.getByLabelText('Category Name'), 'Education');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Successfully created Category'));
    expect(trigger).toHaveBeenCalledWith({ category_name: 'Education' });
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('shows the server message when creation fails', async () => {
    const { refetch, user } = setup({ trigger: rejectingTrigger({ data: { message: 'Category name must be at least 3 characters long' } }) });

    await user.type(screen.getByLabelText('Category Name'), 'Ed');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Error: Category name must be at least 3 characters long'),
    );
    expect(refetch).not.toHaveBeenCalled();
  });

  it('shows a fallback message when the failure has no server message', async () => {
    const { user } = setup({ trigger: rejectingTrigger({ status: 'FETCH_ERROR' }) });

    await user.type(screen.getByLabelText('Category Name'), 'Education');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Error: Failed to create Category'));
  });

  it('submits an empty name because the form has no client-side rules', async () => {
    const { trigger, user } = setup();

    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => expect(trigger).toHaveBeenCalledWith({ category_name: '' }));
  });

  it('disables the submit button while the request is in flight', () => {
    setup({ isLoading: true });

    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();
  });
});
