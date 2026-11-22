import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AppPagination from '../../src/components/pagination';

const renderPagination = (props: Partial<Parameters<typeof AppPagination>[0]> = {}) => {
  const onPageChange = jest.fn();
  const utils = render(
    <AppPagination currentPage={1} totalItems={20} itemsPerPage={6} onPageChange={onPageChange} {...props} />,
  );
  return { ...utils, onPageChange };
};

describe('AppPagination', () => {
  it.each([
    [0, 6],
    [6, 6],
    [1, 6],
  ])('renders nothing when %d items fit on one page of %d', (totalItems, itemsPerPage) => {
    const { container } = renderPagination({ totalItems, itemsPerPage });

    expect(container).toBeEmptyDOMElement();
  });

  it('renders one link per page', () => {
    renderPagination({ totalItems: 20, itemsPerPage: 6 });

    expect(screen.getAllByRole('link', { name: /^\d+$/ }).map((link) => link.textContent)).toEqual(['1', '2', '3', '4']);
  });

  it('renders two pages when items exceed one page by one', () => {
    renderPagination({ totalItems: 7, itemsPerPage: 6 });

    expect(screen.getAllByRole('link', { name: /^\d+$/ })).toHaveLength(2);
  });

  it('marks only the current page as active', () => {
    renderPagination({ currentPage: 3 });

    expect(screen.getByRole('link', { name: '3' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: '1' })).not.toHaveAttribute('aria-current');
  });

  it('requests the clicked page', async () => {
    const { onPageChange } = renderPagination();

    await userEvent.click(screen.getByRole('link', { name: '3' }));

    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('requests the previous page', async () => {
    const { onPageChange } = renderPagination({ currentPage: 3 });

    await userEvent.click(screen.getByRole('link', { name: /previous/i }));

    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('disables previous on the first page', () => {
    renderPagination({ currentPage: 1 });

    expect(screen.getByRole('link', { name: /previous/i })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('link', { name: /next/i })).toHaveAttribute('aria-disabled', 'false');
  });

  it('does not request the page already shown', async () => {
    const { onPageChange } = renderPagination({ currentPage: 2 });

    await userEvent.click(screen.getByRole('link', { name: '2' }));

    expect(onPageChange).not.toHaveBeenCalled();
  });

  it('requests the next page', async () => {
    const { onPageChange } = renderPagination({ currentPage: 2 });

    await userEvent.click(screen.getByRole('link', { name: /next/i }));

    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('disables next on the last page', () => {
    renderPagination({ currentPage: 4 });

    expect(screen.getByRole('link', { name: /next/i })).toHaveAttribute('aria-disabled', 'true');
  });

  it('prevents the default anchor navigation', async () => {
    renderPagination();
    const link = screen.getByRole('link', { name: '2' });
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });

    link.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  describe('with many pages', () => {
    const pageNumbers = () => screen.getAllByRole('link', { name: /^\d+$/ }).map((link) => link.textContent);
    const gaps = () => screen.queryAllByText('More pages');

    it('shows every page up to seven', () => {
      renderPagination({ totalItems: 42 });

      expect(pageNumbers()).toEqual(['1', '2', '3', '4', '5', '6', '7']);
      expect(gaps()).toHaveLength(0);
    });

    it('collapses the tail on the first page', () => {
      renderPagination({ totalItems: 300 });

      expect(pageNumbers()).toEqual(['1', '2', '3', '4', '5', '50']);
      expect(gaps()).toHaveLength(1);
    });

    it('keeps the first, last and neighbouring pages around a middle page', () => {
      renderPagination({ totalItems: 300, currentPage: 25 });

      expect(pageNumbers()).toEqual(['1', '24', '25', '26', '50']);
      expect(gaps()).toHaveLength(2);
    });

    it('collapses the head on the last page', () => {
      renderPagination({ totalItems: 300, currentPage: 50 });

      expect(pageNumbers()).toEqual(['1', '46', '47', '48', '49', '50']);
      expect(gaps()).toHaveLength(1);
    });

    it('reaches the last page in one click', async () => {
      const { onPageChange } = renderPagination({ totalItems: 300, currentPage: 25 });

      await userEvent.click(screen.getByRole('link', { name: '50' }));

      expect(onPageChange).toHaveBeenCalledWith(50);
    });
  });
});
