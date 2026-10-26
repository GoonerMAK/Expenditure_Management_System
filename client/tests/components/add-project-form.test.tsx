import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { format } from 'date-fns';
import { toast } from 'sonner';
import AddProjectForm from '../../src/components/add-project-form';
import { useGetCategoriesQuery } from '../../src/redux/category-api';
import { useAddProjectMutation } from '../../src/redux/project-api';
import { useGetUserAuthQuery } from '../../src/redux/user-api';
import { mutationResult, queryResult, rejectingTrigger, resolvingTrigger } from '../support/rtk';

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
  Toaster: () => null,
}));
jest.mock('../../src/redux/category-api', () => ({ useGetCategoriesQuery: jest.fn() }));
jest.mock('../../src/redux/project-api', () => ({ useAddProjectMutation: jest.fn() }));
jest.mock('../../src/redux/user-api', () => ({ useGetUserAuthQuery: jest.fn() }));

const mockedGetCategories = jest.mocked(useGetCategoriesQuery);
const mockedAddProject = jest.mocked(useAddProjectMutation);
const mockedGetUserAuth = jest.mocked(useGetUserAuthQuery);

const categories = [
  { id: 'c1', category_name: 'Infrastructure', created_at: '', updated_at: '' },
  { id: 'c2', category_name: 'Healthcare', created_at: '', updated_at: '' },
];

type SetupOptions = { trigger?: jest.Mock; authUser?: { user: { id: string } } };

const setup = (options: SetupOptions = {}) => {
  const { trigger = resolvingTrigger({ id: 'p1' }) } = options;
  const authUser = 'authUser' in options ? options.authUser : { user: { id: 'u1' } };
  mockedGetCategories.mockReturnValue(queryResult({ data: categories }));
  mockedGetUserAuth.mockReturnValue(queryResult({ data: authUser }));
  mockedAddProject.mockReturnValue(mutationResult(trigger));
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
  render(<AddProjectForm />);
  return { trigger, user: userEvent.setup({ advanceTimers: jest.advanceTimersByTime }) };
};

describe('AddProjectForm', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
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

  it('shows an error toast when creation fails', async () => {
    const { user } = setup({ trigger: rejectingTrigger({ status: 500 }) });

    await user.type(screen.getByLabelText('Project Name'), 'Bridge Renovation');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Error creating project'));
    expect(toast.success).not.toHaveBeenCalled();
  });
});
