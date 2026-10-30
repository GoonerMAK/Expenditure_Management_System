import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import UserRoles from '../../src/components/users-roles';
import {
  useAddRoleMutation,
  useGetAssignedRolesByUserIdQuery,
  useGetRolesQuery,
  useGetUnassignedRolesByUserIdQuery,
  useGetUsersByRolesQuery,
} from '../../src/redux/role-api';
import { useGetUsernamesQuery, useUpdateUserMutation } from '../../src/redux/user-api';
import { mutationResult, queryResult, rejectingTrigger, resolvingTrigger } from '../support/rtk';

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
  Toaster: () => null,
}));
jest.mock('../../src/redux/role-api', () => ({
  useGetRolesQuery: jest.fn(),
  useAddRoleMutation: jest.fn(),
  useGetUsersByRolesQuery: jest.fn(),
  useGetAssignedRolesByUserIdQuery: jest.fn(),
  useGetUnassignedRolesByUserIdQuery: jest.fn(),
}));
jest.mock('../../src/redux/user-api', () => ({
  useGetUsernamesQuery: jest.fn(),
  useUpdateUserMutation: jest.fn(),
}));

const mockedGetRoles = jest.mocked(useGetRolesQuery);
const mockedAddRole = jest.mocked(useAddRoleMutation);
const mockedGetUsersByRoles = jest.mocked(useGetUsersByRolesQuery);
const mockedGetAssigned = jest.mocked(useGetAssignedRolesByUserIdQuery);
const mockedGetUnassigned = jest.mocked(useGetUnassignedRolesByUserIdQuery);
const mockedGetUsernames = jest.mocked(useGetUsernamesQuery);
const mockedUpdateUser = jest.mocked(useUpdateUserMutation);

const roles = [
  { id: 'r1', role_name: 'Read-only' },
  { id: 'r2', role_name: 'Contributor' },
  { id: 'r3', role_name: 'Administrator' },
];

const usernames = [
  { id: 'u1', username: 'alice' },
  { id: 'u2', username: 'bob' },
];

const setup = ({ addRole = resolvingTrigger({}), updateUser = resolvingTrigger({}) } = {}) => {
  const refetchRoles = jest.fn();
  const refetchRolesWithUsers = jest.fn();
  mockedGetRoles.mockReturnValue(queryResult({ data: roles, refetch: refetchRoles }));
  mockedGetUsersByRoles.mockReturnValue(
    queryResult({ data: [['Administrator', 'alice'], ['Contributor', 'bob', 'carol']], refetch: refetchRolesWithUsers }),
  );
  mockedGetUsernames.mockReturnValue(queryResult({ data: usernames }));
  mockedGetUnassigned.mockReturnValue(queryResult({ data: [roles[1], roles[2]] }));
  mockedGetAssigned.mockReturnValue(queryResult({ data: roles[1] }));
  mockedAddRole.mockReturnValue(mutationResult(addRole));
  mockedUpdateUser.mockReturnValue(mutationResult(updateUser));
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'error').mockImplementation(() => undefined);

  render(<UserRoles />);
  return { addRole, updateUser, refetchRoles, refetchRolesWithUsers, user: userEvent.setup({ advanceTimers: jest.advanceTimersByTime }) };
};

const section = (heading: string) => screen.getByRole('heading', { name: heading }).parentElement as HTMLElement;

const pick = async (user: ReturnType<typeof userEvent.setup>, container: HTMLElement, placeholder: string, option: string) => {
  const trigger = within(container)
    .getAllByRole('combobox')
    .find((element) => element.textContent?.toLowerCase().includes(placeholder)) as HTMLElement;
  await user.click(trigger);
  await user.click(await screen.findByRole('option', { name: option }));
};

