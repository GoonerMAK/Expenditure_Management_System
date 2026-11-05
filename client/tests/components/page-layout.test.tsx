import { render, screen } from '@testing-library/react';
import PageLayout from '../../src/components/page-layout';

jest.mock('../../src/components/sidebar', () => () => <nav>Sidebar</nav>);
jest.mock('../../src/components/header', () => () => <header>Header</header>);

describe('PageLayout', () => {
  it('shows the sidebar, the header and the page content', () => {
    render(
      <PageLayout>
        <p>Page content</p>
      </PageLayout>,
    );

    expect(screen.getByRole('navigation')).toHaveTextContent('Sidebar');
    expect(screen.getByRole('banner')).toHaveTextContent('Header');
    expect(screen.getByText('Page content')).toBeInTheDocument();
  });
});
