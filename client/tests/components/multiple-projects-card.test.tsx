import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import ShowProjects from '../../src/components/multiple-projects-card';
import { useGetBudgetSummaryQuery, useGetProjectOwnersQuery, useGetProjectsQuery } from '../../src/redux/project-api';
import { useGetCategoriesQuery } from '../../src/redux/category-api';
import { useGetUsersQuery } from '../../src/redux/user-api';
import { queryResult } from '../support/rtk';

jest.mock('../../src/redux/project-api', () => ({
  useGetProjectsQuery: jest.fn(),
  useGetBudgetSummaryQuery: jest.fn(),
  useGetProjectOwnersQuery: jest.fn(),
}));
jest.mock('../../src/redux/category-api', () => ({ useGetCategoriesQuery: jest.fn() }));
jest.mock('../../src/redux/user-api', () => ({ useGetUsersQuery: jest.fn() }));

const mockedGetProjects = jest.mocked(useGetProjectsQuery);
const mockedGetUsers = jest.mocked(useGetUsersQuery);
const mockedGetSummary = jest.mocked(useGetBudgetSummaryQuery);
const mockedGetOwners = jest.mocked(useGetProjectOwnersQuery);
const mockedGetCategories = jest.mocked(useGetCategoriesQuery);

const project = (overrides: Record<string, unknown> = {}) => ({
  id: 'p1',
  project_name: 'Bridge Renovation',
  description: 'Renovate the river bridge',
  category_id: 'c1',
  category_name: 'Infrastructure',
  start_date: '2026-02-01T12:00:00.000Z',
  end_date: '2026-12-31T12:00:00.000Z',
  created_by_id: 'u1',
  created_at: '2026-01-15T12:00:00.000Z',
  updated_at: '2026-01-20T12:00:00.000Z',
  ...overrides,
});

const page = (data: unknown[], totalItems = data.length) => ({
  data,
  pagination: { offset: 0, limit: 6, totalItems, totalPages: Math.ceil(totalItems / 6), hasMore: false },
});

const totals = (overrides: Record<string, unknown> = {}) => ({
  budget: 5000,
  spent: 1500,
  remaining: 3500,
  percent_used: 30,
  over_budget: false,
  ...overrides,
});

const summary = (projectOverrides: Record<string, unknown> = {}) => ({
  overall: { ...totals(), over_budget_count: 0 },
  projects: [{ project_id: 'p1', project_name: 'Bridge Renovation', ...totals(projectOverrides) }],
});

const LocationSearch = () => <output aria-label="Current query">{useLocation().search}</output>;

const currentQuery = () => screen.getByRole('status', { name: 'Current query' }).textContent;

const renderCard = (entry = '/dashboard') =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/dashboard" element={<><ShowProjects /><LocationSearch /></>} />
        <Route path="/projects/:id" element={<p>Project detail</p>} />
        <Route path="/add-project" element={<p>Add project page</p>} />
      </Routes>
    </MemoryRouter>,
  );

