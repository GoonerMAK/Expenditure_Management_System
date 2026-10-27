import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from 'express';
import * as authRepository from '../repositories/auth.repository.js';

export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies.jwt;
    
    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    try {
        const decodedToken = jwt.verify(token, process.env.SECRET) as jwt.JwtPayload;
        req.user = decodedToken;
        next(); 
    } catch (error) {
        res.status(400).json({ message: 'Invalid token.' });
    }
}   

export const authorizeRoles = (...allowedRoles: string[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = await authRepository.getUserById(req.user?.id);

            if (!user || !allowedRoles.includes(user.role_name)) {
                return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
            }

            next();
        } catch (error) {
            res.status(500).json({ message: 'Failed to check permissions.' });
        }
    };
}
