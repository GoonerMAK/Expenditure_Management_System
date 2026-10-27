import bcrypt from 'bcrypt';
import { User } from '@prisma/client';
import * as userRepository from '../repositories/user.repository.js';

let saltRounds = 10;

export const getSaltRounds = () => saltRounds;

export const setSaltRounds = (rounds: number) => {
    saltRounds = rounds;
};

export const createUser = async (
    username: string,
    password: string,
    email: string,
    name: string,
    role_id: string,
    role_name: string,
    age?: string,
    gender?: string,
    nationality?: string
) => {
    try {
        const existingUserByUsername = await userRepository.getUserByUsername(username);
        const existingUserByEmail = await userRepository.getUserByEmail(email);

        if (existingUserByUsername) {
            throw new Error('Username already exists');
        }

        if (existingUserByEmail) {
            throw new Error('Email already exists');
        }

        const hashedPassword = await bcrypt.hash(password, getSaltRounds());

        const user = await userRepository.createUser(username, hashedPassword, email, name, role_id, role_name, age, gender, nationality);
        return user;
    } catch (error) {
        throw new Error(`Failed to create user: ${error}`);
    }
};

export const updateUser = async (
    id: string,
    username?: string,
    password?: string,
    email?: string,
    name?: string,
    role_id?: string,
    role_name?: string,
    age?: string,
    gender?: string,
    nationality?: string
) => {
    try {
        const data: any = {};
        if (username !== undefined) data.username = username;
        if (password !== undefined) data.password = await bcrypt.hash(password, getSaltRounds());
        if (email !== undefined) data.email = email;
        if (name !== undefined) data.name = name;
        if (role_id !== undefined) data.role_id = role_id;
        if (role_name !== undefined) data.role_name = role_name;
        if (age !== undefined) data.age = age;
        if (gender !== undefined) data.gender = gender;
        if (nationality !== undefined) data.nationality = nationality;

        const updatedUser = await userRepository.updateUser(id, data);

        if (!updatedUser) {
            throw new Error(`User with id ${id} not found`);
        }

        return updatedUser;
    } catch (error) {
        throw new Error(`Failed to update user: ${error.message}`);
    }
};

export const deleteUser = async (id: string) => {
    try {
        const deletedUser = await userRepository.deleteUser(id);
        if (!deletedUser) {
            throw new Error(`User with id ${id} not found`);
        }
        return deletedUser;
    } catch (error) {
        throw new Error(`Failed to delete user: ${error}`);
    }
};

export const getAllUsers = async () => {
    try {
        const users = await userRepository.getAllUsers();
        return users;
    } catch (error) {
        throw new Error(`Failed to fetch users: ${error}`);
    }
};

export const getUserById = async (id: string) => {
    try {
        const user = await userRepository.getUserById(id);
        if (!user) {
            throw new Error(`User with id ${id} not found`);
        }
        return user;
    } catch (error) {
        throw new Error(`Failed to fetch user: ${error}`);
    }
};

export const getAllUsernames = async () => {
    try {
        const usernames = await userRepository.getAllUsernames();
        return usernames;
    } catch (error) {
        throw new Error(`Failed to fetch usernames: ${error.message}`);
    }
};

export const getUsersWithoutRoles = async () => {
    try {
        const usersWithoutRoles = await userRepository.getUsersWithoutRoles();
        return usersWithoutRoles;
    } catch (error) {
        throw new Error(`Failed to fetch users without roles: ${error.message}`);
    }
}