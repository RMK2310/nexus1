import { Injectable, LoggerService, Scope } from "@nestjs/common";

@Injectable({ scope: Scope.TRANSIENT })
export class AppLogger implements LoggerService {
  private contextName: string = "App";

  setContext(context: string) {
    this.contextName = context;
  }

  private formatMessage(level: string, message: any, context?: string) {
    const logData = {
      timestamp: new Date().toISOString(),
      level,
      service: "NEXUS-Backend",
      context: context || this.contextName,
      message: typeof message === "object" ? JSON.stringify(message) : message,
    };
    return JSON.stringify(logData);
  }

  log(message: any, context?: string) {
    console.log(this.formatMessage("INFO", message, context));
  }

  error(message: any, trace?: string, context?: string) {
    const errorData = {
      message: typeof message === "object" ? JSON.stringify(message) : message,
      stack: trace,
    };
    console.error(this.formatMessage("ERROR", errorData, context));
  }

  warn(message: any, context?: string) {
    console.warn(this.formatMessage("WARN", message, context));
  }

  debug(message: any, context?: string) {
    console.debug(this.formatMessage("DEBUG", message, context));
  }

  verbose(message: any, context?: string) {
    console.log(this.formatMessage("VERBOSE", message, context));
  }
}
