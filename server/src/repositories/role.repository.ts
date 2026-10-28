import prisma from '../db.js';
import { Role } from '@prisma/client';

export const createRole = async (role_name: string) => {
    return await prisma.role.create({
        data: {
            role_name,
        },
    });
};

export const upsertRole = async (role_name: string) => {
    return await prisma.role.upsert({
        where: { role_name },
        update: {},
        create: { role_name },
    });
};

export const updateRole = async (
    id: string,
    role_name?: string
) => {
    const data: any = {};
    if (role_name !== undefined) data.role_name = role_name;

    return await prisma.role.update({
        where: { id },
        data,
    });
};

export const deleteRole = async (id: string) => {
    return await prisma.role.delete({
        where: { id },
    });
};

export const getAllRoles = async () => {
    return await prisma.role.findMany();
};

export const getRoleById = async (id: string) => {
    return await prisma.role.findUnique({
        where: { id },
    });
};

export const getUsersByRole = async () => {
    const rolesWithUsers = await prisma.role.findMany({
        include: {
            users: true,
        },
    });

    return rolesWithUsers.map(role => ({
        role_name: role.role_name,
        users: role.users,
    }));
};


export const getUnassignedRolesByUserId = async (user_id: string) => {
    const user = await prisma.user.findUnique({
        where: { id: user_id },
        select: { role_id: true } 
    });

    const unassignedRoles = await prisma.role.findMany({
        where: {
            NOT: {
                id: user.role_id 
            }
        },
        select: {
            id: true,
            role_name: true
        }
    });

    return unassignedRoles;
};


export const getAssignedRolesByUserId = async (user_id: string) => {
    const user = await prisma.user.findUnique({
        where: { id: user_id },
        include: {
            role: {
                where: {
                    role_name: {
                        not: 'Read-only' 
                    }
                },
                select: {
                    id: true,
                    role_name: true,
                },
            },
        },
    });

    return user?.role ?? [];
};