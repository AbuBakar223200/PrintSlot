import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

/**
 * ResponseInterceptor — wraps all successful responses into:
 * { data: T, message: "ok", statusCode: 200 }
 *
 * Per coding standard: never manually wrap responses in controllers.
 * Return domain objects directly — this interceptor handles the envelope.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<unknown> {
    return next.handle().pipe(
      map((data) => ({
        data,
        message: 'ok',
        statusCode: context.switchToHttp().getResponse().statusCode,
      })),
    );
  }
}
