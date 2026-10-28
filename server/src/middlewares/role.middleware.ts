import { Request, Response, NextFunction } from 'express';
import * as roleRepository from '../repositories/role.repository.js';
import * as userRepository from '../repositories/user.repository.js';
import { getAdminRole, isBuiltInRole } from '../roles.js';

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

const keepsAdminRole = async (req: Request) => {
    if (req.method === 'DELETE') {
        return false;
    }

    const { role_name, role_id } = req.body?.data ?? {};

    if (role_name !== undefined) {
        return role_name === getAdminRole();
    }

    if (role_id !== undefined) {
        const role = await roleRepository.getRoleById(role_id);
        return role?.role_name === getAdminRole();
    }

    return true;
};

export const protectLastAdmin = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
        const user = await userRepository.getUserWithRole(req.params.id);

        if (user?.role?.role_name !== getAdminRole() || await keepsAdminRole(req)) {
            return next();
        }

        if (await userRepository.countUsersWithRole(getAdminRole()) <= 1) {
            return res.status(409).json({ message: 'The last Administrator cannot be demoted or deleted.' });
        }

        next();
    } catch (error) {
        res.status(500).json({ message: 'Failed to check the Administrator count.' });
    }
};
