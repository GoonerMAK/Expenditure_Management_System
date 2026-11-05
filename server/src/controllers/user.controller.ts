import { Request, Response } from 'express';
import * as userService from '../services/user.service.js';
import { UserCreate, UserUpdate, UserParams } from '../validators/user.validator.js';
import { LastAdminError } from '../roles.js';

const sendUserWriteError = (res: Response, error: Error) => {
    if (error instanceof LastAdminError) {
        res.status(409).json({ message: error.message });
    } else {
        res.status(500).json({ error: error.message });
    }
};

export const createUser = async (req: Request<UserParams, unknown, UserCreate, unknown>, res: Response) => {
    const { username, password, email, name, role_id, role_name, age, gender, nationality } = req.body;
    try {
        const newUser = await userService.createUser(username, password, email, name, role_id, role_name, age, gender, nationality);
        res.status(201).json(newUser);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const updateUser = async (req: Request<UserParams, unknown, UserUpdate, unknown>, res: Response) => {
    const { id } = req.params;
    const { username, password, email, name, role_id, role_name, age, gender, nationality } = req.body.data;
    try {
        const updatedUser = await userService.updateUser(id, username, password, email, name, role_id, role_name, age, gender, nationality);
        if (!updatedUser) {
            res.status(404).json({ error: `User with id ${id} not found` });
        } else {
            res.status(200).json(updatedUser);
        }
    } catch (error) {
        sendUserWriteError(res, error);
    }
};

export const deleteUser = async (req: Request<UserParams, unknown, unknown, unknown>, res: Response) => {
    const { id } = req.params;
    try {
        const deletedUser = await userService.deleteUser(id);
        if (!deletedUser) {
            res.status(404).json({ error: `User with id ${id} not found` });
        } else {
            res.status(200).json(deletedUser);
        }
    } catch (error) {
        sendUserWriteError(res, error);
    }
};

export const getAllUsers = async (_req: Request<unknown, unknown, unknown, unknown>, res: Response) => {
    try {
        const users = await userService.getAllUsers();
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getUserById = async (req: Request<UserParams, unknown, unknown, unknown>, res: Response) => {
    const { id } = req.params;
    try {
        const user = await userService.getUserById(id);
        if (!user) {
            res.status(404).json({ error: `User with id ${id} not found` });
        } else {
            res.status(200).json(user);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getAllUsernames = async (_req: Request<unknown, unknown, unknown, unknown>, res: Response) => {
    try {
        const usernames = await userService.getAllUsernames();
        res.status(200).json(usernames);
    } catch (error) {
        console.error('Error fetching usernames:', error);
        res.status(500).json({ error: 'Failed to fetch usernames' });
    }
};

export const getUsersWithoutRoles = async (_req: Request<unknown, unknown, unknown, unknown>, res: Response) => {
    try {
        const getUsersWithoutRoles = await userService.getUsersWithoutRoles();
        res.status(200).json(getUsersWithoutRoles);
    } catch (error) {
        console.error('Error fetching users without roles:', error);
        res.status(500).json({ error: 'Failed to fetch users without roles'});
    }
}