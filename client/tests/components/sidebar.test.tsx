import { render, screen } from '@testing-library/react';
import Sidebar from '../../src/components/sidebar';
import useAuth from '../../src/lib/use-auth';

jest.mock('../../src/lib/use-auth');

const mockedUseAuth = jest.mocked(useAuth);

const renderAs = (role_name: string | null) => {
  mockedUseAuth.mockReturnValue({ user: role_name === null ? null : { id: 'u1', role_name }, loading: false });
  render(<Sidebar />);
};

const linkNames = () => screen.getAllByRole('link').map((link) => link.textContent?.trim());

describe('Sidebar', () => {
  it('shows the app name', () => {
    renderAs('Read-only');

    expect(screen.getByText('Expenditure App')).toBeInTheDocument();
  });

  it('shows only shared links to a Read-only user', () => {
    renderAs('Read-only');

    expect(linkNames()).toEqual(['Dashboard', 'Analytics']);
  });

  it('shows create links but not user management to a Contributor', () => {
    renderAs('Contributor');

    expect(linkNames()).toEqual(['Dashboard', 'Add Category', 'Add Project', 'Add Financial Info', 'Analytics']);
  });

  it('shows every link to an Administrator', () => {
    renderAs('Administrator');

    expect(linkNames()).toEqual([
      'Dashboard',
      'Add Category',
      'Add Project',
      'Add Financial Info',
      'Users & Roles',
      'Analytics',
    ]);
  });

  it('shows only shared links while the user is unknown', () => {
    renderAs(null);

    expect(linkNames()).toEqual(['Dashboard', 'Analytics']);
  });

  it('shows only shared links for an unrecognised role', () => {
    renderAs('administrator');

    expect(linkNames()).toEqual(['Dashboard', 'Analytics']);
  });

  it('points each link at its route', () => {
    renderAs('Administrator');

    expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: /add category/i })).toHaveAttribute('href', '/add-category');
    expect(screen.getByRole('link', { name: /add project/i })).toHaveAttribute('href', '/add-project');
    expect(screen.getByRole('link', { name: /add financial info/i })).toHaveAttribute('href', '/add-financial-info');
    expect(screen.getByRole('link', { name: /users & roles/i })).toHaveAttribute('href', '/users-roles');
    expect(screen.getByRole('link', { name: /analytics/i })).toHaveAttribute('href', '/analytics');
  });
});
