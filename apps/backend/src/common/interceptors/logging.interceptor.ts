import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { AppLogger } from "../../logger/logger.service";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: AppLogger) {
    this.logger.setContext("LoggingInterceptor");
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const requestId = (request as any)["requestId"] || "unknown";
    const startTime = Date.now();
    (request as any)["startTime"] = startTime;

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        const response = context.switchToHttp().getResponse();
        this.logger.log({
          operation: `${request.method} ${request.url}`,
          requestId,
          status: response.statusCode,
          latencyMs: duration,
        });
      })
    );
  }
}
