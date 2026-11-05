import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import AddCategoryForm from '../../src/components/add-category-form';
import { useAddCategoryMutation, useGetCategoriesQuery } from '../../src/redux/category-api';
import useAuth from '../../src/lib/use-auth';
import { mutationResult, queryResult, rejectingTrigger, resolvingTrigger } from '../support/rtk';

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
  Toaster: () => null,
}));
jest.mock('../../src/lib/use-auth');
jest.mock('../../src/redux/category-api', () => ({
  useGetCategoriesQuery: jest.fn(),
  useAddCategoryMutation: jest.fn(),
}));

const mockedGetCategories = jest.mocked(useGetCategoriesQuery);
const mockedAddCategory = jest.mocked(useAddCategoryMutation);
const mockedUseAuth = jest.mocked(useAuth);

const categories = [
  { id: 'c1', category_name: 'Infrastructure', created_at: '', updated_at: '' },
  { id: 'c2', category_name: 'Healthcare', created_at: '', updated_at: '' },
];

type SetupOptions = { trigger?: jest.Mock; isLoading?: boolean; data?: typeof categories };

const setup = (options: SetupOptions = {}) => {
  const { trigger = resolvingTrigger({ id: 'c3' }), isLoading = false } = options;
  const data = 'data' in options ? options.data : categories;
  const refetch = jest.fn();
  mockedUseAuth.mockReturnValue({ user: { id: 'u1', role_name: 'Read-only' }, loading: false } as never);
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

  it('says there are no categories when categories have not loaded', () => {
    setup({ data: undefined });

    expect(screen.queryAllByRole('cell')).toHaveLength(0);
    expect(screen.getByText('No categories yet')).toBeInTheDocument();
  });

  it('says there are no categories when the list is empty', () => {
    setup({ data: [] });

    expect(screen.getByText('No categories yet')).toBeInTheDocument();
  });

  it('puts the form and the list in their own outlined sections', () => {
    setup();

    const form = screen.getByRole('region', { name: 'Add a category' });
    const list = screen.getByRole('region', { name: 'Existing categories' });

    expect(form).toHaveClass('border', 'border-section');
    expect(list).toHaveClass('border', 'border-section');
    expect(form).toContainElement(screen.getByLabelText('Category Name'));
    expect(list).toContainElement(screen.getByRole('cell', { name: 'Infrastructure' }));
  });

  it('separates each category with a visible line', () => {
    setup();

    screen.getAllByRole('row').forEach((row) => expect(row).toHaveClass('border-b', 'border-section'));
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
    const { refetch, user } = setup({
      trigger: rejectingTrigger({ status: 409, data: { message: 'A category named "Tech" already exists.' } }),
    });

    await user.type(screen.getByLabelText('Category Name'), 'tech');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('A category named "Tech" already exists.'));
    expect(refetch).not.toHaveBeenCalled();
  });

  it('names the signed-in role when it cannot manage categories', async () => {
    const { user } = setup({ trigger: rejectingTrigger({ status: 403, data: { message: 'Access denied.' } }) });

    await user.type(screen.getByLabelText('Category Name'), 'Education');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Your role (Read-only) can't manage categories."));
  });

  it('explains a connection problem when the server cannot be reached', async () => {
    const { user } = setup({ trigger: rejectingTrigger({ status: 'FETCH_ERROR' }) });

    await user.type(screen.getByLabelText('Category Name'), 'Education');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Couldn't reach the server. Check your connection and try again."),
    );
  });

  it('never shows internal error text from a server crash', async () => {
    const { user } = setup({
      trigger: rejectingTrigger({ status: 500, data: { message: 'PrismaClientKnownRequestError: Unique constraint failed' } }),
    });

    await user.type(screen.getByLabelText('Category Name'), 'Education');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Something went wrong while saving the category. Try again.'),
    );
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
