import prisma from '../db.js';
import { User } from '@prisma/client';


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
    return await prisma.user.create({
        data: {
            username,
            password,
            email,
            name,
            age,
            gender,
            nationality,
            role_name,
            role: {
                connect: {
                    id: role_id
                }
            }
        },
    });
};


export const updateUser = async (
    id: string,
    data: {
        username?: string,
        password?: string,
        email?: string,
        name?: string,
        role_id?: string,
        role_name?: string,
        age?: string,
        gender?: string,
        nationality?: string
    }
) => {
    if (data.role_name) {
        const role = await prisma.role.findUnique({
            where: { role_name: data.role_name },
        });
        if (!role) {
            throw new Error(`Role '${data.role_name}' not found`);
        }
        data.role_id = role.id;
    } else if (data.role_id) {
        const role = await prisma.role.findUnique({
            where: { id: data.role_id },
        });
        if (!role) {
            throw new Error(`Role '${data.role_id}' not found`);
        }
        data.role_name = role.role_name;
    }

    return await prisma.user.update({
        where: { id },
        data,
    });
};


export const deleteUser = async (id: string) => {
    return await prisma.user.delete({
        where: { id },
    });
};

export const getAllUsers = async () => {
    return await prisma.user.findMany();
};

export const getUserById = async (id: string) => {
    return await prisma.user.findUnique({
        where: { id },
    });
};

export const getUserWithRole = async (id: string) => {
    return await prisma.user.findUnique({
        where: { id },
        include: { role: true },
    });
};

export const countUsersWithRole = async (role_name: string) => {
    return await prisma.user.count({
        where: { role: { role_name } },
    });
};

export const getUserByUsername = async (username: string) => {
    return await prisma.user.findUnique({
        where: { username },
    });
};

export const getUserByEmail = async (email: string) => {
    return await prisma.user.findUnique({
        where: { email },
    });
};

export const getAllUsernames = async () => {
    const users = await prisma.user.findMany({
        select: {
            id: true,
            username: true,
        },
    });

    return users.map(user => ({
        id: user.id,
        username: user.username,
    }));
};


export const getUsersWithoutRoles = async () => {
    const usersWithoutRoles = await prisma.user.findMany({
      where: {
        role: null,
      },
    });

    return usersWithoutRoles;
};
