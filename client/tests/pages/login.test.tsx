import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Login from '../../src/pages/login';
import useAuth from '../../src/lib/use-auth';

jest.mock('axios');
jest.mock('../../src/lib/use-auth');

const mockedPost = jest.mocked(axios.post);
const mockedUseAuth = jest.mocked(useAuth);

const renderLogin = () =>
  render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<p>Dashboard page</p>} />
        <Route path="/signup" element={<p>Signup page</p>} />
      </Routes>
    </MemoryRouter>,
  );

const submit = async (email = 'jdoe@example.com', password = 'secret123') => {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Email'), email);
  await user.type(screen.getByLabelText('Password'), password);
  await user.click(screen.getByRole('button', { name: 'Login' }));
};

describe('Login page', () => {
  beforeEach(() => {
    mockedUseAuth.mockReturnValue({ user: null, loading: false });
  });

  it('renders the email and password fields', () => {
    renderLogin();

    expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText('Email')).toBeRequired();
    expect(screen.getByLabelText('Password')).toBeRequired();
  });

  it('posts the credentials with cookies enabled', async () => {
    mockedPost.mockResolvedValue({ data: { user: { id: '1' } } });
    renderLogin();

    await submit();

    expect(mockedPost).toHaveBeenCalledWith(
      'http://localhost:4000/api/auth/login',
      { email: 'jdoe@example.com', password: 'secret123' },
      { withCredentials: true },
    );
  });

  it('navigates to the dashboard after a successful login', async () => {
    mockedPost.mockResolvedValue({ data: { user: { id: '1' } } });
    renderLogin();

    await submit();

    expect(await screen.findByText('Dashboard page')).toBeInTheDocument();
  });

  it('shows the server error message when login is rejected', async () => {
    mockedPost.mockRejectedValue({ response: { data: { message: 'Failed to sign in: Wrong Password' } } });
    renderLogin();

    await submit();

    expect(await screen.findByText('Failed to sign in: Wrong Password')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard page')).not.toBeInTheDocument();
  });

  it('falls back to the transport error message when there is no response', async () => {
    mockedPost.mockRejectedValue(new Error('Network Error'));
    renderLogin();

    await submit();

    expect(await screen.findByText('Network Error')).toBeInTheDocument();
  });

  it('does not submit when the fields are empty', async () => {
    renderLogin();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Login' }));

    expect(mockedPost).not.toHaveBeenCalled();
  });

  it('redirects an already signed-in user to the dashboard on its own', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    mockedUseAuth.mockReturnValue({ user: { id: '1' }, loading: false });

    renderLogin();

    await waitFor(() => expect(screen.getByText('Dashboard page')).toBeInTheDocument(), { timeout: 200 });
  });

  it('links to the sign-up page', async () => {
    renderLogin();

    await userEvent.setup().click(screen.getByRole('link', { name: 'Sign up' }));

    expect(screen.getByText('Signup page')).toBeInTheDocument();
  });
});