describe('UserRoles', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('roles table', () => {
    // Kept first: React logs each nesting warning only once per test file.
    it('renders valid table markup', () => {
      setup();

      const messages = jest.mocked(console.error).mock.calls.map(([message]) => String(message));
      expect(messages.filter((message) => message.includes('validateDOMNesting'))).toEqual([]);
    });

    it('lists every role', () => {
      setup();

      for (const role of roles) {
        expect(screen.getByRole('button', { name: role.role_name })).toBeInTheDocument();
      }
    });

    it('reveals the users of a role when it is expanded', async () => {
      const { user } = setup();

      await user.click(screen.getByRole('button', { name: 'Contributor' }));

      expect(await screen.findByText('bob', { selector: 'li' })).toBeInTheDocument();
      expect(screen.getByText('carol', { selector: 'li' })).toBeInTheDocument();
    });

    it('shows a placeholder for a role nobody holds', async () => {
      const { user } = setup();

      await user.click(screen.getByRole('button', { name: 'Read-only' }));

      expect(await screen.findByText('No users found', { selector: 'li' })).toBeInTheDocument();
    });
  });

  describe('add role form', () => {
    it('requires a role name', async () => {
      const { addRole, user } = setup();

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      expect(await screen.findByText('Role name is required')).toBeInTheDocument();
      expect(addRole).not.toHaveBeenCalled();
    });

    it('requires at least two characters', async () => {
      const { addRole, user } = setup();

      await user.type(screen.getByLabelText('Role Name', { selector: 'input' }), 'Q');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      expect(await screen.findByText('Role name must be at least two character long')).toBeInTheDocument();
      expect(addRole).not.toHaveBeenCalled();
    });

    it('creates the role, refetches roles and confirms', async () => {
      const { addRole, refetchRoles, user } = setup();

      await user.type(screen.getByLabelText('Role Name', { selector: 'input' }), 'Auditor');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Successfully created Role'));
      expect(addRole).toHaveBeenCalledWith({ role_name: 'Auditor' });
      expect(refetchRoles).toHaveBeenCalledTimes(1);
    });

    it('reports a failed creation', async () => {
      const { refetchRoles, user } = setup({ addRole: rejectingTrigger('duplicate') });

      await user.type(screen.getByLabelText('Role Name', { selector: 'input' }), 'Auditor');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Error Creating Role duplicate'));
      expect(refetchRoles).not.toHaveBeenCalled();
    });
  });

  describe('assign roles form', () => {
    it('skips the unassigned roles query until a user is chosen', () => {
      setup();

      expect(mockedGetUnassigned).toHaveBeenLastCalledWith('', { skip: true });
    });

    it('loads the unassigned roles for the chosen user', async () => {
      const { user } = setup();

      await pick(user, section('Assign Roles'), 'select username', 'bob');

      expect(mockedGetUnassigned).toHaveBeenLastCalledWith('u2', { skip: false });
    });

    it('assigns the chosen role to the chosen user', async () => {
      const { updateUser, refetchRolesWithUsers, user } = setup();
      const form = section('Assign Roles');

      await pick(user, form, 'select username', 'alice');
      await pick(user, form, 'select role', 'Administrator');
      await user.click(within(form).getByRole('button', { name: 'Assign' }));

      await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Role assigned successfully'));
      expect(updateUser).toHaveBeenCalledWith({ id: 'u1', data: { data: { role_id: 'r3', role_name: 'Administrator' } } });
      expect(refetchRolesWithUsers).toHaveBeenCalledTimes(1);
    });

    it('rejects submission without a user', async () => {
      const { updateUser, user } = setup();

      await user.click(within(section('Assign Roles')).getByRole('button', { name: 'Assign' }));

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('User not found'));
      expect(updateUser).not.toHaveBeenCalled();
    });

    it('rejects submission without a role', async () => {
      const { updateUser, user } = setup();
      const form = section('Assign Roles');

      await pick(user, form, 'select username', 'alice');
      await user.click(within(form).getByRole('button', { name: 'Assign' }));

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Role not found'));
      expect(updateUser).not.toHaveBeenCalled();
    });

    it('reports a failed assignment', async () => {
      const { user } = setup({ updateUser: rejectingTrigger({ status: 500 }) });
      const form = section('Assign Roles');

      await pick(user, form, 'select username', 'alice');
      await pick(user, form, 'select role', 'Contributor');
      await user.click(within(form).getByRole('button', { name: 'Assign' }));

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Error assigning role'));
    });
  });

  describe('revoke access form', () => {
    it('skips the assigned roles query until a user is chosen', () => {
      setup();

      expect(mockedGetAssigned).toHaveBeenLastCalledWith('', { skip: true });
    });

    it('loads the assigned role for the chosen user', async () => {
      const { user } = setup();

      await pick(user, section('Revoke Access'), 'select username', 'bob');

      expect(mockedGetAssigned).toHaveBeenLastCalledWith('u2', { skip: false });
    });

    it('demotes the user to Read-only without touching role_id', async () => {
      const { updateUser, user } = setup();
      const form = section('Revoke Access');

      await pick(user, form, 'select username', 'bob');
      await user.click(within(form).getByRole('button', { name: 'Revoke' }));

      await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Role revoked successfully'));
      expect(updateUser).toHaveBeenCalledWith({ id: 'u2', data: { data: { role_name: 'Read-only' } } });
    });

    it('rejects submission without a user', async () => {
      const { updateUser, user } = setup();

      await user.click(within(section('Revoke Access')).getByRole('button', { name: 'Revoke' }));

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('User not found'));
      expect(updateUser).not.toHaveBeenCalled();
    });

    it('reports a failed revoke', async () => {
      const { user } = setup({ updateUser: rejectingTrigger({ status: 500 }) });
      const form = section('Revoke Access');

      await pick(user, form, 'select username', 'bob');
      await user.click(within(form).getByRole('button', { name: 'Revoke' }));

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Error revoking role'));
    });

    it('shows the server reason when revoking the last Administrator is refused', async () => {
      const message = 'The last Administrator cannot be demoted or deleted.';
      const { user } = setup({ updateUser: rejectingTrigger({ status: 409, data: { message } }) });
      const form = section('Revoke Access');

      await pick(user, form, 'select username', 'bob');
      await user.click(within(form).getByRole('button', { name: 'Revoke' }));

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith(message));
    });
  });
});
