import "./load-env";

import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { AppLogger } from "./logger/logger.service";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import * as cookieParser from "cookie-parser";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Resolve custom logger
  const logger = await app.resolve(AppLogger);
  logger.setContext("Bootstrap");
  app.useLogger(logger);

  // Enable cookies & request parsing
  app.use(cookieParser());
  
  // Configure CORS securely for local development / production origins
  const allowedOrigins = process.env.NODE_ENV === "production"
    ? ["https://nexus.com", "https://admin.nexus.com"]
    : true; // reflects request origin dynamically in development

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
  });

  // Hook up global standards
  app.useGlobalFilters(new HttpExceptionFilter(logger));
  app.useGlobalInterceptors(new LoggingInterceptor(logger));

  // Swagger OpenAPI Specification Generation
  const config = new DocumentBuilder()
    .setTitle("NEXUS Super-App Gateway API")
    .setDescription("Core endpoints for Auth, Commerce, Wallet, Messaging, Mobility and Food Delivery")
    .setVersion("1.0.0")
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`NEXUS Super-App server initialized on port ${port}`);
  logger.log(`API documentation available at http://localhost:${port}/api/docs`);
}

bootstrap();
