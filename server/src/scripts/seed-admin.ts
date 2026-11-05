import dotenv from 'dotenv';
import prisma from '../db.js';
import * as authService from '../services/auth.service.js';
import * as roleRepository from '../repositories/role.repository.js';
import * as userRepository from '../repositories/user.repository.js';
import { getAdminRole } from '../roles.js';

dotenv.config();

const getAdminCredentials = () => {
    const { ADMIN_EMAIL: email, ADMIN_USERNAME: username, ADMIN_PASSWORD: password } = process.env;

    if (!email || !username || !password) {
        throw new Error('Set ADMIN_EMAIL, ADMIN_USERNAME and ADMIN_PASSWORD to seed the first Administrator.');
    }

    return { email, username, password };
};

const seedAdmin = async () => {
    const { email, username, password } = getAdminCredentials();

    await roleRepository.upsertRole(getAdminRole());

    const user = await userRepository.getUserByEmail(email)
        ?? (await authService.signUp(email, password, username)).user;

    return await userRepository.updateUser(user.id, { role_name: getAdminRole() });
};

seedAdmin()
    .then((admin) => console.log(`${admin.email} is now an ${admin.role_name}`))
    .catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
