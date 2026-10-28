import { render, screen } from '@testing-library/react';
import App from '../src/App';
import useAuth from '../src/lib/use-auth';

jest.mock('../src/lib/use-auth');
jest.mock('../src/pages/login', () => () => <p>Login page</p>);
jest.mock('../src/pages/dashboard', () => () => <p>Dashboard page</p>);
jest.mock('../src/pages/analytics', () => () => <p>Analytics page</p>);
jest.mock('../src/pages/roles', () => () => <p>Roles page</p>);
jest.mock('../src/pages/add-category', () => () => <p>Add category page</p>);
jest.mock('../src/pages/add-financial', () => () => <p>Add financial page</p>);
jest.mock('../src/pages/add-project', () => () => <p>Add project page</p>);
jest.mock('../src/pages/update-project', () => () => <p>Project page</p>);
jest.mock('../src/pages/signup', () => ({ Signup: () => <p>Signup page</p> }));

const mockedUseAuth = jest.mocked(useAuth);

const visit = (path: string, role: string | null) => {
  mockedUseAuth.mockReturnValue({ user: role ? { id: 'u1', role_name: role } : null, loading: false });
  window.history.pushState({}, '', path);
  render(<App />);
};

describe('App routing', () => {
  it.each([
    ['/', 'Dashboard page'],
    ['/dashboard', 'Dashboard page'],
    ['/analytics', 'Analytics page'],
    ['/projects/p1', 'Project page'],
    ['/add-category', 'Dashboard page'],
    ['/add-project', 'Dashboard page'],
    ['/add-financial-info', 'Dashboard page'],
    ['/users-roles', 'Dashboard page'],
  ])('Read-only user visiting %s sees the %s', (path, expected) => {
    visit(path, 'Read-only');

    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it.each([
    ['/dashboard', 'Dashboard page'],
    ['/analytics', 'Analytics page'],
    ['/projects/p1', 'Project page'],
    ['/add-category', 'Add category page'],
    ['/add-project', 'Add project page'],
    ['/add-financial-info', 'Add financial page'],
    ['/users-roles', 'Dashboard page'],
  ])('Contributor visiting %s sees the %s', (path, expected) => {
    visit(path, 'Contributor');

    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it.each([
    ['/dashboard', 'Dashboard page'],
    ['/analytics', 'Analytics page'],
    ['/add-category', 'Add category page'],
    ['/add-project', 'Add project page'],
    ['/add-financial-info', 'Add financial page'],
    ['/users-roles', 'Roles page'],
  ])('Administrator visiting %s sees the %s', (path, expected) => {
    visit(path, 'Administrator');

    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it.each(['/', '/dashboard', '/analytics', '/projects/p1', '/add-project', '/users-roles'])(
    'anonymous visitor to %s is sent to login',
    (path) => {
      visit(path, null);

      expect(screen.getByText('Login page')).toBeInTheDocument();
    },
  );

  it('shows the login page to an anonymous visitor', () => {
    visit('/login', null);

    expect(screen.getByText('Login page')).toBeInTheDocument();
  });

  it('sends a signed-in user away from the login page', () => {
    visit('/login', 'Contributor');

    expect(screen.getByText('Dashboard page')).toBeInTheDocument();
  });

  it('shows the signup page without any guard', () => {
    visit('/signup', 'Administrator');

    expect(screen.getByText('Signup page')).toBeInTheDocument();
  });

  it('renders nothing for an unknown route', () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    visit('/does-not-exist', 'Administrator');

    expect(screen.queryByText(/page$/)).not.toBeInTheDocument();
  });
});
