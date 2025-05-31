import { PrismaClient } from '@prisma/client';
import { Request } from 'express';

// Define the JWT payload type
export interface JwtPayload {
  id: string;
  email: string;
  name: string;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
  prisma?: PrismaClient;
}

export interface UploadRequest extends AuthRequest {
  file?: Express.Multer.File;
}