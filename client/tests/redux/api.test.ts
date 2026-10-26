/**
 * @jest-environment node
 */
import { categoryApi } from '../../src/redux/category-api';
import { financialDataApi } from '../../src/redux/financial-data-api';
import { projectApi } from '../../src/redux/project-api';
import { roleApi } from '../../src/redux/role-api';
import { userApi } from '../../src/redux/user-api';
import { BASE, flush, makeStore, mockServer } from '../support/api';

const urlsFor = (requests: { url: string }[], path: string) => requests.filter((request) => request.url === `${BASE}${path}`);

describe('RTK Query APIs', () => {
  describe('shared base query', () => {
    it('sends cookies with every request', async () => {
      const { requests } = mockServer(() => ({ body: [] }));
      const store = makeStore();

      await store.dispatch(categoryApi.endpoints.getCategories.initiate());

      expect(requests[0].credentials).toBe('include');
    });

    it('surfaces the HTTP status and body of a failed request', async () => {
      mockServer(() => ({ status: 500, body: { error: 'Failed to fetch categories' } }));
      const store = makeStore();

      const result = await store.dispatch(categoryApi.endpoints.getCategories.initiate());

      expect(result.error).toEqual({ status: 500, data: { error: 'Failed to fetch categories' } });
    });
  });

  describe('projectApi', () => {
    it('requests the first page of six by default', async () => {
      const { requests } = mockServer(() => ({ body: { data: [], pagination: {} } }));
      const store = makeStore();

      await store.dispatch(projectApi.endpoints.getProjects.initiate({}));

      expect(requests).toEqual([expect.objectContaining({ url: `${BASE}projects?offset=0&limit=6`, method: 'GET' })]);
    });

    it('passes a custom offset and limit in the query string', async () => {
      const { requests } = mockServer(() => ({ body: { data: [], pagination: {} } }));
      const store = makeStore();

      await store.dispatch(projectApi.endpoints.getProjects.initiate({ offset: 12, limit: 3 }));

      expect(requests[0].url).toBe(`${BASE}projects?offset=12&limit=3`);
    });

    it('fails without a network call when called with no argument', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
      const { fetchSpy } = mockServer();
      const store = makeStore();

      const result = await store.dispatch(
        projectApi.endpoints.getProjects.initiate(undefined as unknown as { offset?: number; limit?: number }),
      );

      expect(result.isError).toBe(true);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('fetches a project by id', async () => {
      const { requests } = mockServer(() => ({ body: { id: 'p1' } }));
      const store = makeStore();

      const result = await store.dispatch(projectApi.endpoints.getProjectById.initiate('p1'));

      expect(requests[0].url).toBe(`${BASE}projects/p1`);
      expect(result.data).toEqual({ id: 'p1' });
    });

    it('creates a project with a POST body', async () => {
      const { requests } = mockServer(() => ({ body: { id: 'p1' } }));
      const store = makeStore();

      await store.dispatch(projectApi.endpoints.addProject.initiate({ project_name: 'Bridge' }));

      expect(requests[0]).toEqual(
        expect.objectContaining({ url: `${BASE}projects`, method: 'POST', body: { project_name: 'Bridge' } }),
      );
    });

    it('updates a project with a PUT to its id', async () => {
      const { requests } = mockServer(() => ({ body: { id: 'p1' } }));
      const store = makeStore();

      await store.dispatch(projectApi.endpoints.updateProject.initiate({ id: 'p1', data: { project_name: 'Bridge 2' } }));

      expect(requests[0]).toEqual(
        expect.objectContaining({ url: `${BASE}projects/p1`, method: 'PUT', body: { project_name: 'Bridge 2' } }),
      );
    });

    it('refetches the project list after a project is added', async () => {
      const { requests } = mockServer(({ method }) =>
        method === 'GET' ? { body: { data: [{ id: 'p1' }], pagination: {} } } : { body: { id: 'p2' } },
      );
      const store = makeStore();
      store.dispatch(projectApi.endpoints.getProjects.initiate({}));
      await flush();

      await store.dispatch(projectApi.endpoints.addProject.initiate({ project_name: 'New' }));
      await flush();

      expect(urlsFor(requests, 'projects?offset=0&limit=6')).toHaveLength(2);
    });

    it('refetches the project list after a listed project is updated', async () => {
      const { requests } = mockServer(({ method }) =>
        method === 'GET' ? { body: { data: [{ id: 'p1' }], pagination: {} } } : { body: { id: 'p1' } },
      );
      const store = makeStore();
      store.dispatch(projectApi.endpoints.getProjects.initiate({}));
      await flush();

      await store.dispatch(projectApi.endpoints.updateProject.initiate({ id: 'p1', data: {} }));
      await flush();

      expect(urlsFor(requests, 'projects?offset=0&limit=6')).toHaveLength(2);
    });
  });

  describe('categoryApi', () => {
    it('lists categories', async () => {
      const { requests } = mockServer(() => ({ body: [{ id: 'c1', category_name: 'Infra' }] }));
      const store = makeStore();

      const result = await store.dispatch(categoryApi.endpoints.getCategories.initiate());

      expect(requests[0]).toEqual(expect.objectContaining({ url: `${BASE}categories`, method: 'GET' }));
      expect(result.data).toEqual([{ id: 'c1', category_name: 'Infra' }]);
    });

    it('fetches a category by id', async () => {
      const { requests } = mockServer(() => ({ body: {} }));
      const store = makeStore();

      await store.dispatch(categoryApi.endpoints.getCategoryById.initiate('c1'));

      expect(requests[0].url).toBe(`${BASE}categories/c1`);
    });

    it('creates a category and refetches the list', async () => {
      const { requests } = mockServer(({ method }) => (method === 'GET' ? { body: [] } : { body: { id: 'c2' } }));
      const store = makeStore();
      store.dispatch(categoryApi.endpoints.getCategories.initiate());
      await flush();

      await store.dispatch(categoryApi.endpoints.addCategory.initiate({ category_name: 'Health' }));
      await flush();

      expect(requests).toContainEqual(
        expect.objectContaining({ url: `${BASE}categories`, method: 'POST', body: { category_name: 'Health' } }),
      );
      expect(requests.filter((request) => request.method === 'GET')).toHaveLength(2);
    });
  });

  describe('financialDataApi', () => {
    it('lists financial data', async () => {
      const { requests } = mockServer(() => ({ body: [] }));
      const store = makeStore();

      await store.dispatch(financialDataApi.endpoints.getFinancialData.initiate());

      expect(requests[0].url).toBe(`${BASE}financialData`);
    });

    it('fetches financial data by id', async () => {
      const { requests } = mockServer(() => ({ body: {} }));
      const store = makeStore();

      await store.dispatch(financialDataApi.endpoints.getFinancialDataById.initiate('p1'));

      expect(requests[0].url).toBe(`${BASE}financialData/p1`);
    });

    it('creates financial data with a POST body', async () => {
      const { requests } = mockServer(() => ({ body: {} }));
      const store = makeStore();

      await store.dispatch(financialDataApi.endpoints.addFinancialData.initiate({ year: 2026, month: 3, expenditure: 10 }));

      expect(requests[0]).toEqual(
        expect.objectContaining({ method: 'POST', body: { year: 2026, month: 3, expenditure: 10 } }),
      );
    });

    it('updates financial data with a PUT to its id', async () => {
      const { requests } = mockServer(() => ({ body: {} }));
      const store = makeStore();

      await store.dispatch(financialDataApi.endpoints.updateFinancialData.initiate({ id: 'f1', data: { month: 4 } }));

      expect(requests[0]).toEqual(
        expect.objectContaining({ url: `${BASE}financialData/f1`, method: 'PUT', body: { month: 4 } }),
      );
    });
  });

  describe('roleApi', () => {
    it.each([
      ['getRoles', () => roleApi.endpoints.getRoles.initiate(), 'roles'],
      ['getRoleById', () => roleApi.endpoints.getRoleById.initiate('r1'), 'roles/r1'],
      ['getUnassignedRolesByUserId', () => roleApi.endpoints.getUnassignedRolesByUserId.initiate('u1'), 'roles/unassigned/u1'],
      ['getAssignedRolesByUserId', () => roleApi.endpoints.getAssignedRolesByUserId.initiate('u1'), 'roles/assigned/u1'],
      ['getUsersByRoles', () => roleApi.endpoints.getUsersByRoles.initiate(), 'roles/users/by-role'],
    ])('%s requests %s', async (_name, initiate, path) => {
      const { requests } = mockServer(() => ({ body: [] }));
      const store = makeStore();

      await store.dispatch(initiate() as never);

      expect(requests[0]).toEqual(expect.objectContaining({ url: `${BASE}${path}`, method: 'GET' }));
    });

    it('returns the server tuples unchanged because transformResponse is nested inside query', async () => {
      mockServer(() => ({ body: [['Administrator', 'alice']] }));
      const store = makeStore();

      const result = await store.dispatch(roleApi.endpoints.getUsersByRoles.initiate());

      expect(result.data).toEqual([['Administrator', 'alice']]);
    });

    it('creates a role with a POST body', async () => {
      const { requests } = mockServer(() => ({ body: {} }));
      const store = makeStore();

      await store.dispatch(roleApi.endpoints.addRole.initiate({ role_name: 'Auditor' }));

      expect(requests[0]).toEqual(
        expect.objectContaining({ url: `${BASE}roles`, method: 'POST', body: { role_name: 'Auditor' } }),
      );
    });

    it('updates a role with a PUT to its id', async () => {
      const { requests } = mockServer(() => ({ body: {} }));
      const store = makeStore();

      await store.dispatch(roleApi.endpoints.updateRole.initiate({ id: 'r1', data: { role_name: 'QA' } }));

      expect(requests[0]).toEqual(expect.objectContaining({ url: `${BASE}roles/r1`, method: 'PUT', body: { role_name: 'QA' } }));
    });
  });

  describe('userApi', () => {
    it.each([
      ['getUsers', () => userApi.endpoints.getUsers.initiate(), 'users'],
      ['getUserAuth', () => userApi.endpoints.getUserAuth.initiate(), 'auth/user'],
      ['getUserById', () => userApi.endpoints.getUserById.initiate('u1'), 'users/u1'],
      ['getUsernames', () => userApi.endpoints.getUsernames.initiate(), 'users/usernames'],
    ])('%s requests %s', async (_name, initiate, path) => {
      const { requests } = mockServer(({ url }) => ({ body: url.endsWith('auth/user') ? { user: { id: 'u1' } } : [] }));
      const store = makeStore();

      await store.dispatch(initiate() as never);

      expect(requests[0]).toEqual(expect.objectContaining({ url: `${BASE}${path}`, method: 'GET' }));
    });

    it('updates a user with a PUT carrying the given body', async () => {
      const { requests } = mockServer(() => ({ body: {} }));
      const store = makeStore();

      await store.dispatch(
        userApi.endpoints.updateUser.initiate({ id: 'u1', data: { data: { role_name: 'Read-only' } } as never }),
      );

      expect(requests[0]).toEqual(
        expect.objectContaining({ url: `${BASE}users/u1`, method: 'PUT', body: { data: { role_name: 'Read-only' } } }),
      );
    });

    it('refetches the authenticated user after that user is updated', async () => {
      const { requests } = mockServer(({ url }) => ({ body: url.endsWith('auth/user') ? { user: { id: 'u1' } } : {} }));
      const store = makeStore();
      store.dispatch(userApi.endpoints.getUserAuth.initiate());
      await flush();

      await store.dispatch(userApi.endpoints.updateUser.initiate({ id: 'u1', data: { name: 'Jane' } }));
      await flush();

      expect(urlsFor(requests, 'auth/user')).toHaveLength(2);
    });
  });
});
