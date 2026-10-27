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

  it('stays on page 1 when going back from the first page', async () => {
    const { onPageChange } = renderPagination({ currentPage: 1 });

    await userEvent.click(screen.getByRole('link', { name: /previous/i }));

    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('requests the next page', async () => {
    const { onPageChange } = renderPagination({ currentPage: 2 });

    await userEvent.click(screen.getByRole('link', { name: /next/i }));

    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('stays on the last page when going forward from it', async () => {
    const { onPageChange } = renderPagination({ currentPage: 4 });

    await userEvent.click(screen.getByRole('link', { name: /next/i }));

    expect(onPageChange).toHaveBeenCalledWith(4);
  });

  it('prevents the default anchor navigation', async () => {
    renderPagination();
    const link = screen.getByRole('link', { name: '2' });
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });

    link.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });
});
