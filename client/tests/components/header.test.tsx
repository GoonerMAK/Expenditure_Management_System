import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import Cookies from 'js-cookie';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Header from '../../src/components/header';
import useAuth from '../../src/lib/use-auth';

jest.mock('axios');
jest.mock('js-cookie');
jest.mock('../../src/lib/use-auth');

const mockedPost = jest.mocked(axios.post);
const mockedRemove = jest.mocked(Cookies.remove);
const mockedUseAuth = jest.mocked(useAuth);

const renderHeader = () =>
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/dashboard" element={<Header />} />
        <Route path="/login" element={<p>Login page</p>} />
      </Routes>
    </MemoryRouter>,
  );

const openMenuAndLogout = async () => {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: /toggle user menu/i }));
  await user.click(await screen.findByRole('menuitem', { name: 'Logout' }));
};

describe('Header', () => {
  beforeEach(() => {
    mockedUseAuth.mockReturnValue({ user: { id: 'u1', username: 'jdoe' }, loading: false });
  });

  it('greets the signed-in user by username', () => {
    renderHeader();

    expect(screen.getByText('Welcome jdoe')).toBeInTheDocument();
  });

  it('renders a bare greeting while the user is unknown', () => {
    mockedUseAuth.mockReturnValue({ user: null, loading: true });

    renderHeader();

    expect(screen.getByText(/^Welcome\s*$/)).toBeInTheDocument();
  });

  it('shows the account menu when the avatar is clicked', async () => {
    renderHeader();

    await userEvent.setup().click(screen.getByRole('button', { name: /toggle user menu/i }));

    expect(await screen.findByText('My Account')).toBeInTheDocument();
  });

  it('logs out on the server, removes the cookie and navigates to /login', async () => {
    mockedPost.mockResolvedValue({ data: { message: 'Logged out successfully' } });
    renderHeader();

    await openMenuAndLogout();

    await waitFor(() => expect(screen.getByText('Login page')).toBeInTheDocument());
    expect(mockedPost).toHaveBeenCalledWith('http://localhost:4000/api/auth/logout', {}, { withCredentials: true });
    expect(mockedRemove).toHaveBeenCalledWith('jwt');
  });

  it('stays on the page and keeps the cookie when the logout request fails', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const error = new Error('Network Error');
    mockedPost.mockRejectedValue(error);
    renderHeader();

    await openMenuAndLogout();

    await waitFor(() => expect(consoleError).toHaveBeenCalledWith('Failed to log out:', error));
    expect(mockedRemove).not.toHaveBeenCalled();
    expect(screen.queryByText('Login page')).not.toBeInTheDocument();
  });
});
