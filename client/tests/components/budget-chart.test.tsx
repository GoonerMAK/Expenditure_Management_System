import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BudgetChart from '../../src/components/budget-chart';

jest.mock('recharts', () => jest.requireActual('../support/recharts').fixedSizeRecharts());

const data = [
  { label: 'Roads', budget: 5000, spent: 6000 },
  { label: 'Schools', budget: 2500.5, spent: 1000 },
];

const renderChart = (props: Partial<Parameters<typeof BudgetChart>[0]> = {}) =>
  render(<BudgetChart title="Spending by category" description="All projects" data={data} emptyMessage="Nothing yet." {...props} />);

describe('BudgetChart', () => {
  it('shows the title, description and chart by default', () => {
    renderChart();

    expect(screen.getByText('Spending by category')).toBeInTheDocument();
    expect(screen.getByText('All projects')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Spending by category: budget and spent' })).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('draws a bar for each value with a legend naming both series', () => {
    const { container } = renderChart();

    expect(container.querySelectorAll('.recharts-bar-rectangle')).toHaveLength(4);
    const legend = container.querySelector('.recharts-legend-wrapper') as HTMLElement;
    expect(legend).toHaveTextContent('Budget');
    expect(legend).toHaveTextContent('Spent');
  });

  it('can draw horizontal bars, labelling every item and growing with the data', () => {
    const many = Array.from({ length: 8 }, (_, i) => ({ label: `Category ${i + 1}`, budget: 100, spent: 50 }));
    const { container } = renderChart({ data: many, horizontal: true });

    expect(screen.getByRole('img')).toHaveStyle({ height: `${8 * 56 + 64}px` });
    expect(container.querySelector('.recharts-yAxis')).toHaveTextContent(many.map(({ label }) => label).join(''));
  });

  it('switches to a table with budget, spent and remaining, and back', async () => {
    const user = userEvent.setup();
    renderChart();

    await user.click(screen.getByRole('button', { name: 'Show table' }));

    const rows = within(screen.getByRole('table')).getAllByRole('row');
    expect(rows[0]).toHaveTextContent('BudgetSpentRemaining');
    expect(rows[1]).toHaveTextContent('Roads5,0006,000-1,000');
    expect(rows[2]).toHaveTextContent('Schools2,500.51,0001,500.5');

    await user.click(screen.getByRole('button', { name: 'Show chart' }));
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('shows the empty message without a table toggle when there is no data', () => {
    renderChart({ data: [] });

    expect(screen.getByText('Nothing yet.')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows a loading state', () => {
    renderChart({ isLoading: true });

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows an error with a retry button that refetches', async () => {
    const onRetry = jest.fn();
    renderChart({ isError: true, onRetry });

    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load this chart. Please try again.");
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows the error without a retry button when no retry is given', () => {
    renderChart({ isError: true });

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
