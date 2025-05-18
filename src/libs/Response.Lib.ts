import express from 'express';
import httpContext from 'express-http-context';
import LoggerLib from './Logger.Lib';

export default class ResponseLib {
  constructor(private _req: express.Request, private _res: express.Response) {}

  status(statusCode: number) {
    this._res.status(statusCode);
    return this;
  }

  json<T>(data: T) {
    // Always set status code if not already set
    if (!this._res.statusCode || this._res.statusCode === 200) {
      this._res.status(200);
    }
    // Log the response with request context
    LoggerLib.log('API Response', {
      url: this._req.originalUrl || this._req.url,
      method: this._req.method,
      status: this._res.statusCode,
      response: data,
      requestId: httpContext.get('request-id'),
      user: httpContext.get('user'),
    });
    // Set request ID header if available
    const reqId = httpContext.get('request-id');
    if (reqId) this._res.set('X-Request-ID', reqId);
    this._res.json(data);
    return this;
  }

  setHeader(headers: Record<string, string>) {
    Object.entries(headers).forEach(([key, value]) => {
      this._res.set(key, value);
    });
    return this;
  }

  // Helper for error responses
  error(message: string, statusCode = 500, error?: unknown) {
    LoggerLib.error(message, error);
    this.status(statusCode).json({ message, error: process.env.NODE_ENV === 'local' ? error : undefined });
    return this;
  }

  // Helper for common responses
  static unauthorized(res: express.Response, message = 'Unauthorized') {
    return res.status(401).json({ message });
  }
  static forbidden(res: express.Response, message = 'Forbidden') {
    return res.status(403).json({ message });
  }
  static notFound(res: express.Response, message = 'Not found') {
    return res.status(404).json({ message });
  }
}