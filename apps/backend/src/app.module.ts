import { Module, NestModule, MiddlewareConsumer } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { LoggerModule } from "./logger/logger.module";
import { AuthModule } from "./auth/auth.module";
import { CommerceModule } from "./commerce/commerce.module";
import { RequestIdMiddleware } from "./common/middleware/request-id.middleware";
import * as cookieParser from "cookie-parser";

@Module({
  imports: [PrismaModule, LoggerModule, AuthModule, CommerceModule],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      // Apply RequestIdMiddleware globally to assign tracking correlation IDs
      .apply(RequestIdMiddleware)
      .forRoutes("*");
  }
}
