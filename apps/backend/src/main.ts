import "./load-env";

import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { AppLogger } from "./logger/logger.service";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import * as cookieParser from "cookie-parser";
import helmet from "helmet";
import { getConfig } from "./config/env.validation";

async function bootstrap() {
  // ── FAIL-FAST: Validate all required environment variables ──
  const envConfig = getConfig();

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Resolve custom logger
  const logger = await app.resolve(AppLogger);
  logger.setContext("Bootstrap");
  app.useLogger(logger);

  // ── Security Headers (Helmet) ──
  app.use(
    helmet({
      contentSecurityPolicy: envConfig.NODE_ENV === "production" ? undefined : false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Enable cookies & request parsing
  app.use(cookieParser());

  // ── Request Body Size Limits & Static Assets ──
  // NestJS/Express default is 100kb; explicitly set for clarity
  const express = require("express");
  const path = require("path");
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));

  // ── Serve Local Product Images Statically ──
  // Resolve robustly: works from dist (nest build) and from src (nest start).
  const fs = require("fs");
  const publicCandidates = [
    path.resolve(__dirname, "../public"),
    path.resolve(process.cwd(), "public"),
    path.resolve(process.cwd(), "apps/backend/public"),
  ];
  const publicPath =
    publicCandidates.find((p: string) => fs.existsSync(p)) ?? publicCandidates[0];
  app.use(express.static(publicPath));
  app.use("/images", express.static(path.join(publicPath, "images")));

  // ── CORS Configuration (Environment-Driven) ──
  const allowedOrigins =
    envConfig.NODE_ENV === "production"
      ? envConfig.CORS_ORIGINS.length > 0
        ? envConfig.CORS_ORIGINS
        : ["https://nexus.com", "https://admin.nexus.com"]
      : true; // Reflects request origin dynamically in development

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
  });

  // Hook up global standards
  app.useGlobalFilters(new HttpExceptionFilter(logger));
  app.useGlobalInterceptors(new LoggingInterceptor(logger));

  // ── Swagger: Development Mode Only ──
  if (envConfig.NODE_ENV !== "production") {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("NEXUS Super-App Gateway API")
      .setDescription(
        "Core endpoints for Auth, Commerce, Wallet, Messaging, Mobility and Food Delivery",
      )
      .setVersion("1.0.0")
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup("api/docs", app, document);
    logger.log(`API documentation available at http://localhost:${envConfig.PORT}/api/docs`);
  }

  // ── Graceful Shutdown ──
  app.enableShutdownHooks();

  const port = envConfig.PORT;
  await app.listen(port);
  logger.log(`NEXUS Super-App server initialized on port ${port} [${envConfig.NODE_ENV}]`);
}

bootstrap();

