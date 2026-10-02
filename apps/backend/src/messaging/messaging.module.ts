import { Module } from "@nestjs/common";
import { MessagingController } from "./messaging.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [MessagingController],
  exports: [],
})
export class MessagingModule {}
