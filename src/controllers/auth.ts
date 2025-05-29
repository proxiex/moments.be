import bcrypt from 'bcryptjs';
import { NextFunction, Response } from 'express';
import jwt from 'jsonwebtoken';
import { BadRequest, NotFound, Unauthorized } from '../libs/Error.Lib';
import ResponseLib from '../libs/Response.Lib';
import { AuthRequest } from '../types';

interface RegisterInput {
  name: string;
  email: string;
  password: string;
  avatar?: string;
}

interface LoginInput {
  email: string;
  password: string;
}

export const register = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, email, password, avatar }: RegisterInput = req.body;
    
    if (!name || !email || !password) {
      throw new BadRequest('Validation', 'Name, email, and password are required');
    }

    const existingUser = await req.prisma?.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequest('Email', 'User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await req.prisma?.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        avatar,
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        createdAt: true,
      },
    });

    const token = jwt.sign(
      { id: user?.id, email: user?.email, name: user?.name },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    new ResponseLib(req, res).status(201).json({ user, token });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password }: LoginInput = req.body;

    if (!email || !password) {
      throw new BadRequest('Validation', 'Email and password are required');
    }

    const user = await req.prisma?.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFound('User', 'User not found');
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new Unauthorized('Auth', 'Invalid credentials');
    }

    const { password: _, ...userWithoutPassword } = user;
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    new ResponseLib(req, res).json({ user: userWithoutPassword, token });
  } catch (error) {
    next(error);
  }
};

export const getCurrentUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      next(new Unauthorized('Auth', 'Not authenticated'));
    }

    const user = await req.prisma?.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        createdAt: true,
        _count: {
          select: {
            images: true,
            events: true,
            createdEvents: true,
          },
        },
      },
    });

    if (!user) {
      next(new NotFound('User', 'User not found'));
    }

    new ResponseLib(req, res).json(user);
  } catch (error) {
    next(error);
  }
};