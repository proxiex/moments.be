import { PrismaClient, User } from '@prisma/client';
import { Request } from 'express';

export interface AuthRequest extends Request {
  user?: User;
  prisma?: PrismaClient;
}

export interface UploadRequest extends AuthRequest {
  file?: Express.Multer.File;
}