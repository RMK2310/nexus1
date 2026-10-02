import { Controller, Get, HttpStatus, Res } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Response } from "express";

@Controller()
export class HealthController {
  private startTime = Date.now();

  constructor(private prisma: PrismaService) {}

  @Get(["api/health", "api/v1/health", "health"])
  async getHealth(@Res() res: Response) {
    const memory = process.memoryUsage();
    let dbStatus = "HEALTHY";
    let dbLatencyMs = 0;

    const dbStart = Date.now();
    try {
      // Execute raw query to verify actual live database connection & responsiveness
      await this.prisma.$queryRaw`SELECT 1`;
      dbLatencyMs = Date.now() - dbStart;
    } catch (err: any) {
      dbStatus = "UNHEALTHY";
      dbLatencyMs = Date.now() - dbStart;
    }

    const isHealthy = dbStatus === "HEALTHY";
    const status = isHealthy ? "OK" : "DEGRADED";
    const statusCode = isHealthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;

    return res.status(statusCode).json({
      status,
      timestamp: new Date().toISOString(),
      service: "nexus-backend",
      version: "1.0.0",
      environment: process.env.NODE_ENV || "development",
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        memoryUsageMB: {
          rss: Math.round(memory.rss / (1024 * 1024)),
          heapTotal: Math.round(memory.heapTotal / (1024 * 1024)),
          heapUsed: Math.round(memory.heapUsed / (1024 * 1024)),
        },
      },
      checks: {
        database: {
          status: dbStatus,
          latencyMs: dbLatencyMs,
        },
      },
    });
  }
}
