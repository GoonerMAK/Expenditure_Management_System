import { z } from 'zod';
import { validateParams, validateQuery, validateRequest } from '../../../src/middlewares/validator.middleware.js';
import { ID } from '../helpers/factories.js';
import { expectResponse, mockNext, mockRequest, mockResponse } from '../helpers/express.js';

const bodySchema = z.object({
  name: z.string().min(3, { message: 'Name too short' }),
  age: z.number().int({ message: 'Age must be an integer' }),
});

const paramsSchema = z.object({
  id: z.string().uuid({ message: 'Invalid ID format. Must be a UUID.' }),
});

const querySchema = z.object({
  page: z.string().transform((value) => parseInt(value, 10)),
});

describe('validator.middleware', () => {
  describe('validateRequest', () => {
    it('replaces req.body with the parsed value and calls next', async () => {
      const req = mockRequest({ body: { name: 'Alice', age: 30 } });
      const res = mockResponse();
      const next = mockNext();

      await validateRequest(bodySchema)(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.body).toEqual({ name: 'Alice', age: 30 });
      expect(res.status).not.toHaveBeenCalled();
    });

    it('strips keys that the schema does not declare', async () => {
      const req = mockRequest({ body: { name: 'Alice', age: 30, isAdmin: true } });

      await validateRequest(bodySchema)(req, mockResponse(), mockNext());

      expect(req.body).toEqual({ name: 'Alice', age: 30 });
    });

    it('responds 400 with the first validation message and does not call next', async () => {
      const req = mockRequest({ body: { name: 'Al', age: 30 } });
      const res = mockResponse();
      const next = mockNext();

      await validateRequest(bodySchema)(req, res, next);

      expectResponse(res, 400, { message: 'Name too short' });
      expect(next).not.toHaveBeenCalled();
    });

    it('reports only the first issue when several fields are invalid', async () => {
      const res = mockResponse();

      await validateRequest(bodySchema)(mockRequest({ body: { name: 'Al', age: 1.5 } }), res, mockNext());

      expectResponse(res, 400, { message: 'Name too short' });
    });

    it('responds 400 for a missing body field', async () => {
      const res = mockResponse();

      await validateRequest(bodySchema)(mockRequest({ body: { name: 'Alice' } }), res, mockNext());

      expectResponse(res, 400, { message: 'Required' });
    });

    it('responds 400 when the body is undefined', async () => {
      const res = mockResponse();
      const next = mockNext();

      await validateRequest(bodySchema)(mockRequest({ body: undefined }), res, next);

      expectResponse(res, 400, { message: 'Required' });
      expect(next).not.toHaveBeenCalled();
    });

    it('leaves req.body untouched when validation fails', async () => {
      const body = { name: 'Al', age: 30 };
      const req = mockRequest({ body });

      await validateRequest(bodySchema)(req, mockResponse(), mockNext());

      expect(req.body).toBe(body);
    });

    it('supports async refinements', async () => {
      const schema = z.object({ code: z.string() }).refine(async ({ code }) => code === 'OK', { message: 'Bad code' });
      const res = mockResponse();
      const next = mockNext();

      await validateRequest(schema)(mockRequest({ body: { code: 'NO' } }), res, next);

      expectResponse(res, 400, { message: 'Bad code' });
      expect(next).not.toHaveBeenCalled();
    });

    it('rejects instead of responding when the schema throws a non-Zod error', async () => {
      const schema = z.object({ x: z.string() }).transform(() => {
        throw new Error('unexpected');
      });
      const res = mockResponse();

      await expect(validateRequest(schema)(mockRequest({ body: { x: 'a' } }), res, mockNext())).rejects.toThrow(TypeError);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('validateParams', () => {
    it('replaces req.params with the parsed value and calls next', async () => {
      const req = mockRequest({ params: { id: ID } });
      const next = mockNext();

      await validateParams(paramsSchema)(req, mockResponse(), next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.params).toEqual({ id: ID });
    });

    it('responds 400 for an invalid id', async () => {
      const res = mockResponse();
      const next = mockNext();

      await validateParams(paramsSchema)(mockRequest({ params: { id: '123' } }), res, next);

      expectResponse(res, 400, { message: 'Invalid ID format. Must be a UUID.' });
      expect(next).not.toHaveBeenCalled();
    });

    it('responds 400 when the id is missing', async () => {
      const res = mockResponse();

      await validateParams(paramsSchema)(mockRequest({ params: {} }), res, mockNext());

      expectResponse(res, 400, { message: 'Required' });
    });
  });

  describe('validateQuery', () => {
    it('replaces req.query with the transformed value and calls next', async () => {
      const req = mockRequest({ query: { page: '3' } });
      const next = mockNext();

      await validateQuery(querySchema)(req, mockResponse(), next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.query).toEqual({ page: 3 });
    });

    it('responds 400 when a query value has the wrong type', async () => {
      const res = mockResponse();
      const next = mockNext();

      await validateQuery(querySchema)(mockRequest({ query: { page: ['1', '2'] } }), res, next);

      expectResponse(res, 400, { message: 'Expected string, received array' });
      expect(next).not.toHaveBeenCalled();
    });
  });
});
