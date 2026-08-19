import { Module } from "@nestjs/common";
import { CommerceService } from "./commerce.service";
import { CommerceController } from "./commerce.controller";
import { ProductsApiController } from "./products-api.controller";
import { OpenFoodFactsService } from "./open-food-facts.service";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [CommerceController, ProductsApiController],
  providers: [CommerceService, OpenFoodFactsService],
  exports: [CommerceService, OpenFoodFactsService],
})
export class CommerceModule {}
