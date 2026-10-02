import { Module } from "@nestjs/common";
import { RideController } from "./ride.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [RideController],
  exports: [],
})
export class RideModule {}
