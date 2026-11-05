import type { NextFunction, Request, Response } from 'express';

export type MockResponse = Response & {
  status: jest.Mock;
  json: jest.Mock;
  cookie: jest.Mock;
  clearCookie: jest.Mock;
};

type MockRequestInit = {
  method?: string;
  params?: Record<string, unknown>;
  body?: unknown;
  query?: Record<string, unknown>;
  cookies?: Record<string, unknown>;
  user?: Record<string, unknown>;
};

export const mockRequest = (init: MockRequestInit = {}) =>
  ({ params: {}, body: {}, query: {}, cookies: {}, ...init }) as unknown as Request<any, any, any, any>;

export const mockResponse = (): MockResponse => {
  const res = {
    status: jest.fn(),
    json: jest.fn(),
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  res.cookie.mockReturnValue(res);
  res.clearCookie.mockReturnValue(res);
  return res as unknown as MockResponse;
};

export const mockNext = () => jest.fn() as jest.MockedFunction<NextFunction>;

export const expectResponse = (res: MockResponse, status: number, body: unknown) => {
  expect(res.status).toHaveBeenCalledTimes(1);
  expect(res.status).toHaveBeenCalledWith(status);
  expect(res.json).toHaveBeenCalledTimes(1);
  expect(res.json).toHaveBeenCalledWith(body);
};
