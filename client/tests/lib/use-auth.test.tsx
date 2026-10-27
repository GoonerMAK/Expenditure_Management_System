import { renderHook, waitFor } from '@testing-library/react';
import axios from 'axios';
import useAuth from '../../src/lib/use-auth';

jest.mock('axios');

const mockedGet = jest.mocked(axios.get);

describe('useAuth', () => {
  it('starts in a loading state with no user', () => {
    mockedGet.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useAuth());

    expect(result.current).toEqual({ user: null, loading: true });
  });

  it('requests the authenticated user with credentials', async () => {
    mockedGet.mockResolvedValue({ data: { user: { id: '1' } } });

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockedGet).toHaveBeenCalledTimes(1);
    expect(mockedGet).toHaveBeenCalledWith('http://localhost:4000/api/auth/user', { withCredentials: true });
  });

  it('exposes the user returned by the API', async () => {
    const user = { id: '1', username: 'jdoe', role_name: 'Contributor' };
    mockedGet.mockResolvedValue({ data: { user } });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current).toEqual({ user, loading: false }));
  });

  it('resolves to no user when the request fails', async () => {
    mockedGet.mockRejectedValue(new Error('401'));

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current).toEqual({ user: null, loading: false }));
  });

  it('only checks once across re-renders', async () => {
    mockedGet.mockResolvedValue({ data: { user: { id: '1' } } });

    const { result, rerender } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));
    rerender();

    expect(mockedGet).toHaveBeenCalledTimes(1);
  });
});
