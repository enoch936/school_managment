import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiEnvelope<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

/**
 * Wraps successful responses in a stable envelope. Paginated responses already
 * return `{ data, meta }` and are passed through with their meta preserved.
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiEnvelope<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiEnvelope<T>> {
    const request = context.switchToHttp().getRequest<{ url?: string }>();
    const isHealth = (request.url ?? '').includes('/health');
    return next.handle().pipe(
      map((data) => {
        // Health/readiness payloads must keep their Terminus-defined shape.
        if (isHealth) {
          return data as unknown as ApiEnvelope<T>;
        }
        if (
          data !== null &&
          typeof data === 'object' &&
          'data' in (data as Record<string, unknown>) &&
          'meta' in (data as Record<string, unknown>)
        ) {
          const d = data as unknown as { data: T; meta: Record<string, unknown> };
          return { success: true, data: d.data, meta: d.meta };
        }
        return { success: true, data };
      }),
    );
  }
}
