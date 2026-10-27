import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { toast } from 'sonner';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Signup } from '../../src/pages/signup';

jest.mock('axios');
jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
  Toaster: () => null,
}));

const mockedPost = jest.mocked(axios.post);

const renderSignup = () =>
  render(
    <MemoryRouter initialEntries={['/signup']}>
      <Routes>
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<p>Login page</p>} />
      </Routes>
    </MemoryRouter>,
  );

const fillAndSubmit = async () => {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Username'), 'jdoe');
  await user.type(screen.getByLabelText('Email'), 'jdoe@example.com');
  await user.type(screen.getByLabelText('Password'), 'secret123');
  await user.click(screen.getByRole('button', { name: 'Create an account' }));
  return user;
};

describe('Signup page', () => {
  it('renders required username, email and password fields', () => {
    renderSignup();

    expect(screen.getByLabelText('Username')).toBeRequired();
    expect(screen.getByLabelText('Email')).toBeRequired();
    expect(screen.getByLabelText('Password')).toBeRequired();
  });

  it('posts the entered details', async () => {
    mockedPost.mockResolvedValue({ data: {} });
    renderSignup();

    await fillAndSubmit();

    expect(mockedPost).toHaveBeenCalledWith('http://localhost:4000/api/auth/signup', {
      email: 'jdoe@example.com',
      password: 'secret123',
      username: 'jdoe',
    });
  });

  it('confirms success and navigates to /login', async () => {
    mockedPost.mockResolvedValue({ data: {} });
    renderSignup();

    await fillAndSubmit();

    expect(await screen.findByText('Login page')).toBeInTheDocument();
    expect(toast.success).toHaveBeenCalledWith('Account created successfully!');
  });

  it('shows the server error message on failure', async () => {
    mockedPost.mockRejectedValue({ response: { data: { message: 'Failed to create user: Error: Email already exists' } } });
    renderSignup();

    await fillAndSubmit();

    expect(await screen.findByText('Failed to create user: Error: Email already exists')).toBeInTheDocument();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('shows a generic message when the server gives no reason', async () => {
    mockedPost.mockRejectedValue(new Error('Network Error'));
    renderSignup();

    await fillAndSubmit();

    expect(await screen.findByText('An error occurred. Please try again.')).toBeInTheDocument();
  });

  it('clears a previous error when submitting again', async () => {
    mockedPost.mockRejectedValueOnce(new Error('Network Error')).mockReturnValueOnce(new Promise(() => {}));
    renderSignup();

    const user = await fillAndSubmit();
    expect(await screen.findByText('An error occurred. Please try again.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Create an account' }));

    expect(screen.queryByText('An error occurred. Please try again.')).not.toBeInTheDocument();
  });

  it('does not submit when the fields are empty', async () => {
    renderSignup();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Create an account' }));

    expect(mockedPost).not.toHaveBeenCalled();
  });

  it('links back to the login page', async () => {
    renderSignup();

    await userEvent.setup().click(screen.getByRole('link', { name: 'Sign in' }));

    expect(screen.getByText('Login page')).toBeInTheDocument();
  });
});