describe('ShowProjects (multiple projects card)', () => {
  beforeEach(() => {
    mockedGetUsers.mockReturnValue(queryResult({ data: [{ id: 'u1', username: 'jdoe' }] }));
    mockedGetProjects.mockReturnValue(queryResult({ data: page([project()]) }));
    mockedGetSummary.mockReturnValue(queryResult({ data: summary() }));
    mockedGetOwners.mockReturnValue(queryResult({ data: [{ id: 'u1', display_name: 'jdoe' }] }));
    mockedGetCategories.mockReturnValue(queryResult({ data: [{ id: 'c1', category_name: 'Infrastructure' }] }));
  });

  it('shows a loading state while projects load', () => {
    mockedGetProjects.mockReturnValue(queryResult({ isLoading: true }));

    renderCard();

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows a loading state while users load', () => {
    mockedGetUsers.mockReturnValue(queryResult({ isLoading: true }));

    renderCard();

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('requests the first page of six projects', () => {
    renderCard();

    expect(mockedGetProjects).toHaveBeenLastCalledWith({ offset: 0, limit: 6 });
  });

  it('shows an empty state with a link to add a project', async () => {
    mockedGetProjects.mockReturnValue(queryResult({ data: page([]) }));
    renderCard();

    expect(screen.getByText('You have no projects')).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Add Project' }));
    expect(screen.getByText('Add project page')).toBeInTheDocument();
  });

  it('shows the empty state when the response has no data', () => {
    mockedGetProjects.mockReturnValue(queryResult({ data: undefined }));

    renderCard();

    expect(screen.getByText('You have no projects')).toBeInTheDocument();
  });

  it('renders the project details', () => {
    renderCard();

    const card = screen.getByRole('heading', { name: 'Bridge Renovation' }).closest('.p-6') as HTMLElement;
    expect(within(card).getByText('Renovate the river bridge')).toBeInTheDocument();
    expect(within(card).getByText('Category: Infrastructure')).toBeInTheDocument();
    expect(within(card).getByText('Created by: jdoe')).toBeInTheDocument();
    expect(within(card).getByText('Start Date: 1 February 2026')).toBeInTheDocument();
    expect(within(card).getByText('Created Date: 15 January 2026')).toBeInTheDocument();
    expect(within(card).getByText('Updated Date: 20 January 2026')).toBeInTheDocument();
  });

  it('shows N/A when the creator is not among the users', () => {
    mockedGetProjects.mockReturnValue(queryResult({ data: page([project({ created_by_id: 'unknown' })]) }));

    renderCard();

    expect(screen.getByText('Created by: N/A')).toBeInTheDocument();
  });

  it('shows "Not specified" for a missing start date', () => {
    mockedGetProjects.mockReturnValue(queryResult({ data: page([project({ start_date: null })]) }));

    renderCard();

    expect(screen.getByText('Start Date: Not specified')).toBeInTheDocument();
  });

  it('shows Uncategorised for a project whose category was deleted', () => {
    mockedGetProjects.mockReturnValue(queryResult({ data: page([project({ category_id: null, category_name: '' })]) }));

    renderCard();

    expect(screen.getByText('Category: Uncategorised')).toBeInTheDocument();
  });

  it('links each project to its detail page', async () => {
    renderCard();

    await userEvent.setup().click(screen.getByRole('button', { name: 'View' }));

    expect(screen.getByText('Project detail')).toBeInTheDocument();
  });

  it('hides pagination when everything fits on one page', () => {
    renderCard();

    expect(screen.queryByRole('navigation', { name: 'pagination' })).not.toBeInTheDocument();
  });

  it('requests the next offset when another page is chosen', async () => {
    mockedGetProjects.mockReturnValue(queryResult({ data: page([project()], 13) }));
    renderCard();

    await userEvent.setup().click(screen.getByRole('link', { name: '3' }));

    expect(mockedGetProjects).toHaveBeenLastCalledWith({ offset: 12, limit: 6 });
    expect(currentQuery()).toBe('?page=3');
  });

  describe('filters', () => {
    it('reads the filters and page from the URL', () => {
      renderCard('/dashboard?search=bridge&category=c1&owner=u1&from=2026-01-01&to=2026-06-30&sort=spend_desc&page=2');

      expect(mockedGetProjects).toHaveBeenLastCalledWith({
        offset: 6,
        limit: 6,
        search: 'bridge',
        category: 'c1',
        owner: 'u1',
        from: '2026-01-01',
        to: '2026-06-30',
        sort: 'spend_desc',
      });
      expect(screen.getByLabelText('Search projects')).toHaveValue('bridge');
      expect(screen.getByLabelText('Category')).toHaveTextContent('Infrastructure');
      expect(screen.getByLabelText('Owner')).toHaveTextContent('jdoe');
      expect(screen.getByLabelText('Sort')).toHaveTextContent('Total spend highest');
    });

    it('ignores an unknown sort in the URL', () => {
      renderCard('/dashboard?sort=budget');

      expect(mockedGetProjects).toHaveBeenLastCalledWith({ offset: 0, limit: 6 });
    });

    it('puts a chosen filter in the URL and returns to the first page', async () => {
      renderCard('/dashboard?page=2');

      await userEvent.setup().click(screen.getByLabelText('Category'));
      await userEvent.setup().click(screen.getByRole('option', { name: 'Infrastructure' }));

      expect(currentQuery()).toBe('?category=c1');
      expect(mockedGetProjects).toHaveBeenLastCalledWith({ offset: 0, limit: 6, category: 'c1' });
    });

    it('puts the search text in the URL after typing stops', async () => {
      renderCard();

      await userEvent.setup().type(screen.getByLabelText('Search projects'), 'road');

      await waitFor(() => expect(currentQuery()).toBe('?search=road'));
      expect(mockedGetProjects).toHaveBeenLastCalledWith({ offset: 0, limit: 6, search: 'road' });
    });

    it('lists the owners from the owners endpoint', async () => {
      renderCard();

      await userEvent.setup().click(screen.getByLabelText('Owner'));

      expect(screen.getByRole('option', { name: 'jdoe' })).toBeInTheDocument();
    });

    it('shows no owner or category options while they load', async () => {
      mockedGetOwners.mockReturnValue(queryResult({ data: undefined }));
      mockedGetCategories.mockReturnValue(queryResult({ data: undefined }));
      renderCard();

      await userEvent.setup().click(screen.getByLabelText('Owner'));

      expect(screen.getAllByRole('option')).toHaveLength(1);
    });

    it('keeps the clear button disabled when no filter is set', () => {
      renderCard('/dashboard?page=2');

      expect(screen.getByRole('button', { name: 'Clear filters' })).toBeDisabled();
    });

    it('clears every filter and the page from the URL', async () => {
      renderCard('/dashboard?search=bridge&sort=name_asc&page=2');

      await userEvent.setup().click(screen.getByRole('button', { name: 'Clear filters' }));

      expect(currentQuery()).toBe('');
      expect(screen.getByLabelText('Search projects')).toHaveValue('');
      expect(mockedGetProjects).toHaveBeenLastCalledWith({ offset: 0, limit: 6 });
    });

    it('shows a filtered empty state with a clear button when nothing matches', async () => {
      mockedGetProjects.mockReturnValue(queryResult({ data: page([]) }));
      renderCard('/dashboard?search=nothing');

      expect(screen.getByRole('heading', { name: 'No projects match your filters' })).toBeInTheDocument();
      expect(screen.queryByText('You have no projects')).not.toBeInTheDocument();

      const clearButtons = screen.getAllByRole('button', { name: 'Clear filters' });
      await userEvent.setup().click(clearButtons[clearButtons.length - 1]);

      expect(currentQuery()).toBe('');
      expect(screen.getByText('You have no projects')).toBeInTheDocument();
    });
  });

  describe('budget', () => {
    it('refetches the summary each time the dashboard opens', () => {
      renderCard();

      expect(mockedGetSummary).toHaveBeenCalledWith(undefined, { refetchOnMountOrArgChange: true });
    });

    it('shows the overall budget tiles', () => {
      renderCard();

      const section = screen.getByRole('region', { name: 'Budget summary' });
      const tile = (title: string) => within(section).getByText(title).closest('.rounded-lg');
      expect(tile('Total Budget')).toHaveTextContent('5,000');
      expect(tile('Total Spent')).toHaveTextContent('1,500');
      expect(tile('Remaining')).toHaveTextContent('3,500');
      expect(tile('Budget Used')).toHaveTextContent('30%');
      expect(within(section).queryByText(/over budget/)).not.toBeInTheDocument();
    });

    it('shows spending on each project card', () => {
      renderCard();

      expect(screen.getByText(/Spent 1,500 of 5,000 \(30%\)/)).toHaveTextContent('Remaining 3,500');
      expect(screen.queryByText('Over budget')).not.toBeInTheDocument();
    });

    it('marks over-budget projects and counts them overall', () => {
      mockedGetSummary.mockReturnValue(
        queryResult({
          data: {
            overall: { ...totals({ spent: 6000, remaining: -1000, percent_used: 120, over_budget: true }), over_budget_count: 1 },
            projects: [
              { project_id: 'p1', project_name: 'Bridge Renovation', ...totals({ spent: 6000, remaining: -1000, percent_used: 120, over_budget: true }) },
            ],
          },
        }),
      );

      renderCard();

      expect(screen.getByText('Over budget')).toBeInTheDocument();
      expect(screen.getByText('1 project over budget')).toBeInTheDocument();
      expect(screen.getByText('-1,000')).toHaveClass('text-destructive');
    });

    it('uses the plural when several projects are over budget', () => {
      mockedGetSummary.mockReturnValue(
        queryResult({ data: { ...summary(), overall: { ...totals(), over_budget_count: 2 } } }),
      );

      renderCard();

      expect(screen.getByText('2 projects over budget')).toBeInTheDocument();
    });

    it('shows N/A for percent used when a project has no budget', () => {
      mockedGetSummary.mockReturnValue(queryResult({ data: summary({ budget: 0, spent: 0, remaining: 0, percent_used: null }) }));

      renderCard();

      expect(screen.getByText(/Spent 0 of 0 \(N\/A\)/)).toBeInTheDocument();
    });

    it('still lists projects while the summary is loading', () => {
      mockedGetSummary.mockReturnValue(queryResult({ data: undefined, isLoading: true }));

      renderCard();

      expect(screen.getByRole('heading', { name: 'Bridge Renovation' })).toBeInTheDocument();
      expect(screen.queryByRole('region', { name: 'Budget summary' })).not.toBeInTheDocument();
      expect(screen.queryByText(/Spent/)).not.toBeInTheDocument();
    });

    it('shows an error with a retry button when the summary fails to load', async () => {
      const refetch = jest.fn();
      mockedGetSummary.mockReturnValue(queryResult({ data: undefined, isError: true, refetch }));

      renderCard();

      expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load the budget summary.");
      expect(screen.getByRole('heading', { name: 'Bridge Renovation' })).toBeInTheDocument();
      await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }));
      expect(refetch).toHaveBeenCalledTimes(1);
    });
  });
});
