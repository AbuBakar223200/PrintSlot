import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * Global HTTP exception filter.
 * Wraps all errors into the standard response shape:
 * { data: null, message: string, statusCode: number }
 *
 * Never throw plain Error objects from services — they become 500s.
 */
@Catch()
export class HttpExceptionFilterGlobal implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        message = (exceptionResponse as Record<string, unknown>).message as string
          ?? exception.message;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    response.status(statusCode).json({
      data: null,
      message,
      statusCode,
    });
  }
}
