import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Request, Response } from "express";
import { AppLogger } from "../../logger/logger.service";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLogger) {
    this.logger.setContext("HttpExceptionFilter");
  }

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = (request as any)["requestId"] || "unknown-request";

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = "INTERNAL_SERVER_ERROR";
    let errorMessage = "An unexpected server error occurred";
    let details: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resContent: any = exception.getResponse();

      if (typeof resContent === "object") {
        errorCode = resContent.code || exception.name.replace("Exception", "").toUpperCase();
        errorMessage = resContent.message || exception.message;
        details = resContent.errors || null;
      } else {
        errorMessage = resContent || exception.message;
      }
    } else {
      // Log full stack trace internally for observability, but NEVER leak it to client
      this.logger.error(
        {
          operation: request.method + " " + request.url,
          requestId,
          message: exception.message || exception,
        },
        exception.stack,
        "SystemException"
      );
    }

    // Structured JSON log for all HTTP responses
    this.logger.warn({
      operation: `${request.method} ${request.url}`,
      requestId,
      status,
      errorCode,
      errorMessage,
      latencyMs: (request as any)["startTime"] ? Date.now() - (request as any)["startTime"] : undefined,
    });

    response.status(status).json({
      success: false,
      error: {
        code: errorCode,
        message: errorMessage,
        request_id: requestId,
        ...(details && { details }),
      },
    });
  }
}
