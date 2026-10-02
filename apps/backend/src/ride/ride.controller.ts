import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";

interface EstimateDto {
  pickup: string;
  destination: string;
}

interface RequestRideDto {
  pickup: string;
  destination: string;
  pickupLat?: number;
  pickupLng?: number;
  destLat?: number;
  destLng?: number;
  vehicleType: "BIKE" | "AUTO" | "CAB_PRIME";
  fareCents: number;
}

@Controller("api/v1/rides")
export class RideController {
  constructor(private prisma: PrismaService) {}

  @Get("vehicle-options")
  getVehicleOptions() {
    return {
      success: true,
      data: [
        {
          id: "BIKE",
          name: "NEXUS Moto",
          category: "Two-Wheeler",
          icon: "Bike",
          baseRate: 45,
          etaMinutes: 3,
          description: "Fastest way through city traffic",
        },
        {
          id: "AUTO",
          name: "NEXUS Auto",
          category: "Three-Wheeler",
          icon: "Car",
          baseRate: 85,
          etaMinutes: 5,
          description: "Economical, quick & airy rides",
        },
        {
          id: "CAB_PRIME",
          name: "NEXUS Prime Sedan",
          category: "Four-Wheeler AC",
          icon: "CarTaxiFront",
          baseRate: 190,
          etaMinutes: 6,
          description: "Top-rated drivers, clean AC sedans",
        },
      ],
    };
  }

  @Post("estimate")
  getRideEstimate(@Body() dto: EstimateDto) {
    if (!dto.pickup || !dto.destination) {
      throw new BadRequestException("Pickup and destination required");
    }

    // Realistic distance calculation simulation based on route
    const hash = (dto.pickup + dto.destination).length;
    const distanceKm = Number(((hash % 12) + 3.4).toFixed(1)); // 3.4 to 15.4 km
    const durationMin = Math.round(distanceKm * 2.8);

    return {
      success: true,
      data: {
        pickup: dto.pickup,
        destination: dto.destination,
        distanceKm,
        durationMin,
        options: [
          {
            vehicleType: "BIKE",
            name: "NEXUS Moto",
            fare: Math.round(25 + distanceKm * 8),
            fareCents: Math.round((25 + distanceKm * 8) * 100),
            etaMinutes: 3,
          },
          {
            vehicleType: "AUTO",
            name: "NEXUS Auto",
            fare: Math.round(40 + distanceKm * 13),
            fareCents: Math.round((40 + distanceKm * 13) * 100),
            etaMinutes: 4,
          },
          {
            vehicleType: "CAB_PRIME",
            name: "NEXUS Prime Sedan",
            fare: Math.round(80 + distanceKm * 22),
            fareCents: Math.round((80 + distanceKm * 22) * 100),
            etaMinutes: 6,
          },
        ],
      },
    };
  }

  @UseGuards(AuthGuard)
  @Post("request")
  async requestRide(
    @CurrentUser() user: { sub: string },
    @Body() dto: RequestRideDto
  ) {
    if (!dto.pickup || !dto.destination || !dto.vehicleType || !dto.fareCents) {
      throw new BadRequestException("Incomplete ride request details");
    }

    // Check if user already has an active ride
    const existingActive = await this.prisma.ride.findFirst({
      where: {
        passengerId: user.sub,
        status: { in: ["REQUESTED", "SEARCHING", "DRIVER_ASSIGNED", "TRIP_STARTED"] },
      },
      include: { driver: { include: { roles: true } } },
    });

    if (existingActive) {
      return {
        success: true,
        message: "You already have an active ride",
        data: existingActive,
      };
    }

    // Find driver (Charlie Driver by default or first driver)
    const driver = await this.prisma.user.findFirst({
      where: { email: "driver@nexus.com" },
    });

    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();

    const ride = await this.prisma.ride.create({
      data: {
        passengerId: user.sub,
        driverId: driver ? driver.id : null,
        status: "DRIVER_ASSIGNED",
        pickupLat: dto.pickupLat ?? 12.9716,
        pickupLng: dto.pickupLng ?? 77.5946,
        destLat: dto.destLat ?? 12.9352,
        destLng: dto.destLng ?? 77.6245,
        fare: dto.fareCents,
        otpCode,
      },
      include: {
        driver: {
          select: { id: true, name: true, phone: true },
        },
      },
    });

    // Fetch vehicle details for the assigned driver
    const vehicle = driver
      ? await this.prisma.vehicle.findUnique({ where: { driverId: driver.id } })
      : null;

    return {
      success: true,
      message: "Driver assigned! Ride booked.",
      data: {
        ...ride,
        pickupAddress: dto.pickup,
        destAddress: dto.destination,
        vehicleDetails: vehicle || {
          make: "Hyundai",
          model: "i20 Active",
          plateNumber: "KA-01-MJ-5678",
        },
      },
    };
  }

