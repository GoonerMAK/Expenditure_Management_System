import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export const validateRequest = (schema: ZodSchema) => async (req: Request, res: Response, next: NextFunction) => {
    try {
        const parsedBody = await schema.parseAsync(req.body);
        req.body = parsedBody;
        next();
    } catch (error) {
        res.status(400).json({ message: error.errors[0].message });
    }
};


export const validateParams = (schema: ZodSchema) => async (req: Request, res: Response, next: NextFunction) => {
    try {
        const parsedParams = await schema.parseAsync(req.params);
        req.params = parsedParams;
        next();
    } catch (error) {
        res.status(400).json({ message: error.errors[0].message });
    }
};

export const validateQuery = (schema: ZodSchema) => async (req: Request, res: Response, next: NextFunction) => {
    try {
        const parsedQuery = await schema.parseAsync(req.query);
        req.query = parsedQuery;
        next();
    } catch (error) {
        res.status(400).json({ message: error.errors[0].message });
    }
};