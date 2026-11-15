import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProjectFilterBar, { SEARCH_DELAY_MS } from '../../src/components/project-filter-bar';
import { ProjectFilters } from '../../src/components/interfaces';

const noFilters: ProjectFilters = { search: '', category: '', owner: '', from: '', to: '', sort: '' };

const categories = [
  { id: 'c1', category_name: 'Infrastructure', created_at: '', updated_at: '' },
  { id: 'c2', category_name: 'Health', created_at: '', updated_at: '' },
];

const owners = [{ id: 'u1', display_name: 'jdoe' }];

const renderBar = (filters: Partial<ProjectFilters> = {}, canClear = false) => {
  const onChange = jest.fn();
  const onClear = jest.fn();
  const props = { categories, owners, onChange, onClear, canClear };
  const utils = render(<ProjectFilterBar filters={{ ...noFilters, ...filters }} {...props} />);
  const rerender = (next: Partial<ProjectFilters>) =>
    utils.rerender(<ProjectFilterBar filters={{ ...noFilters, ...next }} {...props} />);
  return { onChange, onClear, rerender };
};

const chooseOption = async (label: string, option: string) => {
  const user = userEvent.setup();
  await user.click(screen.getByLabelText(label));
  await user.click(screen.getByRole('option', { name: option }));
};

describe('ProjectFilterBar', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows All for category and owner and a sort placeholder by default', () => {
    renderBar();

    expect(screen.getByLabelText('Category')).toHaveTextContent('All categories');
    expect(screen.getByLabelText('Owner')).toHaveTextContent('All owners');
    expect(screen.getByLabelText('Sort')).toHaveTextContent('Sort by');
    expect(screen.getByRole('button', { name: 'From date' })).toHaveTextContent('From date');
    expect(screen.getByRole('button', { name: 'To date' })).toHaveTextContent('To date');
  });

  describe('search', () => {
    it('waits for typing to stop before searching', async () => {
      jest.useFakeTimers();
      const { onChange } = renderBar();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      await user.type(screen.getByLabelText('Search projects'), 'bri');
      act(() => jest.advanceTimersByTime(SEARCH_DELAY_MS - 1));
      expect(onChange).not.toHaveBeenCalled();

      act(() => jest.advanceTimersByTime(1));
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith('search', 'bri');
    });

    it('uses a delay of about 300 ms', () => {
      expect(SEARCH_DELAY_MS).toBe(300);
    });

    it('does not search again when the text matches the current search', async () => {
      jest.useFakeTimers();
      const { onChange } = renderBar({ search: 'road' });

      act(() => jest.advanceTimersByTime(SEARCH_DELAY_MS));

      expect(onChange).not.toHaveBeenCalled();
    });

    it('updates the text when the search changes from outside', () => {
      const { rerender } = renderBar({ search: 'road' });
      expect(screen.getByLabelText('Search projects')).toHaveValue('road');

      rerender({ search: '' });

      expect(screen.getByLabelText('Search projects')).toHaveValue('');
    });
  });

  describe('selects', () => {
    it('chooses a category', async () => {
      const { onChange } = renderBar();

      await chooseOption('Category', 'Health');

      expect(onChange).toHaveBeenCalledWith('category', 'c2');
    });

    it('turns All categories into an empty filter', async () => {
      const { onChange } = renderBar({ category: 'c1' });

      await chooseOption('Category', 'All categories');

      expect(onChange).toHaveBeenCalledWith('category', '');
    });

    it('chooses an owner and turns All owners into an empty filter', async () => {
      const { onChange, rerender } = renderBar();

      await chooseOption('Owner', 'jdoe');
      expect(onChange).toHaveBeenCalledWith('owner', 'u1');

      rerender({ owner: 'u1' });
      await chooseOption('Owner', 'All owners');
      expect(onChange).toHaveBeenLastCalledWith('owner', '');
    });

    it('lists every sort option and chooses one', async () => {
      const { onChange } = renderBar();
      const user = userEvent.setup();

      await user.click(screen.getByLabelText('Sort'));
      expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
        'Name A-Z',
        'Name Z-A',
        'Start date newest',
        'Start date oldest',
        'Total spend highest',
        'Total spend lowest',
      ]);
      await user.click(screen.getByRole('option', { name: 'Total spend lowest' }));

      expect(onChange).toHaveBeenCalledWith('sort', 'spend_asc');
    });
  });

  describe('dates', () => {
    it('shows the chosen dates', () => {
      renderBar({ from: '2026-03-01', to: '2026-04-30' });

      expect(screen.getByRole('button', { name: 'From date' })).toHaveTextContent('1 Mar 2026');
      expect(screen.getByRole('button', { name: 'To date' })).toHaveTextContent('30 Apr 2026');
    });

    it('picks a from date as YYYY-MM-DD and closes the calendar', async () => {
      const { onChange } = renderBar({ to: '2026-03-20' });
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: 'From date' }));
      await user.click(screen.getByRole('gridcell', { name: '15' }));

      expect(onChange).toHaveBeenCalledWith('from', '2026-03-15');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('clears a date when the chosen day is picked again', async () => {
      const { onChange } = renderBar({ from: '2026-03-15' });
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: 'From date' }));
      await user.click(screen.getByRole('gridcell', { name: '15' }));

      expect(onChange).toHaveBeenCalledWith('from', '');
    });

    it('does not allow a from date after the to date', async () => {
      renderBar({ to: '2026-03-20' });

      await userEvent.setup().click(screen.getByRole('button', { name: 'From date' }));

      expect(screen.getByRole('gridcell', { name: '21' })).toBeDisabled();
      expect(screen.getByRole('gridcell', { name: '20' })).toBeEnabled();
    });

    it('does not allow a to date before the from date', async () => {
      renderBar({ from: '2026-03-10' });

      await userEvent.setup().click(screen.getByRole('button', { name: 'To date' }));

      expect(screen.getByRole('gridcell', { name: '9' })).toBeDisabled();
      expect(screen.getByRole('gridcell', { name: '10' })).toBeEnabled();
    });
  });

  describe('clear', () => {
    it('is disabled when there is nothing to clear', () => {
      renderBar();

      expect(screen.getByRole('button', { name: 'Clear filters' })).toBeDisabled();
    });

    it('clears the filters', async () => {
      const { onClear } = renderBar({ owner: 'u1' }, true);

      await userEvent.setup().click(screen.getByRole('button', { name: 'Clear filters' }));

      expect(onClear).toHaveBeenCalledTimes(1);
    });
  });
});
