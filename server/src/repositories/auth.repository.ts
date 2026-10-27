import prisma from '../db.js';


export const signUp = async (
    email: string,
    password: string,
    username: string,
) => {
    return await prisma.user.create({
        data: {
            email,
            password,
            username,
            role_name: "Read-only",
            role: {
                connectOrCreate: {
                    where: { role_name: "Read-only" },
                    create: { role_name: "Read-only" },
                },
            },
        },
    });
};


export const logIn = async (
    email: string,
    password: string,
) => {
    return await prisma.user.create({
        data: {
            email,
            password,
        },
    });
};


export const getUserById = async (
    userId: string,
) => {
    return await prisma.user.findUnique({ 
        where: { 
            id: userId
        } 
    });
};