import { configureStore } from '@reduxjs/toolkit';
import { categoryApi } from '../../src/redux/category-api';
import { financialDataApi } from '../../src/redux/financial-data-api';
import { projectApi } from '../../src/redux/project-api';
import { roleApi } from '../../src/redux/role-api';
import { userApi } from '../../src/redux/user-api';

export const BASE = 'http://localhost:4000/api/';

export type RecordedRequest = { url: string; method: string; credentials: string; body: unknown };

const apis = [categoryApi, financialDataApi, projectApi, roleApi, userApi] as const;

export const makeStore = () =>
  configureStore({
    reducer: {
      [categoryApi.reducerPath]: categoryApi.reducer,
      [financialDataApi.reducerPath]: financialDataApi.reducer,
      [projectApi.reducerPath]: projectApi.reducer,
      [roleApi.reducerPath]: roleApi.reducer,
      [userApi.reducerPath]: userApi.reducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(...apis.map((api) => api.middleware)),
  });

// Form data bodies are kept as text so tests can look for their fields.
const parseBody = (text: string, contentType: string | null) =>
  contentType?.startsWith('multipart/form-data') ? text : JSON.parse(text);

type Route = (request: RecordedRequest) => { status?: number; body?: unknown } | undefined;

export const mockServer = (route: Route = () => ({ body: {} })) => {
  const requests: RecordedRequest[] = [];
  const fetchSpy = jest.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const request = input as Request;
    const text = await request.clone().text();
    const recorded: RecordedRequest = {
      url: request.url,
      method: request.method,
      credentials: request.credentials,
      body: text ? parseBody(text, request.headers.get('content-type')) : undefined,
    };
    requests.push(recorded);
    const { status = 200, body = {} } = route(recorded) ?? {};
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  });
  return { requests, fetchSpy };
};

export const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
