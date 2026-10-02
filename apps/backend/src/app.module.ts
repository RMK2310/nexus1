import { Module, NestModule, MiddlewareConsumer } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { PrismaModule } from "./prisma/prisma.module";
import { LoggerModule } from "./logger/logger.module";
import { AuthModule } from "./auth/auth.module";
import { CommerceModule } from "./commerce/commerce.module";
import { WalletModule } from "./wallet/wallet.module";
import { HealthModule } from "./health/health.module";
import { RequestIdMiddleware } from "./common/middleware/request-id.middleware";
import { ImageProxyController } from "./common/image-proxy.controller";
import { FoodController } from "./food/food.controller";
import * as cookieParser from "cookie-parser";

@Module({
  imports: [
    // Global rate limiting: 60 requests per 60 seconds per IP
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 60,
    }]),
    PrismaModule,
    LoggerModule,
    AuthModule,
    CommerceModule,
    WalletModule,
    HealthModule,
  ],
  controllers: [ImageProxyController, FoodController],
  providers: [
    // Apply rate limiting globally to all endpoints
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      // Apply RequestIdMiddleware globally to assign tracking correlation IDs
      .apply(RequestIdMiddleware)
      .forRoutes("*");
  }
}
