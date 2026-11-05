import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import GuestRoute from '../../src/components/guest-route';
import ProtectedRoute from '../../src/components/protected-route';
import useAuth from '../../src/lib/use-auth';

jest.mock('../../src/lib/use-auth');

const mockedUseAuth = jest.mocked(useAuth);

const setAuth = (user: { role_name: string } | null, loading = false) => {
  mockedUseAuth.mockReturnValue({ user: user && { id: 'u1', ...user }, loading });
};

const renderAt = (element: JSX.Element) =>
  render(
    <MemoryRouter initialEntries={['/private']}>
      <Routes>
        <Route path="/private" element={element} />
        <Route path="/login" element={<p>Login page</p>} />
        <Route path="/dashboard" element={<p>Dashboard page</p>} />
      </Routes>
    </MemoryRouter>,
  );

describe('ProtectedRoute', () => {
  const guarded = (allowedRoles: string[]) => (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <p>Secret content</p>
    </ProtectedRoute>
  );

  it('shows a loading indicator while auth is resolving', () => {
    setAuth(null, true);

    renderAt(guarded(['Administrator']));

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Secret content')).not.toBeInTheDocument();
  });

  it('redirects an anonymous visitor to /login', () => {
    setAuth(null);

    renderAt(guarded(['Administrator']));

    expect(screen.getByText('Login page')).toBeInTheDocument();
  });

  it('redirects a user without an allowed role to /dashboard', () => {
    setAuth({ role_name: 'Read-only' });

    renderAt(guarded(['Contributor', 'Administrator']));

    expect(screen.getByText('Dashboard page')).toBeInTheDocument();
    expect(screen.queryByText('Secret content')).not.toBeInTheDocument();
  });

  it('redirects a user with no role to /dashboard', () => {
    setAuth({ role_name: '' });

    renderAt(guarded(['Read-only']));

    expect(screen.getByText('Dashboard page')).toBeInTheDocument();
  });

  it('matches role names case-sensitively', () => {
    setAuth({ role_name: 'administrator' });

    renderAt(guarded(['Administrator']));

    expect(screen.getByText('Dashboard page')).toBeInTheDocument();
  });

  it.each(['Read-only', 'Contributor', 'Administrator'])('renders the children for an allowed %s', (role) => {
    setAuth({ role_name: role });

    renderAt(guarded(['Read-only', 'Contributor', 'Administrator']));

    expect(screen.getByText('Secret content')).toBeInTheDocument();
  });

  it('denies everyone when no roles are allowed', () => {
    setAuth({ role_name: 'Administrator' });

    renderAt(guarded([]));

    expect(screen.getByText('Dashboard page')).toBeInTheDocument();
  });
});

describe('GuestRoute', () => {
  const guestOnly = (
    <GuestRoute>
      <p>Guest form</p>
    </GuestRoute>
  );

  it('shows a loading indicator while auth is resolving', () => {
    setAuth(null, true);

    renderAt(guestOnly);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders the children for an anonymous visitor', () => {
    setAuth(null);

    renderAt(guestOnly);

    expect(screen.getByText('Guest form')).toBeInTheDocument();
  });

  it('redirects a signed-in user to /dashboard', () => {
    setAuth({ role_name: 'Read-only' });

    renderAt(guestOnly);

    expect(screen.getByText('Dashboard page')).toBeInTheDocument();
    expect(screen.queryByText('Guest form')).not.toBeInTheDocument();
  });
});
