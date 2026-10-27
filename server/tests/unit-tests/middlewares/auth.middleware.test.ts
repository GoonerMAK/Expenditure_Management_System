import jwt from 'jsonwebtoken';
import { authorizeRoles, isAuthenticated } from '../../../src/middlewares/auth.middleware.js';
import * as authRepository from '../../../src/repositories/auth.repository.js';
import { buildUser, ID } from '../helpers/factories.js';
import { expectResponse, mockNext, mockRequest, mockResponse } from '../helpers/express.js';

jest.mock('../../../src/repositories/auth.repository.js');

const repository = jest.mocked(authRepository);

const SECRET = 'unit-test-secret';

describe('auth.middleware isAuthenticated', () => {
  const originalSecret = process.env.SECRET;

  beforeEach(() => {
    process.env.SECRET = SECRET;
  });

  afterEach(() => {
    process.env.SECRET = originalSecret;
  });

  it('attaches the decoded payload to req.user and calls next for a valid token', () => {
    const token = jwt.sign({ id: ID }, SECRET, { expiresIn: '3d' });
    const req = mockRequest({ cookies: { jwt: token } });
    const res = mockResponse();
    const next = mockNext();

    isAuthenticated(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
    expect(req.user).toEqual(expect.objectContaining({ id: ID }));
    expect(req.user?.exp).toBeGreaterThan(req.user?.iat as number);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('responds 401 when no jwt cookie is present', () => {
    const res = mockResponse();
    const next = mockNext();

    isAuthenticated(mockRequest({ cookies: {} }), res, next);

    expectResponse(res, 401, { message: 'Access denied. No token provided.' });
    expect(next).not.toHaveBeenCalled();
  });

  it('responds 401 when the jwt cookie is an empty string', () => {
    const res = mockResponse();
    const next = mockNext();

    isAuthenticated(mockRequest({ cookies: { jwt: '' } }), res, next);

    expectResponse(res, 401, { message: 'Access denied. No token provided.' });
    expect(next).not.toHaveBeenCalled();
  });

  it('responds 400 for a token signed with a different secret', () => {
    const token = jwt.sign({ id: ID }, 'some-other-secret');
    const req = mockRequest({ cookies: { jwt: token } });
    const res = mockResponse();
    const next = mockNext();

    isAuthenticated(req, res, next);

    expectResponse(res, 400, { message: 'Invalid token.' });
    expect(next).not.toHaveBeenCalled();
    expect(req.user).toBeUndefined();
  });

  it('responds 400 for an expired token', () => {
    const token = jwt.sign({ id: ID, exp: Math.floor(Date.now() / 1000) - 60 }, SECRET);
    const res = mockResponse();
    const next = mockNext();

    isAuthenticated(mockRequest({ cookies: { jwt: token } }), res, next);

    expectResponse(res, 400, { message: 'Invalid token.' });
    expect(next).not.toHaveBeenCalled();
  });

  it('responds 400 for a malformed token', () => {
    const res = mockResponse();
    const next = mockNext();

    isAuthenticated(mockRequest({ cookies: { jwt: 'not-a-jwt' } }), res, next);

    expectResponse(res, 400, { message: 'Invalid token.' });
    expect(next).not.toHaveBeenCalled();
  });

  it('responds 400 for a token whose payload was tampered with', () => {
    const [header, , signature] = jwt.sign({ id: ID }, SECRET).split('.');
    const forgedPayload = Buffer.from(JSON.stringify({ id: 'attacker' })).toString('base64url');
    const res = mockResponse();
    const next = mockNext();

    isAuthenticated(mockRequest({ cookies: { jwt: `${header}.${forgedPayload}.${signature}` } }), res, next);

    expectResponse(res, 400, { message: 'Invalid token.' });
    expect(next).not.toHaveBeenCalled();
  });

  it('responds 400 for an unsigned token using the none algorithm', () => {
    const token = jwt.sign({ id: ID }, '', { algorithm: 'none' });
    const res = mockResponse();
    const next = mockNext();

    isAuthenticated(mockRequest({ cookies: { jwt: token } }), res, next);

    expectResponse(res, 400, { message: 'Invalid token.' });
    expect(next).not.toHaveBeenCalled();
  });

  it('responds 400 when the server secret is not configured', () => {
    const token = jwt.sign({ id: ID }, SECRET);
    delete process.env.SECRET;
    const res = mockResponse();
    const next = mockNext();

    isAuthenticated(mockRequest({ cookies: { jwt: token } }), res, next);

    expectResponse(res, 400, { message: 'Invalid token.' });
    expect(next).not.toHaveBeenCalled();
  });

  it('throws when cookie-parser has not populated req.cookies', () => {
    const req = mockRequest();
    delete (req as { cookies?: unknown }).cookies;

    expect(() => isAuthenticated(req, mockResponse(), mockNext())).toThrow(TypeError);
  });
});

describe('auth.middleware authorizeRoles', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('looks up the logged-in user and calls next when their role is allowed', async () => {
    repository.getUserById.mockResolvedValue(buildUser({ role_name: 'Contributor' }));
    const res = mockResponse();
    const next = mockNext();

    await authorizeRoles('Contributor', 'Administrator')(mockRequest({ user: { id: ID } }), res, next);

    expect(repository.getUserById).toHaveBeenCalledWith(ID);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('responds 403 when the user role is not allowed', async () => {
    repository.getUserById.mockResolvedValue(buildUser({ role_name: 'Read-only' }));
    const res = mockResponse();
    const next = mockNext();

    await authorizeRoles('Contributor', 'Administrator')(mockRequest({ user: { id: ID } }), res, next);

    expectResponse(res, 403, { message: 'Access denied. Insufficient permissions.' });
    expect(next).not.toHaveBeenCalled();
  });

  it('responds 403 when the user has no role', async () => {
    repository.getUserById.mockResolvedValue(buildUser({ role_name: null }));
    const res = mockResponse();
    const next = mockNext();

    await authorizeRoles('Administrator')(mockRequest({ user: { id: ID } }), res, next);

    expectResponse(res, 403, { message: 'Access denied. Insufficient permissions.' });
    expect(next).not.toHaveBeenCalled();
  });

  it('responds 403 when the user no longer exists', async () => {
    repository.getUserById.mockResolvedValue(null);
    const res = mockResponse();
    const next = mockNext();

    await authorizeRoles('Administrator')(mockRequest({ user: { id: ID } }), res, next);

    expectResponse(res, 403, { message: 'Access denied. Insufficient permissions.' });
    expect(next).not.toHaveBeenCalled();
  });

  it('responds 500 when the user lookup fails', async () => {
    repository.getUserById.mockRejectedValue(new Error('db down'));
    const res = mockResponse();
    const next = mockNext();

    await authorizeRoles('Administrator')(mockRequest({ user: { id: ID } }), res, next);

    expectResponse(res, 500, { message: 'Failed to check permissions.' });
    expect(next).not.toHaveBeenCalled();
  });
});
