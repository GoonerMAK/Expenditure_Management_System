import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SingleProject from '../../src/components/single-project-card';
import useAuth from '../../src/lib/use-auth';
import { useGetCategoriesQuery } from '../../src/redux/category-api';
import { useGetFinancialDataByIdQuery, useUpdateFinancialDataMutation } from '../../src/redux/financial-data-api';
import { useGetProjectByIdQuery, useUpdateProjectMutation } from '../../src/redux/project-api';
import { useGetUserAuthQuery } from '../../src/redux/user-api';
import { mutationResult, queryResult, rejectingTrigger, resolvingTrigger } from '../support/rtk';

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
  Toaster: () => null,
}));
jest.mock('../../src/lib/use-auth');
jest.mock('../../src/redux/category-api', () => ({ useGetCategoriesQuery: jest.fn() }));
jest.mock('../../src/redux/financial-data-api', () => ({
  useGetFinancialDataByIdQuery: jest.fn(),
  useUpdateFinancialDataMutation: jest.fn(),
}));
jest.mock('../../src/redux/project-api', () => ({
  useGetProjectByIdQuery: jest.fn(),
  useUpdateProjectMutation: jest.fn(),
}));
jest.mock('../../src/redux/user-api', () => ({ useGetUserAuthQuery: jest.fn() }));

const mockedUseAuth = jest.mocked(useAuth);
const mockedGetCategories = jest.mocked(useGetCategoriesQuery);
const mockedGetFinancial = jest.mocked(useGetFinancialDataByIdQuery);
const mockedUpdateFinancial = jest.mocked(useUpdateFinancialDataMutation);
const mockedGetProject = jest.mocked(useGetProjectByIdQuery);
const mockedUpdateProject = jest.mocked(useUpdateProjectMutation);
const mockedGetUserAuth = jest.mocked(useGetUserAuthQuery);

const project = {
  id: 'p1',
  project_name: 'Bridge Renovation',
  description: 'Renovate the river bridge',
  category_id: 'c1',
  category_name: 'Infrastructure',
  start_date: '2026-02-01T12:00:00.000Z',
  end_date: '2026-12-31T12:00:00.000Z',
};

const financialData = { year: 2026, month: 3, expenditure: 1500.5, initial_budget: 10000, revised_budget: 12000 };

type SetupOptions = {
  role?: string;
  projectQuery?: Record<string, unknown>;
  financialQuery?: Record<string, unknown>;
  updateProject?: jest.Mock;
  updateFinancial?: jest.Mock;
};

const setup = ({
  role = 'Contributor',
  projectQuery = { data: project },
  financialQuery = { data: financialData },
  updateProject = resolvingTrigger({}),
  updateFinancial = resolvingTrigger({}),
}: SetupOptions = {}) => {
  mockedUseAuth.mockReturnValue({ user: { id: 'u1', role_name: role }, loading: false });
  mockedGetProject.mockReturnValue(queryResult(projectQuery));
  mockedGetFinancial.mockReturnValue(queryResult(financialQuery));
  mockedGetCategories.mockReturnValue(queryResult({ data: [{ id: 'c1', category_name: 'Infrastructure' }] }));
  mockedGetUserAuth.mockReturnValue(queryResult({ data: { user: { id: 'u1' } } }));
  mockedUpdateProject.mockReturnValue(mutationResult(updateProject));
  mockedUpdateFinancial.mockReturnValue(mutationResult(updateFinancial));
  jest.spyOn(console, 'log').mockImplementation(() => undefined);

  render(
    <MemoryRouter initialEntries={['/projects/p1']}>
      <Routes>
        <Route path="/projects/:id" element={<SingleProject />} />
      </Routes>
    </MemoryRouter>,
  );
  return { updateProject, updateFinancial, user: userEvent.setup() };
};

describe('SingleProject (single project card)', () => {
  it('loads the project and its financial data using the route id', () => {
    setup();

    expect(mockedGetProject).toHaveBeenCalledWith('p1');
    expect(mockedGetFinancial).toHaveBeenCalledWith('p1');
  });

  it('shows a loading state while the project loads', () => {
    setup({ projectQuery: { isLoading: true } });

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows a loading state while financial data loads', () => {
    setup({ financialQuery: { isLoading: true } });

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows an error when the project fails to load', () => {
    setup({ projectQuery: { error: { status: 404 } } });

    expect(screen.getByText('Error loading project')).toBeInTheDocument();
  });

  it('shows an error when financial data fails to load', () => {
    setup({ financialQuery: { error: { status: 500 } } });

    expect(screen.getByText('Error loading project')).toBeInTheDocument();
  });

  it('fills in the financial fields', async () => {
    setup();

    await waitFor(() => expect(screen.getByLabelText('Year')).toHaveValue(2026));
    expect(screen.getByLabelText('Month')).toHaveValue(3);
    expect(screen.getByLabelText('Expenditure')).toHaveValue(1500.5);
    expect(screen.getByLabelText('Initial Budget')).toHaveValue(10000);
    expect(screen.getByLabelText('Revised Budget')).toHaveValue(12000);
  });

  it('keeps the project fields after the financial data fills in', async () => {
    setup();

    await waitFor(() => expect(screen.getByLabelText('Year')).toHaveValue(2026));
    expect(screen.getByLabelText('Project Name')).toHaveValue('Bridge Renovation');
    expect(screen.getByLabelText('Description')).toHaveValue('Renovate the river bridge');
  });

  it('shows an empty description when the project has none', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    setup({ projectQuery: { data: { ...project, description: null } } });

    await waitFor(() => expect(screen.getByLabelText('Project Name')).toHaveValue('Bridge Renovation'));
    expect(screen.getByLabelText('Description')).toHaveValue('');
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('starts read-only with no Update button', () => {
    setup();

    expect(screen.getByLabelText('Project Name')).toBeDisabled();
    expect(screen.getByLabelText('Expenditure')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Update' })).not.toBeInTheDocument();
  });

  it('hides the Edit button from Read-only users', () => {
    setup({ role: 'Read-only' });

    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
  });

  it.each(['Contributor', 'Administrator'])('lets a %s enable editing', async (role) => {
    const { user } = setup({ role });

    await user.click(screen.getByRole('button', { name: 'Edit' }));

    expect(screen.getByLabelText('Project Name')).toBeEnabled();
    expect(screen.getByLabelText('Expenditure')).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Update' })).toBeInTheDocument();
  });

  it('saves the project and the parsed financial data together', async () => {
    const { updateProject, updateFinancial, user } = setup();
    await waitFor(() => expect(screen.getByLabelText('Year')).toHaveValue(2026));

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.clear(screen.getByLabelText('Expenditure'));
    await user.type(screen.getByLabelText('Expenditure'), '2000.25');
    await user.clear(screen.getByLabelText('Month'));
    await user.type(screen.getByLabelText('Month'), '4');
    await user.click(screen.getByRole('button', { name: 'Update' }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Project updated successfully'));
    expect(updateProject).toHaveBeenCalledWith({ id: 'p1', data: expect.any(Object) });
    expect(updateFinancial).toHaveBeenCalledWith({
      id: 'p1',
      data: { year: 2026, month: 4, expenditure: 2000.25, initial_budget: 10000, revised_budget: 12000 },
    });
  });

  it('reports a failure when either update is rejected', async () => {
    const { user } = setup({ updateFinancial: rejectingTrigger({ status: 500 }) });
    await waitFor(() => expect(screen.getByLabelText('Year')).toHaveValue(2026));

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.click(screen.getByRole('button', { name: 'Update' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to update project'));
    expect(toast.success).not.toHaveBeenCalled();
  });
});
