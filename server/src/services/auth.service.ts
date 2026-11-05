import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

import * as authRepository from '../repositories/auth.repository.js';
import * as userRepository from '../repositories/user.repository.js';
import { toPublicUser } from '../users.js';

dotenv.config();

export const signUp = async (
    email: string,
    password: string,
    username: string,
) => {
    try {
        const existingUserByEmail = await userRepository.getUserByEmail(email);
        const existingUserByUsername = await userRepository.getUserByUsername(username);

        if (existingUserByEmail) {
            throw new Error('Email already exists');
        }

        if (existingUserByUsername) {
            throw new Error('Username already exists');
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await authRepository.signUp(email, hashedPassword, username);

        return { user: toPublicUser(user) };
    } catch (error) {
        throw new Error(`Failed to create user: ${error}`);
    }
};



export const logIn = async (
    email: string,
    password: string,
) => {
    try {
        const user = await userRepository.getUserByEmail(email);

        if (!user) {
            throw new Error(`Email doesn't exist`);
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            throw new Error(`Wrong Password`);
        }

        const token = jwt.sign( { id: user.id }, process.env.SECRET, { expiresIn: '3d' } );

        return { user: toPublicUser(user), token };
    } catch (error) {
        throw new Error(`Failed to sign in: ${error.message}`);
    }
};


export const getAuthenticatedUser = async (
    userId: string
) => {
    try {
      const user = await authRepository.getUserById(userId);

      if (!user) {
        throw new Error('User not found');
      }
      
      return toPublicUser(user);
    } catch (error) {
      throw new Error('Failed to get user information');
    }
};


export const logOut = async () => {
    try {
        return { message: 'Logged out fully' };
    } catch (error) {
        throw new Error('Failed to log out');
    }
};