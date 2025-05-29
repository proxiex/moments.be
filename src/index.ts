import { PrismaClient } from '@prisma/client';
import cors from 'cors';
import 'dotenv/config';
import express from 'express';
import httpContext from 'express-http-context';
import swaggerUi from 'swagger-ui-express';
import { v4 as uuidv4 } from 'uuid';
import { swaggerSpec } from './config/swagger';
import LoggerLib from './libs/Logger.Lib';
import ResponseLib from './libs/Response.Lib';

// Import routes
import { AssertionError } from 'assert';
import ErrorLib from './libs/Error.Lib';
import authRoutes from './routes/auth';
import eventRoutes from './routes/events';
import imageRoutes from './routes/images';
import userRoutes from './routes/users';
import { AuthRequest } from './types';

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 4000;

// Initialize Prisma client
const prisma = new PrismaClient();

// Middleware
app.set('trust proxy', true);

app.use(cors({ exposedHeaders: ['access-token'] }));
app.use(express.json());

app.use(httpContext.middleware)

app.use((req, _res, next) => {
  httpContext.set('request-id', uuidv4().toString());
  LoggerLib.log('API Request:', {
    url: req.url, method: req.method, request: req.body
  });
  next()
})

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Attach prisma to req object
app.use((req: AuthRequest, _res, next) => {
  req.prisma = prisma;
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/users', userRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  return new ResponseLib(req, res).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((req: express.Request, res: express.Response) => {
  new ResponseLib(req, res).status(404).json({ message: 'Not Found' });
});

app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  LoggerLib.error(err);
  console.log(' ->>>>>> ',err);
  let message = 'Server Error', statusCode = 500;
  if (err instanceof ErrorLib) {
    message = err.message;
    statusCode = err.code;
  } else if (err instanceof AssertionError) {
    message = err.message;
    statusCode = 400;
  } else {
    message = 'Server Error';
    statusCode = 500;
  }
  new ResponseLib(req, res).status(statusCode).json({ message });
});

// Start server
const server = app.listen(PORT, () => {
  LoggerLib.log(`Server running on port ${PORT}`);
  LoggerLib.log(`API Documentation: http://localhost:${PORT}/api-docs`);
  LoggerLib.log(`Health check: http://localhost:${PORT}/api/health`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  LoggerLib.error('Unhandled Rejection:', err);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  LoggerLib.log('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  server.close(() => {
    LoggerLib.log('Server closed');
    process.exit(0);
  });
});