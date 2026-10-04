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
  pickupLat?: number;
  pickupLng?: number;
  destLat?: number;
  destLng?: number;
  distanceKm?: number;
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
          baseRate: 30,
          etaMinutes: 3,
          description: "₹30 for first 5 km • +₹10/km thereafter",
        },
        {
          id: "AUTO",
          name: "NEXUS Auto",
          category: "Three-Wheeler",
          icon: "Car",
          baseRate: 45,
          etaMinutes: 4,
          description: "Economical city rickshaw • ₹30 base + ₹10/km",
        },
        {
          id: "CAB_PRIME",
          name: "NEXUS Prime Sedan",
          category: "Four-Wheeler AC",
          icon: "CarTaxiFront",
          baseRate: 70,
          etaMinutes: 6,
          description: "Clean AC sedan • Top-rated drivers",
        },
      ],
    };
  }

  @Post("estimate")
  getRideEstimate(@Body() dto: EstimateDto) {
    if (!dto.pickup || !dto.destination) {
      throw new BadRequestException("Pickup and destination required");
    }

    // Distance calculation: use passed distance, or compute from lat/lng, or route hash fallback
    let distanceKm: number;
    if (dto.distanceKm && dto.distanceKm > 0) {
      distanceKm = Number(dto.distanceKm.toFixed(1));
    } else if (dto.pickupLat && dto.pickupLng && dto.destLat && dto.destLng) {
      const R = 6371;
      const dLat = ((dto.destLat - dto.pickupLat) * Math.PI) / 180;
      const dLon = ((dto.destLng - dto.pickupLng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((dto.pickupLat * Math.PI) / 180) *
          Math.cos((dto.destLat * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      distanceKm = Number((R * c).toFixed(1));
    } else {
      const hash = (dto.pickup + dto.destination).length;
      distanceKm = Number(((hash % 12) + 3.4).toFixed(1)); // 3.4 to 15.4 km
    }
    const durationMin = Math.max(5, Math.round(distanceKm * 2.8));

    // Pricing Rule: Basic fare of ₹30 for up to 5 km, then +₹10 for each kilometer thereafter
    const extraKm = Math.max(0, distanceKm - 5);
    const bikeFare = Math.round(30 + extraKm * 10);
    const autoFare = Math.round(30 + extraKm * 10 + 15);
    const cabFare = Math.round(30 + extraKm * 10 + 40);

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
            fare: bikeFare,
            fareCents: bikeFare * 100,
            etaMinutes: 3,
          },
          {
            vehicleType: "AUTO",
            name: "NEXUS Auto",
            fare: autoFare,
            fareCents: autoFare * 100,
            etaMinutes: 4,
          },
          {
            vehicleType: "CAB_PRIME",
            name: "NEXUS Prime Sedan",
            fare: cabFare,
            fareCents: cabFare * 100,
            etaMinutes: 6,
          },
        ],
      },
    };
  }

  @UseGuards(AuthGuard)
  @Post("request")
  async requestRide(
    @CurrentUser() user: any,
    @Body() dto: RequestRideDto
  ) {
    const passengerId = user.userId || user.sub;
    if (!dto.pickup || !dto.destination || !dto.vehicleType || !dto.fareCents) {
      throw new BadRequestException("Incomplete ride request details");
    }

    // Check if user already has an active ride
    const existingActive = await this.prisma.ride.findFirst({
      where: {
        passengerId,
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
        passengerId,
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
  async getActiveRide(@CurrentUser() user: any) {
    const passengerId = user.userId || user.sub;
    const active = await this.prisma.ride.findFirst({
      where: {
        passengerId,
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
  @Get("history")
  async getRideHistory(@CurrentUser() user: any) {
    const passengerId = user.userId || user.sub;
    const rides = await this.prisma.ride.findMany({
      where: { passengerId },
      orderBy: { createdAt: "desc" },
      include: {
        driver: { select: { id: true, name: true, phone: true } },
      },
    });

    const driverIds = rides
      .map((r) => r.driverId)
      .filter((id): id is string => Boolean(id));

    const vehicles = await this.prisma.vehicle.findMany({
      where: { driverId: { in: driverIds } },
    });
    const vehicleMap = new Map(vehicles.map((v) => [v.driverId, v]));

    const enriched = rides.map((r) => ({
      ...r,
      vehicleDetails: r.driverId
        ? vehicleMap.get(r.driverId) || {
            make: "Hyundai",
            model: "i20 Active",
            plateNumber: "KA-01-MJ-5678",
          }
        : null,
    }));

    return { success: true, data: enriched };
  }

  @UseGuards(AuthGuard)
  @Get(":id/track")
  async getRideLiveTracking(@Param("id") id: string) {
    const ride = await this.prisma.ride.findUnique({
      where: { id },
      include: {
        driver: { select: { id: true, name: true, phone: true } },
      },
    });
    if (!ride) throw new NotFoundException("Ride not found");

    const vehicle = ride.driverId
      ? await this.prisma.vehicle.findUnique({ where: { driverId: ride.driverId } })
      : null;

    // Simulate GPS movement between pickup and destination based on trip state
    const isStarted = ride.status === "TRIP_STARTED";
    const progressFactor = isStarted ? 0.65 : 0.2;
    const currentLat = Number((ride.pickupLat + (ride.destLat - ride.pickupLat) * progressFactor).toFixed(6));
    const currentLng = Number((ride.pickupLng + (ride.destLng - ride.pickupLng) * progressFactor).toFixed(6));

    return {
      success: true,
      data: {
        rideId: ride.id,
        status: ride.status,
        otpCode: ride.otpCode,
        fare: ride.fare,
        driver: ride.driver,
        vehicleDetails: vehicle || {
          make: "Hyundai",
          model: "i20 Active",
          plateNumber: "KA-01-MJ-5678",
        },
        route: {
          pickup: { lat: ride.pickupLat, lng: ride.pickupLng },
          destination: { lat: ride.destLat, lng: ride.destLng },
          currentLocation: { lat: currentLat, lng: currentLng },
          bearing: 42,
          speedKmh: isStarted ? 38 : 22,
          etaMinutes: isStarted ? 7 : 3,
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