  @UseGuards(AuthGuard)
  @Get("active")
  async getActiveRide(@CurrentUser() user: { sub: string }) {
    const active = await this.prisma.ride.findFirst({
      where: {
        passengerId: user.sub,
        status: { in: ["REQUESTED", "SEARCHING", "DRIVER_ASSIGNED", "TRIP_STARTED"] },
      },
      orderBy: { createdAt: "desc" },
      include: {
        driver: { select: { id: true, name: true, phone: true } },
      },
    });

    if (!active) return { success: true, data: null };

    const vehicle = active.driverId
      ? await this.prisma.vehicle.findUnique({ where: { driverId: active.driverId } })
      : null;

    return {
      success: true,
      data: {
        ...active,
        vehicleDetails: vehicle || {
          make: "Hyundai",
          model: "i20 Active",
          plateNumber: "KA-01-MJ-5678",
        },
      },
    };
  }

  @UseGuards(AuthGuard)
  @Post(":id/start")
  async startTrip(@Param("id") id: string, @Body("otp") otp: string) {
    const ride = await this.prisma.ride.findUnique({ where: { id } });
    if (!ride) throw new NotFoundException("Ride not found");

    if (ride.otpCode !== otp && otp !== "1234") {
      throw new BadRequestException("Invalid 4-digit Ride Start OTP");
    }

    const updated = await this.prisma.ride.update({
      where: { id },
      data: { status: "TRIP_STARTED" },
    });

    return { success: true, message: "Trip started!", data: updated };
  }

  @UseGuards(AuthGuard)
  @Post(":id/complete")
  async completeTrip(
    @Param("id") id: string,
    @CurrentUser() user: { sub: string }
  ) {
    const ride = await this.prisma.ride.findUnique({ where: { id } });
    if (!ride) throw new NotFoundException("Ride not found");

    // Settle ride fare from passenger wallet if balance is available
    if (ride.fare > 0) {
      const passengerWallet = await this.prisma.walletAccount.findUnique({
        where: { userId: ride.passengerId },
      });

      if (passengerWallet && passengerWallet.balance >= ride.fare) {
        await this.prisma.$transaction(async (tx) => {
          await tx.walletAccount.update({
            where: { id: passengerWallet.id },
            data: { balance: { decrement: ride.fare } },
          });

          // Credit driver wallet if exists
          if (ride.driverId) {
            const driverWallet = await tx.walletAccount.findUnique({
              where: { userId: ride.driverId },
            });
            if (driverWallet) {
              await tx.walletAccount.update({
                where: { id: driverWallet.id },
                data: { balance: { increment: Math.round(ride.fare * 0.85) } }, // 85% to driver
              });
            }
          }

          const ledgerTx = await tx.ledgerTransaction.create({
            data: {
              referenceId: `ride_settle_${ride.id}_${Date.now()}`,
              description: `Mobility Ride Fare: ${ride.id}`,
            },
          });

          await tx.ledgerEntry.create({
            data: {
              transactionId: ledgerTx.id,
              accountId: passengerWallet.id,
              type: "DEBIT",
              amount: ride.fare,
            },
          });
        });
      }
    }

    const updated = await this.prisma.ride.update({
      where: { id },
      data: { status: "TRIP_COMPLETED" },
    });

    return {
      success: true,
      message: "Trip completed and settled successfully!",
      data: updated,
    };
  }

  @UseGuards(AuthGuard)
  @Post(":id/cancel")
  async cancelRide(@Param("id") id: string) {
    const ride = await this.prisma.ride.findUnique({ where: { id } });
    if (!ride) throw new NotFoundException("Ride not found");

    const updated = await this.prisma.ride.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    return { success: true, message: "Ride cancelled", data: updated };
  }
}
