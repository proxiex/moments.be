import httpContext from 'express-http-context';
import pino from 'pino';
import PinoPretty from 'pino-pretty';

const stream = process.env.NODE_ENV === 'local' ? PinoPretty({ colorize: true, singleLine: true }) : undefined!;

const logger = pino({
  messageKey: 'message',
  redact: ['*.new_password', '*.*.new_password', '*.password', '*.*.password', '*.otp', '*.*.otp']
}, stream);

export default class LoggerLib {
  static log(message: string | number, data?: unknown, ...args: unknown[]) {
    const user = httpContext.get('user');
    logger.info({
      'name': process.env.APP_NAME,
      message,
      'request-id': httpContext.get('request-id'),
      user,
      data,
      args
    })
  }

  static error(err: Error | string, data?: unknown, ...args: unknown[]) {
    const user = httpContext.get('user');
    logger.error({
      'name': process.env.APP_NAME,
      err,
      'request-id': httpContext.get('request-id'),
      user,
      data,
      args
    })
  }
}