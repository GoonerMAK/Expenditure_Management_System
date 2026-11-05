import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { format } from 'date-fns';
import { toast } from 'sonner';
import AddProjectForm from '../../src/components/add-project-form';
import { useAddCategoryMutation, useGetCategoriesQuery } from '../../src/redux/category-api';
import { useAddProjectMutation } from '../../src/redux/project-api';
import { useGetUserAuthQuery } from '../../src/redux/user-api';
import { mutationResult, queryResult, rejectingTrigger, resolvingTrigger } from '../support/rtk';

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
  Toaster: () => null,
}));
jest.mock('../../src/redux/category-api', () => ({ useGetCategoriesQuery: jest.fn(), useAddCategoryMutation: jest.fn() }));
jest.mock('../../src/redux/project-api', () => ({ useAddProjectMutation: jest.fn() }));
jest.mock('../../src/redux/user-api', () => ({ useGetUserAuthQuery: jest.fn() }));

const mockedGetCategories = jest.mocked(useGetCategoriesQuery);
const mockedAddProject = jest.mocked(useAddProjectMutation);
const mockedGetUserAuth = jest.mocked(useGetUserAuthQuery);
const mockedAddCategory = jest.mocked(useAddCategoryMutation);

const categories = [
  { id: 'c1', category_name: 'Infrastructure', created_at: '', updated_at: '' },
  { id: 'c2', category_name: 'Healthcare', created_at: '', updated_at: '' },
];

type SetupOptions = { trigger?: jest.Mock; addCategory?: jest.Mock; authUser?: { user: { id: string; role_name?: string } } };

const setup = (options: SetupOptions = {}) => {
  const { trigger = resolvingTrigger({ id: 'p1' }), addCategory = resolvingTrigger({ id: 'c3', category_name: 'Education' }) } = options;
  const authUser = 'authUser' in options ? options.authUser : { user: { id: 'u1' } };
  mockedGetCategories.mockReturnValue(queryResult({ data: categories }));
  mockedGetUserAuth.mockReturnValue(queryResult({ data: authUser }));
  mockedAddProject.mockReturnValue(mutationResult(trigger));
  mockedAddCategory.mockReturnValue(mutationResult(addCategory));
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
  render(<AddProjectForm />);
  return { trigger, addCategory, user: userEvent.setup({ advanceTimers: jest.advanceTimersByTime }) };
};

