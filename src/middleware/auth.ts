import { NextFunction, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Forbidden, NotFound, Unauthorized } from '../libs/Error.Lib';
import { AuthRequest } from '../types';

// Extract and verify JWT token from request
export const authenticateUser = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      next(new Unauthorized('Authentication required. No token provided.'));
      return;
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      next(new Unauthorized('Authentication token is required'));
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
      email: string;
      name: string;
    };
    
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(new Unauthorized('Token expired'));
    }
    if (error instanceof jwt.JsonWebTokenError) {
      next(new Unauthorized('Invalid token'));
    }
    next(new Unauthorized('Authentication failed'));
  }
};

// Check if the user is the event creator
export const isEventCreator = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      next(new Unauthorized('Authentication required'));
      return;
    }

    const event = await req.prisma?.event.findUnique({
      where: { id },
      select: { creatorId: true },
    });
    
    if (!event) {
      next(new NotFound('Event not found'));
      return;
    }
    
    if (event.creatorId !== userId) {
      next(new Forbidden('Only the event creator can perform this action'));
      return;
    }

    next();
  } catch (error) {
    next(new Forbidden('Failed to verify permissions'));
  }
};

// Check if the user is an event participant
export const isEventParticipant = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      next(new Unauthorized('Authentication required'));
      return;
    }

    const event = await req.prisma?.event.findUnique({
      where: { id },
      include: {
        participants: {
          where: { id: userId },
          select: { id: true },
        },
        creator: {
          select: { id: true },
        },
      },
    });
    
    if (!event) {
      next(new NotFound('Event not found'));
      return;
    }

    // Check if user is the creator or a participant
    if (event.creator.id !== userId && event.participants.length === 0) {
      next(new Forbidden('You must be a participant to access this event'));
      return;
    }

    next();
  } catch (error) {
    next(new Forbidden('Failed to verify permissions'));
  }
};
