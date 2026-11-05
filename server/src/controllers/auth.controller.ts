import { Request, Response } from 'express';
import * as authService from '../services/auth.service.js';
import { AuthLogin, AuthSignup } from '../validators/auth.validator.js';


export const signUp = async (req: Request<unknown, unknown, AuthSignup, unknown>, res: Response) => {
  const { email, password, username } = req.body;

    try {
        const result = await authService.signUp(email, password, username);
        res.status(201).json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const logIn = async (req: Request<unknown, unknown, AuthLogin, unknown>, res: Response) => {
    const { email, password } = req.body;

    try {
        const { user, token } = await authService.logIn(email, password);

        res.cookie('jwt', token, { httpOnly: true, maxAge: 3 * 24 * 60 * 60 * 1000, });

        res.status(200).json({ user });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export const getAuthenticatedUser = async (req: Request<unknown, unknown, unknown, unknown>, res: Response) => {
  try {
    const user = await authService.getAuthenticatedUser(req.user.id);
    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const logOut = async (_req: Request<unknown, unknown, unknown, unknown>, res: Response) => {
  try {
      await authService.logOut();
      res.clearCookie('jwt', { httpOnly: true, sameSite: 'strict', secure: true  });
      res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
      res.status(500).json({ message: error.message });
  }
};
