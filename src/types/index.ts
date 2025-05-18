import { PrismaClient } from '@prisma/client';
import { Request } from 'express';

export interface UserPayload {
  id: string;
  email: string;
  name: string;
}

export interface AuthRequest extends Request {
  user?: UserPayload;
  prisma?: PrismaClient;
}

export interface UploadRequest extends AuthRequest {
  file?: Express.Multer.File;
}