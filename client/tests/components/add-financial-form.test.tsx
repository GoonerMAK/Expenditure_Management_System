import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import AddFinancialForm from '../../src/components/add-financial-form';
import { useAddFinancialDataMutation } from '../../src/redux/financial-data-api';
import { useGetProjectsQuery } from '../../src/redux/project-api';
import { mutationResult, queryResult, resolvingTrigger } from '../support/rtk';

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
  Toaster: () => null,
}));
jest.mock('../../src/redux/financial-data-api', () => ({ useAddFinancialDataMutation: jest.fn() }));
jest.mock('../../src/redux/project-api', () => ({ useGetProjectsQuery: jest.fn() }));

const mockedGetProjects = jest.mocked(useGetProjectsQuery);
const mockedAddFinancial = jest.mocked(useAddFinancialDataMutation);

const paginatedProjects = {
  data: [
    { id: 'p1', project_name: 'Bridge Renovation' },
    { id: 'p2', project_name: 'School Expansion' },
  ],
  pagination: { offset: 0, limit: 6, totalItems: 2, totalPages: 1, hasMore: false },
};

const setup = (projectsQuery: Record<string, unknown> = {}) => {
  const trigger = resolvingTrigger({});
  mockedGetProjects.mockReturnValue(queryResult(projectsQuery));
  mockedAddFinancial.mockReturnValue(mutationResult(trigger));
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
  render(<AddFinancialForm />);
  return { trigger, user: userEvent.setup({ advanceTimers: jest.advanceTimersByTime }) };
};

describe('AddFinancialForm', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('defaults the year and month to the current date, amounts to zero and leaves the revised budget empty', () => {
    setup();
    const now = new Date();

    expect(screen.getByLabelText('Year')).toHaveValue(now.getFullYear());
    expect(screen.getByLabelText('Month')).toHaveValue(now.getMonth() + 1);
    expect(screen.getByLabelText('Expenditure')).toHaveValue(0);
    expect(screen.getByLabelText('Initial Budget')).toHaveValue(0);
    expect(screen.getByLabelText('Revised Budget')).toHaveValue(null);
  });

  it('constrains the month input to 1-12', () => {
    setup();

    expect(screen.getByLabelText('Month')).toHaveAttribute('min', '1');
    expect(screen.getByLabelText('Month')).toHaveAttribute('max', '12');
  });

  it('notifies the user when projects fail to load', async () => {
    setup({ error: { status: 500 } });

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to fetch projects'));
  });

  it('refuses to submit without a selected project', async () => {
    const { trigger, user } = setup();

    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Selected project not found. Please select a valid project.'),
    );
    expect(trigger).not.toHaveBeenCalled();
  });

  it('requests projects with pagination arguments the endpoint requires', () => {
    setup();

    expect(mockedGetProjects).toHaveBeenCalledWith(expect.objectContaining({ offset: expect.any(Number) }));
  });

  it('renders the project picker from the paginated projects response', () => {
    setup({ data: paginatedProjects });

    expect(screen.getByRole('button', { name: /select project/i })).toBeInTheDocument();
  });

  it('submits parsed amounts for the selected project', async () => {
    const { trigger, user } = setup({ data: paginatedProjects });

    await user.click(screen.getByRole('button', { name: /select project/i }));
    await user.click(await screen.findByRole('option', { name: 'School Expansion' }));
    await user.clear(screen.getByLabelText('Expenditure'));
    await user.type(screen.getByLabelText('Expenditure'), '1500.75');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() =>
      expect(trigger).toHaveBeenCalledWith(
        expect.objectContaining({ project_id: 'p2', project_name: 'School Expansion', expenditure: 1500.75 }),
      ),
    );
  });

  it('sends no revised budget when the field is left empty', async () => {
    const { trigger, user } = setup({ data: paginatedProjects });

    await user.click(screen.getByRole('button', { name: /select project/i }));
    await user.click(await screen.findByRole('option', { name: 'School Expansion' }));
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => expect(trigger).toHaveBeenCalledWith(expect.objectContaining({ revised_budget: null })));
  });

  it('sends a revised budget of zero when zero is typed', async () => {
    const { trigger, user } = setup({ data: paginatedProjects });

    await user.click(screen.getByRole('button', { name: /select project/i }));
    await user.click(await screen.findByRole('option', { name: 'School Expansion' }));
    await user.type(screen.getByLabelText('Revised Budget'), '0');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => expect(trigger).toHaveBeenCalledWith(expect.objectContaining({ revised_budget: 0 })));
  });
});
