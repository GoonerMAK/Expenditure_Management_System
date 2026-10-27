import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Analytics from '../../src/pages/analytics';
import {
  useGetBudgetByCategoryQuery,
  useGetBudgetSummaryQuery,
  useGetProjectTrendQuery,
} from '../../src/redux/project-api';
import { queryResult } from '../support/rtk';

jest.mock('recharts', () => jest.requireActual('../support/recharts').fixedSizeRecharts());
jest.mock('../../src/components/sidebar', () => () => <nav>Sidebar</nav>);
jest.mock('../../src/components/header', () => () => <header>Header</header>);
jest.mock('../../src/redux/project-api', () => ({
  useGetBudgetByCategoryQuery: jest.fn(),
  useGetBudgetSummaryQuery: jest.fn(),
  useGetProjectTrendQuery: jest.fn(),
}));

const mockedCategories = jest.mocked(useGetBudgetByCategoryQuery);
const mockedSummary = jest.mocked(useGetBudgetSummaryQuery);
const mockedTrend = jest.mocked(useGetProjectTrendQuery);

const totals = { budget: 0, spent: 0, remaining: 0, percent_used: null, over_budget: false };
const summary = {
  overall: { ...totals, over_budget_count: 0 },
  projects: [
    { project_id: 'p1', project_name: 'Bridge', ...totals },
    { project_id: 'p2', project_name: 'School', ...totals },
  ],
};
const trend = {
  project_id: 'p1',
  project_name: 'Bridge',
  monthly: [
    { year: 2025, month: 12, budget: 500, spent: 100 },
    { year: 2026, month: 3, budget: 1000, spent: 1200 },
  ],
  yearly: [
    { year: 2025, budget: 500, spent: 100 },
    { year: 2026, budget: 1000, spent: 1200 },
  ],
};

const chartCard = (title: string) => screen.getByText(title).closest('.rounded-lg') as HTMLElement;

describe('Analytics page', () => {
  beforeEach(() => {
    mockedCategories.mockReturnValue(
      queryResult({ data: [{ category_id: 'c1', category_name: 'Roads', budget: 3000, spent: 700 }] }),
    );
    mockedSummary.mockReturnValue(queryResult({ data: summary }));
    mockedTrend.mockReturnValue(queryResult({ data: trend }));
  });

  it('refetches all data each time the page opens', () => {
    render(<Analytics />);

    expect(mockedCategories).toHaveBeenCalledWith(undefined, { refetchOnMountOrArgChange: true });
    expect(mockedSummary).toHaveBeenCalledWith(undefined, { refetchOnMountOrArgChange: true });
  });

  it('shows the category chart with its data in the table view', async () => {
    render(<Analytics />);

    await userEvent.setup().click(
      (chartCard('Spending by category').querySelector('button') as HTMLElement),
    );

    expect(screen.getByRole('table')).toHaveTextContent('Roads3,000700');
  });

  it('shows the first project trend by month by default', async () => {
    render(<Analytics />);

    expect(mockedTrend).toHaveBeenLastCalledWith('p1', { skip: false, refetchOnMountOrArgChange: true });
    expect(screen.getByLabelText('Project')).toHaveValue('p1');
    const card = chartCard('Monthly budget vs spent');
    await userEvent.setup().click(card.querySelector('button') as HTMLElement);
    expect(screen.getByRole('table')).toHaveTextContent('Dec 2025500100');
    expect(screen.getByRole('table')).toHaveTextContent('Mar 20261,0001,200');
  });

  it('switches to the yearly view', async () => {
    const user = userEvent.setup();
    render(<Analytics />);

    await user.click(screen.getByRole('tab', { name: 'Yearly' }));
    await user.click(chartCard('Yearly budget vs spent').querySelector('button') as HTMLElement);

    expect(screen.getByRole('table')).toHaveTextContent('20261,0001,200');
  });

  it('loads the trend for the chosen project', async () => {
    render(<Analytics />);

    await userEvent.setup().selectOptions(screen.getByLabelText('Project'), 'p2');

    expect(mockedTrend).toHaveBeenLastCalledWith('p2', { skip: false, refetchOnMountOrArgChange: true });
  });

  it('skips the trend request and says so when there are no projects', () => {
    mockedSummary.mockReturnValue(queryResult({ data: { ...summary, projects: [] } }));
    mockedTrend.mockReturnValue(queryResult({ data: undefined }));

    render(<Analytics />);

    expect(mockedTrend).toHaveBeenLastCalledWith('', { skip: true, refetchOnMountOrArgChange: true });
    expect(screen.getByLabelText('Project')).toBeDisabled();
    expect(screen.getByText('No projects yet.')).toBeInTheDocument();
  });

  it('says when the chosen project has no financial data', () => {
    mockedTrend.mockReturnValue(queryResult({ data: { ...trend, monthly: [], yearly: [] } }));

    render(<Analytics />);

    expect(screen.getByText('No financial data for this project yet.')).toBeInTheDocument();
  });

  it('shows loading states while data loads', () => {
    mockedCategories.mockReturnValue(queryResult({ isLoading: true }));
    mockedSummary.mockReturnValue(queryResult({ isLoading: true }));
    mockedTrend.mockReturnValue(queryResult({ data: undefined }));

    render(<Analytics />);

    expect(screen.getAllByText('Loading...')).toHaveLength(2);
  });

  it('shows an error with retry when categories fail to load', async () => {
    const refetch = jest.fn();
    mockedCategories.mockReturnValue(queryResult({ isError: true, refetch }));

    render(<Analytics />);

    expect(chartCard('Spending by category')).toHaveTextContent("Couldn't load this chart.");
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('shows an error with retry when the project list fails to load', async () => {
    const refetch = jest.fn();
    mockedSummary.mockReturnValue(queryResult({ isError: true, refetch }));
    mockedTrend.mockReturnValue(queryResult({ data: undefined }));

    render(<Analytics />);

    expect(screen.queryByLabelText('Project')).not.toBeInTheDocument();
    expect(chartCard('Budget vs spent by project')).toHaveTextContent("Couldn't load this chart.");
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('shows an error with retry when the trend fails to load', async () => {
    const refetch = jest.fn();
    mockedTrend.mockReturnValue(queryResult({ isError: true, refetch }));

    render(<Analytics />);

    expect(chartCard('Monthly budget vs spent')).toHaveTextContent("Couldn't load this chart.");
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