describe('AddProjectForm', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('shows the form in an outlined section', () => {
    setup();

    expect(screen.getByRole('region', { name: 'Add a project' })).toHaveClass('border', 'border-section');
  });

  it('prefills both dates with today', () => {
    setup();
    const today = format(new Date(), 'PPP');

    expect(screen.getByRole('button', { name: 'Start Date of the Project' })).toHaveTextContent(today);
    expect(screen.getByRole('button', { name: 'End Date of the Project' })).toHaveTextContent(today);
  });

  it('shows the category placeholder until one is chosen', () => {
    setup();

    expect(screen.getByRole('combobox')).toHaveTextContent('Select category');
  });

  it('lists the categories in the picker', async () => {
    const { user } = setup();

    await user.click(screen.getByRole('combobox'));

    expect(await screen.findByRole('option', { name: 'Infrastructure' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Healthcare' })).toBeInTheDocument();
  });

  it('shows an empty message when there are no categories', async () => {
    const { user } = setup();
    mockedGetCategories.mockReturnValue(queryResult({ data: [] }));

    await user.click(screen.getByRole('combobox'));

    expect(await screen.findByText('No Category found')).toBeInTheDocument();
  });

  it('creates the project with the chosen category and the signed-in creator', async () => {
    const { trigger, user } = setup();

    await user.type(screen.getByLabelText('Project Name'), 'Bridge Renovation');
    await user.type(screen.getByLabelText('Description'), 'Renovate the river bridge');
    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: 'Healthcare' }));
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Project has been created'));
    expect(trigger).toHaveBeenCalledWith(
      expect.objectContaining({
        project_name: 'Bridge Renovation',
        description: 'Renovate the river bridge',
        category_id: 'c2',
        category_name: 'Healthcare',
        created_by_id: 'u1',
        start_date: expect.any(Date),
        end_date: expect.any(Date),
      }),
    );
  });

  it('shows the chosen category on the picker button', async () => {
    const { user } = setup();

    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: 'Infrastructure' }));

    expect(screen.getByRole('combobox')).toHaveTextContent('Infrastructure');
  });

  it('sends an empty creator id while the signed-in user is unknown', async () => {
    const { trigger, user } = setup({ authUser: undefined });

    await user.type(screen.getByLabelText('Project Name'), 'Bridge Renovation');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => expect(trigger).toHaveBeenCalledWith(expect.objectContaining({ created_by_id: '' })));
  });

  describe('adding a category from the picker', () => {
    const contributor = { user: { id: 'u1', role_name: 'Contributor' } };

    it('always shows the Add new category row at the bottom', async () => {
      const { user } = setup({ authUser: contributor });

      await user.click(screen.getByRole('combobox'));

      const options = await screen.findAllByRole('option');
      expect(options[options.length - 1]).toHaveTextContent('Add new category');
    });

    it('keeps the row while searching even when nothing matches', async () => {
      const { user } = setup({ authUser: contributor });

      await user.click(screen.getByRole('combobox'));
      await user.type(screen.getByPlaceholderText('Search or add...'), 'Educ');

      expect(screen.queryByRole('option', { name: 'Infrastructure' })).not.toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Create "Educ"' })).toBeInTheDocument();
    });

    it('moves focus to the search box to type a new name', async () => {
      const { user } = setup({ authUser: contributor });

      await user.click(screen.getByRole('combobox'));
      await user.click(await screen.findByRole('option', { name: 'Add new category' }));

      expect(screen.getByPlaceholderText('Search or add...')).toHaveFocus();
    });

    it('creates the typed category, selects it and keeps the rest of the form', async () => {
      const { trigger, addCategory, user } = setup({ authUser: contributor });

      await user.type(screen.getByLabelText('Project Name'), 'New School');
      await user.click(screen.getByRole('combobox'));
      await user.type(screen.getByPlaceholderText('Search or add...'), ' Education ');
      await user.click(screen.getByRole('option', { name: 'Create "Education"' }));

      expect(addCategory).toHaveBeenCalledWith({ category_name: 'Education' });
      await waitFor(() => expect(screen.getByRole('combobox')).toHaveTextContent('Education'));
      expect(toast.success).toHaveBeenCalledWith('Created "Education".');
      expect(screen.getByLabelText('Project Name')).toHaveValue('New School');

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() =>
        expect(trigger).toHaveBeenCalledWith(
          expect.objectContaining({ project_name: 'New School', category_id: 'c3', category_name: 'Education' }),
        ),
      );
    });

    it('says the name already exists instead of offering to create it', async () => {
      const { addCategory, user } = setup({ authUser: contributor });

      await user.click(screen.getByRole('combobox'));
      await user.type(screen.getByPlaceholderText('Search or add...'), 'healthcare');

      expect(screen.getByRole('option', { name: 'A category named "Healthcare" already exists.' })).toHaveAttribute(
        'aria-disabled',
        'true',
      );
      expect(screen.queryByRole('option', { name: /^Create/ })).not.toBeInTheDocument();
      expect(addCategory).not.toHaveBeenCalled();
    });

    it('shows the category error and keeps the picker open when creating fails', async () => {
      const { user } = setup({
        authUser: contributor,
        addCategory: rejectingTrigger({ status: 400, data: { message: 'Category name must be 3–20 characters.' } }),
      });

      await user.click(screen.getByRole('combobox'));
      await user.type(screen.getByPlaceholderText('Search or add...'), 'Ed');
      await user.click(screen.getByRole('option', { name: 'Create "Ed"' }));

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Category name must be 3–20 characters.'));
      expect(screen.getAllByRole('combobox')[0]).toHaveTextContent('Select category');
      expect(screen.getByRole('option', { name: 'Create "Ed"' })).toBeInTheDocument();
    });

    it('hides the row from Read-only users', async () => {
      const { user } = setup({ authUser: { user: { id: 'u1', role_name: 'Read-only' } } });

      await user.click(screen.getByRole('combobox'));
      await screen.findByRole('option', { name: 'Infrastructure' });

      expect(screen.queryByRole('option', { name: 'Add new category' })).not.toBeInTheDocument();
    });
  });

  it('shows an error toast when creation fails', async () => {
    const { user } = setup({ trigger: rejectingTrigger({ status: 500 }) });

    await user.type(screen.getByLabelText('Project Name'), 'Bridge Renovation');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Error creating project'));
    expect(toast.success).not.toHaveBeenCalled();
  });
});
