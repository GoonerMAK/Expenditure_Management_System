import { Request, Response, NextFunction } from 'express';
import * as roleRepository from '../repositories/role.repository.js';
import { isBuiltInRole } from '../roles.js';

export const protectBuiltInRoles = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
        const role = await roleRepository.getRoleById(req.params.id);

        if (role && isBuiltInRole(role.role_name)) {
            return res.status(403).json({ message: `The built-in role '${role.role_name}' cannot be changed or deleted.` });
        }

        next();
    } catch (error) {
        res.status(500).json({ message: 'Failed to check the role.' });
    }
};
