import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';

interface HttpExceptionBody {
  statusCode?: number;
  message?: string | string[];
  error?: unknown;
  status?: unknown;
}

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const raw = exception.getResponse();
    const responseException: HttpExceptionBody =
      typeof raw === 'string' ? {} : raw;

    if (typeof responseException.statusCode !== 'undefined') {
      const errors: Record<string, unknown> = {};

      if (Array.isArray(responseException.message)) {
        responseException.message.forEach((message) => {
          const fieldName = message.substring(0, message.indexOf(' '));

          errors[fieldName] = [message];
        });
      } else {
        Object.assign(errors, [responseException.message]);
      }

      response.status(status).json({
        status: {
          code: responseException.statusCode,
          message: responseException.error,
        },
        error: {
          code: 900000,
          message: responseException.error,
          errors: errors,
        },
      });
    }

    if (typeof responseException.status !== 'undefined') {
      response.status(status).json({
        status: responseException.status,
        error: responseException.error,
      });
    }

    if (
      typeof responseException.statusCode === 'undefined' &&
      typeof responseException.status === 'undefined'
    ) {
      response.status(status).json({
        status: { code: exception.getStatus(), message: exception.message },
        error: {
          code: 900000,
          message: exception.message,
          errors: [exception.message],
        },
      });
    }
  }
}
